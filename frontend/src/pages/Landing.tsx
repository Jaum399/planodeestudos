import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  BrainCircuit, Zap, Calendar, Layers, BookOpen, BarChart2,
  Smartphone, CheckCircle2, Star, ArrowRight, Shield, Clock, Award,
  Bell, Laptop, Phone, TrendingUp, Users, ChevronDown,
  MessageSquare, Sparkles, Send
} from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';
import { preloadRoute } from '../utils/routePrefetch';

const areas = [
  'Faculdade', 'Residência Médica', 'OAB', 'ENEM & Vestibulares',
  'Concursos', 'Revalida', 'Línguas', 'Pós-Graduação', 'Militares',
  'Magistratura', 'Medicina', 'Engenharia', 'Direito', 'Administração',
];

const testimonials = [
  { handle: '@lucas_med', role: 'Residência USP', text: 'Lembretes automáticos salvaram minha vida na revisão de Anatomia. Aprovado! 🩺', stars: 5 },
  { handle: '@adv.carol', role: 'Aprovada OAB', text: 'Passei de primeira na OAB! O cronograma focou só no que eu errava. Surreal.', stars: 5 },
  { handle: '@júlia.estuda', role: 'Medicina Federal', text: 'Saí de 600 pra 940 na média geral. A IA organizou toda a minha bagunça. ❤️', stars: 5 },
  { handle: '@thiago_rfb', role: 'Auditor Fiscal', text: 'Trabalho e estudo. O app ajustou meus horários perfeitamente. Nome no DOU! 🚀', stars: 5 },
  { handle: '@eng.matheus', role: 'Politécnica', text: 'Cálculo 3 finalmente saiu! A curva de esquecimento funciona mesmo.', stars: 5 },
  { handle: '@psi.ana', role: 'Psicologia PUC', text: 'Amei a interface! Consigo ver exatamente onde estou falhando. Recomendo dms!', stars: 5 },
];

const planFeatures = [
  'Revisões inteligentes com IA (Curva de Hermann)',
  'Planner validado por +5.000 estudantes',
  'Flashcards com IA',
  'Organização estilo Kanban',
  'Notificações automáticas de revisão',
  'Sincronização de Revisões com Provas',
  'Importação de Edital com IA',
  'Integração com Google Calendar',
  'Cronograma semanal automático',
  'Interface limpa e sem distrações',
  'Analytics de desempenho com IA',
  'Simulador de revisões com IA',
];

const planFeaturesExtra = [
  'Geração inteligente de horários',
  'Revisões dinâmicas com desempenho',
  'Banco de questões integrado',
  'Mapa mental com IA',
  'Suporte prioritário',
  'Acesso via mobile e desktop',
  'Lembretes por WhatsApp',
  'Relatórios semanais automáticos',
];

const plannerDays = [
  { day: 'Segunda-feira', items: [{ sub: 'Clínica Médica', time: '1h30', color: 'blue' }, { sub: 'Psiquiatria', time: '1h30', color: 'blue' }, { sub: 'Revisão Flashcards', time: '45m', color: 'green' }] },
  { day: 'Terça-feira', items: [{ sub: 'Cardiologia', time: '1h30', color: 'purple' }, { sub: 'Endocrinologia', time: '15m', color: 'gray' }, { sub: 'Questões SUS', time: '1h00', color: 'blue' }] },
  { day: 'Quarta-feira', items: [{ sub: 'Pediatria', time: '1h30', color: 'orange' }, { sub: 'Ginecologia', time: '1h30', color: 'green' }, { sub: 'Simulado', time: '2h00', color: 'blue' }] },
];

const notifications = [
  { time: 'agora', subject: 'Nefrologia', topic: 'Síndromes Nefróticas' },
  { time: '2m', subject: 'Direito Constitucional', topic: 'Princípios Fundamentais' },
  { time: '5m', subject: 'Ginecologia', topic: 'Sangramento Uterino' },
  { time: '10m', subject: 'Pediatria', topic: 'Marcos do desenvolvimento' },
  { time: '15m', subject: 'Legislação', topic: 'Estatuto do Servidor' },
];

const flashcards = [
  { category: 'História', question: 'Quem proclamou a independência do Brasil?', answer: 'Dom Pedro I, em 7 de setembro de 1822, às margens do rio Ipiranga.' },
  { category: 'Cardiologia', question: 'Quais são os sinais clássicos de IAM?', answer: 'Dor precordial em aperto, irradiação para braço esquerdo, sudorese e dispneia.' },
  { category: 'Direito', question: 'O que é o princípio da legalidade?', answer: 'Ninguém é obrigado a fazer ou deixar de fazer algo senão em virtude de lei (CF art. 5°, II).' },
  { category: 'Matemática', question: 'Qual a fórmula da progressão geométrica?', answer: 'an = a1 × q^(n-1), onde q é a razão e a1 o primeiro termo.' },
];

