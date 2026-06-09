const axios = require('axios');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_ID = 'gemini-1.5-flash'; // Fast, free tier available
const TIMEOUT_MS = 12000;

function isAvailable() {
  return Boolean(process.env.GOOGLE_GEMINI_API_KEY);
}

async function callGemini(prompt, systemInstruction = null) {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error('GEMINI_NOT_CONFIGURED');
  }

  const fullPrompt = systemInstruction
    ? `${systemInstruction}\n\nUser request: ${prompt}`
    : prompt;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}/${MODEL_ID}:generateContent`,
      {
        contents: [
          {
            parts: [
              {
                text: fullPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      },
      {
        params: {
          key: process.env.GOOGLE_GEMINI_API_KEY,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: TIMEOUT_MS,
      }
    );

    if (!response.data.candidates || !response.data.candidates[0]?.content?.parts[0]?.text) {
      throw new Error('GEMINI_EMPTY_RESPONSE');
    }

    return response.data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('GEMINI_RATE_LIMIT');
    }
    if (error.response?.status === 403) {
      throw new Error('GEMINI_INVALID_API_KEY');
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('GEMINI_TIMEOUT');
    }
    console.error('Gemini API Error:', error.message);
    throw error;
  }
}

async function generateFlashcardsWithAI({ theme, subject, quantity, sourceText }) {
  const contextBlock = sourceText
    ? `Base as perguntas principalmente no seguinte conteúdo:\n\n${sourceText.slice(0, 3000)}\n\n`
    : '';

  const systemInstruction = `Você é um especialista em criar flashcards para estudo médico de ALTÍSSIMA ESPECIFICIDADE.
Gere respostas NUNCA genéricas: sempre com nomes específicos, números exatos, critérios precisos.
Cada resposta deve ser válida em prova de concurso médico.`;

  const prompt = `${contextBlock}Gere exatamente ${quantity} flashcards de estudo de ALTÍSSIMA ESPECIFICIDADE sobre "${theme}" para a matéria de ${subject}.

Retorne SOMENTE um array JSON válido, sem texto antes ou depois, sem markdown, sem \`\`\`:
[
  {"question": "pergunta objetiva aqui", "answer": "resposta completa e concisa aqui"},
  ...
]`;

  try {
    const response = await callGemini(prompt, systemInstruction);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('INVALID_JSON_RESPONSE');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating flashcards:', error.message);
    throw error;
  }
}

async function generateSummaryWithAI({ content, length = 'medium', language = 'pt-BR' }) {
  const lengthGuide = {
    short: '2-3 parágrafos',
    medium: '4-6 parágrafos',
    long: '8-12 parágrafos',
  };

  const systemInstruction = `Você é um especialista em criar resumos educacionais de ALTA QUALIDADE.
Resumos devem ser claros, concisos, com estrutura lógica e destacando conceitos-chave.`;

  const prompt = `Crie um resumo de ${lengthGuide[length] || lengthGuide.medium} para:

"${content.slice(0, 4000)}"

Mantenha informações importantes, use **negrito** para conceitos-chave.`;

  try {
    return await callGemini(prompt, systemInstruction);
  } catch (error) {
    console.error('Error generating summary:', error.message);
    throw error;
  }
}

async function generateJarvisResponse({ userMessage, context = '', conversationHistory = [] }) {
  const systemInstruction = `Você é Jarvis, assistente de IA educacional especializado em medicina.

PERSONALIDADE: Amigável, empático, preciso, proativo em sugerir recursos.
FUNÇÕES: Responder dúvidas, sugerir estratégias, dar feedback, motivar, recomendar recursos.
REGRAS: Respostas 150-300 palavras, use 1-2 emojis máx, seja honesto se não souber.`;

  const prompt = `Usuário: "${userMessage}"

Responda de forma acessível, educacional e motivadora. Se relevante, sugira próximos passos.`;

  try {
    return await callGemini(prompt, systemInstruction);
  } catch (error) {
    console.error('Error generating Jarvis response:', error.message);
    throw error;
  }
}

