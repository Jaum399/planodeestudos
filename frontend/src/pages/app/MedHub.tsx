import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, Bot, BookOpen, BrainCircuit, Building2, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, ClipboardList, FileText, Loader2, Lock, ReceiptText, Search, ShieldCheck, Sparkles, Stethoscope, Timer, Users, Video, Wallet, Wand2 } from 'lucide-react';
import { analyticsApi, flashcardsApi, jarvisApi, medhubCertificationApi, medhubLeadsApi, medhubMarketplaceApi, medhubWorkspaceApi, questionBankApi, reminderSessionApi, scheduleApi, studyToolsApi } from '../../services/api';
import type { ClinicLead, ClinicLeadPagination, ClinicLeadStatus, DailyPlanBlock, MedHubCertification, MedHubCertificationType, MedHubMarketplaceItem, MedHubWorkspace, MnemonicItem, MockExamRankingItem, QuestionBankItem, QuestionBankStats, StudySummary } from '../../types';

type HubModuleKey =
  | 'ai_schedule'
  | 'tiss'
  | 'protocols'
  | 'credentialing'
  | 'marketplace'
  | 'visibility'
  | 'anticipation'
  | 'prescriber'
  | 'ehr'
  | 'telemedicine';

type MainSectionKey =
  | 'admin'
  | 'overview'
  | 'advanced'
  | 'leads'
  | 'questions'
  | 'jarvis'
  | 'dailyPlan'
  | 'summaries'
  | 'mnemonics'
  | 'interaction';

const MODULE_KEYS: HubModuleKey[] = [
  'ai_schedule',
  'tiss',
  'protocols',
  'credentialing',
  'marketplace',
  'visibility',
  'anticipation',
  'prescriber',
  'ehr',
  'telemedicine',
];

const PHASES = [
  { value: '', label: 'Todas as fases' },
  { value: 'basico', label: 'Ciclo Básico' },
  { value: 'clinico', label: 'Ciclo Clínico' },
  { value: 'internato', label: 'Internato' },
  { value: 'residencia', label: 'Residência/ENAMED' },
];

const MEDICAL_CENTER_FEATURES = [
  {
    key: 'ai_schedule' as HubModuleKey,
    title: 'Agendamento com IA',
    description: 'Otimize sua agenda com inteligência que aprende padrões, reduz faltas e maximiza ocupação.',
    icon: CalendarClock,
    status: 'Ativo',
    actionLabel: 'Gerar agenda inteligente',
  },
  {
    key: 'tiss' as HubModuleKey,
    title: 'Faturamento TISS Digital',
    description: 'Automatize envio e acompanhamento de guias TISS para reduzir glosas e acelerar recebimentos.',
    icon: ReceiptText,
    status: 'Ativo',
    actionLabel: 'Abrir fluxo TISS',
  },
  {
    key: 'protocols' as HubModuleKey,
    title: 'Protocolos de Atendimento',
    description: 'Padronize fluxos com protocolos personalizáveis para garantir qualidade operacional.',
    icon: ClipboardList,
    status: 'Ativo',
    actionLabel: 'Gerenciar protocolos',
  },
  {
    key: 'credentialing' as HubModuleKey,
    title: 'Credenciamento Simplificado',
    description: 'Gerencie o credenciamento junto a operadoras de forma digital e organizada.',
    icon: Building2,
    status: 'Ativo',
    actionLabel: 'Abrir pipeline',
  },
  {
    key: 'marketplace' as HubModuleKey,
    title: 'Marketplace de Profissionais',
    description: 'Encontre profissionais qualificados e gerencie equipes com ferramentas integradas.',
    icon: Users,
    status: 'Ativo',
    actionLabel: 'Buscar profissionais',
  },
  {
    key: 'visibility' as HubModuleKey,
    title: 'Visibilidade para Pacientes e Operadoras',
    description: 'Aumente presença no mercado e seja encontrado por quem busca seus serviços.',
    icon: Search,
    status: 'Ativo',
    actionLabel: 'Ativar campanhas',
  },
  {
    key: 'anticipation' as HubModuleKey,
    title: 'Antecipação de Recebíveis',
    description: 'Antecipe recebimentos de operadoras com taxas competitivas e baixa burocracia.',
    icon: Wallet,
    status: 'Ativo',
    actionLabel: 'Simular antecipação',
  },
  {
    key: 'prescriber' as HubModuleKey,
    title: 'Prescritor Digital',
    description: 'Prescreva medicamentos com segurança e agilidade, com integração digital.',
    icon: FileText,
    status: 'Ativo',
    actionLabel: 'Nova prescrição',
  },
  {
    key: 'ehr' as HubModuleKey,
    title: 'Prontuário Ambulatorial',
    description: 'Registre histórico completo do paciente com acesso estruturado por atendimento.',
    icon: Stethoscope,
    status: 'Ativo',
    actionLabel: 'Abrir prontuário',
  },
  {
    key: 'telemedicine' as HubModuleKey,
    title: 'Telemedicina',
    description: 'Realize consultas remotas com vídeo/áudio, prontuário integrado e prescrição digital.',
    icon: Video,
    status: 'Ativo',
    actionLabel: 'Iniciar consulta remota',
  },
];

const LEAD_STATUS_OPTIONS: Array<{ value: ClinicLeadStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Novo' },
  { value: 'contacted', label: 'Contatado' },
  { value: 'qualified', label: 'Qualificado' },
  { value: 'closed', label: 'Fechado' },
];

const LEAD_STATUS_LABEL: Record<ClinicLeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  closed: 'Fechado',
};

const MARKETPLACE_OWNERSHIP_FILTERS: Array<{ value: 'all' | 'public' | 'private'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'public', label: 'Público' },
  { value: 'private', label: 'Privado' },
];

function toModuleKey(value?: string): HubModuleKey | null {
  if (!value) return null;
  return MODULE_KEYS.includes(value as HubModuleKey) ? (value as HubModuleKey) : null;
}

function moduleRoute(module: HubModuleKey): string {
  return `/app/medhub/${module}`;
}

