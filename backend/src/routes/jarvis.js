const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');
const { enqueueReminderNotifications, processDueNotificationJobs } = require('../services/reminderNotifications');

const router = express.Router();
router.use(authenticate, requireAccess);

const VOICE_MODELS = {
  tigas_core: 'tigas_core',
  manus_ia: 'manus_ia',
  manus_ia_pro: 'manus_ia_pro',
  aios: 'aios',
  aios_coach: 'aios_coach',
};

const VOICE_FEEDBACK_TYPES = {
  interrupted: 'interrupted',
  repeated_command: 'repeated_command',
  toggled_off: 'toggled_off',
};

const VOICE_PRESETS = {
  adaptive: 'adaptive',
  calm: 'calm',
  objective: 'objective',
  energetic: 'energetic',
};

function resolveVoiceModel(value) {
  if (!value) return VOICE_MODELS.tigas_core;
  const normalized = String(value).toLowerCase().trim();
  if (normalized === VOICE_MODELS.manus_ia_pro) return VOICE_MODELS.manus_ia_pro;
  if (normalized === VOICE_MODELS.aios_coach) return VOICE_MODELS.aios_coach;
  if (normalized === VOICE_MODELS.manus_ia) return VOICE_MODELS.manus_ia;
  if (normalized === VOICE_MODELS.aios) return VOICE_MODELS.aios;
  return VOICE_MODELS.tigas_core;
}

