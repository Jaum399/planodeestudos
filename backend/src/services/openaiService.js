const axios = require('axios');

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const TIMEOUT_MS = 30000;
const MODEL_ID = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

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
    ? `Use exclusivamente as informações relevantes do material abaixo. Não invente fatos e não misture com outra área:\n\n${sourceText.slice(0, 12000)}\n\n`
    : '';

  const systemInstruction = `🎓 EXPERT EM FLASHCARDS TÉCNICOS DE ALTÍSSIMA QUALIDADE
Seu trabalho: Criar flashcards de MÁXIMA ESPECIFICIDADE e EXTREMA QUALIDADE para ${subject}.

RESTRIÇÕES CRÍTICAS:
✗ NUNCA: Perguntas genéricas ("O que é...", "Explique...", "Fale sobre...")
✗ NUNCA: Respostas que se aplicam a múltiplos temas
✓ SEMPRE: Números, percentuais, valores, critérios específicos
✓ SEMPRE: Perguntas que exigem PROFUNDO CONHECIMENTO técnico
✓ SEMPRE: Aplicação prática e contexto específico real
✓ SEMPRE: Respostas precisas, técnicas e verificáveis`;

  const prompt = `${contextBlock}Gere EXATAMENTE ${quantity} flashcards EXTREMAMENTE ESPECÍFICOS para "${theme}" em "${subject}".

PADRÃO RIGOROSO:
1. ESPECIFICIDADE ULTRA-ALTA: Pergunta tão específica que 80% não consegue responder
2. TÉCNICO: Números, valores, percentuais, datas, protocolos, critérios diagnósticos
3. ZERO GENÉRICOS: Proibido "O que é", "Como funciona", "Explique"
4. FOCO PRÁTICO: "Em qual situação...", "Qual é o valor...", "Quando se aplica..."
5. VERIFICÁVEL: Cada resposta pode ser confirmada em fontes técnicas
6. PROFUNDIDADE: Conhecimento especialista, não básico

❌ PÉSSIMO: P: "O que é enzima?" R: "É uma molécula que catalisa reações"
✅ EXCELENTE: P: "Qual é o Km da hexoquinase para glicose?" R: "~0,1 mM, permitindo saturação fisiológica em ~5 mM"

Retorne APENAS um array JSON válido (sem markdown):
[
  {"question": "Pergunta MUITO específica e técnica", "answer": "Resposta com números/critérios exatos"},
  ...
]

Português Brasil. Qualidade técnica acima de tudo.`;

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
