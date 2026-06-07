const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL_ID = 'gemini-2.0-flash';
const TIMEOUT_MS = 12000;

let genAI = null;

function getGenAI() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

function isAvailable() {
  return Boolean(process.env.GEMINI_API_KEY);
}

async function callGemini(prompt, systemInstruction = null) {
  const ai = getGenAI();
  if (!ai) throw new Error('GEMINI_NOT_CONFIGURED');

  const modelConfig = { model: MODEL_ID };
  if (systemInstruction) modelConfig.systemInstruction = systemInstruction;

  const model = ai.getGenerativeModel(modelConfig);

  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise((_, reject) => setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), TIMEOUT_MS)),
  ]);

  return result.response.text().trim();
}

// ── Flashcard Generation ──────────────────────────────────────────────────────

async function generateFlashcardsWithAI({ theme, subject, quantity, sourceText }) {
  const contextBlock = sourceText
    ? `Base as perguntas principalmente no seguinte conteúdo:\n\n${sourceText.slice(0, 3000)}\n\n`
    : '';

  const prompt = `${contextBlock}Gere exatamente ${quantity} flashcards de estudo sobre "${theme}" para a matéria de ${subject}.

Retorne SOMENTE um array JSON válido, sem texto antes ou depois, sem markdown, sem \`\`\`:
[
  {"question": "pergunta objetiva aqui", "answer": "resposta completa e concisa aqui"},
  ...
]

Regras:
- Perguntas devem testar conhecimento específico e prático
- Respostas devem ter no máximo 3 frases, objetivas e memorizáveis
- Varie os formatos: definição, aplicação, comparação, exemplos clínicos/práticos
- Use português brasileiro`;

  const raw = await callGemini(prompt);

  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('Invalid flashcard array response');

  return parsed.map((item) => ({
    question: String(item.question || '').trim(),
    answer: String(item.answer || '').trim(),
  })).filter((item) => item.question.length > 5 && item.answer.length > 5);
}

// ── Study Summarization ───────────────────────────────────────────────────────

async function generateSummaryWithAI({ text, title, subject }) {
  const prompt = `Analise o seguinte texto acadêmico sobre "${title}"${subject ? ` (${subject})` : ''} e retorne SOMENTE um JSON válido, sem markdown:

{
  "bullets": ["ponto-chave 1", "ponto-chave 2", ...],
  "keyTerms": ["termo1", "termo2", ...],
  "mindmapNodes": ["Nó 1", "Nó 2", ...]
}

Regras:
- bullets: 5 a 8 pontos-chave resumidos, cada um em uma frase curta e direta
- keyTerms: 6 a 10 termos-chave mais importantes do texto
- mindmapNodes: 5 a 6 nós para mapa mental, começando com letra maiúscula

Texto:
${text.slice(0, 4000)}`;

  const raw = await callGemini(prompt);

  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  return {
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets.map(String) : [],
    keyTerms: Array.isArray(parsed.keyTerms) ? parsed.keyTerms.map(String) : [],
    mindmapNodes: Array.isArray(parsed.mindmapNodes) ? parsed.mindmapNodes.map(String) : [],
  };
}

// ── Jarvis / Tigas Chat ───────────────────────────────────────────────────────

function buildJarvisSystemPrompt(user, track, trackHint) {
  const firstName = user.name.split(' ')[0];
  const area = user.area || 'área não definida';
  const goal = user.goal || 'meta não definida';
  const weeklyHours = user.weekly_goal_hours || 20;

  return `Você é o Tigas, o assistente de estudos inteligente do app Ordex.
Sua missão é apoiar ${firstName} com clareza, motivação e direção estratégica nos estudos.

PERFIL DO ALUNO:
- Nome: ${firstName}
- Área de estudo: ${area}
- Objetivo: ${goal}
- Meta semanal: ${weeklyHours}h
- Trilha detectada: ${track} → ${trackHint}

REGRAS DE RESPOSTA:
- Seja direto, motivador e objetivo. Máximo 2 a 3 frases.
- Sempre personalize pelo nome do aluno.
- Termine com uma ação concreta ou pergunta de engajamento.
- Não ofereça criar lembretes, flashcards ou tarefas (isso é feito por comandos específicos).
- Responda sempre em português brasileiro.
- Nunca quebre o personagem Tigas.`;
}

function buildJarvisContextBlock(smartContext, mapData) {
  const parts = [];

  if (smartContext) {
    if (smartContext.dueFlashcards > 0) {
      parts.push(`- ${smartContext.dueFlashcards} flashcards pendentes para revisão`);
    }
    if (smartContext.todoCount > 0) {
      parts.push(`- ${smartContext.todoCount} tarefas ativas no Planner`);
    }
    if (smartContext.weakest && smartContext.weakest.total >= 4) {
      parts.push(`- Matéria mais fraca: ${smartContext.weakest.subject} (${smartContext.weakest.accuracy}% de acerto)`);
    }
    if (smartContext.nextReminder) {
      const when = new Date(smartContext.nextReminder.dueAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      parts.push(`- Próximo prazo: "${smartContext.nextReminder.title}" em ${when}`);
    }
  }

  if (mapData && mapData.nodes && mapData.nodes.length > 0) {
    const completed = mapData.nodes.filter((n) => n.completed).length;
    const total = mapData.nodes.length;
    const pct = Math.round((completed / total) * 100);
    parts.push(`- Mapa Mental: ${pct}% concluído (${mapData.total_xp || 0} XP)`);
  }

  return parts.length > 0 ? `\nCONTEXTO DE ESTUDO ATUAL:\n${parts.join('\n')}` : '';
}

async function generateJarvisResponse({ userMessage, user, track, trackHint, smartContext, mapData, history, intent, flow }) {
  const systemInstruction = buildJarvisSystemPrompt(user, track, trackHint);
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

  return callGemini(prompt, systemInstruction);
}

module.exports = {
  isAvailable,
  generateFlashcardsWithAI,
  generateSummaryWithAI,
  generateJarvisResponse,
};