interface JarvisMsg { from: 'user' | 'ai'; text?: string; list?: string[]; }
const jarvisScenarios: { label: string; messages: JarvisMsg[] }[] = [
  {
    label: 'No ônibus 🚌',
    messages: [
      { from: 'user', text: 'Oi Jarvis, tenho 20 minutos. O que revisar?' },
      { from: 'ai', text: 'Com base no seu histórico, 3 matérias estão no ponto ideal hoje:' },
      { from: 'ai', list: ['🫀 Cardiologia — última revisão há 3 dias', '🧠 Neurologia — 2 flashcards pendentes', '🦠 Microbiologia — 85% de esquecimento previsto'] },
      { from: 'ai', text: 'Inicio os flashcards de Cardiologia agora? 👇' },
    ],
  },
  {
    label: 'Antes da prova 📚',
    messages: [
      { from: 'user', text: 'Jarvis, minha prova de Cardiologia é amanhã.' },
      { from: 'ai', text: 'Entendido! Aqui está seu plano de revisão express de 2 horas:' },
      { from: 'ai', list: ['⏱ 20min — Síndromes Coronarianas (revisão rápida)', '⏱ 30min — Flashcards: ECG + Arritmias', '⏱ 40min — 20 questões nos seus pontos fracos', '⏱ 30min — Revisão das questões erradas'] },
      { from: 'ai', text: 'Vai dormir cedo. A memória consolida no sono 🌙' },
    ],
  },
  {
    label: 'Após simulado 📊',
    messages: [
      { from: 'user', text: 'Acabei o simulado. Errei demais em Neurologia 😞' },
      { from: 'ai', text: 'Vi seu resultado! Você acertou 48% em Neuro. Os pontos críticos foram:' },
      { from: 'ai', list: ['❌ Síndromes Vasculares — 38% de acerto', '❌ Epilepsias — 42% de acerto', '❌ Desmielinizantes — 51% de acerto'] },
      { from: 'ai', text: 'Já agendei revisões extras para os próximos 5 dias. Vamos recuperar! 💪' },
    ],
  },
  {
    label: 'Falta 1 semana ⏰',
    messages: [
      { from: 'user', text: 'Jarvis, minha residência é em 7 dias. Estou em pânico.' },
      { from: 'ai', text: 'Respira! Aqui está seu plano de choque baseado no seu histórico:' },
      { from: 'ai', list: ['📅 Dias 1-3: Matérias com maior peso no edital', '📅 Dias 4-5: Revisão dos seus pontos fracos', '📅 Dia 6: Simulado geral + revisão dos erros', '📅 Dia 7: Revisão leve + descanso. Você merece!'] },
      { from: 'ai', text: 'Você estudou pra isso. Confia no processo! 🚀' },
    ],
  },
  {
    label: 'Sexta à noite 🌙',
    messages: [
      { from: 'user', text: 'É sexta, to cansado mas quero estudar algo leve.' },
      { from: 'ai', text: 'Perfeito para manutenção! Aqui vai um plano de 30 minutos leves:' },
      { from: 'ai', list: ['🃏 15 flashcards do assunto que você mais curte', '🎯 5 questões fáceis para manter o ritmo', '✅ Marcar o progresso da semana no planner'] },
      { from: 'ai', text: 'Você estudou 4h42min essa semana. Descansa com consciência limpa! 😄' },
    ],
  },
];

// Animated counter hook
function useCountUp(target: number, isVisible: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isVisible) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isVisible, target]);
  return count;
}