async function generateQuizWithAI({ topic, subject, difficulty = 'medium', quantity = 5 }) {
  const difficultyMap = {
    easy: 'fácil (básica, conceitual)',
    medium: 'média (aplicada, casos clínicos simples)',
    hard: 'difícil (análise crítica, casos complexos)',
  };

  const systemInstruction = `Você é especialista em criar questões de múltipla escolha de ALTA QUALIDADE.
Questões devem ter uma única resposta correta clara, distractores plausíveis, e explicação detalhada.`;

  const prompt = `Gere ${quantity} questões de múltipla escolha nível ${difficultyMap[difficulty]} sobre "${topic}" em ${subject}.

Retorne SOMENTE JSON (sem markdown):
[
  {
    "question": "Texto da questão",
    "options": [
      {"label": "A", "text": "opção A"},
      {"label": "B", "text": "opção B"},
      {"label": "C", "text": "opção C"},
      {"label": "D", "text": "opção D"},
      {"label": "E", "text": "opção E"}
    ],
    "correctAnswer": "A",
    "explanation": "Explicação clara"
  }
]`;

  try {
    const response = await callGemini(prompt, systemInstruction);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('INVALID_JSON_RESPONSE');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating quiz:', error.message);
    throw error;
  }
}

async function generateStudyPlanWithAI({ goal, currentLevel, timeAvailable, subject }) {
  const systemInstruction = `Você é especialista em educação e planejamento de estudo.
Planos devem ser realistas, progressivos e motivadores.`;

  const prompt = `Crie um plano de estudo com:
- Objetivo: ${goal}
- Nível atual: ${currentLevel}
- Tempo: ${timeAvailable}
- Matéria: ${subject}

Inclua: semanas, tópicos em ordem, recursos recomendados, marcos de progresso, dicas de motivação.`;

  try {
    return await callGemini(prompt, systemInstruction);
  } catch (error) {
    console.error('Error generating study plan:', error.message);
    throw error;
  }
}

async function callGeminiWithImage(imageBase64, prompt, mimeType = 'image/jpeg') {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error('GEMINI_NOT_CONFIGURED');
  }

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}/${MODEL_ID}:generateContent`,
      {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      },
      {
        params: {
          key: process.env.GOOGLE_GEMINI_API_KEY,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: TIMEOUT_MS,
      }
    );

    if (!response.data.candidates || !response.data.candidates[0]?.content?.parts[0]?.text) {
      throw new Error('GEMINI_EMPTY_RESPONSE');
    }

    return response.data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('GEMINI_RATE_LIMIT');
    }
    if (error.response?.status === 403) {
      throw new Error('GEMINI_INVALID_API_KEY');
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('GEMINI_TIMEOUT');
    }
    console.error('Gemini Vision Error:', error.message);
    throw error;
  }
}

async function analyzeImageForFlashcards(imageBase64, subject = 'Geral', mimeType = 'image/jpeg') {
  const prompt = `Analise esta imagem e gere flashcards de estudo de ALTA QUALIDADE.

Retorne SOMENTE um array JSON válido:
[
  {"question": "pergunta concisa", "answer": "resposta completa e precisa"},
  {"question": "pergunta 2", "answer": "resposta 2"},
  {"question": "pergunta 3", "answer": "resposta 3"}
]

Mínimo 3, máximo 7 flashcards. Se a imagem for de equações, diagramas ou fórmulas, crie perguntas específicas sobre esses conceitos.`;

  try {
    const response = await callGeminiWithImage(imageBase64, prompt, mimeType);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('INVALID_JSON_RESPONSE');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error analyzing image for flashcards:', error.message);
    throw error;
  }
}

async function explainImageContent(imageBase64, mimeType = 'image/jpeg') {
  const prompt = `Explique o conteúdo desta imagem de forma educacional e clara.
Identifique os conceitos principais, sua relevância educacional, e sugira como estudá-los.
Mantenha a resposta entre 200-400 palavras.`;

  try {
    return await callGeminiWithImage(imageBase64, prompt, mimeType);
  } catch (error) {
    console.error('Error explaining image:', error.message);
    throw error;
  }
}

module.exports = {
  isAvailable,
  callGemini,
  callGeminiWithImage,
  generateFlashcardsWithAI,
  generateSummaryWithAI,
  generateJarvisResponse,
  generateQuizWithAI,
  generateStudyPlanWithAI,
  analyzeImageForFlashcards,
  explainImageContent,
};
