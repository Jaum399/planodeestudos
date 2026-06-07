const { GoogleGenerativeAI } = require('@google/generative-ai');
const { FLASHCARD_PROMPTS, JARVIS_PROMPTS, SUMMARY_PROMPTS } = require('../config/aiPrompts');

const MODEL_ID = 'gemini-2.0-flash';

// Operation-specific timeout constants (ms)
const TIMEOUTS = {
  flashcard: 15000,
  jarvis: 10000,
  summary: 12000,
  recommendation: 8000,
  default: 12000,
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 2,
  backoff: [500, 1000], // ms between retries
};

let genAI = null;

function getGenAI() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

function isAvailable() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// Wrapper for retry logic with exponential backoff
async function withRetry(operation, maxRetries = RETRY_CONFIG.maxRetries) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delayMs = RETRY_CONFIG.backoff[attempt] || RETRY_CONFIG.backoff[RETRY_CONFIG.backoff.length - 1];
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

async function callGemini(prompt, systemInstruction = null, options = {}) {
  const { timeout = TIMEOUTS.default, temperature = 0.3, topP = 0.95, topK = 40 } = options;

  return withRetry(async () => {
    const ai = getGenAI();
    if (!ai) throw new Error('GEMINI_NOT_CONFIGURED');

    const modelConfig = {
      model: MODEL_ID,
      generationConfig: {
        temperature,
        topP,
        topK,
        maxOutputTokens: 2048,
      },
    };
    if (systemInstruction) modelConfig.systemInstruction = systemInstruction;

    const model = ai.getGenerativeModel(modelConfig);

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), timeout)),
    ]);

    const text = result.response.text().trim();
    if (!text || text.length < 2) throw new Error('EMPTY_RESPONSE');
    return text;
  });
}

// Parse JSON with multiple fallback strategies
function parseJsonResponse(raw, fallbackParsingRules = null) {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(raw);
  } catch (e1) {
    // Strategy 2: Remove markdown code blocks
    try {
      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (e2) {
      // Strategy 3: Extract array/object with regex
      try {
        const arrayMatch = raw.match(/\[\s*{[\s\S]*}\s*\]/);
        const objectMatch = raw.match(/{\s*"[\s\S]*"[\s\S]*}/);
        const candidate = arrayMatch ? arrayMatch[0] : objectMatch ? objectMatch[0] : null;
        if (candidate) return JSON.parse(candidate);
      } catch (e3) {
        // Strategy 4: Apply custom parsing rules if provided
        if (fallbackParsingRules) {
          try {
            return fallbackParsingRules(raw);
          } catch (e4) {
            throw new Error(`JSON_PARSE_FAILED: ${e1.message}`);
          }
        }
        throw new Error(`JSON_PARSE_FAILED: ${e1.message}`);
      }
    }
  }
}

// Quality metrics logger
class QualityMetrics {
  constructor(operation) {
    this.operation = operation;
    this.startTime = Date.now();
    this.retryCount = 0;
    this.parseSuccess = false;
    this.responseLength = 0;
  }

  record(data) {
    Object.assign(this, data);
    this.latency = Date.now() - this.startTime;
  }

  toLog() {
    return {
      operation: this.operation,
      latency: this.latency,
      retryCount: this.retryCount,
      parseSuccess: this.parseSuccess,
      responseLength: this.responseLength,
      timestamp: new Date().toISOString(),
    };
  }
}

// ── Flashcard Generation ──────────────────────────────────────────────────────

async function generateFlashcardsWithAI({ theme, subject, quantity, sourceText, domain = 'medical' }) {
  const metrics = new QualityMetrics('flashcard_generation');

  try {
    // Select appropriate prompt template from centralized config
    const domainTemplates = FLASHCARD_PROMPTS[domain] || FLASHCARD_PROMPTS.generic;
    const userPrompt = domainTemplates.user(theme, subject, quantity, sourceText);
    const systemPrompt = domainTemplates.system;

    const raw = await callGemini(userPrompt, systemPrompt, {
      timeout: TIMEOUTS.flashcard,
      temperature: 0.3, // Factual responses need lower temperature
      topP: 0.95,
      topK: 40,
    });

    metrics.responseLength = raw.length;

    // Parse JSON with fallback strategies
    const parsed = parseJsonResponse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid_flashcard_array_response');

    const validated = parsed
      .map((item) => ({
        question: String(item.question || '').trim(),
        answer: String(item.answer || '').trim(),
      }))
      .filter((item) => item.question.length > 5 && item.answer.length > 5);

    if (validated.length === 0) throw new Error('No_valid_flashcards_generated');

    metrics.parseSuccess = true;
    metrics.record({ retryCount: 0 });
    return validated;
  } catch (error) {
    metrics.record({ parseSuccess: false, error: error.message });
    throw error;
  }
}

