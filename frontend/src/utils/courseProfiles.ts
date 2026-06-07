import { inferAreaFromGoal } from './formAutomation';

export type CourseProfile = {
  area: string;
  title: string;
  subtitle: string;
  dashboardFocus: string;
  questionBankTitle: string;
  questionBankDescription: string;
  lessonsTitle: string;
  lessonsDescription: string;
  subjects: string[];
  highlights: string[];
};

const DEFAULT_PROFILE: CourseProfile = {
  area: 'Faculdade',
  title: 'Faculdade',
  subtitle: 'Trilhas, questões e aulas organizadas para a sua área de formação.',
  dashboardFocus: 'Monte uma rotina que combine teoria, prática e revisão.',
  questionBankTitle: 'Banco de Questões da sua área',
  questionBankDescription: 'Use filtros por disciplina para treinar com foco no seu curso.',
  lessonsTitle: 'Aulas por área',
  lessonsDescription: 'Assista às aulas mais relevantes para o seu objetivo atual.',
  subjects: [
    'Metodologia de Estudo',
    'Planejamento',
    'Leitura Ativa',
    'Revisão Espaçada',
    'Desempenho',
    'Produtividade',
  ],
  highlights: [
    'Questões alinhadas ao curso escolhido',
    'Aulas organizadas por prioridade',
    'Revisão e acompanhamento centralizados',
  ],
};

const COURSE_PROFILES: CourseProfile[] = [
  {
    area: 'Medicina',
    title: 'Medicina',
    subtitle: 'Ciclo básico, clínico e internato com foco em retenção e prova prática.',
    dashboardFocus: 'Priorize questões clínicas, revisão espaçada e aulas de raciocínio médico.',
    questionBankTitle: 'Banco de Questões de Medicina',
    questionBankDescription: 'Treine por fase e disciplina com foco em clínica, cirurgia e internato.',
    lessonsTitle: 'Aulas de Medicina',
    lessonsDescription: 'Trilhas para base, raciocínio clínico e preparação para provas e internato.',
    subjects: ['Cardiologia', 'Pediatria', 'Farmacologia', 'Cirurgia', 'Clínica Médica', 'Ginecologia', 'Neurologia', 'Infectologia', 'Psiquiatria'],
    highlights: [
      'Questões por fase clínica e internato',
      'Aulas para consolidar base e raciocínio',
      'Flashcards e revisão para retenção longa',
    ],
  },
  {
    area: 'Direito',
    title: 'Direito',
    subtitle: 'Estudo orientado para teoria, jurisprudência e resolução de questões objetivas.',
    dashboardFocus: 'Combine leitura de lei seca, revisões curtas e prática de questões comentadas.',
    questionBankTitle: 'Banco de Questões de Direito',
    questionBankDescription: 'Questões de Constitucional, Civil, Penal e áreas mais cobradas.',
    lessonsTitle: 'Aulas de Direito',
    lessonsDescription: 'Aulas para revisão da teoria e preparação para provas e OAB.',
    subjects: ['Constitucional', 'Administrativo', 'Civil', 'Processo Civil', 'Penal', 'Processo Penal', 'Ética', 'Tributário', 'Trabalho'],
    highlights: [
      'Questões de teoria e jurisprudência',
      'Aulas focadas em peças e fundamentos',
      'Revisões para OAB, concursos e faculdade',
    ],
  },
  {
    area: 'ENEM & Vestibulares',
    title: 'ENEM & Vestibulares',
    subtitle: 'Conteúdo por disciplina, redação e simulados para vestibulares e ENEM.',
    dashboardFocus: 'Distribua o estudo entre matérias, redação e simulados cronometrados.',
    questionBankTitle: 'Banco de Questões do ENEM',
    questionBankDescription: 'Treine com disciplinas gerais, interpretação e resolução de provas.',
    lessonsTitle: 'Aulas para Vestibular',
    lessonsDescription: 'Videoaulas para reforçar teoria, revisão e prática com foco em prova.',
    subjects: ['Matemática', 'Português', 'Redação', 'História', 'Geografia', 'Física', 'Química', 'Biologia', 'Inglês'],
    highlights: [
      'Questões por disciplina e simulado',
      'Aulas para reforço e redação',
      'Rotina de revisão com foco em prova',
    ],
  },
  {
    area: 'Concursos Públicos',
    title: 'Concursos Públicos',
    subtitle: 'Organização por edital, bloco de matérias e revisões para alta concorrência.',
    dashboardFocus: 'Acompanhe blocos de conteúdo, priorize pesos do edital e revisão ativa.',
    questionBankTitle: 'Banco de Questões de Concursos',
    questionBankDescription: 'Treine Português, RLM, Direito e matérias específicas do edital.',
    lessonsTitle: 'Aulas para Concursos',
    lessonsDescription: 'Aulas objetivas para base, resolução e revisão orientada ao edital.',
    subjects: ['Português', 'Raciocínio Lógico', 'Informática', 'Constitucional', 'Administrativo', 'Direito Penal', 'Direito Civil', 'Legislação Específica'],
    highlights: [
      'Questões alinhadas ao edital atual',
      'Aulas curtas e diretas por bloco',
      'Revisão contínua para retenção',
    ],
  },
  {
    area: 'Engenharia',
    title: 'Engenharia',
    subtitle: 'Base matemática, física aplicada e resolução de problemas com consistência.',
    dashboardFocus: 'Junte teoria, cálculo e lista de exercícios para ganhar velocidade.',
    questionBankTitle: 'Banco de Questões de Engenharia',
    questionBankDescription: 'Pratique cálculos, física e raciocínio aplicado por tema.',
    lessonsTitle: 'Aulas de Engenharia',
    lessonsDescription: 'Aulas para consolidar cálculo, física e tópicos específicos da área.',
    subjects: ['Cálculo', 'Física', 'Álgebra', 'Resistência dos Materiais', 'Mecânica', 'Eletrônica', 'Programação', 'Termodinâmica'],
    highlights: [
      'Questões com foco em cálculo e aplicação',
      'Aulas de base e tópicos avançados',
      'Rotina para exercícios e revisão técnica',
    ],
  },
];

function normalizeArea(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchProfile(area: string): CourseProfile | undefined {
  const normalized = normalizeArea(area);
  if (!normalized) return undefined;

  return COURSE_PROFILES.find((profile) => {
    const key = normalizeArea(profile.area);
    if (normalized === key) return true;
    if (key === 'medicina') return /medicina|med|medico|residencia/.test(normalized);
    if (key === 'direito') return /direito|oab|magistratura|mp|delegado|procurador/.test(normalized);
    if (key.includes('enem')) return /enem|vestibular|vestibulares|vestibular/.test(normalized);
    if (key.includes('concursos')) return /concurso|concursos|servidor|publico|público|militar|militares/.test(normalized);
    if (key === 'engenharia') return /engenharia|engenheiro|cálculo|calculo|física|fisica/.test(normalized);
    return false;
  });
}

export function getCourseProfile(area?: string, goal?: string): CourseProfile {
  const resolvedArea = area?.trim() || inferAreaFromGoal(goal || '');
  return matchProfile(resolvedArea || '') || DEFAULT_PROFILE;
}

export function getQuestionSubjects(area?: string, goal?: string) {
  return getCourseProfile(area, goal).subjects;
}