export default function MedHubPage() {
  const navigate = useNavigate();
  const { moduleKey } = useParams<{ moduleKey?: string }>();
  const { user } = useAuth();
  const isAdminUser = !!(user as Record<string, unknown> | null)?.isPrivileged;

  // ── Certification state ───────────────────────────────────────────────
  const [cert, setCert] = useState<MedHubCertification | null>(null);
  const [certLoading, setCertLoading] = useState(true);
  const [certSubmitting, setCertSubmitting] = useState(false);
  const [certError, setCertError] = useState('');
  const [certSuccess, setCertSuccess] = useState('');
  const [certType, setCertType] = useState<MedHubCertificationType>('clinic');
  const [certPhone, setCertPhone] = useState('');
  const [certClinicCity, setCertClinicCity] = useState('');
  const [certClinicState, setCertClinicState] = useState('SP');
  const [certClinicAddress, setCertClinicAddress] = useState('');
  const [certCnpj, setCertCnpj] = useState('');
  const [certCrmNumber, setCertCrmNumber] = useState('');
  const [certCrmState, setCertCrmState] = useState('SP');
  const [adminPendingCerts, setAdminPendingCerts] = useState<MedHubCertification[]>([]);
  const [adminCertLoading, setAdminCertLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeModule, setActiveModule] = useState<HubModuleKey | null>(null);
  const [sectionExpanded, setSectionExpanded] = useState<Record<MainSectionKey, boolean>>({
    admin: true,
    overview: true,
    advanced: true,
    leads: true,
    questions: true,
    jarvis: true,
    dailyPlan: true,
    summaries: true,
    mnemonics: true,
    interaction: true,
  });
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const [leads, setLeads] = useState<ClinicLead[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState<ClinicLeadStatus | 'all'>('all');
  const [leadStartDate, setLeadStartDate] = useState('');
  const [leadEndDate, setLeadEndDate] = useState('');
  const [leadPage, setLeadPage] = useState(1);
  const [leadPageSize] = useState(12);
  const [leadTotals, setLeadTotals] = useState<Record<ClinicLeadStatus, number>>({
    new: 0,
    contacted: 0,
    qualified: 0,
    closed: 0,
  });
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [leadUpdatingId, setLeadUpdatingId] = useState<string | null>(null);
  const [leadPagination, setLeadPagination] = useState<ClinicLeadPagination>({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [marketplaceItems, setMarketplaceItems] = useState<MedHubMarketplaceItem[]>([]);
  const [marketplaceCity, setMarketplaceCity] = useState('São Paulo');
  const [marketplaceState, setMarketplaceState] = useState('SP');
  const [marketplaceType, setMarketplaceType] = useState<'all' | 'public' | 'private'>('all');
  const [marketplaceSpecialty, setMarketplaceSpecialty] = useState('');
  const [marketplaceUserLat, setMarketplaceUserLat] = useState<number | null>(null);
  const [marketplaceUserLon, setMarketplaceUserLon] = useState<number | null>(null);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState('');
  const [marketplacePage, setMarketplacePage] = useState(1);
  const [marketplacePagination, setMarketplacePagination] = useState<ClinicLeadPagination>({
    page: 1,
    pageSize: 6,
    total: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });

  const [aiSlots, setAiSlots] = useState<string[]>([]);
  const [tissPatient, setTissPatient] = useState('');
  const [tissOperator, setTissOperator] = useState('Unimed');
  const [tissAmount, setTissAmount] = useState('');
  const [tissGuides, setTissGuides] = useState<Array<{ id: string; patient: string; operator: string; amount: number; status: 'draft' | 'sent' | 'paid' }>>([
    { id: 'g1', patient: 'Maria Souza', operator: 'Unimed', amount: 320, status: 'sent' },
    { id: 'g2', patient: 'João Lima', operator: 'Bradesco', amount: 480, status: 'draft' },
  ]);

  const [protocolName, setProtocolName] = useState('');
  const [protocols, setProtocols] = useState<Array<{ id: string; name: string; active: boolean }>>([
    { id: 'p1', name: 'Atendimento inicial adulto', active: true },
    { id: 'p2', name: 'Retorno de acompanhamento', active: true },
  ]);

  const [credentialing, setCredentialing] = useState<Array<{ id: string; operator: string; stage: 'documents' | 'analysis' | 'approved' }>>([
    { id: 'c1', operator: 'Unimed', stage: 'analysis' },
    { id: 'c2', operator: 'Amil', stage: 'documents' },
  ]);

  const [telePatient, setTelePatient] = useState('');
  const [teleDate, setTeleDate] = useState('');
  const [teleQueue, setTeleQueue] = useState<Array<{ id: string; patient: string; date: string; status: 'scheduled' | 'live' | 'finished' }>>([]);

  const [visibilityStats, setVisibilityStats] = useState({ patients: 18, operators: 4 });
  const [prescriptions, setPrescriptions] = useState<Array<{ id: string; patient: string; drug: string; created_at: string }>>([]);
  const [recordNotes, setRecordNotes] = useState<Array<{ id: string; patient: string; note: string; created_at: string }>>([]);
  const [rxPatient, setRxPatient] = useState('');
  const [rxDrug, setRxDrug] = useState('');
  const [recordPatient, setRecordPatient] = useState('');
  const [recordText, setRecordText] = useState('');

  const [questionStats, setQuestionStats] = useState<QuestionBankStats>({ total_attempts: 0, correct_attempts: 0, accuracy: 0 });
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [selectedPhase, setSelectedPhase] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questionFeedback, setQuestionFeedback] = useState<string>('');
  const [simQuestions, setSimQuestions] = useState<QuestionBankItem[]>([]);
  const [simAnswers, setSimAnswers] = useState<Record<string, number>>({});
  const [simRunning, setSimRunning] = useState(false);
  const [simStartTs, setSimStartTs] = useState(0);
  const [simSeconds, setSimSeconds] = useState(0);
  const [simResult, setSimResult] = useState<{ accuracy: number; correct_answers: number; total_questions: number } | null>(null);
  const [simRanking, setSimRanking] = useState<{ personal_best: MockExamRankingItem | null; recent: MockExamRankingItem[] }>({ personal_best: null, recent: [] });

  const [jarvisInput, setJarvisInput] = useState('');
  const [jarvisReply, setJarvisReply] = useState('');
  const [askingJarvis, setAskingJarvis] = useState(false);

  const [summaryTitle, setSummaryTitle] = useState('Resumo rápido');
  const [summarySubject, setSummarySubject] = useState('Medicina');
  const [summaryText, setSummaryText] = useState('');
  const [summaries, setSummaries] = useState<StudySummary[]>([]);
  const [creatingSummary, setCreatingSummary] = useState(false);

  const [mnTerm, setMnTerm] = useState('');
  const [mnPhrase, setMnPhrase] = useState('');
  const [mnContext, setMnContext] = useState('');
  const [mnemonics, setMnemonics] = useState<MnemonicItem[]>([]);
  const [creatingMnemonic, setCreatingMnemonic] = useState(false);

  const [reviewDueCount, setReviewDueCount] = useState(0);
  const [pendingRemindersCount, setPendingRemindersCount] = useState(0);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [scheduleCount, setScheduleCount] = useState(0);
  const [dailyPlan, setDailyPlan] = useState<DailyPlanBlock[]>([]);

  const currentQuestion = useMemo(() => questions[currentQuestionIndex] || null, [questions, currentQuestionIndex]);
  const totalReceivables = useMemo(() => tissGuides.filter((g) => g.status !== 'paid').reduce((sum, g) => sum + g.amount, 0), [tissGuides]);
  const anticipatedValue = useMemo(() => Math.round(totalReceivables * 0.92), [totalReceivables]);
  const activeModuleMeta = useMemo(
    () => MEDICAL_CENTER_FEATURES.find((feature) => feature.key === activeModule) || null,
    [activeModule]
  );

  function createAiSchedule() {
    const base = ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00'];
    const dynamic = base.filter((_, idx) => idx % 2 === (pendingRemindersCount + scheduleCount) % 2);
    setAiSlots(dynamic.map((slot) => `${slot} • prioridade alta`));
  }

  function addTissGuide() {
    if (!tissPatient.trim() || !tissAmount.trim()) return;
    const value = Number(tissAmount);
    if (!Number.isFinite(value) || value <= 0) return;
    setTissGuides((prev) => [
      {
        id: `g-${Date.now()}`,
        patient: tissPatient.trim(),
        operator: tissOperator,
        amount: value,
        status: 'draft',
      },
      ...prev,
    ]);
    setTissPatient('');
    setTissAmount('');
  }

  function advanceGuideStatus(id: string) {
    setTissGuides((prev) => prev.map((g) => {
      if (g.id !== id) return g;
      if (g.status === 'draft') return { ...g, status: 'sent' };
      if (g.status === 'sent') return { ...g, status: 'paid' };
      return g;
    }));
  }

  function addProtocol() {
    if (!protocolName.trim()) return;
    setProtocols((prev) => [{ id: `p-${Date.now()}`, name: protocolName.trim(), active: true }, ...prev]);
    setProtocolName('');
  }

  function advanceCredentialing(id: string) {
    setCredentialing((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      if (c.stage === 'documents') return { ...c, stage: 'analysis' };
      if (c.stage === 'analysis') return { ...c, stage: 'approved' };
      return c;
    }));
  }

  function addTeleconsultation() {
    if (!telePatient.trim() || !teleDate.trim()) return;
    setTeleQueue((prev) => [{ id: `t-${Date.now()}`, patient: telePatient.trim(), date: teleDate, status: 'scheduled' }, ...prev]);
    setTelePatient('');
    setTeleDate('');
  }

  function startTeleconsultation(id: string) {
    setTeleQueue((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'live' } : t)));
  }

  function finishTeleconsultation(id: string) {
    setTeleQueue((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'finished' } : t)));
  }

  function addPrescription() {
    if (!rxPatient.trim() || !rxDrug.trim()) return;
    setPrescriptions((prev) => [{ id: `rx-${Date.now()}`, patient: rxPatient.trim(), drug: rxDrug.trim(), created_at: new Date().toISOString() }, ...prev]);
    setRxPatient('');
    setRxDrug('');
  }

  function addRecordNote() {
    if (!recordPatient.trim() || !recordText.trim()) return;
    setRecordNotes((prev) => [{ id: `pr-${Date.now()}`, patient: recordPatient.trim(), note: recordText.trim(), created_at: new Date().toISOString() }, ...prev]);
    setRecordPatient('');
    setRecordText('');
  }

  async function loadQuestions(phaseValue = selectedPhase) {
    const { data } = await questionBankApi.getAll({ limit: 20, phase: phaseValue || undefined });
    setQuestions(data.items || []);
    setQuestionStats(data.stats || { total_attempts: 0, correct_attempts: 0, accuracy: 0 });
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setQuestionFeedback('');
  }

  async function loadLeads({
    status = leadStatusFilter,
    query = leadSearch,
    startDate = leadStartDate,
    endDate = leadEndDate,
    page = leadPage,
  }: {
    status?: ClinicLeadStatus | 'all';
    query?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
  } = {}) {
    setLeadLoading(true);
    setLeadError('');
    try {
      const { data } = await medhubLeadsApi.list({
        status: status === 'all' ? undefined : status,
        q: query.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        pageSize: leadPageSize,
      });
      setLeads(data.items || []);
      setLeadTotals(data.totals || { new: 0, contacted: 0, qualified: 0, closed: 0 });
      setLeadPagination(data.pagination || {
        page,
        pageSize: leadPageSize,
        total: data.items?.length || 0,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      });
      if (data?.pagination?.page && data.pagination.page !== leadPage) {
        setLeadPage(data.pagination.page);
      }
    } catch {
      setLeadError('Não foi possível carregar os leads no momento.');
    } finally {
      setLeadLoading(false);
    }
  }

  async function loadCertification() {
    setCertLoading(true);
    try {
      const { data } = await medhubCertificationApi.get();
      const c: MedHubCertification | null = data.certification || null;
      setCert(c);
      if (c?.status === 'approved') {
        loadHub();
      } else {
        setLoading(false);
      }
    } catch {
      setCert(null);
      setLoading(false);
    } finally {
      setCertLoading(false);
    }
  }

  async function submitCertification(e: FormEvent) {
    e.preventDefault();
    setCertError('');
    setCertSuccess('');
    setCertSubmitting(true);
    try {
      const payload: {
        type: MedHubCertificationType;
        contact_phone: string;
        clinic_city: string;
        clinic_state: string;
        clinic_address: string;
        cnpj?: string;
        crm_number?: string;
        crm_state?: string;
      } = {
        type: certType,
        contact_phone: certPhone.replace(/\D/g, ''),
        clinic_city: certClinicCity.trim(),
        clinic_state: certClinicState.toUpperCase().trim(),
        clinic_address: certClinicAddress.trim(),
      };
      if (certType === 'clinic' || certType === 'both') {
        payload.cnpj = certCnpj.replace(/\D/g, '');
      }
      if (certType === 'doctor' || certType === 'both') {
        payload.crm_number = certCrmNumber.replace(/\D/g, '');
        payload.crm_state = certCrmState.toUpperCase().trim();
      }
      const { data } = await medhubCertificationApi.submit(payload);
      const certRes = await medhubCertificationApi.get();
      const updatedCert: MedHubCertification | null = certRes.data.certification || null;
      setCert(updatedCert);
      setCertSuccess(data.message || 'Documentos enviados.');
      if (updatedCert?.status === 'approved') {
        loadHub();
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setCertError(msg || 'Erro ao enviar documentos. Verifique os dados e tente novamente.');
    } finally {
      setCertSubmitting(false);
    }
  }

  async function cancelCertification() {
    if (!confirm('Cancelar certificação atual e reenviar novos documentos?')) return;
    try {
      await medhubCertificationApi.cancel();
      setCert(null);
      setCertSuccess('');
      setCertError('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setCertError(msg || 'Erro ao cancelar certificação.');
    }
  }

  async function loadAdminPendingCerts() {
    setAdminCertLoading(true);
    try {
      const { data } = await medhubCertificationApi.adminListPending();
      setAdminPendingCerts(data.items || []);
    } catch {
      /* silently ignore */
    } finally {
      setAdminCertLoading(false);
    }
  }

  async function adminApproveCert(userId: string) {
    await medhubCertificationApi.adminUpdateStatus(userId, 'approved');
    loadAdminPendingCerts();
  }

  async function adminRejectCert(userId: string) {
    const reason = prompt('Motivo da rejeição:');
    if (reason === null) return;
    await medhubCertificationApi.adminUpdateStatus(userId, 'rejected', reason || 'Documentos inválidos.');
    loadAdminPendingCerts();
  }

  async function loadHub() {
    setLoading(true);
    setError('');
    try {
      const [
        summariesRes,
        mnemonicsRes,
        reviewRes,
        reminderRes,
        analyticsRes,
        scheduleRes,
        rankingRes,
        dailyPlanRes,
        workspaceRes,
      ] = await Promise.all([
        studyToolsApi.listSummaries(),
        studyToolsApi.listMnemonics(),
        flashcardsApi.getReview(),
        reminderSessionApi.getAll(),
        analyticsApi.getSummary(),
        scheduleApi.getAll(),
        questionBankApi.ranking(),
        studyToolsApi.dailyPlan(),
        medhubWorkspaceApi.getWorkspace(),
      ]);

      await loadQuestions('');
      setSummaries(summariesRes.data.items || []);
      setMnemonics(mnemonicsRes.data.items || []);
      setReviewDueCount((reviewRes.data.items || []).length);
      setPendingRemindersCount((reminderRes.data.items || []).length);
      setWeeklyMinutes(analyticsRes.data.weeklyMinutes || 0);
      setScheduleCount((scheduleRes.data.items || []).length);
      setSimRanking({
        personal_best: rankingRes.data.personal_best || null,
        recent: rankingRes.data.recent || [],
      });
      setDailyPlan(dailyPlanRes.data.blocks || []);

      const workspace: MedHubWorkspace | undefined = workspaceRes?.data?.workspace;
      if (workspace) {
        setAiSlots(workspace.ai_slots || []);
        setTissGuides(workspace.tiss_guides || []);
        setProtocols(workspace.protocols || []);
        setCredentialing(workspace.credentialing || []);
        setTeleQueue(workspace.tele_queue || []);
        setVisibilityStats(workspace.visibility_stats || { patients: 0, operators: 0 });
        setPrescriptions(workspace.prescriptions || []);
        setRecordNotes(workspace.record_notes || []);
      }
      setWorkspaceHydrated(true);
    } catch {
      setError('Não foi possível carregar o Centro Médico agora.');
    } finally {
      setLoading(false);
    }
  }

  async function loadMarketplace({
    city = marketplaceCity,
    state = marketplaceState,
    type = marketplaceType,
    specialty = marketplaceSpecialty,
    lat = marketplaceUserLat,
    lon = marketplaceUserLon,
    page = marketplacePage,
  }: {
    city?: string;
    state?: string;
    type?: 'all' | 'public' | 'private';
    specialty?: string;
    lat?: number | null;
    lon?: number | null;
    page?: number;
  } = {}) {
    setMarketplaceLoading(true);
    setMarketplaceError('');
    try {
      const { data } = await medhubMarketplaceApi.list({
        city: city.trim() || 'São Paulo',
        state: state.trim() || 'SP',
        type,
        specialty: specialty?.trim() || undefined,
        lat: Number.isFinite(lat as number) ? (lat as number) : undefined,
        lon: Number.isFinite(lon as number) ? (lon as number) : undefined,
        page,
        pageSize: 6,
      });
      setMarketplaceItems(data.items || []);
      setMarketplacePagination(data.pagination || {
        page,
        pageSize: 6,
        total: data.items?.length || 0,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      });
    } catch {
      setMarketplaceError('Não foi possível carregar os dados reais do marketplace médico agora.');
    } finally {
      setMarketplaceLoading(false);
    }
  }

  function closeModule() {
    setActiveModule(null);
    navigate('/app/medhub');
  }

  function toggleMainSection(section: MainSectionKey) {
    setSectionExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function useCurrentLocationForMarketplace() {
    if (!navigator.geolocation) {
      setMarketplaceError('Geolocalização não disponível neste navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMarketplaceUserLat(pos.coords.latitude);
        setMarketplaceUserLon(pos.coords.longitude);
      },
      () => {
        setMarketplaceError('Não foi possível obter sua localização.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(() => {
    loadCertification();
    if (isAdminUser) loadAdminPendingCerts();
  }, []);

  useEffect(() => {
    const currentModule = toModuleKey(moduleKey);
    setActiveModule(currentModule);
  }, [moduleKey]);

  useEffect(() => {
    if (activeModule !== 'marketplace') return;
    loadMarketplace({ page: marketplacePage });
  }, [activeModule, marketplacePage]);

  useEffect(() => {
    setLeadPage(1);
  }, [leadStatusFilter, leadSearch, leadStartDate, leadEndDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads({
        status: leadStatusFilter,
        query: leadSearch,
        startDate: leadStartDate,
        endDate: leadEndDate,
        page: leadPage,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [leadStatusFilter, leadSearch, leadStartDate, leadEndDate, leadPage]);

  useEffect(() => {
    if (!workspaceHydrated) return;

    const timer = setTimeout(() => {
      medhubWorkspaceApi.saveWorkspace({
        ai_slots: aiSlots,
        tiss_guides: tissGuides,
        protocols,
        credentialing,
        tele_queue: teleQueue,
        visibility_stats: visibilityStats,
        prescriptions,
        record_notes: recordNotes,
      }).catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
  }, [
    workspaceHydrated,
    aiSlots,
    tissGuides,
    protocols,
    credentialing,
    teleQueue,
    visibilityStats,
    prescriptions,
    recordNotes,
  ]);

  useEffect(() => {
    if (!simRunning) return;
    const timer = setInterval(() => {
      setSimSeconds(Math.max(Math.floor((Date.now() - simStartTs) / 1000), 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [simRunning, simStartTs]);

  async function onPhaseChange(value: string) {
    setSelectedPhase(value);
    await loadQuestions(value);
  }

  async function submitQuestionAttempt() {
    if (!currentQuestion || selectedOption === null) return;
    const { data } = await questionBankApi.attempt({
      question_id: currentQuestion.id,
      selected_index: selectedOption,
    });

    setQuestionFeedback(data.result?.is_correct ? 'Resposta correta.' : `Resposta incorreta. ${data.result?.explanation || ''}`);
    setQuestionStats(data.stats || questionStats);

    setTimeout(() => {
      setSelectedOption(null);
      setQuestionFeedback('');
      setCurrentQuestionIndex((prev) => (questions.length > 0 ? (prev + 1) % questions.length : 0));
    }, 1200);
  }

  async function startSimulation() {
    const { data } = await questionBankApi.simulate({ phase: selectedPhase || 'geral', count: 10 });
    setSimQuestions(data.items || []);
    setSimAnswers({});
    setSimResult(null);
    setSimRunning(true);
    setSimStartTs(Date.now());
    setSimSeconds(0);
  }

  async function finishSimulation() {
    if (simQuestions.length === 0) return;
    const answers = simQuestions
      .filter((q) => simAnswers[q.id] !== undefined)
      .map((q) => ({ question_id: q.id, selected_index: simAnswers[q.id] }));

    const { data } = await questionBankApi.simulate({
      phase: selectedPhase || 'geral',
      answers,
      duration_seconds: simSeconds,
    });

    setSimRunning(false);
    setSimResult(data.result || null);
    setSimRanking(data.ranking || simRanking);
    await loadQuestions(selectedPhase);
  }

  async function askJarvis(e: FormEvent) {
    e.preventDefault();
    if (!jarvisInput.trim()) return;
    setAskingJarvis(true);
    try {
      const { data } = await jarvisApi.chat(jarvisInput.trim(), { voiceModel: 'tigas_core' });
      setJarvisReply(data.reply || 'Sem resposta.');
      setJarvisInput('');
    } finally {
      setAskingJarvis(false);
    }
  }

  async function createSummary(e: FormEvent) {
    e.preventDefault();
    if (!summaryTitle.trim() || !summaryText.trim()) return;

    setCreatingSummary(true);
    try {
      const { data } = await studyToolsApi.summarize({
        title: summaryTitle.trim(),
        subject: summarySubject.trim(),
        text: summaryText.trim(),
      });
      setSummaries((prev) => [data.item, ...prev]);
      setSummaryText('');
    } finally {
      setCreatingSummary(false);
    }
  }

  async function convertSummaryToFlashcards(summaryId: string) {
    await studyToolsApi.summaryToFlashcards(summaryId);
    const { data } = await flashcardsApi.getReview();
    setReviewDueCount((data.items || []).length);
  }

  async function createMnemonic(e: FormEvent) {
    e.preventDefault();
    if (!mnTerm.trim() || !mnPhrase.trim()) return;

    setCreatingMnemonic(true);
    try {
      const { data } = await studyToolsApi.createMnemonic({
        term: mnTerm.trim(),
        phrase: mnPhrase.trim(),
        context: mnContext.trim(),
      });
      setMnemonics((prev) => [data.item, ...prev]);
      setMnTerm('');
      setMnPhrase('');
      setMnContext('');
    } finally {
      setCreatingMnemonic(false);
    }
  }

  async function updateLeadStatus(leadId: string, status: ClinicLeadStatus) {
    setLeadUpdatingId(leadId);
    setLeadError('');
    try {
      await medhubLeadsApi.updateStatus(leadId, status);
      await loadLeads({
        status: leadStatusFilter,
        query: leadSearch,
        startDate: leadStartDate,
        endDate: leadEndDate,
        page: leadPage,
      });
    } catch {
      setLeadError('Não foi possível atualizar o status do lead.');
    } finally {
      setLeadUpdatingId(null);
    }
  }

  if (certLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-300">
        <Loader2 size={20} className="animate-spin mr-2" /> Verificando credenciais profissionais...
      </div>
    );
  }

  const isCertified = cert?.status === 'approved';

  if (!isCertified) {
    const showForm = true;
    const isPending = cert?.status === 'pending' || cert?.status === 'verifying';
    return (
      <div className="space-y-5 max-w-2xl flex flex-col">
        {/* Header */}
        <section className="card-glass rounded-2xl p-6 card-glow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Lock size={22} className="text-amber-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Verificação Profissional Obrigatória</h1>
              <p className="text-sm text-gray-400">O Centro Médico é exclusivo para profissionais e clínicas certificadas</p>
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-gray-300 space-y-1">
            <p className="text-amber-200 font-medium mb-2">Primeiro complete o subcadastro profissional:</p>
            <div className="flex items-start gap-2"><ShieldCheck size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" /><span><strong className="text-white">Telefone profissional</strong> e <strong className="text-white">localização da clínica</strong> (cidade, UF e endereço)</span></div>
            <p className="text-amber-200 font-medium mt-3 mb-2">Depois validamos os documentos governamentais:</p>
            <div className="flex items-start gap-2"><ShieldCheck size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" /><span><strong className="text-white">CNPJ ativo</strong> — validado na Receita Federal via BrasilAPI (para clínicas e estabelecimentos)</span></div>
            <div className="flex items-start gap-2"><ShieldCheck size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" /><span><strong className="text-white">CRM válido</strong> — verificado junto ao CFM — Conselho Federal de Medicina (para médicos)</span></div>
          </div>
        </section>

        {/* Status: pending */}
        {isPending && (
          <section className="card-glass rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 size={18} className="text-amber-300 animate-spin" />
              <h2 className="text-white font-semibold">Verificação em Andamento</h2>
            </div>
            <p className="text-sm text-gray-300 mb-3">Seus documentos foram recebidos e estão sendo analisados. Você será notificado quando a verificação for concluída.</p>
            {cert.cnpj_company_name && (
              <p className="text-xs text-gray-400">CNPJ: {cert.cnpj} • {cert.cnpj_company_name} • Situação: {cert.cnpj_situation}</p>
            )}
            {cert.crm_number && (
              <p className="text-xs text-gray-400 mt-1">CRM: {cert.crm_number}/{cert.crm_state}{cert.crm_name ? ` • ${cert.crm_name}` : ''}</p>
            )}
            <button onClick={cancelCertification} className="mt-4 text-xs px-3 py-1.5 rounded-lg border border-gray-500/30 text-gray-400 hover:text-white">
              Cancelar e reenviar documentos
            </button>
          </section>
        )}

        {/* Status: rejected */}
        {cert?.status === 'rejected' && (
          <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-400" />
              <p className="text-red-300 font-semibold text-sm">Verificação Rejeitada</p>
            </div>
            {cert.rejection_reason && <p className="text-xs text-red-200">Motivo: {cert.rejection_reason}</p>}
            <p className="text-xs text-gray-400 mt-1">Corrija os dados e reenvie abaixo.</p>
          </section>
        )}

        {/* Submission form */}
        {showForm && (
          <section className="card-glass rounded-2xl p-5 order-first">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><BadgeCheck size={16} className="text-primary-300" /> Enviar Documentos para Verificação</h2>

            {certError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300 flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /><span>{certError}</span>
              </div>
            )}
            {certSuccess && (
              <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300 flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" /><span>{certSuccess}</span>
              </div>
            )}

            <form onSubmit={submitCertification} className="space-y-4">
              <div>
                <p className="text-xs text-primary-300 font-semibold mb-2">1) Dados profissionais obrigatórios</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Telefone profissional (DDD + número)</label>
                    <input
                      className="input-field"
                      placeholder="11999998888"
                      value={certPhone}
                      onChange={(e) => setCertPhone(e.target.value)}
                      maxLength={15}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Cidade da clínica</label>
                    <input
                      className="input-field"
                      placeholder="São Paulo"
                      value={certClinicCity}
                      onChange={(e) => setCertClinicCity(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">UF da clínica</label>
                    <select
                      className="input-field"
                      value={certClinicState}
                      onChange={(e) => setCertClinicState(e.target.value)}
                      required
                    >
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Endereço da clínica</label>
                    <input
                      className="input-field"
                      placeholder="Rua, número, bairro"
                      value={certClinicAddress}
                      onChange={(e) => setCertClinicAddress(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-primary-300 font-semibold mb-2">2) Tipo profissional e documentos para validação governamental</p>
                <label className="block text-xs text-gray-400 mb-2">Perfil profissional</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'clinic', label: 'Clínica / Estabelecimento', icon: Building2 },
                    { value: 'doctor', label: 'Médico / Profissional', icon: Stethoscope },
                    { value: 'both', label: 'Médico com Clínica', icon: ShieldCheck },
                  ] as { value: MedHubCertificationType; label: string; icon: React.ComponentType<{ size: number; className?: string }> }[]).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCertType(value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs text-center transition-colors ${certType === value ? 'border-primary-500/50 bg-primary-600/15 text-white' : 'border-app-border text-gray-400 hover:text-white hover:border-primary-500/30'}`}
                    >
                      <Icon size={18} className={certType === value ? 'text-primary-300' : 'text-gray-500'} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {(certType === 'clinic' || certType === 'both') && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">CNPJ da clínica / estabelecimento</label>
                  <input
                    className="input-field"
                    placeholder="00.000.000/0001-00"
                    value={certCnpj}
                    onChange={(e) => setCertCnpj(e.target.value)}
                    maxLength={18}
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Verificado em tempo real na base da Receita Federal (BrasilAPI). Apenas CNPJ com situação <strong className="text-gray-400">ATIVA</strong> será aceito.</p>
                </div>
              )}

              {(certType === 'doctor' || certType === 'both') && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1.5">Número do CRM</label>
                    <input
                      className="input-field"
                      placeholder="123456"
                      value={certCrmNumber}
                      onChange={(e) => setCertCrmNumber(e.target.value)}
                      maxLength={7}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">UF do CRM</label>
                    <select
                      className="input-field"
                      value={certCrmState}
                      onChange={(e) => setCertCrmState(e.target.value)}
                    >
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                  <p className="col-span-3 text-[11px] text-gray-500">Verificado junto ao CFM — Conselho Federal de Medicina. CRM com formato válido (4–7 dígitos + UF) será aceito.</p>
                </div>
              )}

              <button type="submit" disabled={certSubmitting} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
                {certSubmitting ? (
                  <><Loader2 size={15} className="animate-spin" /> Verificando documentos...</>
                ) : (
                  <><BadgeCheck size={15} /> Verificar e Liberar Acesso ao Centro Médico</>
                )}
              </button>
            </form>
          </section>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-300">
        <Loader2 size={20} className="animate-spin mr-2" /> Carregando Centro Médico...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300 text-sm">{error}</div>}

      {/* Certification badge */}
      {cert && cert.status === 'approved' && (
        <div className="flex items-center gap-2 text-xs text-emerald-300 px-1">
          <BadgeCheck size={14} />
          <span>Centro Médico verificado — {cert.type === 'clinic' ? `Clínica: ${cert.cnpj_company_name || cert.cnpj}` : cert.type === 'doctor' ? `CRM ${cert.crm_number}/${cert.crm_state}` : `CNPJ + CRM verificados`}</span>
        </div>
      )}

      {/* Admin: pending certifications panel */}
      {isAdminUser && (
        <section className="card-glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold flex items-center gap-2"><ShieldCheck size={16} className="text-amber-300" /> Certificações Pendentes — Admin</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleMainSection('admin')}
                className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-gray-300 hover:text-white inline-flex items-center gap-1"
              >
                {sectionExpanded.admin ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {sectionExpanded.admin ? 'Minimizar' : 'Maximizar'}
              </button>
              <button onClick={loadAdminPendingCerts} className="text-xs text-gray-400 hover:text-white">
                {adminCertLoading ? <Loader2 size={12} className="animate-spin" /> : 'Atualizar'}
              </button>
            </div>
          </div>
          {sectionExpanded.admin && (
          <>
          {adminPendingCerts.length === 0 ? (
            <p className="text-xs text-gray-500">Nenhuma certificação pendente.</p>
          ) : (
            <div className="space-y-2">
              {adminPendingCerts.map((c) => (
                <div key={c.id} className="rounded-lg border border-app-border bg-app-card/50 p-3 flex items-start justify-between gap-3">
                  <div className="text-xs text-gray-300 space-y-0.5">
                    <p className="font-semibold text-white">ID: {c.id}</p>
                    {c.cnpj && <p>CNPJ: {c.cnpj} {c.cnpj_company_name ? `• ${c.cnpj_company_name}` : ''} {c.cnpj_situation ? `(${c.cnpj_situation})` : ''}</p>}
                    {c.crm_number && <p>CRM: {c.crm_number}/{c.crm_state}{c.crm_name ? ` • ${c.crm_name}` : ''}</p>}
                    <p className="text-gray-500">Enviado: {new Date(c.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => adminApproveCert(c.id)} className="text-xs px-2 py-1 rounded border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">Aprovar</button>
                    <button onClick={() => adminRejectCert(c.id)} className="text-xs px-2 py-1 rounded border border-red-500/30 text-red-300 hover:bg-red-500/10">Rejeitar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
          )}
        </section>
      )}

      {!activeModule && (
        <>

      <section className="card-glass rounded-2xl p-5 card-glow">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
            <BrainCircuit size={18} className="text-primary-300" />
          </div>
          <div>
            <h1 className="text-2xl text-white font-bold">Centro Médico Integrado</h1>
            <p className="text-sm text-gray-400">IA, questões, resumos, mnemônicos, flashcards, cronograma e lembretes em um único local.</p>
          </div>
          </div>
          <button
            type="button"
            onClick={() => toggleMainSection('overview')}
            className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-gray-300 hover:text-white inline-flex items-center gap-1"
          >
            {sectionExpanded.overview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {sectionExpanded.overview ? 'Minimizar' : 'Maximizar'}
          </button>
        </div>

        {sectionExpanded.overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg border border-app-border bg-app-card/60 p-3">
            <p className="text-gray-400">Revisões hoje</p>
            <p className="text-white font-bold text-lg">{reviewDueCount}</p>
          </div>
          <div className="rounded-lg border border-app-border bg-app-card/60 p-3">
            <p className="text-gray-400">Lembretes ativos</p>
            <p className="text-white font-bold text-lg">{pendingRemindersCount}</p>
          </div>
          <div className="rounded-lg border border-app-border bg-app-card/60 p-3">
            <p className="text-gray-400">Cronograma</p>
            <p className="text-white font-bold text-lg">{scheduleCount}</p>
          </div>
          <div className="rounded-lg border border-app-border bg-app-card/60 p-3">
            <p className="text-gray-400">Min/semana</p>
            <p className="text-white font-bold text-lg">{weeklyMinutes}</p>
          </div>
        </div>
        )}
      </section>

      <section className="card-glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck size={18} className="text-emerald-300" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Módulos Avançados do Centro Médico</h2>
            <p className="text-xs text-gray-400">Funcionalidades inspiradas no MedSimples para gestão clínica completa.</p>
          </div>
          </div>
          <button
            type="button"
            onClick={() => toggleMainSection('advanced')}
            className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-gray-300 hover:text-white inline-flex items-center gap-1"
          >
            {sectionExpanded.advanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {sectionExpanded.advanced ? 'Minimizar' : 'Maximizar'}
          </button>
        </div>

        {sectionExpanded.advanced && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {MEDICAL_CENTER_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                role="button"
                tabIndex={0}
                onClick={() => navigate(moduleRoute(feature.key))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(moduleRoute(feature.key));
                  }
                }}
                className={`rounded-xl border bg-app-card/60 p-5 transition-colors cursor-pointer min-h-[220px] ${activeModule === feature.key ? 'border-primary-500/50' : 'border-app-border hover:border-primary-500/40'}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary-600/15 border border-primary-500/25 flex items-center justify-center">
                    <Icon size={16} className="text-primary-300" />
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-semibold">
                    {feature.status}
                  </span>
                </div>

                <p className="text-white text-sm font-semibold mb-1">{feature.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{feature.description}</p>
                <span className="inline-block mt-4 text-xs px-3 py-1.5 rounded-lg border border-primary-500/30 text-primary-300 hover:bg-primary-600/10">
                  {feature.actionLabel}
                </span>
              </div>
            );
          })}
        </div>
        )}
      </section>

      <section className="card-glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-white font-semibold">Pipeline interno de leads</h2>
            <p className="text-xs text-gray-400">Gerencie os cadastros públicos por etapa comercial.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <button
              type="button"
              onClick={() => toggleMainSection('leads')}
              className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-gray-300 hover:text-white inline-flex items-center gap-1"
            >
              {sectionExpanded.leads ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {sectionExpanded.leads ? 'Minimizar' : 'Maximizar'}
            </button>
            <span className="px-2 py-1 rounded border border-app-border bg-app-card/60">Novo: {leadTotals.new}</span>
            <span className="px-2 py-1 rounded border border-app-border bg-app-card/60">Contatado: {leadTotals.contacted}</span>
            <span className="px-2 py-1 rounded border border-app-border bg-app-card/60">Qualificado: {leadTotals.qualified}</span>
            <span className="px-2 py-1 rounded border border-app-border bg-app-card/60">Fechado: {leadTotals.closed}</span>
          </div>
        </div>

        {sectionExpanded.leads && (
        <>
        <div className="grid md:grid-cols-5 gap-2 mb-3">
          <input
            className="input-field md:col-span-2"
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            placeholder="Buscar por nome, email, clínica, CNPJ ou telefone"
          />
          <select
            className="input-field"
            value={leadStatusFilter}
            onChange={(e) => setLeadStatusFilter(e.target.value as ClinicLeadStatus | 'all')}
          >
            {LEAD_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="date"
            className="input-field"
            value={leadStartDate}
            onChange={(e) => setLeadStartDate(e.target.value)}
            title="Data inicial"
          />
          <input
            type="date"
            className="input-field"
            value={leadEndDate}
            onChange={(e) => setLeadEndDate(e.target.value)}
            title="Data final"
          />
        </div>

        {leadError && (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{leadError}</div>
        )}

        {leadLoading ? (
          <div className="py-6 text-sm text-gray-300 flex items-center justify-center">
            <Loader2 size={16} className="animate-spin mr-2" /> Carregando leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="py-6 text-sm text-gray-400 text-center">Nenhum lead encontrado com os filtros atuais.</div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {leads.map((lead) => (
              <div key={lead._id} className="rounded-lg border border-app-border bg-app-card/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-semibold truncate">{lead.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{lead.email}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {lead.clinic_name || 'Clínica não informada'}
                      {(lead.ddd || lead.phone) ? ` • (${lead.ddd || '--'}) ${lead.phone || ''}` : ''}
                    </p>
                    <p className="text-[11px] text-gray-500">Cadastro: {new Date(lead.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full border border-primary-500/30 bg-primary-600/10 text-primary-300 font-semibold">
                    {LEAD_STATUS_LABEL[lead.status]}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(LEAD_STATUS_LABEL) as ClinicLeadStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => updateLeadStatus(lead._id, status)}
                      disabled={leadUpdatingId === lead._id || lead.status === status}
                      className={`text-[11px] px-2 py-1 rounded border transition-colors ${lead.status === status ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' : 'border-app-border text-gray-300 hover:text-white'} disabled:opacity-60`}
                    >
                      {LEAD_STATUS_LABEL[status]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-gray-400">
            Página {leadPagination.page} de {leadPagination.totalPages} • {leadPagination.total} lead(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLeadPage((prev) => Math.max(prev - 1, 1))}
              disabled={!leadPagination.hasPrev || leadLoading}
              className="px-2.5 py-1.5 rounded border border-app-border text-gray-300 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setLeadPage((prev) => prev + 1)}
              disabled={!leadPagination.hasNext || leadLoading}
              className="px-2.5 py-1.5 rounded border border-app-border text-gray-300 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
        </>
        )}
      </section>

        </>
      )}

      {activeModule && (
        <section className="card-glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">{activeModuleMeta ? activeModuleMeta.title : 'Workspace do módulo'}</h2>
            <button onClick={closeModule} className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-gray-300 hover:text-white">Voltar ao menu</button>
          </div>

          {activeModule === 'ai_schedule' && (
            <div className="space-y-3">
              <button onClick={createAiSchedule} className="btn-primary text-xs px-3 py-2">Gerar horários inteligentes</button>
              <div className="grid md:grid-cols-3 gap-2">
                {aiSlots.map((slot) => (
                  <div key={slot} className="rounded-lg border border-app-border bg-app-card/50 p-3 text-sm text-gray-200">{slot}</div>
                ))}
              </div>
            </div>
          )}

          {activeModule === 'tiss' && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-4 gap-2">
                <input className="input-field" value={tissPatient} onChange={(e) => setTissPatient(e.target.value)} placeholder="Paciente" />
                <input className="input-field" value={tissOperator} onChange={(e) => setTissOperator(e.target.value)} placeholder="Operadora" />
                <input className="input-field" value={tissAmount} onChange={(e) => setTissAmount(e.target.value)} placeholder="Valor" />
                <button onClick={addTissGuide} className="btn-primary text-xs px-3 py-2">Adicionar guia</button>
              </div>
              <div className="space-y-2">
                {tissGuides.map((g) => (
                  <div key={g.id} className="rounded-lg border border-app-border bg-app-card/50 p-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-200">{g.patient} • {g.operator} • R$ {g.amount.toFixed(2)}</p>
                    <button onClick={() => advanceGuideStatus(g.id)} className="text-xs px-2 py-1 rounded border border-primary-500/30 text-primary-300">{g.status === 'draft' ? 'Enviar' : g.status === 'sent' ? 'Marcar pago' : 'Pago'}</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeModule === 'protocols' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input className="input-field" value={protocolName} onChange={(e) => setProtocolName(e.target.value)} placeholder="Novo protocolo" />
                <button onClick={addProtocol} className="btn-primary text-xs px-3 py-2">Adicionar</button>
              </div>
              <div className="space-y-2">
                {protocols.map((p) => (
                  <div key={p.id} className="rounded-lg border border-app-border bg-app-card/50 p-3 flex items-center justify-between">
                    <span className="text-sm text-gray-200">{p.name}</span>
                    <button onClick={() => setProtocols((prev) => prev.map((x) => x.id === p.id ? { ...x, active: !x.active } : x))} className="text-xs px-2 py-1 rounded border border-app-border text-gray-300">
                      {p.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeModule === 'credentialing' && (
            <div className="space-y-2">
              {credentialing.map((c) => (
                <div key={c.id} className="rounded-lg border border-app-border bg-app-card/50 p-3 flex items-center justify-between">
                  <p className="text-sm text-gray-200">{c.operator} • etapa: {c.stage}</p>
                  <button onClick={() => advanceCredentialing(c.id)} className="text-xs px-2 py-1 rounded border border-primary-500/30 text-primary-300">Avançar etapa</button>
                </div>
              ))}
            </div>
          )}

          {activeModule === 'marketplace' && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-7 gap-2">
                <input
                  className="input-field md:col-span-2"
                  placeholder="Cidade"
                  value={marketplaceCity}
                  onChange={(e) => {
                    setMarketplaceCity(e.target.value);
                    setMarketplacePage(1);
                  }}
                />
                <input
                  className="input-field"
                  placeholder="UF"
                  value={marketplaceState}
                  maxLength={2}
                  onChange={(e) => {
                    setMarketplaceState(e.target.value.toUpperCase());
                    setMarketplacePage(1);
                  }}
                />
                <input
                  className="input-field"
                  placeholder="Especialidade (ex: cardiologia)"
                  value={marketplaceSpecialty}
                  onChange={(e) => {
                    setMarketplaceSpecialty(e.target.value);
                    setMarketplacePage(1);
                  }}
                />
                <select
                  className="input-field"
                  value={marketplaceType}
                  onChange={(e) => {
                    setMarketplaceType(e.target.value as 'all' | 'public' | 'private');
                    setMarketplacePage(1);
                  }}
                >
                  {MARKETPLACE_OWNERSHIP_FILTERS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={useCurrentLocationForMarketplace}
                  className="text-xs px-3 py-2 rounded border border-app-border text-gray-300 hover:text-white"
                >
                  Usar minha localização
                </button>
                <button
                  onClick={() => loadMarketplace({ city: marketplaceCity, state: marketplaceState, type: marketplaceType, specialty: marketplaceSpecialty, lat: marketplaceUserLat, lon: marketplaceUserLon, page: 1 })}
                  className="btn-primary text-xs px-3 py-2"
                >
                  Buscar
                </button>
              </div>

              {marketplaceError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{marketplaceError}</div>
              )}

              {marketplaceLoading ? (
                <div className="py-6 text-sm text-gray-300 flex items-center justify-center">
                  <Loader2 size={16} className="animate-spin mr-2" /> Carregando dados reais...
                </div>
              ) : marketplaceItems.length === 0 ? (
                <div className="py-6 text-sm text-gray-400 text-center">Nenhum estabelecimento encontrado para os filtros atuais.</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-2">
                  {marketplaceItems.map((item) => (
                    <div key={item.id} className="rounded-lg border border-app-border bg-app-card/50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-100 font-semibold">{item.name}</p>
                        <span className={`text-[10px] px-2 py-1 rounded-full border ${item.ownership === 'public' ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' : item.ownership === 'private' ? 'border-amber-500/30 text-amber-300 bg-amber-500/10' : 'border-gray-500/30 text-gray-300 bg-gray-500/10'}`}>
                          {item.ownership === 'public' ? 'Público' : item.ownership === 'private' ? 'Privado' : 'Indefinido'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Tipo: {item.kind}</p>
                      <p className="text-xs text-gray-400">{item.city}/{item.state}</p>
                      {item.address && <p className="text-xs text-gray-500 mt-1">{item.address}</p>}

                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        {typeof item.distance_km === 'number' && Number.isFinite(item.distance_km) && (
                          <span className="px-2 py-1 rounded border border-sky-500/30 text-sky-300 bg-sky-500/10">
                            Distância: {item.distance_km.toFixed(1)} km
                          </span>
                        )}
                        {typeof item.relevance_score === 'number' && Number.isFinite(item.relevance_score) && (
                          <span className="px-2 py-1 rounded border border-primary-500/30 text-primary-300 bg-primary-500/10">
                            Score: {item.relevance_score.toFixed(3)}
                          </span>
                        )}
                        {item.specialty_match && (
                          <span className="px-2 py-1 rounded border border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
                            Match especialidade
                          </span>
                        )}
                      </div>

                      {item.specialties && item.specialties.length > 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          Especialidades: {item.specialties.slice(0, 4).join(', ')}
                        </p>
                      )}

                      <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary-300 hover:text-primary-200 underline">
                        Ver origem pública ({item.source})
                      </a>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                <span>Página {marketplacePagination.page} de {marketplacePagination.totalPages} • {marketplacePagination.total} resultado(s)</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMarketplacePage((prev) => Math.max(prev - 1, 1))}
                    disabled={!marketplacePagination.hasPrev || marketplaceLoading}
                    className="px-2 py-1 rounded border border-app-border text-gray-300 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setMarketplacePage((prev) => prev + 1)}
                    disabled={!marketplacePagination.hasNext || marketplaceLoading}
                    className="px-2 py-1 rounded border border-app-border text-gray-300 disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'visibility' && (
            <div className="space-y-3">
              <button onClick={() => setVisibilityStats((v) => ({ patients: v.patients + 3, operators: v.operators + 1 }))} className="btn-primary text-xs px-3 py-2">Lançar campanha</button>
              <p className="text-sm text-gray-300">Leads de pacientes: <span className="text-white font-semibold">{visibilityStats.patients}</span></p>
              <p className="text-sm text-gray-300">Leads de operadoras: <span className="text-white font-semibold">{visibilityStats.operators}</span></p>
            </div>
          )}

          {activeModule === 'anticipation' && (
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-app-border bg-app-card/50 p-3"><p className="text-xs text-gray-400">Recebíveis elegíveis</p><p className="text-xl text-white font-bold">R$ {totalReceivables.toFixed(2)}</p></div>
              <div className="rounded-lg border border-app-border bg-app-card/50 p-3"><p className="text-xs text-gray-400">Antecipação estimada</p><p className="text-xl text-emerald-300 font-bold">R$ {anticipatedValue.toFixed(2)}</p></div>
              <div className="rounded-lg border border-app-border bg-app-card/50 p-3"><p className="text-xs text-gray-400">Taxa simulada</p><p className="text-xl text-white font-bold">8%</p></div>
            </div>
          )}

          {activeModule === 'prescriber' && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-3 gap-2">
                <input className="input-field" value={rxPatient} onChange={(e) => setRxPatient(e.target.value)} placeholder="Paciente" />
                <input className="input-field" value={rxDrug} onChange={(e) => setRxDrug(e.target.value)} placeholder="Medicamento" />
                <button onClick={addPrescription} className="btn-primary text-xs px-3 py-2">Prescrever</button>
              </div>
              {prescriptions.map((rx) => <div key={rx.id} className="rounded-lg border border-app-border bg-app-card/50 p-3 text-sm text-gray-200">{rx.patient} • {rx.drug}</div>)}
            </div>
          )}

          {activeModule === 'ehr' && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-3 gap-2">
                <input className="input-field" value={recordPatient} onChange={(e) => setRecordPatient(e.target.value)} placeholder="Paciente" />
                <input className="input-field md:col-span-2" value={recordText} onChange={(e) => setRecordText(e.target.value)} placeholder="Evolução clínica" />
              </div>
              <button onClick={addRecordNote} className="btn-primary text-xs px-3 py-2">Salvar no prontuário</button>
              {recordNotes.map((r) => <div key={r.id} className="rounded-lg border border-app-border bg-app-card/50 p-3 text-sm text-gray-200">{r.patient} • {r.note}</div>)}
            </div>
          )}

          {activeModule === 'telemedicine' && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-3 gap-2">
                <input className="input-field" value={telePatient} onChange={(e) => setTelePatient(e.target.value)} placeholder="Paciente" />
                <input className="input-field" type="datetime-local" value={teleDate} onChange={(e) => setTeleDate(e.target.value)} />
                <button onClick={addTeleconsultation} className="btn-primary text-xs px-3 py-2">Agendar teleconsulta</button>
              </div>
              {teleQueue.map((t) => (
                <div key={t.id} className="rounded-lg border border-app-border bg-app-card/50 p-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-200">{t.patient} • {new Date(t.date).toLocaleString('pt-BR')} • {t.status}</p>
                  <div className="flex gap-2">
                    <button onClick={() => startTeleconsultation(t.id)} className="text-xs px-2 py-1 rounded border border-primary-500/30 text-primary-300">Iniciar</button>
                    <button onClick={() => finishTeleconsultation(t.id)} className="text-xs px-2 py-1 rounded border border-emerald-500/30 text-emerald-300">Finalizar</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-app-border/70">
            <button onClick={closeModule} className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-gray-300 hover:text-white">
              Voltar ao menu do Centro Médico
            </button>
          </div>
        </section>
      )}

      {!activeModule && (
        <>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card-glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold flex items-center gap-2"><ClipboardCheck size={16} /> Banco de Questões</h2>
            <button
              type="button"
              onClick={() => toggleMainSection('questions')}
              className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-gray-300 hover:text-white inline-flex items-center gap-1"
            >
              {sectionExpanded.questions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {sectionExpanded.questions ? 'Minimizar' : 'Maximizar'}
            </button>
          </div>
          {sectionExpanded.questions && (
          <>
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <select
              value={selectedPhase}
              onChange={(e) => onPhaseChange(e.target.value)}
              className="input-field max-w-[220px]"
            >
              {PHASES.map((phase) => (
                <option key={phase.value} value={phase.value}>{phase.label}</option>
              ))}
            </select>
            <button onClick={startSimulation} className="btn-secondary text-xs px-3 py-2">Iniciar Simulado (10 questões)</button>
          </div>

          {simRunning && (
            <div className="mb-3 rounded-lg border border-primary-500/30 bg-primary-600/10 p-3">
              <p className="text-xs text-primary-300 mb-2 flex items-center gap-1"><Timer size={12} /> Simulado em andamento: {simSeconds}s</p>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {simQuestions.map((q, idx) => (
                  <div key={q.id} className="text-xs border border-app-border rounded-md p-2">
                    <p className="text-gray-300 mb-1">{idx + 1}. {q.statement}</p>
                    <select
                      className="input-field"
                      value={simAnswers[q.id] ?? ''}
                      onChange={(e) => setSimAnswers((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))}
                    >
                      <option value="" disabled>Selecione uma alternativa</option>
                      {q.options.map((opt, optIdx) => (
                        <option key={optIdx} value={optIdx}>{opt}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <button onClick={finishSimulation} className="btn-primary text-xs px-3 py-2 mt-2">Finalizar Simulado</button>
            </div>
          )}

          {simResult && (
            <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-200">
              Resultado do último simulado: {simResult.correct_answers}/{simResult.total_questions} ({simResult.accuracy}%).
            </div>
          )}

          {simRanking.personal_best && (
            <p className="text-xs text-gray-400 mb-2">
              Melhor desempenho pessoal: {simRanking.personal_best.accuracy}% em {simRanking.personal_best.total_questions} questões.
            </p>
          )}

          {!currentQuestion ? (
            <p className="text-gray-400 text-sm">Sem questões disponíveis.</p>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-2">{currentQuestion.subject} • {currentQuestion.phase}</p>
              <p className="text-white text-sm mb-3">{currentQuestion.statement}</p>
              <div className="space-y-2 mb-3">
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${selectedOption === idx ? 'border-primary-500/50 bg-primary-600/15 text-white' : 'border-app-border text-gray-300 hover:text-white'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-400">Acurácia: {questionStats.accuracy}% ({questionStats.correct_attempts}/{questionStats.total_attempts})</p>
                <button onClick={submitQuestionAttempt} disabled={selectedOption === null} className="btn-primary text-xs px-3 py-2">Responder</button>
              </div>
              {questionFeedback && <p className="text-xs text-primary-300 mt-3">{questionFeedback}</p>}
            </>
          )}
          </>
          )}
        </section>

        <section className="card-glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold flex items-center gap-2"><Bot size={16} /> Tigas IA</h2>
            <button
              type="button"
              onClick={() => toggleMainSection('jarvis')}
              className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-gray-300 hover:text-white inline-flex items-center gap-1"
            >
              {sectionExpanded.jarvis ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {sectionExpanded.jarvis ? 'Minimizar' : 'Maximizar'}
            </button>
          </div>
          {sectionExpanded.jarvis && (
          <>
          <form onSubmit={askJarvis} className="space-y-3">
            <textarea className="input-field min-h-[100px]" placeholder="Pergunte algo de medicina, peça resumo, plano adaptativo ou estratégia para prova..." value={jarvisInput} onChange={(e) => setJarvisInput(e.target.value)} />
            <button className="btn-primary text-xs px-3 py-2" disabled={askingJarvis}>{askingJarvis ? 'Consultando...' : 'Perguntar'}</button>
          </form>
          {jarvisReply && <div className="mt-3 rounded-lg border border-app-border bg-app-card/50 p-3 text-sm text-gray-200 whitespace-pre-wrap">{jarvisReply}</div>}
          </>
          )}
        </section>
      </div>

      <section className="card-glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-semibold flex items-center gap-2"><CalendarClock size={16} /> Plano adaptativo diário</h2>
          <button
            type="button"
            onClick={() => toggleMainSection('dailyPlan')}
            className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-gray-300 hover:text-white inline-flex items-center gap-1"
          >
            {sectionExpanded.dailyPlan ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {sectionExpanded.dailyPlan ? 'Minimizar' : 'Maximizar'}
          </button>
        </div>
        {sectionExpanded.dailyPlan && (
        <div className="grid md:grid-cols-2 gap-2">
          {dailyPlan.map((block, idx) => (
            <div key={`${block.type}-${idx}`} className="rounded-lg border border-app-border bg-app-card/50 p-3">
              <p className="text-sm text-white font-medium">{block.title}</p>
              <p className="text-xs text-gray-400 mt-1">{block.detail}</p>
              <p className="text-[11px] text-primary-300 mt-2">{block.minutes} min • prioridade {block.priority}</p>
            </div>
          ))}
        </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card-glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold flex items-center gap-2"><Sparkles size={16} /> Resumos Dinâmicos</h2>
            <button
              type="button"
              onClick={() => toggleMainSection('summaries')}
              className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-gray-300 hover:text-white inline-flex items-center gap-1"
            >
              {sectionExpanded.summaries ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {sectionExpanded.summaries ? 'Minimizar' : 'Maximizar'}
            </button>
          </div>
          {sectionExpanded.summaries && (
          <>
          <form onSubmit={createSummary} className="space-y-2">
            <input className="input-field" value={summaryTitle} onChange={(e) => setSummaryTitle(e.target.value)} placeholder="Título do resumo" />
            <input className="input-field" value={summarySubject} onChange={(e) => setSummarySubject(e.target.value)} placeholder="Disciplina" />
            <textarea className="input-field min-h-[110px]" value={summaryText} onChange={(e) => setSummaryText(e.target.value)} placeholder="Cole o conteúdo para resumir..." />
            <button className="btn-primary text-xs px-3 py-2" disabled={creatingSummary}>{creatingSummary ? 'Gerando...' : 'Gerar resumo'}</button>
          </form>

          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
            {summaries.slice(0, 4).map((s) => (
              <div key={s.id} className="rounded-lg border border-app-border bg-app-card/50 p-3">
                <p className="text-sm text-white font-medium">{s.title}</p>
                <ul className="mt-2 list-disc ml-5 text-xs text-gray-300 space-y-1">
                  {(s.bullets || []).slice(0, 3).map((b, idx) => <li key={idx}>{b}</li>)}
                </ul>
                <button className="mt-2 text-xs px-2 py-1 rounded border border-primary-500/30 text-primary-300 hover:bg-primary-600/10" onClick={() => convertSummaryToFlashcards(s.id)}>
                  <BookOpen size={12} className="inline mr-1" /> Converter em flashcards
                </button>
              </div>
            ))}
          </div>
          </>
          )}
        </section>

        <section className="card-glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold flex items-center gap-2"><Wand2 size={16} /> Macetes e Mnemônicos</h2>
            <button
              type="button"
              onClick={() => toggleMainSection('mnemonics')}
              className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-gray-300 hover:text-white inline-flex items-center gap-1"
            >
              {sectionExpanded.mnemonics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {sectionExpanded.mnemonics ? 'Minimizar' : 'Maximizar'}
            </button>
          </div>
          {sectionExpanded.mnemonics && (
          <>
          <form onSubmit={createMnemonic} className="space-y-2">
            <input className="input-field" value={mnTerm} onChange={(e) => setMnTerm(e.target.value)} placeholder="Tema/termo (ex: critérios de Duke)" />
            <input className="input-field" value={mnPhrase} onChange={(e) => setMnPhrase(e.target.value)} placeholder="Mnemônico (ex: VINDICATE)" />
            <input className="input-field" value={mnContext} onChange={(e) => setMnContext(e.target.value)} placeholder="Contexto clínico (opcional)" />
            <button className="btn-primary text-xs px-3 py-2" disabled={creatingMnemonic}>{creatingMnemonic ? 'Salvando...' : 'Salvar mnemônico'}</button>
          </form>

          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
            {mnemonics.slice(0, 6).map((m) => (
              <div key={m.id} className="rounded-lg border border-app-border bg-app-card/50 p-3">
                <p className="text-sm text-white font-medium">{m.term}</p>
                <p className="text-xs text-primary-300 mt-1">{m.phrase}</p>
                {m.context ? <p className="text-xs text-gray-400 mt-1">{m.context}</p> : null}
              </div>
            ))}
          </div>
          </>
          )}
        </section>
      </div>

      <section className="card-glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-semibold flex items-center gap-2"><CalendarClock size={16} /> Interação entre funcionalidades</h2>
          <button
            type="button"
            onClick={() => toggleMainSection('interaction')}
            className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-gray-300 hover:text-white inline-flex items-center gap-1"
          >
            {sectionExpanded.interaction ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {sectionExpanded.interaction ? 'Minimizar' : 'Maximizar'}
          </button>
        </div>
        {sectionExpanded.interaction && (
          <p className="text-sm text-gray-300">
            Use o Centro Médico para: conversar com a Tigas IA, gerar resumo, converter resumo em flashcards, filtrar questões por fase, rodar simulados com timer/ranking, salvar mnemônicos e seguir plano diário adaptativo.
            Os lembretes importantes de provas/trabalhos continuam sendo enviados automaticamente por WhatsApp e Email via sessão de lembretes.
          </p>
        )}
      </section>

        </>
      )}
    </div>
  );
}
