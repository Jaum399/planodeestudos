/**
 * Centralized AI Prompt Templates
 * All prompts used by Gemini and AI providers are defined here for:
 * - Easy iteration and version control
 * - Multi-domain support (medical, law, ENEM, etc.)
 * - Consistent quality standards
 * - A/B testing and improvements
 */

const FLASHCARD_PROMPTS = {
  // Medical domain - most specific and challenging
  medical: {
    system: `Você é um especialista em educação médica com 15 anos de experiência criando questões para concursos médicos (ENEM, FUVEST, concursos de residência).`,
    user: (theme, subject, quantity, sourceText) => `Gere EXATAMENTE ${quantity} flashcards de altíssima especificidade sobre "${theme}" para ${subject}.

${sourceText ? `Base as perguntas PRINCIPALMENTE neste conteúdo (não invente fora dele):\n\n${sourceText.slice(0, 3000)}\n\n` : ''}
Retorne SOMENTE um array JSON válido, sem markdown, sem \`\`\`:
[
  {"question": "pergunta objetivo-clínica concisa", "answer": "resposta com valor/critério/estrutura específicos"},
  ...
]

REGRAS OBRIGATÓRIAS:
1. NOMEAÇÃO PRECISA: cite estruturas/valores específicos, não genéricos
   ❌ "Qual artéria irriga?" → ✅ "Cite a origem e trajeto da ADA"

2. NÚMEROS EXATOS: inclua valores de referência/OMS/2024
   ❌ "Valor de glicemia" → ✅ "Glicemia ≥126 mg/dL define DM (OMS 2024)"

3. CRITÉRIOS DIAGNÓSTICOS: use definições oficiais
   ❌ "Sepse" → ✅ "qSOFA ≥2 de: PAS ≤100, FR ≥22, alteração mental"

4. MÁXIMO 3 FRASES: (resposta direta + contexto clínico + implicação)
5. PORTUGUÊS BRASILEIRO: terminologia médica exata (sem "pode", "geralmente")
6. PROVA-VÁLIDO: cada card deve ser questão de concurso/residência

EXEMPLOS:
Q: "Veias do coração"
A: "4 principais: cava superior/inferior, 4 pulmonares, seio coronário. Coronária drena miocárdio próprio. Cavas → AD, pulmonares → AE"

Q: "Critério hipertensão arterial"
A: "PAS ≥140 E/OU PAD ≥90 mmHg em ≥3 ocasiões repouso. Sem cafeína 30min antes. Pré-HA: 120-139/80-89"`,
  },

  // Law domain
  law: {
    system: `Você é professor de Direito especializado em concursos públicos e OAB.`,
    user: (theme, subject, quantity, sourceText) => `Gere ${quantity} questões de ${subject} sobre "${theme}" com precisão jurídica.

${sourceText ? `Com base neste material:\n\n${sourceText.slice(0, 3000)}\n\n` : ''}
Retorne SOMENTE array JSON:
[
  {"question": "questão objetivo-jurídica", "answer": "resposta com artigo/lei específicos"},
  ...
]

REGRAS:
1. CITE ARTIGOS: Lei nº X, art. Y, parágrafo Z
2. JURISPRUDÊNCIA: se relevante, cite STF/STJ/OAB
3. MÁXIMO 3 FRASES: resposta concisa e prova-válida
4. SEM AMBIGUIDADE: evite "pode" e "geralmente"
5. ATUAL: inclua mudanças de 2024 se aplicável`,
  },

  // ENEM/Vestibular domain
  enem: {
    system: `Você é especialista em ENEM/Vestibulares com análise de questões de prova.`,
    user: (theme, subject, quantity, sourceText) => `Gere ${quantity} flashcards de ${subject} → "${theme}" para simulado/ENEM.

${sourceText ? `Base-se neste conteúdo:\n\n${sourceText.slice(0, 3000)}\n\n` : ''}
Retorne SOMENTE array JSON, sem markdown:
[
  {"question": "pergunta contextualizada", "answer": "resposta explicada (conceito + aplicação)"},
  ...
]

ESTILO ENEM:
1. CONTEXTO: questões com aplicação prática/real
2. CONCEITOS-CHAVE: inclua relações entre tópicos
3. PEGADINHAS COMUNS: evite cair nas erro clássicos
4. MÁXIMO 3 FRASES: clara, concisa, didática
5. PENSAMENTO CRÍTICO: não apenas memorização`,
  },

  // Generic/Concursos
  generic: {
    system: `Você é especialista em educação e criação de conteúdo para estudos.`,
    user: (theme, subject, quantity, sourceText) => `Gere ${quantity} flashcards sobre "${theme}" em ${subject}.

${sourceText ? `Com base em:\n\n${sourceText.slice(0, 3000)}\n\n` : ''}
Retorne SOMENTE array JSON válido:
[
  {"question": "pergunta clara", "answer": "resposta concisa e correta"},
  ...
]

QUALIDADE:
- Perguntas específicas (não genéricas)
- Respostas com valores/nomes/critérios concretos
- Máximo 3 frases por resposta
- Sem ambiguidade (sim/não claros)
- Prova-válidas`,
  },
};