function resolveVoicePreset(value) {
  const normalized = String(value || '').toLowerCase().trim();
  if (normalized === VOICE_PRESETS.calm) return VOICE_PRESETS.calm;
  if (normalized === VOICE_PRESETS.objective) return VOICE_PRESETS.objective;
  if (normalized === VOICE_PRESETS.energetic) return VOICE_PRESETS.energetic;
  return VOICE_PRESETS.adaptive;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toDateKey(isoDate = new Date().toISOString()) {
  return String(isoDate).slice(0, 10);
}

function resolveVoiceFeedbackType(value) {
  const normalized = String(value || '').toLowerCase().trim();
  if (normalized === VOICE_FEEDBACK_TYPES.interrupted) return VOICE_FEEDBACK_TYPES.interrupted;
  if (normalized === VOICE_FEEDBACK_TYPES.repeated_command) return VOICE_FEEDBACK_TYPES.repeated_command;
  if (normalized === VOICE_FEEDBACK_TYPES.toggled_off) return VOICE_FEEDBACK_TYPES.toggled_off;
  return null;
}

function normalizeVoiceAdaptation(existing) {
  const source = existing || {};
  return {
    interruption_count: Number(source.interruption_count || 0),
    repeated_command_count: Number(source.repeated_command_count || 0),
    toggled_off_count: Number(source.toggled_off_count || 0),
    daily_feedback: Array.isArray(source.daily_feedback) ? source.daily_feedback.slice(-30) : [],
    adaptive_offsets: {
      rate: Number(source?.adaptive_offsets?.rate || 0),
      pitch: Number(source?.adaptive_offsets?.pitch || 0),
    },
    last_feedback_at: source.last_feedback_at || null,
  };
}

function recalculateVoiceOffsets(voiceAdaptation) {
  const recent = (voiceAdaptation.daily_feedback || []).slice(-7);
  const totals = recent.reduce(
    (acc, item) => {
      acc.interrupted += Number(item.interrupted || 0);
      acc.repeated += Number(item.repeated_command || 0);
      acc.toggledOff += Number(item.toggled_off || 0);
      return acc;
    },
    { interrupted: 0, repeated: 0, toggledOff: 0 }
  );

  const rawRate = -0.01 * totals.interrupted - 0.015 * totals.repeated - 0.006 * totals.toggledOff;
  const rawPitch = -0.006 * totals.interrupted - 0.01 * totals.repeated - 0.004 * totals.toggledOff;

  return {
    rate: clamp(rawRate, -0.12, 0.06),
    pitch: clamp(rawPitch, -0.12, 0.06),
  };
}

function applyVoiceFeedback(studyStyle, feedbackType, timestamp) {
  const safeStudyStyle = studyStyle || {};
  const safeVoiceAdaptation = normalizeVoiceAdaptation(safeStudyStyle.voice_adaptation);

  if (feedbackType === VOICE_FEEDBACK_TYPES.interrupted) {
    safeVoiceAdaptation.interruption_count += 1;
  } else if (feedbackType === VOICE_FEEDBACK_TYPES.repeated_command) {
    safeVoiceAdaptation.repeated_command_count += 1;
  } else if (feedbackType === VOICE_FEEDBACK_TYPES.toggled_off) {
    safeVoiceAdaptation.toggled_off_count += 1;
  }

  const key = toDateKey(timestamp);
  const idx = safeVoiceAdaptation.daily_feedback.findIndex((entry) => entry.date === key);
  if (idx === -1) {
    safeVoiceAdaptation.daily_feedback.push({
      date: key,
      interrupted: feedbackType === VOICE_FEEDBACK_TYPES.interrupted ? 1 : 0,
      repeated_command: feedbackType === VOICE_FEEDBACK_TYPES.repeated_command ? 1 : 0,
      toggled_off: feedbackType === VOICE_FEEDBACK_TYPES.toggled_off ? 1 : 0,
    });
  } else {
    const current = safeVoiceAdaptation.daily_feedback[idx];
    safeVoiceAdaptation.daily_feedback[idx] = {
      ...current,
      interrupted: Number(current.interrupted || 0) + (feedbackType === VOICE_FEEDBACK_TYPES.interrupted ? 1 : 0),
      repeated_command: Number(current.repeated_command || 0) + (feedbackType === VOICE_FEEDBACK_TYPES.repeated_command ? 1 : 0),
      toggled_off: Number(current.toggled_off || 0) + (feedbackType === VOICE_FEEDBACK_TYPES.toggled_off ? 1 : 0),
    };
  }

  safeVoiceAdaptation.daily_feedback = safeVoiceAdaptation.daily_feedback.slice(-30);
  safeVoiceAdaptation.last_feedback_at = timestamp;
  safeVoiceAdaptation.adaptive_offsets = recalculateVoiceOffsets(safeVoiceAdaptation);

  return {
    ...safeStudyStyle,
    voice_adaptation: safeVoiceAdaptation,
  };
}

function detectObjectiveTrack(user) {
  const text = `${user?.goal || ''} ${user?.area || ''}`.toLowerCase();
  if (/enem|vestibular/.test(text)) return 'enem';
  if (/concurso|público|publico|edital|prova objetiva/.test(text)) return 'concurso';
  if (/faculdade|gradua|universidade|tcc/.test(text)) return 'faculdade';
  return 'geral';
}

function objectiveHint(track) {
  if (track === 'enem') return 'priorize simulados, revisão ativa e redação semanal.';
  if (track === 'concurso') return 'foco em lei seca, questões da banca e revisão de erros.';
  if (track === 'faculdade') return 'combine teoria, exercícios e entregas da disciplina em sprints.';
  return 'mantenha constância e ciclos curtos de estudo com revisão espaçada.';
}

// ── NLP / Intent Detection ────────────────────────────────────────────────────

const INTENTS = [
  { name: 'greeting',     pattern: /\b(oi|olá|ola|hello|bom dia|boa tarde|boa noite|ei|hey)\b/i },
  { name: 'reminder_set', pattern: /\b(lembrar|lembrete|avis[ae]|agenda|marcar|não esquecer|nao esquecer)\b/i },
  { name: 'reminder_list',pattern: /\b(meus lembretes|ver lembretes|listar lembretes|quais lembretes)\b/i },
  { name: 'progress',     pattern: /\b(progresso|desempenho|resultado|como (estou|fui)|minha evolução|meu desempenho)\b/i },
  { name: 'motivation',   pattern: /\b(motivação|desanimado|cansado|difícil|não consigo|desistir|tenho medo|estressado)\b/i },
  { name: 'study_tip',    pattern: /\b(dica|conselho|como estudar|técnica|método|pomodoro|revisão|flashcard|memorizar)\b/i },
  { name: 'schedule',     pattern: /\b(cronograma|horário|planejar|organizar|semana|quando estudar)\b/i },
  { name: 'challenge',    pattern: /\b(desafio|missão|tarefa|exercício|praticar|testar)\b/i },
  { name: 'identity',     pattern: /\b(quem é você|o que você faz|seu nome|você é|como funciona)\b/i },
  { name: 'mindmap_progress', pattern: /\b(meu mapa|mapa mental|mapa de estudo|progresso.{0,20}mapa|mapa.{0,20}progresso|minhas conquistas|meu xp|total.*xp)\b/i },
  { name: 'mindmap_complete', pattern: /\b(completei|terminei (de )?(estudar|ler|revisar|ver|aprender)|aprendi|j[aá] (sei|aprendi|estudei|vi)|conclui|conclu[ií]|finalizei)\b/i },
  { name: 'mindmap_suggest', pattern: /\b(o que (devo|posso|vou) estudar|pr[oó]ximo (passo|t[oó]pico|tema|assunto)|me sugira|por (onde|aonde) (come[cç]o|come[cç]ar)|o que fazer agora)\b/i },
];

function detectIntent(text) {
  for (const { name, pattern } of INTENTS) {
    if (pattern.test(text)) return name;
  }
  return 'general';
}

function extractReminderText(text) {
  // Remove trigger words and extract the actual reminder content
  return text
    .replace(/\b(me lembra|me lembre|lembrar|lembrete de|avisame|avisa me|agenda|marcar)\b/gi, '')
    .replace(/\bamanhã\b/gi, 'amanhã')
    .trim()
    .replace(/^(de|para|sobre|que|a)\s+/i, '')
    .trim();
}

function parseDueDate(text) {
  const lower = text.toLowerCase();
  const now = new Date();

  if (/amanhã/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }
  if (/hoje/.test(lower)) {
    const d = new Date(now); d.setHours(20, 0, 0, 0);
    return d.toISOString();
  }
  if (/segunda/.test(lower)) return nextWeekday(1).toISOString();
  if (/terça/.test(lower))   return nextWeekday(2).toISOString();
  if (/quarta/.test(lower))  return nextWeekday(3).toISOString();
  if (/quinta/.test(lower))  return nextWeekday(4).toISOString();
  if (/sexta/.test(lower))   return nextWeekday(5).toISOString();

  // Default: 1 hour from now
  return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
}

function nextWeekday(targetDay) {
  const now = new Date();
  const day = now.getDay();
  const diff = (targetDay - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  next.setHours(9, 0, 0, 0);
  return next;
}

function getNeedFlow(text, history = []) {
  const source = [text, ...history.slice(-6).map((h) => h.content || '')].join(' ').toLowerCase();
  const urgent = /(prova|amanh|urgente|atrasad|nao vou dar conta|nao consigo)/i.test(source);
  const emotional = /(cansad|desanimad|ansios|estress|medo|travado|desistir)/i.test(source);
  const tactical = /(cronograma|plano|passo a passo|organizar|metodo|como fazer)/i.test(source);

  if (urgent) return 'direto';
  if (emotional) return 'acolhedor';
  if (tactical) return 'estrategico';
  return 'equilibrado';
}

// ── Mindmap-aware helpers ──────────────────────────────────────────────────────

function generateMapProgressReport(mapData, user, flow) {
  const firstName = user.name.split(' ')[0];
  const openers = {
    direto: `${firstName}, aqui:`,
    acolhedor: `${firstName}, seu progresso:`,
    estrategico: `${firstName}, análise do mapa:`,
    equilibrado: `${firstName}, seu mapa:`,
  };
  if (!mapData) {
    return `${openers[flow]} você ainda não tem um Mapa Mental. Acesse a aba Mapa Mental para gerar seu roteiro personalizado.`;
  }
  const completed = mapData.nodes.filter(n => n.completed).length;
  const total = mapData.nodes.length;
  const pct = Math.round((completed / total) * 100);
  const nextNodes = mapData.nodes.filter(n => n.unlocked && !n.completed && n.type !== 'root').slice(0, 3);
  const activeChallenges = (mapData.challenges || []).filter(c => c.status === 'accepted');
  let msg = `${openers[flow]} você concluiu ${completed} de ${total} nós (${pct}%) com ${mapData.total_xp || 0} XP acumulados.`;
  if (nextNodes.length > 0) msg += ` Próximos disponíveis: ${nextNodes.map(n => `"${n.label}"`).join(', ')}.`;
  if (activeChallenges.length > 0) msg += ` Você tem ${activeChallenges.length} desafio(s) ativo(s) — bora!`;
  return msg;
}

function generateMapSuggestion(mapData, user, flow) {
  const firstName = user.name.split(' ')[0];
  const openers = {
    direto: `${firstName}, foco em:`,
    acolhedor: `${firstName}, sugiro começar por:`,
    estrategico: `${firstName}, rota de estudo:`,
    equilibrado: `${firstName}, próximo passo:`,
  };
  if (!mapData) {
    return `${openers[flow]} crie seu Mapa Mental primeiro — assim traço o caminho ideal para você.`;
  }
  const nextNodes = mapData.nodes.filter(n => n.unlocked && !n.completed && n.type !== 'root').slice(0, 3);
  if (nextNodes.length === 0) {
    return `${openers[flow]} você completou todos os tópicos disponíveis! Acesse o Mapa Mental para desbloquear novos.`;
  }
  const primary = nextNodes[0];
  const others = nextNodes.slice(1).map(n => `"${n.label}"`).join(' ou ');
  let msg = `${openers[flow]} "${primary.label}" — ${primary.type === 'leaf' ? '45 min de estudo focado resolvem' : 'separe 2 a 3 sessões de 45 min'}.`;
  if (others) msg += ` Depois: ${others}.`;
  msg += ` Quer que eu monte um plano de revisão?`;
  return msg;
}

async function tryCompleteMindmapTopic(userId, text, mapData, mindmapsCol) {
  if (!mapData) {
    return {
      reply: 'Você ainda não tem um Mapa Mental. Acesse a aba Mapa Mental e depois me conte o que completou!',
      sideEffect: null,
    };
  }
  const textLower = text.toLowerCase();
  const candidates = mapData.nodes.filter(n => n.unlocked && !n.completed && n.type !== 'root');
  const matched = candidates.find(n => {
    const lbl = n.label.toLowerCase();
    const subj = n.subject.toLowerCase();
    return textLower.includes(lbl) || lbl.split(' ').filter(w => w.length > 3).some(w => textLower.includes(w)) ||
           textLower.includes(subj) || subj.split(' ').filter(w => w.length > 3).some(w => textLower.includes(w));
  });
  if (!matched) {
    const detectedTopics = extractTopics(text, null);
    if (detectedTopics.length > 0) {
      const topicLabel = detectedTopics[0];
      const branches = mapData.nodes.filter(n => n.type === 'branch');
      const targetBranch = branches.find(b => !b.completed && b.unlocked) || branches[0];
      if (targetBranch) {
        const leaves = mapData.nodes.filter(n => n.parent_id === targetBranch.id);
        const newLeaf = {
          id: uuidv4(),
          label: topicLabel.charAt(0).toUpperCase() + topicLabel.slice(1),
          subject: topicLabel,
          level: 2,
          x: targetBranch.x - 30 + leaves.length * 90,
          y: 450,
          type: 'leaf',
          completed: true,
          unlocked: true,
          parent_id: targetBranch.id,
        };
        mapData.nodes.push(newLeaf);
        mapData.edges.push({ from: targetBranch.id, to: newLeaf.id });
        mapData.total_xp = (mapData.total_xp || 0) + 30;
        mapData.updated_at = new Date().toISOString();
        await mindmapsCol.findOneAndUpdate(
          { _id: userId },
          { $set: { nodes: mapData.nodes, edges: mapData.edges, total_xp: mapData.total_xp, updated_at: mapData.updated_at } }
        );
        return {
          reply: `Ótimo! Adicionei "${newLeaf.label}" ao seu Mapa Mental como tópico concluído. +30 XP! Continue assim.`,
          sideEffect: { type: 'mindmap_updated', event: 'topic_added', node: newLeaf, xp_gained: 30, map: mapData },
        };
      }
    }
    return {
      reply: 'Ótimo que você está estudando! Me diga o nome exato do tópico para eu marcar no seu Mapa Mental.',
      sideEffect: null,
    };
  }
  matched.completed = true;
  mapData.nodes.forEach(n => { if (n.parent_id === matched.id) n.unlocked = true; });
  if (matched.type === 'branch') {
    const branches = mapData.nodes.filter(n => n.type === 'branch');
    const nextBranch = branches.find(n => !n.completed && !n.unlocked);
    if (nextBranch) nextBranch.unlocked = true;
  }
  const xpGain = matched.type === 'leaf' ? 30 : 80;
  mapData.total_xp = (mapData.total_xp || 0) + xpGain;
  mapData.updated_at = new Date().toISOString();
  await mindmapsCol.findOneAndUpdate(
    { _id: userId },
    { $set: { nodes: mapData.nodes, total_xp: mapData.total_xp, updated_at: mapData.updated_at } }
  );
  const nextUnlocked = mapData.nodes.filter(n => n.unlocked && !n.completed && n.type !== 'root').slice(0, 2);
  const nextStr = nextUnlocked.length > 0 ? ` Próximo: ${nextUnlocked.map(n => `"${n.label}"`).join(' ou ')}.` : '';
  return {
    reply: `Incrível! "${matched.label}" concluído no Mapa Mental. +${xpGain} XP!${nextStr}`,
    sideEffect: { type: 'mindmap_updated', event: 'node_completed', node: matched, xp_gained: xpGain, map: mapData },
  };
}

// ── Response Generation ───────────────────────────────────────────────────────

function buildResponse(intent, text, user, jarvisData, mapData, voiceModel) {
  const firstName = user.name.split(' ')[0];
  const topics = jarvisData?.known_topics || [];
  const flow = getNeedFlow(text, jarvisData?.history || []);
  const nextMapNodes = mapData?.nodes?.filter(n => n.unlocked && !n.completed && n.type !== 'root').slice(0, 2) || [];
  const model = resolveVoiceModel(voiceModel || jarvisData?.study_style?.voiceModel);

  const modelPrefix = {
    [VOICE_MODELS.tigas_core]: '',
    [VOICE_MODELS.manus_ia]: 'Modo Manus IA: ',
    [VOICE_MODELS.manus_ia_pro]: 'Modo Manus IA Pro: ',
    [VOICE_MODELS.aios]: 'Modo AIOS: ',
    [VOICE_MODELS.aios_coach]: 'Modo AIOS Coach: ',
  };
  const track = detectObjectiveTrack(user);
  const trackHint = objectiveHint(track);

  const openers = {
    direto: `${firstName}, vamos direto ao ponto:`,
    acolhedor: `${firstName}, estou com voce:`,
    estrategico: `${firstName}, estrategia objetiva:`,
    equilibrado: `${firstName}, bora evoluir com consistencia:`,
  };

  const responses = {
    greeting: [
      `Ola, ${firstName}! Aqui e o Tigas. Estou pronto para ajudar seus estudos. O que precisa hoje?`,
      `Bom ver você, ${firstName}! Posso ajudar com lembretes, dicas de estudo ou seu progresso.`,
      `Oi, ${firstName}! Tigas online. Qual e o plano para hoje?`,
    ],
    motivation: [
      `${openers[flow]} cada hora de estudo hoje e um investimento que rende por anos. Voce esta no caminho certo.`,
      `${openers[flow]} se esta dificil, vamos em blocos curtos: 25 min focado, 5 min de pausa, 4 ciclos.`,
      `${openers[flow]} os melhores resultados vem de dias dificeis superados. Me diga o bloqueio e te passo uma rota.`,
    ],
    study_tip: [
      `${openers[flow]} explique o assunto em voz alta como se estivesse ensinando. Onde travar, voce revisa.`,
      `${openers[flow]} use tecnica Feynman: explique com palavras simples. Se nao conseguir, volte um nivel.`,
      `${openers[flow]} revisao espacada rende mais: hoje, amanha, 3, 7 e 14 dias.`,
      `${openers[flow]} intercale materias em blocos curtos para aumentar retencao e foco.`,
    ],
    schedule: [
      `${openers[flow]} ${user.area ? `na area de ${user.area},` : ''} foque assuntos dificeis pela manha e revisoes no fim do dia.`,
      `${openers[flow]} distribua ${user.weekly_goal_hours || 20}h por semana em blocos de 90 a 120 minutos com pausas curtas.`,
    ],
    progress: [
      mapData && mapData.nodes && mapData.nodes.length > 0
        ? `${openers[flow]} você está em ${Math.round((mapData.nodes.filter(n => n.completed).length / mapData.nodes.length) * 100)}% do Mapa Mental (${mapData.total_xp || 0} XP). ${nextMapNodes.length > 0 ? `Próximos: ${nextMapNodes.map(n => `"${n.label}"`).join(' e ')}.` : 'Continue desbloqueando!'}`
        : `${openers[flow]} veja seu progresso na aba Analises. Posso montar um plano para melhorar ${topics.length ? topics.slice(-2).join(' e ') : 'os pontos fracos'} esta semana.`,
    ],
    challenge: [
      nextMapNodes.length > 0
        ? `${openers[flow]} desafio atual: "${nextMapNodes[0].label}". Monte 3 sessões de 45 min com revisão ativa. Ao concluir, me diga "completei ${nextMapNodes[0].label}" para eu marcar no seu mapa!`
        : `${openers[flow]} acesse o Mapa Mental para desafios personalizados com base no seu progresso.`,
    ],
    identity: [
      `Sou o Tigas, seu assistente de estudos por voz e texto. Eu adapto a conversa ao seu momento: foco, motivacao, estrategia ou execucao imediata.`,
    ],
    general: [
      `${openers[flow]} posso ajudar com lembretes, dicas de estudo, progresso e desafios. O que voce quer agora?`,
      `${openers[flow]} se quiser, descreva sua meta de hoje em uma frase e eu te entrego o proximo passo.`,
    ],
  };

  const pool = responses[intent] || responses.general;
  const base = pool[Math.floor(Math.random() * pool.length)];

  if (model === VOICE_MODELS.manus_ia) {
    return `${modelPrefix[model]}${base} Responda com uma acao imediata sua em 1 frase e eu refinarei o plano.`;
  }
  if (model === VOICE_MODELS.manus_ia_pro) {
    return `${modelPrefix[model]}${base} Contexto do seu objetivo: ${trackHint} Me diga seu tempo disponivel hoje e eu te devolvo um plano em 3 blocos.`;
  }
  if (model === VOICE_MODELS.aios) {
    return `${modelPrefix[model]}${base} Estruture sua execucao em: objetivo, tempo e validacao.`;
  }
  if (model === VOICE_MODELS.aios_coach) {
    return `${modelPrefix[model]}${base} Framework coach: objetivo claro, tarefa de 25min, criterio de conclusao e revisao final de 5min. Track atual: ${track}.`;
  }
  return `${modelPrefix[model]}${base}`;
}

// ── Atualizar tópicos aprendidos ───────────────────────────────────────────────
function extractTopics(text, userArea) {
  const subjects = [
    'matemática', 'física', 'química', 'biologia', 'história', 'geografia',
    'português', 'inglês', 'literatura', 'direito', 'medicina', 'engenharia',
    'administração', 'contabilidade', 'programação', 'computação', 'filosofia',
    'sociologia', 'economia', 'psicologia', 'nutrição', 'farmácia', 'enfermagem',
  ];
  const found = subjects.filter(s => text.toLowerCase().includes(s));
  if (userArea && !found.includes(userArea.toLowerCase())) {
    const areaLower = userArea.toLowerCase();
    if (subjects.some(s => areaLower.includes(s))) found.push(areaLower);
  }
  return found;
}

// ── Néctar Mode: Multi-Action Extraction ────────────────────────────────────────

const NECTAR_MATCHERS = [
  {
    type: 'task',
    re: /\b(preciso\s+(?:estudar|fazer|revisar?|rever|ler|completar|terminar)\s+|tenho\s+que\s+(?:estudar|fazer|revisar?|rever|ler)\s+|vou\s+(?:estudar|criar|fazer|revisar?)\s+|quero\s+(?:estudar|criar|fazer|revisar?)\s+|devo\s+(?:estudar|fazer|revisar?|rever)\s+)([^.,;!?\n]{3,60})/gi,
    extract: (m) => ({ label: cleanNectarLabel(m[2]), due: parseDueDate(m[2]) }),
  },
  {
    type: 'reminder',
    re: /\b(me\s+lembr[ae](?:\s+de)?\s+|lembrete\s+(?:de|para|sobre)?\s+|n[aã]o\s+me\s+deixa?\s+esquecer\s*(?:\s+de)?\s+|avisa?[-\s]me?\s*(?:de|sobre)?\s*)([^.,;!?\n]{3,60})/gi,
    extract: (m) => ({ label: cleanNectarLabel(m[2]), due: parseDueDate(m[2]) }),
  },
  {
    type: 'completion',
    re: /\b(completei\s+|terminei\s+(?:de\s+)?(?:estudar|ler|revisar|ver|aprender\s+)?|aprendi\s+|conclui\s+|finalizei\s+|j[aá]\s+(?:estudei|revisei|li|vi|sei)\s+)([^.,;!?\n]{3,40})/gi,
    extract: (m) => ({ label: cleanNectarLabel(m[2]) }),
  },
  {
    type: 'flashcard',
    re: /\b(?:(?:quero|preciso|vou)\s+)?(?:criar?|fazer?|gerar?|montar?)\s+(\d+\s+)?flashcards?\s+(?:de|para|sobre|d[ao]\s+)?([^.,;!?\n]{3,40})/gi,
    extract: (m) => ({ label: cleanNectarLabel(m[2]), quantity: m[1] ? parseInt(m[1].trim(), 10) : null }),
  },
];

function cleanNectarLabel(str) {
  return str
    .replace(/\s+(at[eé]|para|em|no\s+dia|na|no)\s+\S+.*$/i, '')
    .replace(/\s+(segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|hoje|amanh[aã]|semana\s+que\s+vem)\b.*/i, '')
    .trim();
}

function extractAllActions(text) {
  const actions = [];
  const seen = new Set();
  for (const { type, re, extract } of NECTAR_MATCHERS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const extras = extract(m);
      if (!extras.label || extras.label.length < 3) continue;
      const key = `${type}:${extras.label.substring(0, 20).toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      actions.push({ type, ...extras });
    }
  }
  return actions;
}

function extractFirstSubject(text) {
  const SUBJECTS = [
    'matemática','matematica','física','fisica','química','quimica','biologia',
    'história','historia','geografia','português','portugues','inglês','ingles',
    'literatura','direito','medicina','engenharia','farmácia','farmacia',
    'administração','administracao','contabilidade','programação','programacao',
    'computação','computacao','filosofia','sociologia','economia','psicologia',
    'nutrição','nutricao','enfermagem','cirurgia','cardiologia','pediatria',
    'anatomia','fisiologia','microbiologia','patologia','neurologia','ortopedia',
    'ginecologia','obstetrícia','obstetricia','dermatologia','oftalmologia',
    'urologia','pneumologia','endocrinologia','reumatologia','hematologia',
    'gastroenterologia','nefrologia','infectologia',
  ];
  const lower = text.toLowerCase();
  for (const s of SUBJECTS) {
    if (lower.includes(s)) return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return null;
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function executeNectarActions(actions, userId, user, data, mapData, jarvisCol, plannerCol, mindmapsCol, now) {
  const executed = [];
  let currentData = data; // track if we created a jarvis doc mid-loop
  for (const action of actions) {
    try {
      if (action.type === 'task') {
        const subject = extractFirstSubject(action.label) || user.area || 'Estudo';
        const task = new plannerCol({
          _id: uuidv4(),
          user_id: userId,
          title: capitalizeFirst(action.label),
          subject: capitalizeFirst(subject),
          status: 'todo',
          difficulty: 5,
          notes: 'Criado pelo Tigas — Modo Visão',
          next_review: action.due || null,
          created_at: now,
          updated_at: now,
        });
        await task.save();
        executed.push({ ...action, created: true, id: task._id });

      } else if (action.type === 'flashcard') {
        const subject = extractFirstSubject(action.label) || user.area || 'Estudo';
        const qty = action.quantity ? `${action.quantity} ` : '';
        const task = new plannerCol({
          _id: uuidv4(),
          user_id: userId,
          title: `Criar ${qty}flashcards de ${capitalizeFirst(action.label)}`,
          subject: capitalizeFirst(subject),
          status: 'todo',
          difficulty: 3,
          notes: 'Criado pelo Tigas — Modo Visão',
          next_review: null,
          created_at: now,
          updated_at: now,
        });
        await task.save();
        executed.push({ ...action, created: true, id: task._id });

      } else if (action.type === 'reminder') {
        const reminder = {
          id: uuidv4(),
          text: capitalizeFirst(action.label),
          due_at: action.due || new Date(Date.now() + 3600000).toISOString(),
          done: false,
          created_at: now,
        };
        if (currentData) {
          await jarvisCol.findOneAndUpdate(
            { _id: userId },
            { $push: { reminders: reminder }, $set: { updated_at: now } }
          );
        } else {
          await jarvisCol.create({
            _id: userId, known_topics: [], weak_areas: [], reminders: [reminder],
            history: [], study_style: {}, updated_at: now,
          });
          currentData = { reminders: [reminder] };
        }
        await enqueueReminderNotifications(user, reminder, 'nectar_mode');
        processDueNotificationJobs({ limit: 5 }).catch((error) => {
          console.error('[Notifications] processamento imediato falhou:', error);
        });
        executed.push({ ...action, created: true, reminder });

      } else if (action.type === 'completion') {
        const result = await tryCompleteMindmapTopic(userId, action.label, mapData, mindmapsCol);
        if (result.sideEffect?.map) mapData = result.sideEffect.map;
        executed.push({ ...action, created: result.sideEffect !== null, sideEffect: result.sideEffect });
      }
    } catch (e) {
      console.error(`Néctar action error (${action.type}):`, e);
      executed.push({ ...action, created: false });
    }
  }
  return executed;
}

// ── GET /api/jarvis/state ──────────────────────────────────────────────────────
router.get('/state', async (req, res) => {
  try {
    const { jarvis } = getDatabase();
    let data = await jarvis.findOne({ _id: req.user.id });
    if (!data) {
      data = { known_topics: [], weak_areas: [], reminders: [], history: [], study_style: {} };
    }
    const pendingReminders = (data.reminders || []).filter(r => !r.done);
    res.json({
      known_topics: data.known_topics || [],
      reminders: pendingReminders,
      history: (data.history || []).slice(-20),
      voiceModel: resolveVoiceModel(data?.study_style?.voiceModel),
      voicePreset: resolveVoicePreset(data?.study_style?.voicePreset),
      voiceAdaptation: normalizeVoiceAdaptation(data?.study_style?.voice_adaptation),
    });
  } catch (err) {
    console.error('Jarvis state error:', err);
    res.status(500).json({ error: 'Erro ao carregar o Tigas' });
  }
});

// ── POST /api/jarvis/voice-profile ───────────────────────────────────────────
router.post('/voice-profile', async (req, res) => {
  try {
    const voicePreset = resolveVoicePreset(req.body?.voicePreset);
    const { jarvis } = getDatabase();
    const now = new Date().toISOString();
    const data = await jarvis.findOne({ _id: req.user.id });

    const nextStudyStyle = {
      ...(data?.study_style || {}),
      voicePreset,
    };

    if (data) {
      await jarvis.findOneAndUpdate(
        { _id: req.user.id },
        { $set: { study_style: nextStudyStyle, updated_at: now } }
      );
    } else {
      await jarvis.create({
        _id: req.user.id,
        known_topics: [],
        weak_areas: [],
        reminders: [],
        history: [],
        study_style: nextStudyStyle,
        updated_at: now,
      });
    }

    return res.json({ ok: true, voicePreset });
  } catch (err) {
    console.error('Jarvis voice profile error:', err);
    return res.status(500).json({ error: 'Erro ao salvar preset de voz' });
  }
});

// ── POST /api/jarvis/voice-feedback ───────────────────────────────────────────
router.post('/voice-feedback', async (req, res) => {
  try {
    const feedbackType = resolveVoiceFeedbackType(req.body?.feedbackType);
    if (!feedbackType) {
      return res.status(400).json({ error: 'feedbackType inválido' });
    }

    const { jarvis } = getDatabase();
    const now = new Date().toISOString();
    const data = await jarvis.findOne({ _id: req.user.id });

    const nextStudyStyle = applyVoiceFeedback(data?.study_style || {}, feedbackType, now);

    if (data) {
      await jarvis.findOneAndUpdate(
        { _id: req.user.id },
        { $set: { study_style: nextStudyStyle, updated_at: now } }
      );
    } else {
      await jarvis.create({
        _id: req.user.id,
        known_topics: [],
        weak_areas: [],
        reminders: [],
        history: [],
        study_style: nextStudyStyle,
        updated_at: now,
      });
    }

    return res.json({ ok: true, voiceAdaptation: normalizeVoiceAdaptation(nextStudyStyle.voice_adaptation) });
  } catch (err) {
    console.error('Jarvis voice feedback error:', err);
    return res.status(500).json({ error: 'Erro ao salvar feedback de voz' });
  }
});

// ── POST /api/jarvis/voice-feedback/reset ─────────────────────────────────────
router.post('/voice-feedback/reset', async (req, res) => {
  try {
    const { jarvis } = getDatabase();
    const now = new Date().toISOString();
    const data = await jarvis.findOne({ _id: req.user.id });

    const nextStudyStyle = {
      ...(data?.study_style || {}),
      voice_adaptation: normalizeVoiceAdaptation(),
    };

    if (data) {
      await jarvis.findOneAndUpdate(
        { _id: req.user.id },
        { $set: { study_style: nextStudyStyle, updated_at: now } }
      );
    } else {
      await jarvis.create({
        _id: req.user.id,
        known_topics: [],
        weak_areas: [],
        reminders: [],
        history: [],
        study_style: nextStudyStyle,
        updated_at: now,
      });
    }

    return res.json({ ok: true, voiceAdaptation: normalizeVoiceAdaptation(nextStudyStyle.voice_adaptation) });
  } catch (err) {
    console.error('Jarvis voice reset error:', err);
    return res.status(500).json({ error: 'Erro ao resetar adaptação de voz' });
  }
});

// ── POST /api/jarvis/chat ──────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message, voiceModel, nectarMode } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Mensagem inválida' });
    }
    const text = message.trim().substring(0, 500); // limit input
    const selectedVoiceModel = resolveVoiceModel(voiceModel);

    const { jarvis, mindmaps } = getDatabase();
    const now = new Date().toISOString();
    let data = await jarvis.findOne({ _id: req.user.id });
    let mapData = await mindmaps.findOne({ _id: req.user.id });

    // ── Modo Visão (Néctar-style multi-intent) ──────────────────────────────────
    if (nectarMode === true) {
      const rawActions = extractAllActions(text);
      if (rawActions.length > 0) {
        const { planner: plannerCol } = getDatabase();
        const executedActions = await executeNectarActions(
          rawActions, req.user.id, req.user, data, mapData, jarvis, plannerCol, mindmaps, now
        );
        const firstName = req.user.name.split(' ')[0];
        const cnt = (type) => executedActions.filter(a => a.created && a.type === type).length;
        const parts = [];
        const taskTotal = cnt('task') + cnt('flashcard');
        if (taskTotal > 0) parts.push(`${taskTotal} ${taskTotal === 1 ? 'tarefa' : 'tarefas'} no Planner`);
        if (cnt('reminder') > 0) parts.push(`${cnt('reminder')} ${cnt('reminder') === 1 ? 'lembrete' : 'lembretes'}`);
        if (cnt('completion') > 0) parts.push(`${cnt('completion')} ${cnt('completion') === 1 ? 'tópico concluído' : 'tópicos concluídos'} no Mapa`);
        const replyText = parts.length > 0
          ? `Feito, ${firstName}! Organizei: ${parts.join(', ')}.`
          : `${firstName}, entendido! Descreva o que precisa estudar, lembretes ou o que concluiu e eu organizo tudo automaticamente.`;
        const newReminders = executedActions
          .filter(a => a.type === 'reminder' && a.reminder)
          .map(a => a.reminder);
        const sideEffectData = { type: 'nectar_actions', actions: executedActions, reminders: newReminders };
        const histEntry = [
          { role: 'user', content: text, timestamp: now },
          { role: 'jarvis', content: replyText, timestamp: now },
        ];
        if (data) {
          await jarvis.findOneAndUpdate(
            { _id: req.user.id },
            { $push: { history: { $each: histEntry } }, $set: { updated_at: now, 'study_style.voiceModel': selectedVoiceModel } }
          );
        } else {
          await jarvis.create({
            _id: req.user.id, known_topics: [], weak_areas: [], reminders: newReminders,
            history: histEntry, study_style: { voiceModel: selectedVoiceModel }, updated_at: now,
          });
        }
        return res.json({ reply: replyText, intent: 'nectar_extract', sideEffect: sideEffectData, actions: executedActions });
      }
      // No actions detected — fall through to normal flow
    }

    const intent = detectIntent(text);
    const flow = getNeedFlow(text, data?.history || []);
    let reply = '';
    let sideEffect = null;

    // Handle reminder creation
    if (intent === 'reminder_set') {
      const reminderText = extractReminderText(text);
      const dueAt = parseDueDate(text);
      const reminder = {
        id: uuidv4(),
        text: reminderText || text,
        due_at: dueAt,
        done: false,
        created_at: now,
      };

      const firstName = req.user.name.split(' ')[0];
      const dueDate = new Date(dueAt);
      const formatted = dueDate.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      reply = `Lembrete criado para ${firstName}: "${reminder.text}" — ${formatted}. ✓`;
      sideEffect = { type: 'reminder_created', reminder };
      await enqueueReminderNotifications(req.user, reminder, 'chat_intent');
      processDueNotificationJobs({ limit: 5 }).catch((error) => {
        console.error('[Notifications] processamento imediato falhou:', error);
      });

      if (data) {
        await jarvis.findOneAndUpdate(
          { _id: req.user.id },
          { $push: { reminders: reminder, history: [
            { role: 'user', content: text, timestamp: now },
            { role: 'jarvis', content: reply, timestamp: now },
          ]},
          $set: { updated_at: now } }
        );
      } else {
        await jarvis.create({
          _id: req.user.id, known_topics: [], weak_areas: [],
          reminders: [reminder],
          history: [
            { role: 'user', content: text, timestamp: now },
            { role: 'jarvis', content: reply, timestamp: now },
          ],
          study_style: { voiceModel: selectedVoiceModel }, updated_at: now,
        });
      }
    } else if (intent === 'reminder_list') {
      const reminders = (data?.reminders || []).filter(r => !r.done);
      if (reminders.length === 0) {
        reply = `Você não tem lembretes pendentes, ${req.user.name.split(' ')[0]}. Quer criar um?`;
      } else {
        const list = reminders.map((r, i) => {
          const d = new Date(r.due_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
          return `${i + 1}. ${r.text} (${d})`;
        }).join('\n');
        reply = `Seus lembretes pendentes:\n${list}`;
      }
      sideEffect = { type: 'reminders_list', reminders };
    } else if (intent === 'mindmap_progress') {
      reply = generateMapProgressReport(mapData, req.user, flow);
      sideEffect = mapData ? {
        type: 'mindmap_progress',
        total_xp: mapData.total_xp,
        completed: mapData.nodes.filter(n => n.completed).length,
        total: mapData.nodes.length,
      } : null;
    } else if (intent === 'mindmap_complete') {
      const result = await tryCompleteMindmapTopic(req.user.id, text, mapData, mindmaps);
      reply = result.reply;
      sideEffect = result.sideEffect;
    } else if (intent === 'mindmap_suggest') {
      reply = generateMapSuggestion(mapData, req.user, flow);
    } else {
      reply = buildResponse(intent, text, req.user, data, mapData, selectedVoiceModel);
    }

    if (data) {
      await jarvis.findOneAndUpdate(
        { _id: req.user.id },
        { $set: { 'study_style.voiceModel': selectedVoiceModel, updated_at: now } }
      );
    }

    // Extract topics and update learning
    const newTopics = extractTopics(text, req.user.area);
    if (newTopics.length > 0 && data) {
      const existing = data.known_topics || [];
      const merged = [...new Set([...existing, ...newTopics])].slice(0, 30);
      await jarvis.findOneAndUpdate(
        { _id: req.user.id },
        { $set: { known_topics: merged, updated_at: now } }
      );
    } else if (newTopics.length > 0 && !data) {
      // will be created on next interaction
    }

    // Save to history if not reminder (already saved above)
    if (intent !== 'reminder_set' && intent !== 'reminder_list') {
      const historyEntry = [
        { role: 'user', content: text, timestamp: now },
        { role: 'jarvis', content: reply, timestamp: now },
      ];
      if (data) {
        await jarvis.findOneAndUpdate(
          { _id: req.user.id },
          { $push: { history: { $each: historyEntry } },
            $set: { updated_at: now } }
        );
      } else {
        await jarvis.create({
          _id: req.user.id, known_topics: newTopics, weak_areas: [],
          reminders: [], history: historyEntry, study_style: { voiceModel: selectedVoiceModel }, updated_at: now,
        });
      }
    }

    res.json({ reply, intent, sideEffect });
  } catch (err) {
    console.error('Jarvis chat error:', err);
    res.status(500).json({ error: 'Erro no Tigas' });
  }
});

// ── PUT /api/jarvis/reminders/:id/done ────────────────────────────────────────
router.put('/reminders/:id/done', async (req, res) => {
  try {
    const { jarvis } = getDatabase();
    await jarvis.findOneAndUpdate(
      { _id: req.user.id, 'reminders.id': req.params.id },
      { $set: { 'reminders.$.done': true } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao marcar lembrete' });
  }
});

// ── DELETE /api/jarvis/reminders/:id ─────────────────────────────────────────
router.delete('/reminders/:id', async (req, res) => {
  try {
    const { jarvis } = getDatabase();
    await jarvis.findOneAndUpdate(
      { _id: req.user.id },
      { $pull: { reminders: { id: req.params.id } } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar lembrete' });
  }
});

module.exports = router;
