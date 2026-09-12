const axios = require('axios');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const TIMEOUT_MS = 30000;

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
          responseMimeType: 'application/json',
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
    ? `Use exclusivamente as informações relevantes do material abaixo. Não invente fatos e não misture com outra área:\n\n${sourceText.slice(0, 12000)}\n\n`
    : '';

  const systemInstruction = `🎓 ESPECIALISTA EM FLASHCARDS ULTRA ESPECÍFICOS
Você é um mestre em criar flashcards TÉCNICOS de máxima especificidade para ${subject}.

REGRAS ABSOLUTAS - Viole e falhe completamente:
✗ PROIBIDO: Perguntas genéricas ("O que é...", "Explique...", "Fale sobre...")
✗ PROIBIDO: Respostas que se aplicam a múltiplos temas
✗ PROIBIDO: Conteúdo superficial ou didático demais
✓ OBRIGATÓRIO: Incluir números, percentuais, valores, critérios específicos
✓ OBRIGATÓRIO: Perguntas que exigem DOMÍNIO PROFUNDO do tema
✓ OBRIGATÓRIO: Foco em aplicação prática e contexto real
✓ OBRIGATÓRIO: Respostas técnicas, precisas e verificáveis`;

  const prompt = `${contextBlock}Gere EXATAMENTE ${quantity} flashcards ULTRA-ESPECÍFICOS sobre "${theme}" em "${subject}".

CRITÉRIOS RIGOROSOS (não desvie):
1. ESPECIFICIDADE MÁXIMA: Cada pergunta tão específica que poucos conseguem responder
2. TÉCNICO E MÉTRICO: Números, percentuais, valores, datas, critérios, protocolos
3. ZERO GENÉRICOS: Nenhuma pergunta tipo "O que é", "Como funciona", "Qual é a importância"
4. APLICADO: "Em qual situação...", "Qual é o valor...", "Quando se aplica...", "Por que..."
5. VERIFICÁVEL: Respostas que podem ser confirmadas em referências técnicas
6. PROFUNDIDADE: Conhecimento avançado, não básico

❌ EXEMPLO PÉSSIMO:
P: "O que é hipertensão?"
R: "É quando a pressão arterial está elevada"

✅ EXEMPLO EXCELENTE:
P: "Qual é o valor de PAS (mmHg) que define hipertensão Estágio 1 segundo AHA/ACC 2017?"
R: "130-139 mmHg de PAS (ou 80-89 mmHg de PAD), pois acima disso há risco cardiovascular aumentado"

Retorne SOMENTE um array JSON válido (sem markdown ou blocos de código):
[
  {"question": "Pergunta MUITO específica e técnica", "answer": "Resposta com números/valores/critérios específicos"},
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

async function transcribeVideoWithAI({ mimeType, dataUrl }) {
  if (!isAvailable()) throw new Error('GEMINI_NOT_CONFIGURED');
  const base64Data = String(dataUrl || '').split(',')[1] || '';
  if (!base64Data || !/^video\//i.test(String(mimeType || ''))) {
    throw new Error('VIDEO_DATA_INVALID');
  }

  const response = await axios.post(
    `${GEMINI_API_URL}/${MODEL_ID}:generateContent`,
    {
      contents: [{ parts: [
        { text: 'Transcreva este vídeo em português brasileiro. Preserve os termos técnicos, fórmulas e nomes próprios. Retorne somente a transcrição, sem comentários.' },
        { inline_data: { mime_type: mimeType, data: base64Data } },
      ] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    },
    {
      params: { key: process.env.GOOGLE_GEMINI_API_KEY },
      headers: { 'Content-Type': 'application/json' },
      timeout: TIMEOUT_MS,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 8 * 1024 * 1024,
    },
  );

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  if (text.length < 40) throw new Error('VIDEO_TRANSCRIPTION_EMPTY');
  return text;
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
  const prompt = `🎓 GERE FLASHCARDS TÉCNICOS E ESPECÍFICOS A PARTIR DESTA IMAGEM

Disciplina/Contexto: ${subject}

REGRAS OBRIGATÓRIAS:
✗ NUNCA: Perguntas genéricas tipo "O que é...", "Explique..."
✗ NUNCA: Respostas superficiais ou que se aplicam a múltiplos temas
✓ OBRIGATÓRIO: Se há números, fórmulas, valores ou critérios → INCLUA NAS RESPOSTAS
✓ OBRIGATÓRIO: Cada pergunta deve ser específica e técnica
✓ OBRIGATÓRIO: Perguntas aplicadas quando possível ("Como...", "Qual é...", "Quando...")
✓ OBRIGATÓRIO: 3-7 flashcards de ALTA QUALIDADE (não quantidade, qualidade)

