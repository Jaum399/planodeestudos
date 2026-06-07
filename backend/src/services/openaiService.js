const axios = require('axios');

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const TIMEOUT_MS = 12000;
const MODEL_ID = 'gpt-4o-mini'; // Faster, cost-effective model with good quality

function isAvailable() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function callOpenAI(prompt, systemInstruction = null) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_NOT_CONFIGURED');

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  try {
    const response = await axios.post(
      `${OPENAI_BASE_URL}/chat/completions`,
      {
        model: MODEL_ID,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: TIMEOUT_MS,
      },
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    if (error.response?.status === 429) throw new Error('OPENAI_RATE_LIMIT');
    if (error.code === 'ECONNABORTED') throw new Error('OPENAI_TIMEOUT');
    throw error;
  }
}

async function generateFlashcardsWithAI({ theme, subject, quantity, sourceText }) {
  const contextBlock = sourceText
    ? `Base as perguntas principalmente no seguinte conteúdo:\n\n${sourceText.slice(0, 3000)}\n\n`
    : '';

  const systemInstruction = `Você é um especialista em criar flashcards para estudo médico de alta qualidade, similar ao padrão MedSimple.
Crie perguntas e respostas que sejam específicas, testáveis e clinicamente relevantes.
Priorize clareza, precisão e valor educacional acima de criatividade.`;

  const prompt = `${contextBlock}Gere exatamente ${quantity} flashcards de estudo de alta qualidade sobre "${theme}" para a matéria de ${subject}.

Retorne SOMENTE um array JSON válido, sem texto antes ou depois, sem markdown, sem \`\`\`:
[
  {"question": "pergunta objetiva aqui", "answer": "resposta completa e concisa aqui"},
  ...
]

REGRAS ESSENCIAIS:
- Perguntas devem ser ESPECÍFICAS e TESTÁVEIS: Evite perguntas genéricas, priorize conceitos clínicos, cálculos, critérios diagnósticos
- Respostas: Máximo 3 frases, diretas, memorizáveis. Foque em QUANDO usar, COMO identificar, POR QUE é importante
- Formato variado: Definição clínica, aplicação prática, diferencial diagnóstico, sequência temporal, critérios ABCD/similares, exemplos concretos
- Evite: Respostas óbvias, definições de dicionário superficiais, ambiguidade
- Contexto: Para medicina, inclua: sinais de alerta, contra-indicações, complicações, validação em prova

EXEMPLOS DE QUALIDADE ALTA:
❌ Ruim: "O que é diabetes?" → "Doença do pâncreas"
✅ Bom: "Qual valor de glicemia em jejum define diabetes mellitus tipo 2?" → "≥126 mg/dL em duas ocasiões diferentes (OMS 2010)"

❌ Ruim: "Fale sobre infecção" → "Processo causado por germes"
✅ Bom: "Qual é o critério qSOFA para sepse e qual score indica risco alto de morte em 30 dias?" → "Altered mental status, SBP ≤100 mmHg, RR ≥22. Score ≥2 = risco alto de morte (>40%)"

- Use português brasileiro
- Priorize clareza e precisão`;

  const raw = await callOpenAI(prompt, systemInstruction);

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

  const raw = await callOpenAI(prompt);

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

async function generateJarvisResponse({ userMessage, user, track, trackHint, smartContext, mapData, history, intent, flow }) {
  const firstName = user.name.split(' ')[0];
  const area = user.area || 'área não definida';
  const goal = user.goal || 'meta não definida';
  const weeklyHours = user.weekly_goal_hours || 20;

  const systemInstruction = `Você é o Tigas, o assistente de estudos inteligente do app Ordex.
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

  const contextParts = [];
  if (smartContext) {
    if (smartContext.dueFlashcards > 0) {
      contextParts.push(`- ${smartContext.dueFlashcards} flashcards pendentes para revisão`);
    }
    if (smartContext.todoCount > 0) {
      contextParts.push(`- ${smartContext.todoCount} tarefas ativas no Planner`);
    }
    if (smartContext.weakest && smartContext.weakest.total >= 4) {
      contextParts.push(`- Matéria mais fraca: ${smartContext.weakest.subject} (${smartContext.weakest.accuracy}% de acerto)`);
    }
    if (smartContext.nextReminder) {
      const when = new Date(smartContext.nextReminder.dueAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      contextParts.push(`- Próximo prazo: "${smartContext.nextReminder.title}" em ${when}`);
    }
  }

  if (mapData && mapData.nodes && mapData.nodes.length > 0) {
    const completed = mapData.nodes.filter((n) => n.completed).length;
    const total = mapData.nodes.length;
    const pct = Math.round((completed / total) * 100);
    contextParts.push(`- Mapa Mental: ${pct}% concluído (${mapData.total_xp || 0} XP)`);
  }

  const contextBlock = contextParts.length > 0 ? `\nCONTEXTO DE ESTUDO ATUAL:\n${contextParts.join('\n')}` : '';
  const historyBlock = (history || [])
    .slice(-8)
    .map((h) => `${h.role === 'user' ? 'Aluno' : 'Tigas'}: ${h.content}`)
    .join('\n');

  const prompt = `${contextBlock}

${historyBlock ? `HISTÓRICO RECENTE:\n${historyBlock}\n` : ''}INTENÇÃO DETECTADA: ${intent}
TOM NECESSÁRIO: ${flow}

Aluno: ${userMessage}
Tigas:`;

  return callOpenAI(prompt, systemInstruction);
}

module.exports = {
  isAvailable,
  generateFlashcardsWithAI,
  generateSummaryWithAI,
  generateJarvisResponse,
};
