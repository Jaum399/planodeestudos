import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit, Zap, Calendar, Layers, BookOpen, BarChart2,
  Smartphone, CheckCircle2, Star, ArrowRight, Shield, Clock, Award
} from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';

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

const features = [
  {
    icon: Layers,
    title: 'Planner de Estudos',
    subtitle: 'Organização estilo Kanban',
    description: 'O mesmo planner que já ajudou +5.000 aprovados, agora melhorado. Organize suas matérias no sistema Kanban e acompanhe seu progresso em tempo real.',
    preview: (
      <div className="space-y-2.5">
        {[
          { label: 'Doenças Exantemáticas', tag: 'PEDIATRIA', status: 'done', diff: '7/10' },
          { label: 'Progressão Aritmética', tag: 'MATEMÁTICA', status: 'in-progress', diff: '9/10' },
          { label: 'Cefaléias Primárias', tag: 'NEURO', status: 'todo', diff: '6/10' },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between bg-app-bg/60 rounded-xl px-4 py-3 border border-white/5">
            <div>
              <p className="text-white text-xs font-medium">{item.label}</p>
              <span className="text-primary-400 text-[10px] font-bold">{item.tag}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Dif: {item.diff}</span>
              <span className={`w-2 h-2 rounded-full ${item.status === 'done' ? 'bg-emerald-400' : item.status === 'in-progress' ? 'bg-yellow-400' : 'bg-gray-600'}`} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Calendar,
    title: 'Cronograma Automático',
    subtitle: 'IA analisa seu tempo livre',
    description: 'A IA analisa seu tempo livre e distribui as matérias de forma inteligente. Nunca mais perca tempo fazendo grade manualmente.',
    preview: (
      <div className="space-y-2">
        {[
          { day: 'Segunda-feira', items: [{ sub: 'Clínica Médica', time: '1h30' }, { sub: 'Psiquiatria', time: '1h30' }] },
          { day: 'Terça-feira', items: [{ sub: 'Cardiologia', time: '1h30' }, { sub: 'Endocrinologia', time: '45m' }] },
          { day: 'Quarta-feira', items: [{ sub: 'Pediatria', time: '1h30' }, { sub: 'Simulado', time: '2h00' }] },
        ].map((row, i) => (
          <div key={i} className="bg-app-bg/60 rounded-xl px-4 py-3 border border-white/5">
            <p className="text-gray-400 text-xs mb-2">{row.day}</p>
            <div className="flex gap-2 flex-wrap">
              {row.items.map((it, j) => (
                <div key={j} className="bg-primary-600/20 border border-primary-600/30 rounded-lg px-2.5 py-1.5">
                  <p className="text-white text-xs font-medium">{it.sub}</p>
                  <p className="text-primary-400 text-[10px]">{it.time}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: BookOpen,
    title: 'Flashcards com IA',
    subtitle: 'Revisão rápida e inteligente',
    description: 'A IA gera flashcards das suas matérias. Revise de forma rápida e inteligente com o algoritmo de curva de esquecimento de Hermann.',
    preview: (
      <div className="flex flex-col items-center gap-4">
        <div className="w-full bg-app-bg/60 rounded-2xl border border-primary-500/20 p-5 text-center">
          <span className="badge bg-primary-600/20 text-primary-300 mb-3 mx-auto">HISTÓRIA</span>
          <p className="text-white text-sm font-medium">Quem proclamou a independência do Brasil?</p>
          <p className="text-gray-500 text-xs mt-3">Toque para ver a resposta</p>
        </div>
        <div className="flex gap-2 w-full">
          <button className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold">Não sabia</button>
          <button className="flex-1 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-semibold">Quase</button>
          <button className="flex-1 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">Sabia!</button>
        </div>
      </div>
    ),
  },
  {
    icon: BrainCircuit,
    title: 'Revisão Inteligente',
    subtitle: 'Lembrete no momento certo',
    description: 'Saiba o momento exato de revisar. Nosso algoritmo te lembra de revisar logo antes do esquecimento acontecer.',
    preview: (
      <div className="space-y-2">
        {[
          { time: 'agora', msg: 'Nefrologia — Síndromes Nefróticas', urgent: true },
          { time: '2m', msg: 'Direito Constitucional — Princípios', urgent: false },
          { time: '5m', msg: 'Ginecologia — Sangramento Uterino', urgent: false },
          { time: '10m', msg: 'Pediatria — Marcos do desenvolvimento', urgent: false },
        ].map((n, i) => (
          <div key={i} className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${n.urgent ? 'bg-primary-600/20 border-primary-600/40' : 'bg-app-bg/60 border-white/5'}`}>
            <div className="w-7 h-7 rounded-full bg-primary-600/30 flex items-center justify-center flex-shrink-0">
              <BrainCircuit size={12} className="text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{n.msg}</p>
              <p className="text-gray-500 text-[10px]">Lembrete de Revisão 💡</p>
            </div>
            <span className="text-gray-500 text-[10px] flex-shrink-0">{n.time}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: BarChart2,
    title: 'Análises Visuais',
    subtitle: 'Acompanhe cada detalhe',
    description: 'Acompanhe sua evolução em cada detalhe. Veja sua taxa de acertos, sequência de estudos e muito mais com gráficos visuais.',
    preview: (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs">Meta Semanal</span>
          <span className="text-white text-xs font-semibold">82%</span>
        </div>
        <div className="w-full bg-app-bg/60 rounded-full h-2">
          <div className="bg-gradient-to-r from-primary-600 to-primary-400 h-2 rounded-full" style={{ width: '82%' }} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {['76%', '12', '42h'].map((val, i) => (
            <div key={i} className="bg-app-bg/60 rounded-xl p-3 border border-white/5 text-center">
              <p className="text-primary-400 font-bold text-base">{val}</p>
              <p className="text-gray-500 text-[10px]">{['Acertos', 'Dias streak', 'Horas'][i]}</p>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-1 h-14 mt-2">
          {[40, 65, 30, 80, 55, 70, 90].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-primary-800 to-primary-500 opacity-80" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-600">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => <span key={d}>{d}</span>)}
        </div>
      </div>
    ),
  },
  {
    icon: Smartphone,
    title: 'Mobile & Desktop',
    subtitle: 'Sincronia perfeita',
    description: 'Comece no computador, termine no celular. Sincronia perfeita entre todos os seus dispositivos, sem perder nenhum dado.',
    preview: (
      <div className="flex items-center justify-center gap-4">
        <div className="w-20 h-32 bg-app-bg/60 rounded-2xl border-2 border-primary-600/40 flex items-center justify-center">
          <Smartphone size={28} className="text-primary-400" />
        </div>
        <div className="text-primary-400 text-2xl">⇌</div>
        <div className="w-28 h-20 bg-app-bg/60 rounded-xl border-2 border-primary-600/40 flex items-center justify-center">
          <BarChart2 size={28} className="text-primary-400" />
        </div>
      </div>
    ),
  },
];

const planFeatures = [
  'Revisões inteligentes com IA (Curva de Hermann)',
  'Planner validado por +5.000 estudantes',
  'Flashcards com IA + 20 recursos inclusos',
  'Organização estilo Kanban',
  'Notificações automáticas de revisão',
  'Sincronização de Revisões com Provas',
  'Importação de Edital com IA',
  'Integração com Google Calendar',
  'Cronograma semanal automático',
  'Interface limpa e sem distrações',
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-app-bg overflow-x-hidden">
      <LandingNavbar />

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-700/15 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-violet-900/20 rounded-full blur-[80px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-primary-600/10 border border-primary-600/30 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
              <span className="text-primary-300 text-xs font-medium">Novo: Revisões com IA integrada</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-center leading-tight public-heading mb-6">
            O cérebro digital<br />
            <span className="gradient-text">da sua aprovação.</span>
          </h1>

          <p className="text-gray-400 text-center text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Unimos a ciência da <strong className="text-primary-300">Curva de Esquecimento</strong> com uma IA avançada
            para criar o sistema perfeito e garantir que você nunca esqueça o que estudou.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button onClick={() => navigate('/register')} className="btn-primary text-base px-8 py-4 glow-pulse">
              Garantir meu acesso agora
              <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/cadastro-clinica')} className="btn-secondary text-base px-8 py-4 justify-center">
              Cadastre sua Clínica
            </button>
            <a href="#features" className="btn-secondary text-base px-8 py-4 justify-center">
              Ver como funciona
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            {[
              { icon: Shield, text: 'Pagamento 100% seguro' },
              { icon: Clock, text: 'Garantia de 7 dias' },
              { icon: Award, text: '+5.000 aprovados' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon size={14} className="text-primary-400" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AREAS MARQUEE ── */}
      <section className="py-6 border-y border-app-border overflow-hidden">
        <div className="flex gap-4" style={{ animation: 'marquee-slide 20s linear infinite' }}>
          {[...areas, ...areas].map((area, i) => (
            <div
              key={i}
              className="flex-shrink-0 bg-app-card border border-app-border rounded-full px-5 py-2 text-sm text-gray-300 whitespace-nowrap"
            >
              {area}
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary-600/10 border border-primary-600/20 rounded-full px-4 py-1.5 mb-4">
              <BrainCircuit size={14} className="text-primary-400" />
              <span className="text-primary-300 text-xs font-medium">Simulador Cognitivo & IA</span>
            </div>
            <h2 className="section-title">Tudo que você precisa para passar</h2>
            <p className="section-subtitle">
              Nossa IA analisa seu perfil e cria uma curva de esquecimento única para sua memória.
            </p>
          </div>

          <div className="space-y-16">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`grid md:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? 'md:grid-flow-dense' : ''}`}
              >
                {/* Text */}
                <div className={i % 2 === 1 ? 'md:col-start-2' : ''}>
                  <div className="inline-flex items-center gap-2 bg-primary-600/10 border border-primary-600/20 rounded-xl px-3 py-1.5 mb-4">
                    <feature.icon size={14} className="text-primary-400" />
                    <span className="text-primary-300 text-xs font-semibold">{feature.subtitle}</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-gray-400 text-base leading-relaxed">{feature.description}</p>
                  <button
                    onClick={() => navigate('/register')}
                    className="mt-6 inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm font-semibold transition-colors"
                  >
                    Experimentar grátis <ArrowRight size={14} />
                  </button>
                </div>

                {/* Preview card */}
                <div className={`card-glass rounded-2xl p-6 card-glow animate-float ${i % 2 === 1 ? 'md:col-start-1 md:row-start-1' : ''}`}>
                  {feature.preview}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-20 md:py-28 bg-app-surface/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title">Quem usou disse...</h2>
            <p className="section-subtitle">O que alunos incríveis como você falaram sobre o Mentudo.</p>
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

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title">Invista no seu futuro</h2>
            <p className="section-subtitle">
              Todos os planos incluem acesso completo a todos os recursos. Escolha o que melhor se adapta a você.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Mensal */}
            <div className="card-glass rounded-2xl p-6 border border-app-border">
              <div className="mb-1">
                <span className="badge bg-gray-700/50 text-gray-300">50% OFF</span>
              </div>
              <h3 className="text-white text-xl font-bold mt-3">Mensal</h3>
              <div className="my-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">R$29</span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
                <p className="text-gray-600 text-xs line-through">R$58/mês</p>
              </div>
              <button
                onClick={() => navigate('/register')}
                className="w-full py-3 rounded-xl border border-primary-600/50 text-primary-300 hover:bg-primary-600/10 font-semibold text-sm transition-all"
              >
                Começar agora
              </button>
              <p className="text-gray-600 text-xs mt-3 text-center">Acesso por 1 mês</p>
            </div>

            {/* Semestral */}
            <div className="card-glass rounded-2xl p-6 border border-app-border">
              <div className="mb-1 h-6" />
              <h3 className="text-white text-xl font-bold mt-3">Semestral</h3>
              <div className="my-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">R$21</span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
                <p className="text-gray-600 text-xs line-through">R$42/mês</p>
                <p className="text-emerald-400 text-xs font-medium mt-1">+ 10% OFF no PIX</p>
              </div>
              <button
                onClick={() => navigate('/register')}
                className="w-full py-3 rounded-xl border border-primary-600/50 text-primary-300 hover:bg-primary-600/10 font-semibold text-sm transition-all"
              >
                Começar agora
              </button>
              <p className="text-gray-600 text-xs mt-3 text-center">Acesso por 6 meses</p>
            </div>

            {/* Anual — popular */}
            <div className="relative rounded-2xl p-6 border border-primary-600/60" style={{ background: 'linear-gradient(135deg, #120d2e 0%, #1a0f3e 100%)' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="badge bg-primary-600 text-white px-4 py-1.5 text-xs">Mais popular ⭐</span>
              </div>
              <div className="mb-1">
                <span className="badge bg-primary-600/30 text-primary-300">50% OFF</span>
              </div>
              <h3 className="text-white text-xl font-bold mt-3">Anual</h3>
              <div className="my-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">R$16</span>
                  <span className="text-gray-400 text-sm">/mês</span>
                </div>
                <p className="text-gray-600 text-xs line-through">R$32/mês</p>
                <p className="text-emerald-400 text-xs font-medium mt-1">+ 17% OFF no PIX</p>
                <p className="text-primary-300 text-xs font-semibold mt-1">Menos de 60 centavos por dia!</p>
              </div>
              <button
                onClick={() => navigate('/register')}
                className="btn-primary w-full justify-center py-3 text-sm"
              >
                Garantir agora
              </button>
              <p className="text-gray-500 text-xs mt-3 text-center">Acesso por 12 meses</p>
            </div>
          </div>

          {/* Features list */}
          <div className="mt-12 max-w-2xl mx-auto">
            <p className="text-center text-gray-400 text-sm font-medium mb-6">
              Todos os planos liberam exatamente as mesmas funções:
            </p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {planFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Payment trust */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2"><Shield size={14} className="text-emerald-500" /> Pagamento 100% seguro</div>
            <div className="flex items-center gap-2"><Clock size={14} className="text-emerald-500" /> Garantia de 7 dias</div>
            <div className="flex items-center gap-2"><Zap size={14} className="text-emerald-500" /> Acesso imediato via e-mail</div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 md:py-28 relative overflow-hidden">
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
          <button onClick={() => navigate('/register')} className="btn-primary text-base px-10 py-4 glow-pulse">
            Quero ser aprovado
            <ArrowRight size={18} />
          </button>
          <div className="flex flex-wrap items-center justify-center gap-5 mt-6 text-sm text-gray-600">
            <span>🔒 Compra Segura</span>
            <span>↩ Garantia de 7 dias</span>
            <span>⚡ Suporte Premium</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-app-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                  <BrainCircuit size={14} className="text-white" />
                </div>
                <span className="text-white font-bold">Mentudo</span>
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
                  <li><a href="mailto:contato@mentoriaestudantil.com.br" className="hover:text-gray-300 transition-colors">Contato</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-app-border text-center text-gray-600 text-xs">
            © {new Date().getFullYear()} Mentudo. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