EXEMPLOS:
❌ PÉSSIMO: P: "O que mostra este diagrama?" R: "Mostra o ciclo de vida"
✅ EXCELENTE: P: "Qual é a duração da fase S em células de mamífero?" R: "6-8 horas do ciclo celular total de 24 horas"

Se a imagem contém:
- EQUAÇÕES: Pergunte sobre valores numéricos, aplicações práticas, situações onde se usa
- DIAGRAMAS: Pergunte sobre relações específicas, fluxo de energia/informação, critérios de decisão
- GRÁFICOS: Pergunte sobre valores específicos, interpretação de dados, limites críticos
- FÓRMULAS: Pergunte sobre quando usar, o que cada termo significa, aplicações práticas

Retorne SOMENTE um array JSON válido, sem markdown:
[
  {"question": "Pergunta MUITO ESPECÍFICA e técnica", "answer": "Resposta com números/valores/critérios específicos"},
  ...
]`;

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

async function generateMockExamWithAI({ topic, subject, difficulty = 'medium', questionCount = 10 }) {
  const difficultyDesc = {
    easy: 'fácil (conceitual, definições)',
    medium: 'média (aplicação prática, interpretação)',
    hard: 'difícil (análise crítica, síntese, casos complexos)',
  };

  const systemInstruction = `Você é especialista em criar provas e exames de ALTA QUALIDADE para estudantes de medicina.
Cada questão deve ter uma única resposta correta clara, alternativas plausíveis, e explicação detalhada.
As questões devem seguir o padrão ENEM/concursos médicos.`;

  const prompt = `Gere ${questionCount} questões de múltipla escolha nível ${difficultyDesc[difficulty] || difficultyDesc.medium} sobre "${topic}" em ${subject}.

Formato OBRIGATÓRIO - Retorne SOMENTE JSON (sem markdown, sem \`\`\`, sem texto adicional):
{
  "title": "Simulado: ${topic}",
  "subject": "${subject}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": "q1",
      "text": "Texto da questão 1 aqui",
      "options": [
        {"letter": "A", "text": "opção A"},
        {"letter": "B", "text": "opção B"},
        {"letter": "C", "text": "opção C"},
        {"letter": "D", "text": "opção D"},
        {"letter": "E", "text": "opção E"}
      ],
      "correctAnswer": "A",
      "explanation": "Explicação clara e concisa"
    }
  ]
}`;

  try {
    const response = await callGemini(prompt, systemInstruction);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('INVALID_JSON_RESPONSE');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating mock exam:', error.message);
    throw error;
  }
}

async function generateMnemonicsWithAI({ term, context = '', subject = 'Geral' }) {
  const systemInstruction = `Você é especialista em criar técnicas de memorização, mnemônicos e associações criativas.
Mnemônicos devem ser memoráveis, criativas e cientificamente baseadas em técnicas de aprendizado.`;

  const prompt = `Crie 3-5 mnemônicos e técnicas de memorização DIFERENTES e CRIATIVAS para lembrar de "${term}" em ${subject}.
${context ? `Contexto: ${context}` : ''}

Para cada técnica, inclua:
- Nome/Tipo: (ex: ACRÔNIMO, HISTÓRIA, IMAGEM MENTAL, etc)
- Descrição: explicação da técnica
- Exemplo: como aplicar
- Eficácia: por que funciona

Mantenha a resposta prática e fácil de aplicar durante o estudo.`;

  try {
    return await callGemini(prompt, systemInstruction);
  } catch (error) {
    console.error('Error generating mnemonics:', error.message);
    throw error;
  }
}

async function analyzeStudyWeaknesses({ userId, recentPerformance = [] }) {
  const systemInstruction = `Você é especialista em análise de desempenho educacional e recomendações personalizadas.
Identifique padrões, fraquezas e oportunidades de melhoria.`;

  const performanceData = recentPerformance.length > 0
    ? `Desempenho recente: ${JSON.stringify(recentPerformance)}`
    : 'Sem dados de desempenho disponível. Forneça dicas gerais.';

  const prompt = `Analise o desempenho do usuário e forneça:
1. Tópicos principais com dificuldade
2. Padrões de erro identificados
3. 3-5 recomendações específicas para melhorar
4. Sequência sugerida de estudo

${performanceData}

Seja específico, motivador e prático nas recomendações.`;

  try {
    return await callGemini(prompt, systemInstruction);
  } catch (error) {
    console.error('Error analyzing weaknesses:', error.message);
    throw error;
  }
}

module.exports = {
  isAvailable,
  callGemini,
  callGeminiWithImage,
  generateFlashcardsWithAI,
  transcribeVideoWithAI,
  generateSummaryWithAI,
  generateJarvisResponse,
  generateQuizWithAI,
  generateStudyPlanWithAI,
  analyzeImageForFlashcards,
  explainImageContent,
  generateMockExamWithAI,
  generateMnemonicsWithAI,
  analyzeStudyWeaknesses,
};