// ── Study Summarization ───────────────────────────────────────────────────────

async function generateSummaryWithAI({ text, title, subject, level = 'quick' }) {
  const metrics = new QualityMetrics('summary_generation');

  try {
    const summaryTemplate = SUMMARY_PROMPTS[level] || SUMMARY_PROMPTS.quick;
    const prompt = `Analise o seguinte texto acadêmico sobre "${title}"${subject ? ` (${subject})` : ''}:

${text.slice(0, 4000)}

${summaryTemplate}

Retorne SOMENTE um JSON válido, sem markdown:
{
  "bullets": ["ponto-chave 1", "ponto-chave 2", ...],
  "keyTerms": ["termo1", "termo2", ...],
  "mindmapNodes": ["Nó 1", "Nó 2", ...]
}`;

    const raw = await callGemini(prompt, null, {
      timeout: TIMEOUTS.summary,
      temperature: 0.3,
      topP: 0.95,
    });

    metrics.responseLength = raw.length;

    const parsed = parseJsonResponse(raw);

    const result = {
      bullets: (Array.isArray(parsed.bullets) ? parsed.bullets : []).map(String).filter(b => b.length > 0),
      keyTerms: (Array.isArray(parsed.keyTerms) ? parsed.keyTerms : []).map(String).filter(t => t.length > 0),
      mindmapNodes: (Array.isArray(parsed.mindmapNodes) ? parsed.mindmapNodes : []).map(String).filter(n => n.length > 0),
    };

    if (result.bullets.length === 0 && result.keyTerms.length === 0) {
      throw new Error('No_summary_data_generated');
    }

    metrics.parseSuccess = true;
    metrics.record({ retryCount: 0 });
    return result;
  } catch (error) {
    metrics.record({ parseSuccess: false, error: error.message });
    throw error;
  }
}

// ── Jarvis / Tigas Chat ───────────────────────────────────────────────────────

function buildJarvisSystemPrompt(user, track, trackHint, flow = 'equilibrado') {
  const firstName = user.name.split(' ')[0];
  const area = user.area || 'área não definida';
  const goal = user.goal || 'meta não definida';
  const weeklyHours = user.weekly_goal_hours || 20;

  const basePrompt = JARVIS_PROMPTS.buildSystemPrompt(firstName, area, goal, weeklyHours, track, trackHint);
  const flowTone = JARVIS_PROMPTS.flowPrompts[flow] || JARVIS_PROMPTS.flowPrompts.equilibrado;

  return `${basePrompt}\n\n${flowTone}`;
}

function buildJarvisContextBlock(smartContext, mapData) {
  if (!smartContext && !mapData) return '';
  return JARVIS_PROMPTS.contextBlock(smartContext, mapData);
}

async function generateJarvisResponse({ userMessage, user, track, trackHint, smartContext, mapData, history, intent, flow = 'equilibrado' }) {
  const metrics = new QualityMetrics('jarvis_response');

  try {
    const systemInstruction = buildJarvisSystemPrompt(user, track, trackHint, flow);
    const contextBlock = buildJarvisContextBlock(smartContext, mapData);

    const historyBlock = (history || [])
      .slice(-8)
      .map((h) => `${h.role === 'user' ? 'Aluno' : 'Tigas'}: ${h.content}`)
      .join('\n');

    const prompt = `${contextBlock}

${historyBlock ? `HISTÓRICO RECENTE:\n${historyBlock}\n` : ''}
INTENÇÃO DETECTADA: ${intent}
TOM NECESSÁRIO: ${flow}

Aluno: ${userMessage}
Tigas:`;

    const response = await callGemini(prompt, systemInstruction, {
      timeout: TIMEOUTS.jarvis,
      temperature: 0.7, // Conversational responses need higher temperature
      topP: 0.95,
      topK: 40,
    });

    metrics.responseLength = response.length;
    metrics.parseSuccess = true;
    metrics.record({ retryCount: 0 });
    return response;
  } catch (error) {
    metrics.record({ parseSuccess: false, error: error.message });
    throw error;
  }
}

module.exports = {
  isAvailable,
  generateFlashcardsWithAI,
  generateSummaryWithAI,
  generateJarvisResponse,
  callGemini,
  parseJsonResponse,
  QualityMetrics,
  TIMEOUTS,
  RETRY_CONFIG,
};
