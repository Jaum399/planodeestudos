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

  const systemInstruction = `Você é um especialista em criar flashcards para estudo médico de ALTÍSSIMA ESPECIFICIDADE.
Gere respostas NUNCA genéricas: sempre com nomes específicos, números exatos, critérios precisos.
Cada resposta deve ser válida em prova de concurso médico.`;

  const prompt = `${contextBlock}Gere exatamente ${quantity} flashcards de estudo de ALTÍSSIMA ESPECIFICIDADE sobre "${theme}" para a matéria de ${subject}.

Retorne SOMENTE um array JSON válido, sem texto antes ou depois, sem markdown, sem \`\`\`:
[
  {"question": "pergunta objetiva aqui", "answer": "resposta completa e concisa aqui"},
  ...
]

REGRAS DE ESPECIFICIDADE OBRIGATÓRIAS:
1. NOMEAÇÃO EXATA: Lista NOMES ESPECÍFICOS, não genéricos
   ❌ Não: "Quais são as artérias?"
   ✅ Sim: "Qual é a origem da artéria coronária descendente anterior e qual vaso ela origina-se?"

2. NÚMEROS E VALORES CONCRETOS
   ❌ Não: "Qual é o valor normal de glicemia?"
   ✅ Sim: "Qual é o valor de glicemia em jejum que define diabetes mellitus (OMS 2010)? [≥126 mg/dL]"

3. ESTRUTURAS ANATÔMICAS PRECISAS
   ❌ Não: "Quais estruturas compõem o coração?"
   ✅ Sim: "Cite as 4 veias do coração: [Veia cava superior, veia cava inferior, veia coronária, seio coronário]"

4. CRITÉRIOS DIAGNÓSTICOS ESPECÍFICOS
   ❌ Não: "Como diagnosticar sepse?"
   ✅ Sim: "Qual é o critério qSOFA para sepse? [≥2 de: rebaixamento mental, PAS ≤100, FR ≥22]"

5. SEQUÊNCIAS E PASSOS EXATOS
   ❌ Não: "Qual é o processo de coagulação?"
   ✅ Sim: "Cite em ordem os passos da cascata de coagulação (primária → secundária → terciária)"

6. DIFERENÇAS CLÍNICAS PRECISAS
   ❌ Não: "Qual a diferença entre asma e DPOC?"
   ✅ Sim: "Qual é a principal diferença: reversibilidade em asma vs DPOC irreversível, medida por VEF1 pós-broncodilatador"

ESTRUTURA DE RESPOSTA (máximo 3 frases):
Frase 1: Resposta direta com número/nome específico
Frase 2: Contexto clínico OU critério diferencial
Frase 3: Implicação prática OU validação de prova

EXEMPLOS MÉDICOS DE ALTA QUALIDADE:
Q: "Quais são as veias do coração?"
A: "4 veias principais: veia cava superior, veia cava inferior, 4 veias pulmonares e seio coronário. O seio coronário drena o sangue do próprio miocárdio. Memorizar localização: 2 cavas chegam no átrio direito, 4 pulmonares no esquerdo, coronária é própria do ventrículo."

Q: "Qual critério define hipertensão arterial?"
A: "PAS ≥140 mmHg E/OU PAD ≥90 mmHg em ≥3 ocasiões em consultório (ou média de MAPA). Pré-hipertensão é 120-139/80-89. Importante: medição em repouso 5 min, sem cafeína 30 min antes."

Q: "Cite os critérios de SIRS (resposta inflamatória sistêmica)"
A: "4 critérios (≥2 presentes): Temp >38°C ou <36°C, FC >90, RR >20 ou PaCO2 <32, Leucócitos >11000 ou <4000. SIRS + infecção = sepse. SIRS isolado pode ter origem não-infecciosa (queimadura, cirurgia)."

- Use português brasileiro com terminologia médica EXATA
- PROÍBIDO usar expressões vagas: "pode", "geralmente", "muitas vezes", "frequentemente"
- Priorize: NOMES, NÚMEROS, CRITÉRIOS, EVIDÊNCIAS
- Cada resposta deve ser válida em prova de concurso médico`;

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