export default function Landing() {
  const navigate = useNavigate();
  const [retentionPct, setRetentionPct] = useState(0);
  const [plannerSlide, setPlannerSlide] = useState(0);
  const [notifSlide, setNotifSlide] = useState(0);
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [counterVisible, setCounterVisible] = useState(false);
  const [showExtraFeatures, setShowExtraFeatures] = useState(false);
  const [jarvisScenario, setJarvisScenario] = useState(0);
  const [jarvisStep, setJarvisStep] = useState(0);
  const counterRef = useRef<HTMLDivElement>(null);
  const studentsCount = useCountUp(5000, counterVisible);

  // Scroll-based retention counter
  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById('simulador-section');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const windowH = window.innerHeight;
      if (rect.top < windowH && rect.bottom > 0) {
        const progress = Math.min(1, (windowH - rect.top) / (windowH + rect.height));
        setRetentionPct(Math.round(progress * 94));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-advance planner slides
  useEffect(() => {
    const t = setInterval(() => setPlannerSlide(p => (p + 1) % plannerDays.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Auto-advance notification slides
  useEffect(() => {
    const t = setInterval(() => setNotifSlide(p => (p + 1) % notifications.length), 2500);
    return () => clearInterval(t);
  }, []);

  // Intersection observer for counter
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setCounterVisible(true); }, { threshold: 0.3 });
    if (counterRef.current) obs.observe(counterRef.current);
    return () => obs.disconnect();
  }, []);

  // Jarvis chat animation
  useEffect(() => {
    setJarvisStep(0);
    const msgs = jarvisScenarios[jarvisScenario].messages;
    const timers: number[] = [];
    msgs.forEach((_, i) => {
      timers.push(window.setTimeout(() => setJarvisStep(s => Math.max(s, i + 1)), (i + 1) * 900));
    });
    return () => timers.forEach(clearTimeout);
  }, [jarvisScenario]);

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
    green: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
    orange: 'bg-orange-500/20 border-orange-500/30 text-orange-300',
    gray: 'bg-gray-700/40 border-gray-600/30 text-gray-300',
  };

  return (
    <div className="min-h-screen bg-app-bg overflow-x-hidden">
      <LandingNavbar />

      {/* Hero */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-700/15 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-violet-900/20 rounded-full blur-[80px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-primary-600/10 border border-primary-600/30 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
                <span className="text-primary-300 text-xs font-medium">✨ Novo: Revisões com IA integrada</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[0.95] mb-6">
                Clareza cognitiva
                <br />
                <span className="gradient-text">estrutura de execução.</span>
              </h1>

              <p className="text-gray-300 text-base sm:text-lg md:text-2xl leading-relaxed mb-8 md:mb-10 max-w-2xl">
                Desenvolvido com base em ciência cognitiva e organização estratégica, o Ordex estrutura exatamente o que você precisa estudar — no momento certo.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <button onMouseEnter={() => preloadRoute('/register')} onFocus={() => preloadRoute('/register')} onClick={() => navigate('/register')} className="btn-primary text-base px-8 py-4 glow-pulse">
                  Garantir meu acesso agora
                  <ArrowRight size={18} />
                </button>
                <a href="#features" className="btn-secondary text-base px-8 py-4 justify-center">
                  Ver como funciona
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-sm text-gray-500">
                {[{ icon: Shield, text: 'Pagamento 100% seguro' }, { icon: Clock, text: 'Garantia de 7 dias' }, { icon: Award, text: '+5.000 aprovados' }].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <Icon size={14} className="text-primary-400" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-3xl border border-primary-600/20 bg-gradient-to-br from-primary-950/60 via-app-card to-app-card p-5 shadow-2xl shadow-primary-950/20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-primary-300 text-xs font-semibold uppercase tracking-[0.24em] mb-2">Apps oficiais</p>
                    <h3 className="text-white text-xl md:text-2xl font-black mb-1">Baixe o Ordex no seu dispositivo</h3>
                    <p className="text-gray-400 text-sm md:text-base max-w-xl">
                      Acesse a mesma plataforma no celular. Disponível para Android.
                    </p>
                  </div>
                  <div className="inline-flex items-center self-start rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-300 text-xs font-semibold">
                    Downloads liberados
                  </div>
                </div>

                <div className="mt-5">
                  <a
                    href="/downloads/ordex.apk"
                    download="ordex.apk"
                    className="group flex items-center justify-between rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-4 gap-2 transition-all hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-emerald-500/15"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/20">
                        <svg className="w-7 h-7 text-emerald-300 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.4-.59-2.96-.91-4.47-.91s-3.07.32-4.47.91L5.65 5.67c-.19-.29-.57-.38-.86-.2-.28.18-.38.55-.22.85l1.84 3.18C3.45 11.07 1.93 14.07 2 17.27h20c.07-3.2-1.45-6.2-4.4-7.79zM7 15.25c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[11px] text-emerald-200/80 font-medium uppercase tracking-wide">Android</p>
                        <p className="text-white text-base font-bold">Baixar APK</p>
                        <p className="text-gray-400 text-xs">Instalação direta no dispositivo</p>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-emerald-300 transition-transform group-hover:translate-x-1" />
                  </a>

                </div>
              </div>
            </div>

            {/* Right phone mockup */}
            <div className="relative flex justify-center mt-2 md:mt-0">
              <div className="relative">
                {/* Glow halo */}
                <div className="absolute inset-0 bg-primary-600/20 rounded-[3rem] blur-2xl scale-110" />
                {/* Phone frame */}
                <div className="relative w-[15.5rem] sm:w-64 md:w-72 bg-app-card border border-app-border rounded-[3rem] overflow-hidden shadow-2xl shadow-primary-900/40 p-1">
                  <div className="bg-app-surface rounded-[2.5rem] overflow-hidden">
                    {/* Status bar */}
                    <div className="flex justify-between items-center px-6 pt-5 pb-2">
                      <span className="text-white text-xs font-medium">9:41</span>
                      <div className="w-28 h-5 bg-black rounded-full" />
                      <div className="flex gap-1">
                        <div className="w-3 h-1.5 bg-white rounded-sm opacity-60" />
                        <div className="w-3 h-1.5 bg-white rounded-sm opacity-80" />
                        <div className="w-3 h-1.5 bg-white rounded-sm" />
                      </div>
                    </div>

                    {/* App content */}
                    <div className="px-5 pb-6">
                      <div className="mb-3">
                        <p className="text-gray-400 text-xs">Olá, Maria 👋</p>
                        <p className="text-white font-bold text-sm">Seu plano de hoje</p>
                      </div>

                      {/* Progress ring */}
                      <div className="flex items-center gap-3 bg-primary-600/10 border border-primary-600/20 rounded-2xl p-3 mb-3">
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1988fe" strokeWidth="3" strokeDasharray="72, 100" strokeLinecap="round" />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">72%</span>
                        </div>
                        <div>
                          <p className="text-white text-xs font-semibold">Meta diária</p>
                          <p className="text-gray-400 text-[10px]">3/5 matérias revisadas</p>
                        </div>
                      </div>

                      {/* Cards */}
                      {[
                        { label: 'Nefrologia', tag: 'REVISÃO HOJE', urgent: true },
                        { label: 'Cardiologia', tag: 'AMANHÃ', urgent: false },
                        { label: 'Pediatria', tag: 'EM 3 DIAS', urgent: false },
                      ].map((item, i) => (
                        <div key={i} className={`flex items-center justify-between rounded-xl px-3 py-2.5 mb-2 border ${item.urgent ? 'bg-primary-600/20 border-primary-600/40' : 'bg-app-bg/60 border-white/5'}`}>
                          <div>
                            <p className="text-white text-xs font-medium">{item.label}</p>
                            <span className={`text-[10px] font-bold ${item.urgent ? 'text-primary-300' : 'text-gray-500'}`}>{item.tag}</span>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${item.urgent ? 'bg-primary-400 animate-pulse' : 'bg-gray-700'}`} />
                        </div>
                      ))}

                      {/* Bottom nav */}
                      <div className="flex justify-around mt-4 pt-3 border-t border-app-border">
                        {[BookOpen, Calendar, BarChart2, BrainCircuit].map((Icon, i) => (
                          <div key={i} className={`w-8 h-8 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-primary-600' : 'bg-transparent'}`}>
                            <Icon size={16} className={i === 0 ? 'text-white' : 'text-gray-600'} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating notification */}
                <div className="hidden sm:block absolute -right-4 top-20 bg-app-card border border-primary-600/30 rounded-2xl px-3 py-2 shadow-xl w-44 animate-float">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-primary-600/30 flex items-center justify-center flex-shrink-0">
                      <Bell size={12} className="text-primary-400" />
                    </div>
                    <div>
                      <p className="text-white text-[10px] font-semibold">Hora de revisar!</p>
                      <p className="text-gray-400 text-[9px]">Nefrologia • agora</p>
                    </div>
                  </div>
                </div>

                {/* Floating streak badge */}
                <div className="hidden sm:block absolute -left-4 bottom-24 bg-app-card border border-orange-500/30 rounded-2xl px-3 py-2 shadow-xl animate-float" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔥</span>
                    <div>
                      <p className="text-white text-[10px] font-bold">12 dias seguidos</p>
                      <p className="text-orange-400 text-[9px]">Continue assim!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Areas marquee */}
      <section className="py-6 border-y border-app-border overflow-hidden defer-render-section">
        <div className="flex gap-4" style={{ animation: 'marquee-slide 20s linear infinite' }}>
          {[...areas, ...areas].map((area, i) => (
            <div key={i} className="flex-shrink-0 bg-app-card border border-app-border rounded-full px-5 py-2 text-sm text-gray-300 whitespace-nowrap">
              {area}
            </div>
          ))}
        </div>
      </section>

      {/* Simulador cognitivo */}
      <section id="simulador-section" className="py-20 md:py-28 defer-render-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-600/10 border border-purple-600/20 rounded-xl px-3 py-1.5 mb-4">
                <BrainCircuit size={14} className="text-purple-400" />
                <span className="text-purple-300 text-xs font-semibold">Simulador Cognitivo & IA</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Sua memória, otimizada pela IA</h2>
              <p className="text-gray-400 text-base leading-relaxed mb-6">
                Nossa IA analisa seu perfil psicológico para criar uma curva de esquecimento única para sua memória. Resultado: você revisa menos, lembra mais.
              </p>
              <div className="flex gap-6">
                <div>
                  <p className="text-3xl font-black text-white">{retentionPct}%</p>
                  <p className="text-gray-500 text-xs">Retenção Estimada</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-primary-400">IA</p>
                  <p className="text-gray-500 text-xs">Personalizada</p>
                </div>
              </div>
            </div>

            {/* Graph card */}
            <div className="card-glass rounded-2xl p-6 card-glow">
              <div className="flex justify-between items-center mb-4">
                <span className="text-white text-sm font-semibold">Sua Memória</span>
                <span className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Ao vivo
                </span>
              </div>
              <div className="w-full h-40 relative">
                <svg viewBox="0 0 300 150" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id="gradGraph" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1988fe" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#1988fe" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,150 L0,100 Q75,100 150,50 T300,20 L300,150 Z" fill="url(#gradGraph)" />
                  <path d="M0,100 Q75,100 150,50 T300,20" fill="none" stroke="#1988fe" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="300" cy="20" r="5" fill="#fff" stroke="#1988fe" strokeWidth="2" />
                </svg>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Sem revisão</span>
                <span className="text-primary-400 font-semibold">Revisão ideal: Hoje, 14h</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features bento grid */}
      <section id="jarvis" className="py-20 md:py-28 relative overflow-hidden defer-render-section">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-violet-900/20 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-primary-900/20 rounded-full blur-[80px]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-violet-600/10 border border-violet-600/20 rounded-xl px-3 py-1.5 mb-4">
              <Sparkles size={13} className="text-violet-400" />
              <span className="text-violet-300 text-xs font-semibold">Assistente IA conversacional</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
              Tony Stark tem o Jarvis.<br />
              <span className="gradient-text">Você tem o Ordex.</span>
            </h2>
            <p className="section-subtitle max-w-xl mx-auto">
              Converse com nossa IA e ela organiza tudo por você — cronograma, revisões, flashcards. Só mandando uma mensagem.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">
            {/* Left: scenario selector + benefits */}
            <div>
              <p className="text-gray-400 text-sm font-medium mb-4">Escolha um cenário e veja a IA em ação:</p>
              <div className="flex flex-wrap gap-2 mb-10">
                {jarvisScenarios.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setJarvisScenario(i)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      i === jarvisScenario
                        ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-900/40'
                        : 'bg-app-card border-app-border text-gray-400 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="space-y-5">
                {[
                  { icon: MessageSquare, title: 'Converse naturalmente', desc: 'Fale com o Jarvis como você falaria com um amigo. Sem comandos complicados.' },
                  { icon: BrainCircuit, title: 'Ele conhece seu histórico', desc: 'O Jarvis sabe o que você estudou, errou e quanto tempo tem disponível.' },
                  { icon: Sparkles, title: 'Age por você', desc: 'Ele não só responde — ele agenda revisões, cria flashcards e reorganiza seu planner.' },
                  { icon: Bell, title: 'Proativo, não reativo', desc: 'Antes de você perguntar, ele já te avisa o que revisar para a prova de amanhã.' },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-9 h-9 rounded-xl bg-primary-600/10 border border-primary-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={16} className="text-primary-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold mb-0.5">{title}</p>
                      <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: chat phone mockup */}
            <div className="flex justify-center">
              <div className="relative w-full max-w-sm">
                <div className="absolute inset-0 bg-violet-600/15 rounded-3xl blur-2xl scale-105" />
                <div className="relative bg-app-card border border-app-border rounded-3xl overflow-hidden shadow-2xl">

                  {/* Chat header */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-app-border bg-app-surface/60">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-primary-600 flex items-center justify-center">
                        <BrainCircuit size={18} className="text-white" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-app-card" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold">Jarvis IA</p>
                      <p className="text-emerald-400 text-xs">online agora</p>
                    </div>
                    <div className="ml-auto flex gap-1.5">
                      <div className="w-2.5 h-2.5 bg-red-500/60 rounded-full" />
                      <div className="w-2.5 h-2.5 bg-yellow-500/60 rounded-full" />
                      <div className="w-2.5 h-2.5 bg-emerald-500/60 rounded-full" />
                    </div>
                  </div>

                  {/* Messages area */}
                  <div className="p-4 space-y-3 min-h-[320px] max-h-[320px] overflow-y-auto">
                    {jarvisScenarios[jarvisScenario].messages.map((msg, i) => {
                      if (i >= jarvisStep) return null;
                      if (msg.from === 'user') {
                        return (
                          <div key={`${jarvisScenario}-${i}`} className="flex justify-end animate-fade-in">
                            <div className="max-w-[82%] bg-primary-600 text-white text-xs rounded-2xl rounded-tr-sm px-3.5 py-2.5 leading-relaxed shadow-lg shadow-primary-900/30">
                              {msg.text}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={`${jarvisScenario}-${i}`} className="flex gap-2.5 animate-fade-in">
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-primary-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <BrainCircuit size={11} className="text-white" />
                          </div>
                          <div className="max-w-[82%]">
                            {msg.text && (
                              <div className="bg-app-surface border border-white/5 text-gray-200 text-xs rounded-2xl rounded-tl-sm px-3.5 py-2.5 leading-relaxed mb-1">
                                {msg.text}
                              </div>
                            )}
                            {msg.list && (
                              <div className="bg-app-surface border border-white/5 rounded-2xl rounded-tl-sm px-3.5 py-3 space-y-2">
                                {msg.list.map((item, li) => (
                                  <p key={li} className="text-gray-300 text-xs leading-relaxed">{item}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {jarvisStep < jarvisScenarios[jarvisScenario].messages.length &&
                      jarvisScenarios[jarvisScenario].messages[jarvisStep]?.from === 'ai' && (
                      <div className="flex gap-2.5 animate-fade-in">
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-primary-600 flex items-center justify-center flex-shrink-0">
                          <BrainCircuit size={11} className="text-white" />
                        </div>
                        <div className="bg-app-surface border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat input */}
                  <div className="px-4 pb-4 pt-2 border-t border-app-border">
                    <div className="flex items-center gap-2 bg-app-surface border border-app-border rounded-2xl px-3.5 py-2.5">
                      <input readOnly placeholder="Pergunte ao Jarvis..." className="flex-1 bg-transparent text-gray-400 text-xs outline-none placeholder:text-gray-600 cursor-default" />
                      <button className="w-7 h-7 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0 hover:bg-primary-500 transition-colors">
                        <Send size={12} className="text-white" />
                      </button>
                    </div>
                    <p className="text-center text-gray-600 text-[10px] mt-2">Demo interativo — clique nos cenários acima</p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-8 md:py-12 defer-render-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Tudo que você precisa para passar</h2>
            <p className="section-subtitle">Ferramentas inteligentes que trabalham por você enquanto você foca no que importa.</p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* 1 - Cronograma Automático (wide) */}
            <div className="lg:col-span-2 card-glass rounded-2xl p-6 card-glow">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 bg-primary-600/10 border border-primary-600/20 rounded-xl px-3 py-1.5 mb-3">
                    <Calendar size={13} className="text-primary-400" />
                    <span className="text-primary-300 text-xs font-semibold">IA analisa seu tempo livre</span>
                  </div>
                  <h3 className="text-white text-xl font-bold mb-2">Cronograma Automático</h3>
                  <p className="text-gray-400 text-sm mb-4">A IA analisa seu tempo livre e distribui as matérias de forma inteligente. Nunca mais perca tempo fazendo grade manualmente.</p>
                  <button onClick={() => navigate('/register')} className="inline-flex items-center gap-1.5 text-primary-400 hover:text-primary-300 text-sm font-semibold transition-colors">
                    Gerar meu plano <ArrowRight size={14} />
                  </button>
                </div>
                <div className="w-full md:w-64 flex-shrink-0">
                  {/* Planner slides */}
                  <div className="bg-app-bg/60 border border-app-border rounded-2xl overflow-hidden">
                    {plannerDays.map((day, di) => (
                      <div key={di} className={`transition-all duration-500 ${di === plannerSlide ? 'block' : 'hidden'}`}>
                        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                          <span className="w-2 h-2 bg-primary-400 rounded-full" />
                          <span className="text-white text-xs font-semibold">{day.day}</span>
                        </div>
                        <div className="px-3 pb-3 space-y-2">
                          {day.items.map((item, ii) => (
                            <div key={ii} className={`flex justify-between items-center rounded-xl px-3 py-2 border ${colorMap[item.color] || colorMap.blue}`}>
                              <span className="text-xs font-medium">{item.sub}</span>
                              <span className="text-[10px] opacity-70">{item.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-1.5 mt-2">
                    {plannerDays.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === plannerSlide ? 'bg-primary-400' : 'bg-app-border'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2 - Flashcards com IA */}
            <div className="card-glass rounded-2xl p-6 card-glow">
              <div className="inline-flex items-center gap-2 bg-violet-600/10 border border-violet-600/20 rounded-xl px-3 py-1.5 mb-3">
                <BookOpen size={13} className="text-violet-400" />
                <span className="text-violet-300 text-xs font-semibold">Revisão rápida e inteligente</span>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Flashcards com IA</h3>
              <p className="text-gray-400 text-sm mb-4">A IA gera flashcards das suas matérias automaticamente.</p>
              {/* Flashcard interactive */}
              <div className="cursor-pointer" onClick={() => setFcFlipped(f => !f)}>
                <div className="relative bg-app-bg/60 border border-white/5 rounded-2xl p-4 min-h-[110px] flex flex-col justify-between">
                  {!fcFlipped ? (
                    <>
                      <span className="text-xs font-bold text-primary-400">{flashcards[fcIndex].category.toUpperCase()}</span>
                      <p className="text-white text-sm font-medium mt-2">{flashcards[fcIndex].question}</p>
                      <span className="text-gray-600 text-[10px] mt-3">Toque para ver a resposta</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-emerald-400">RESPOSTA</span>
                      <p className="text-gray-300 text-xs mt-2">{flashcards[fcIndex].answer}</p>
                    </>
                  )}
                </div>
              </div>
              {fcFlipped && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setFcIndex(i => (i + 1) % flashcards.length); setFcFlipped(false); }} className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold">Não sabia</button>
                  <button onClick={() => { setFcIndex(i => (i + 1) % flashcards.length); setFcFlipped(false); }} className="flex-1 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-semibold">Quase</button>
                  <button onClick={() => { setFcIndex(i => (i + 1) % flashcards.length); setFcFlipped(false); }} className="flex-1 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">Sabia!</button>
                </div>
              )}
            </div>

            {/* 3 - Revisão Inteligente (notifications) */}
            <div className="card-glass rounded-2xl p-6 card-glow">
              <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 rounded-xl px-3 py-1.5 mb-3">
                <Bell size={13} className="text-blue-400" />
                <span className="text-blue-300 text-xs font-semibold">Lembrete no momento certo</span>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Revisão Inteligente</h3>
              <p className="text-gray-400 text-sm mb-4">Nosso algoritmo te lembra de revisar logo antes do esquecimento.</p>
              {/* Notification stack */}
              <div className="space-y-2">
                {notifications.map((n, i) => (
                  <div key={i} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border transition-all duration-500 ${i === notifSlide ? 'bg-primary-600/20 border-primary-600/40 scale-[1.02]' : 'bg-app-bg/40 border-white/5 opacity-60'}`}>
                    <div className="w-6 h-6 rounded-lg bg-primary-600/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BrainCircuit size={10} className="text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{n.subject}</p>
                      <p className="text-gray-500 text-[10px]">{n.topic}</p>
                    </div>
                    <span className="text-gray-500 text-[10px] flex-shrink-0">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4 - Análises Visuais */}
            <div className="card-glass rounded-2xl p-6 card-glow">
              <div className="inline-flex items-center gap-2 bg-emerald-600/10 border border-emerald-600/20 rounded-xl px-3 py-1.5 mb-3">
                <BarChart2 size={13} className="text-emerald-400" />
                <span className="text-emerald-300 text-xs font-semibold">Acompanhe cada detalhe</span>
              </div>
              <h3 className="text-white text-xl font-bold mb-4">Análises Visuais</h3>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-gray-400 text-xs">Meta Semanal</span>
                  <span className="text-white text-xs font-semibold">82%</span>
                </div>
                <div className="w-full bg-app-bg/60 rounded-full h-2 mb-4">
                  <div className="bg-gradient-to-r from-primary-600 to-primary-400 h-2 rounded-full" style={{ width: '82%' }} />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[['76%', 'Acertos'], ['12🔥', 'Dias streak'], ['42h', 'Estudadas']].map(([val, label], i) => (
                    <div key={i} className="bg-app-bg/60 rounded-xl p-2.5 border border-white/5 text-center">
                      <p className="text-primary-400 font-bold text-sm">{val}</p>
                      <p className="text-gray-500 text-[10px]">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-1 h-12">
                  {[40, 65, 30, 80, 55, 70, 90].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-primary-800 to-primary-500 opacity-80 transition-all" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => <span key={d}>{d}</span>)}
                </div>
              </div>
            </div>

            {/* 5 - Mobile & Desktop sync (wide) */}
            <div className="lg:col-span-2 card-glass rounded-2xl p-6 card-glow">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 bg-cyan-600/10 border border-cyan-600/20 rounded-xl px-3 py-1.5 mb-3">
                    <Smartphone size={13} className="text-cyan-400" />
                    <span className="text-cyan-300 text-xs font-semibold">Sincronia perfeita</span>
                  </div>
                  <h3 className="text-white text-xl font-bold mb-2">Mobile & Desktop</h3>
                  <p className="text-gray-400 text-sm">Comece no computador, termine no celular. Sincronia perfeita entre todos os seus dispositivos, sem perder nenhum dado.</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-24 bg-app-bg/60 border-2 border-primary-600/40 rounded-2xl flex items-center justify-center relative overflow-hidden">
                      <Phone size={24} className="text-primary-400" />
                      <div className="absolute inset-0 bg-gradient-to-b from-primary-600/10 to-transparent" />
                    </div>
                    <span className="text-gray-500 text-xs">Mobile</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex gap-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                      ))}
                    </div>
                    <span className="text-primary-400 text-xs mt-1">Sync</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-24 h-16 bg-app-bg/60 border-2 border-primary-600/40 rounded-xl flex items-center justify-center relative overflow-hidden">
                      <Laptop size={24} className="text-primary-400" />
                      <div className="absolute inset-0 bg-gradient-to-b from-primary-600/10 to-transparent" />
                    </div>
                    <span className="text-gray-500 text-xs">Desktop</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 - Planner de Estudos (wide) */}
            <div className="lg:col-span-3 card-glass rounded-2xl p-6 card-glow overflow-hidden">
              <div className="flex flex-col md:flex-row gap-4 items-start mb-4">
                <div>
                  <div className="inline-flex items-center gap-2 bg-primary-600/10 border border-primary-600/20 rounded-xl px-3 py-1.5 mb-2">
                    <Layers size={13} className="text-primary-400" />
                    <span className="text-primary-300 text-xs font-semibold">Organização estilo Kanban</span>
                  </div>
                  <h3 className="text-white text-xl font-bold">Planner de Estudos</h3>
                  <p className="text-gray-400 text-sm">O mesmo planner que já ajudou +5.000 aprovados, agora melhorado com IA.</p>
                </div>
              </div>
              {/* Scrolling topics */}
              <div className="overflow-x-auto">
                <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
                  {[
                    { name: 'Doenças Exantemáticas', tag: 'Pediatria', tagColor: 'purple', date: '15/01', diff: '7/10', pct: 82 },
                    { name: 'Progressão Aritmética', tag: 'Matemática II', tagColor: 'orange', date: '20/01', diff: '9/10', pct: 92 },
                    { name: 'Cefaleias Primárias', tag: 'Neuro', tagColor: 'blue', date: '22/01', diff: '6/10', pct: 75 },
                    { name: 'Diabetes Mellitus', tag: 'Endocrino', tagColor: 'green', date: '25/01', diff: '8/10', pct: 65 },
                    { name: 'Administração Pública', tag: 'Constitucional', tagColor: 'purple', date: '28/01', diff: '7/10', pct: 80 },
                    { name: 'Trauma Abdominal', tag: 'Cirurgia', tagColor: 'orange', date: '30/01', diff: '9/10', pct: 88 },
                  ].map((item, i) => (
                    <div key={i} className="w-56 bg-app-bg/60 border border-app-border rounded-2xl p-3 flex-shrink-0">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-white text-xs font-semibold leading-tight flex-1">{item.name}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ml-2 ${item.tagColor === 'purple' ? 'bg-purple-500/20 text-purple-300' : item.tagColor === 'orange' ? 'bg-orange-500/20 text-orange-300' : item.tagColor === 'blue' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{item.tag}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-500 mb-2">
                        <span>📅 {item.date}</span>
                        <span>Dif: {item.diff}</span>
                      </div>
                      <div className="w-full bg-app-bg rounded-full h-1.5">
                        <div className="bg-gradient-to-r from-primary-600 to-primary-400 h-1.5 rounded-full" style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Counter */}
      <section ref={counterRef} className="py-16 md:py-20 bg-app-surface/40 defer-render-section">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Users, value: `+${studentsCount.toLocaleString('pt-BR')}`, label: 'alunos usam o Planner', color: 'text-primary-400' },
              { icon: TrendingUp, value: '94%', label: 'de retenção média', color: 'text-emerald-400' },
              { icon: Award, value: '+5k', label: 'aprovações registradas', color: 'text-yellow-400' },
            ].map(({ icon: Icon, value, label, color }, i) => (
              <div key={i} className="card-glass rounded-2xl p-8">
                <div className={`w-12 h-12 rounded-2xl bg-current/10 flex items-center justify-center mx-auto mb-4 ${color}`} style={{ backgroundColor: 'rgba(var(--current), 0.1)' }}>
                  <Icon size={22} className={color} />
                </div>
                <p className={`text-5xl font-black mb-2 ${color}`}>{value}</p>
                <p className="text-gray-400 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 md:py-28 defer-render-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title">Quem usou disse...</h2>
            <p className="section-subtitle">O que alunos incríveis como você falaram.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="card-glass rounded-2xl p-6 card-glow transition-all hover:-translate-y-1 duration-200">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }, (_, j) => (
                    <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-white text-sm font-semibold">{t.handle}</p>
                  <p className="text-gray-500 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28 bg-app-surface/40 defer-render-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title">Invista no seu <span className="gradient-text">futuro</span></h2>
            <p className="section-subtitle">Todos os planos incluem acesso completo a todos os recursos.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Mensal */}
            <div className="card-glass rounded-2xl p-6 border border-app-border">
              <span className="badge bg-gray-700/50 text-gray-300 mb-2 inline-block">50% OFF</span>
              <h3 className="text-white text-xl font-bold mt-2">Mensal</h3>
              <div className="my-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-gray-400 text-sm">R$</span>
                  <span className="text-4xl font-black text-white">29</span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
                <p className="text-gray-600 text-xs line-through mt-1">R$58/mês</p>
              </div>
              <button onClick={() => navigate('/register')} className="w-full py-3 rounded-xl border border-primary-600/50 text-primary-300 hover:bg-primary-600/10 font-semibold text-sm transition-all mb-2">
                Começar agora
              </button>
              <p className="text-gray-600 text-xs text-center">Acesso por 1 mês</p>
            </div>

            {/* Semestral */}
            <div className="card-glass rounded-2xl p-6 border border-app-border">
              <div className="h-6 mb-2" />
              <h3 className="text-white text-xl font-bold mt-2">Semestral</h3>
              <div className="my-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-gray-400 text-sm">R$</span>
                  <span className="text-4xl font-black text-white">21</span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
                <p className="text-gray-600 text-xs line-through mt-1">R$42/mês</p>
                <p className="text-emerald-400 text-xs font-medium mt-1">+ 10% OFF no PIX</p>
              </div>
              <button onClick={() => navigate('/register')} className="w-full py-3 rounded-xl border border-primary-600/50 text-primary-300 hover:bg-primary-600/10 font-semibold text-sm transition-all mb-2">
                Começar agora
              </button>
              <p className="text-gray-600 text-xs text-center">Acesso por 6 meses</p>
            </div>

            {/* Anual - popular */}
            <div className="relative rounded-2xl p-6 border border-primary-600/60" style={{ background: 'linear-gradient(135deg, #120d2e 0%, #1a0f3e 100%)' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="badge bg-primary-600 text-white px-4 py-1.5 text-xs">⭐ Mais popular</span>
              </div>
              <span className="badge bg-primary-600/30 text-primary-300 mb-2 inline-block">50% OFF</span>
              <h3 className="text-white text-xl font-bold mt-2">Anual</h3>
              <div className="my-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-gray-400 text-sm">12x de R$</span>
                  <span className="text-4xl font-black text-white">16</span>
                  <span className="text-gray-400 text-sm">/mês</span>
                </div>
                <p className="text-gray-600 text-xs line-through mt-1">R$32/mês</p>
                <p className="text-emerald-400 text-xs font-medium mt-1">+ 17% OFF no PIX</p>
                <p className="text-primary-300 text-xs font-semibold mt-1">Menos de 60 centavos por dia!</p>
              </div>
              <button onMouseEnter={() => preloadRoute('/register')} onFocus={() => preloadRoute('/register')} onClick={() => navigate('/register')} className="btn-primary w-full justify-center py-3 text-sm mb-2">
                Melhor escolha
              </button>
              <p className="text-gray-500 text-xs text-center">Acesso por 12 meses</p>
            </div>
          </div>

          {/* Features list */}
          <div className="mt-12 max-w-2xl mx-auto">
            <p className="text-center text-gray-400 text-sm font-medium mb-6">Todos os planos liberam exatamente as mesmas funções:</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {planFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  {f}
                </div>
              ))}
              {showExtraFeatures && planFeaturesExtra.map((f, i) => (
                <div key={`ex-${i}`} className="flex items-center gap-2.5 text-sm text-gray-300 animate-fade-in">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowExtraFeatures(s => !s)}
              className="mx-auto mt-5 flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
            >
              {showExtraFeatures ? 'Ver menos' : `+ ${planFeaturesExtra.length} recursos inclusos`}
              <ChevronDown size={16} className={`transition-transform ${showExtraFeatures ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2"><Shield size={14} className="text-emerald-500" /> Pagamento 100% seguro</div>
            <div className="flex items-center gap-2"><Clock size={14} className="text-emerald-500" /> Garantia de 7 dias</div>
            <div className="flex items-center gap-2"><Zap size={14} className="text-emerald-500" /> Acesso imediato via e-mail</div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28 relative overflow-hidden defer-render-section">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary-700/20 rounded-full blur-[80px]" />
        </div>
        <div className="max-w-3xl mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-5">
            Pare de perder tempo<br />
            <span className="gradient-text">se organizando.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Deixe a tecnologia cuidar da organização para você focar no que importa: <strong className="text-white">passar.</strong>
          </p>
          <button onMouseEnter={() => preloadRoute('/register')} onFocus={() => preloadRoute('/register')} onClick={() => navigate('/register')} className="btn-primary text-base px-10 py-4 glow-pulse">
            Quero ser aprovado
            <ArrowRight size={18} />
          </button>
          <div className="flex flex-wrap items-center justify-center gap-5 mt-6 text-sm text-gray-600">
            <span>🔒 Compra Segura</span>
            <span>✅ Garantia de 7 dias</span>
            <span>💬 Suporte Premium</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-app-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                  <BrainCircuit size={14} className="text-white" />
                </div>
                <span className="text-white font-bold">Ordex</span>
              </div>
              <p className="text-gray-600 text-sm max-w-xs">
                O aplicativo de organização de estudos mais simples, bonito e acessível do mercado.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-white text-sm font-semibold mb-3">Produto</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><a href="#features" className="hover:text-gray-300 transition-colors">Recursos</a></li>
                  <li><a href="#pricing" className="hover:text-gray-300 transition-colors">Preços</a></li>
                  <li><button onClick={() => navigate('/login')} className="hover:text-gray-300 transition-colors">Já é cliente? Acessar</button></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white text-sm font-semibold mb-3">Legal</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><a href="#" className="hover:text-gray-300 transition-colors">Termos de Uso</a></li>
                  <li><a href="#" className="hover:text-gray-300 transition-colors">Política de Privacidade</a></li>
                  <li><a href="mailto:contato@ordex.app" className="hover:text-gray-300 transition-colors">Contato</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-app-border text-center text-gray-600 text-xs">
            © {new Date().getFullYear()} Ordex. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