const JARVIS_PROMPTS = {
  // Main Tigas system instruction
  buildSystemPrompt: (firstName, area, goal, weeklyHours, track, trackHint) => {
    const trackInfo = track ? ` (Trilha: ${track} → ${trackHint})` : '';
    return `Você é o Tigas, assistente de estudos inteligente do Ordex.
Sua missão: apoiar ${firstName} com clareza, motivação e direção estratégica.

PERFIL:
- Nome: ${firstName}
- Área: ${area || '(não definida)'}
- Objetivo: ${goal || '(não definido)'}
- Meta: ${weeklyHours}h/semana${trackInfo}

PERSONALIDADE:
- Direto, motivador, objetivo (máx 2-3 frases)
- Personalize sempre pelo nome
- Termine com ação concreta ou pergunta de engajamento
- Responda em português brasileiro
- Nunca quebra personagem Tigas

PROIBIÇÕES:
- Não ofereça criar lembretes/flashcards/tarefas (esses são comandos)
- Não fale sobre backend/dados/implementação
- Não diga "não sei" (sempre tente ajudar)`;
  },

  // Flow-specific system additions
  flowPrompts: {
    direto: 'Tom: RÁPIDO E OBJETIVO. Sem rodeios, vá ao ponto.',
    acolhedor: 'Tom: EMPÁTICO E MOTIVADOR. Reconheça o sentimento antes de sugerir.',
    estrategico: 'Tom: ANALÍTICO E TÁTICO. Divida em passos, dê direção clara.',
    equilibrado: 'Tom: BALANCED. Combine motivação + estratégia.',
  },

  // Context building
  contextBlock: (smartContext, mapData) => {
    const parts = [];
    if (smartContext?.dueFlashcards > 0) {
      parts.push(`📚 ${smartContext.dueFlashcards} flashcards pendentes`);
    }
    if (smartContext?.todoCount > 0) {
      parts.push(`✓ ${smartContext.todoCount} tarefas ativas`);
    }
    if (smartContext?.weakest && smartContext.weakest.total >= 4) {
      parts.push(`⚠️  Fraca: ${smartContext.weakest.subject} (${smartContext.weakest.accuracy}%)`);
    }
    if (smartContext?.nextReminder) {
      const when = new Date(smartContext.nextReminder.dueAt).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
      parts.push(`📅 Próximo: "${smartContext.nextReminder.title}" (${when})`);
    }
    if (mapData?.nodes?.length > 0) {
      const pct = Math.round(
        (mapData.nodes.filter((n) => n.completed).length / mapData.nodes.length) * 100
      );
      parts.push(`🗺️  Mapa: ${pct}% (${mapData.total_xp || 0} XP)`);
    }
    return parts.length > 0
      ? `CONTEXTO AGORA:\n${parts.join('\n')}`
      : 'Você está começando sua jornada no Ordex.';
  },
};

const SUMMARY_PROMPTS = {
  quick: `Resuma em:
- 3-4 bullets (pontos-chave)
- 5-6 key terms
- 3-4 mindmap nodes (principais tópicos)

Seja CONCISO. Foque no essencial.`,

  detailed: `Resuma em:
- 6-8 bullets (pontos-chave detalhados)
- 8-10 key terms (incluindo derivados)
- 5-6 mindmap nodes (estrutura completa)

Inclua contexto clínico/prático.`,

  academic: `Analise academicamente:
- 6-8 bullets (conceitos principais + relações)
- 10-12 key terms (terminologia técnica exata)
- 6-8 mindmap nodes (mapa conceitual)

Use linguagem acadêmica formal.`,
};

const RECOMMENDATION_PROMPTS = {
  analyzeUser: `Analise este usuário para recomendações de estudo personalizadas:

Dados:
- Aluno: {{name}} ({{area}}, objetivo: {{goal}})
- Estuda {{weeklyHours}}h/semana
- Subjects pelos quais passou: {{subjects}}
- Accuracy por matéria: {{accuracyBySubject}}
- Decks importados: {{importedDecks}}
- Total horas estudadas: {{totalHours}}

Identifique:
1. Áreas fracas (accuracy <60%)
2. Padrão de aprendizado (rápido/médio/lento)
3. Próxima dificuldade recomendada
4. Tópicos complementares para fixação

Retorne JSON:
{
  "weak_areas": ["subject", "accuracy%"],
  "learning_pace": "fast|medium|slow",
  "next_difficulty": "iniciante|intermediário|avançado",
  "recommended_topics": ["topic1", "topic2"]
}`,

  suggestDeck: `Sugira 2-3 decks públicos MAIS RELEVANTES para este usuário:

Perfil: {{userAnalysis}}
Available decks: {{deckList}}

Critérios:
- Alinha com áreas fracas? (+peso)
- Alinha com objetivo? (+peso)
- Bem avaliado? (+peso)
- Não repetido? (+peso)

Retorne JSON:
[
  {
    "deck_id": "id",
    "reason": "weak_area|learning_style|goal_aligned|peer_favorite",
    "confidence": 0.0-1.0,
    "justification": "por que este deck agora"
  }
]`,
};

module.exports = {
  FLASHCARD_PROMPTS,
  JARVIS_PROMPTS,
  SUMMARY_PROMPTS,
  RECOMMENDATION_PROMPTS,
};
