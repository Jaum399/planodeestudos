import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle, XCircle, Clock, BarChart2, ChevronRight, RotateCcw, Trophy, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { questionBankApi } from '../../services/api';
import { getCourseProfile } from '../../utils/courseProfiles';

interface Question {
  id: string;
  subject: string;
  phase: string;
  statement: string;
  options: string[];
  difficulty: number;
}

interface AttemptResult {
  is_correct: boolean;
  correct_index: number;
  explanation: string;
}

interface Stats {
  total_attempts: number;
  correct_attempts: number;
  accuracy: number;
}

type Mode = 'browse' | 'simulate' | 'result';

const PHASES = [
  { value: '', label: 'Todas as fases' },
  { value: 'basico', label: 'Básico' },
  { value: 'clinico', label: 'Clínico' },
  { value: 'internato', label: 'Internato' },
];

export default function QuestionBank() {
  const { user } = useAuth();
  const courseProfile = useMemo(() => getCourseProfile(user?.area, user?.goal), [user?.area, user?.goal]);
  const subjects = useMemo(() => ['', ...courseProfile.subjects], [courseProfile.subjects]);
  const [mode, setMode] = useState<Mode>('browse');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<Stats>({ total_attempts: 0, correct_attempts: 0, accuracy: 0 });
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterPhase, setFilterPhase] = useState('');

  // Browse mode
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [answering, setAnswering] = useState(false);

  // Simulate mode
  const [simPhase, setSimPhase] = useState('');
  const [simCount, setSimCount] = useState(10);
  const [simQuestions, setSimQuestions] = useState<Question[]>([]);
  const [simAnswers, setSimAnswers] = useState<Record<string, number>>({});
  const [simIdx, setSimIdx] = useState(0);
  const [simLoading, setSimLoading] = useState(false);
  const [simStartTime, setSimStartTime] = useState<number>(0);
  const [simResult, setSimResult] = useState<any>(null);
  const [simTimeLeft, setSimTimeLeft] = useState(0);

  const loadQuestions = async () => {
    try {
      const res = await questionBankApi.getAll({
        subject: filterSubject || undefined,
        phase: filterPhase || undefined,
        limit: 50,
      });
      setQuestions(res.data.items);
      setStats(res.data.stats);
    } catch { /* noop */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuestions(); }, [filterSubject, filterPhase]);

  // Simulate timer
  useEffect(() => {
    if (mode !== 'simulate' || simQuestions.length === 0 || simResult) return;
    const totalSecs = simCount * 90; // 90s per question
    setSimTimeLeft(totalSecs);
    const interval = setInterval(() => {
      setSimTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitSim();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simQuestions]);

  const handleAnswer = async (qid: string, idx: number) => {
    setSelectedIndex(idx);
    setAnswering(true);
    try {
      const res = await questionBankApi.attempt({ question_id: qid, selected_index: idx });
      setResult(res.data.result);
      setStats(res.data.stats);
    } catch { /* noop */ } finally {
      setAnswering(false);
    }
  };

  const handleStartSim = async () => {
    setSimLoading(true);
    try {
      const res = await questionBankApi.simulate({ phase: simPhase || undefined, count: simCount });
      setSimQuestions(res.data.items);
      setSimAnswers({});
      setSimIdx(0);
      setSimResult(null);
      setSimStartTime(Date.now());
      setMode('simulate');
    } catch { /* noop */ } finally {
      setSimLoading(false);
    }
  };

  const handleSimAnswer = (qid: string, idx: number) => {
    setSimAnswers(prev => ({ ...prev, [qid]: idx }));
  };

  const handleSubmitSim = async () => {
    const answers = Object.entries(simAnswers).map(([question_id, selected_index]) => ({ question_id, selected_index }));
    const duration = Math.round((Date.now() - simStartTime) / 1000);
    try {
      const res = await questionBankApi.simulate({
        phase: simPhase || undefined,
        count: simCount,
        duration_seconds: duration,
        answers,
      });
      setSimResult(res.data);
      setMode('result');
    } catch { /* noop */ }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const diffLabel = (d: number) => {
    if (d <= 1) return { text: 'Fácil', color: 'text-emerald-400 bg-emerald-500/10' };
    if (d === 2) return { text: 'Médio', color: 'text-yellow-400 bg-yellow-500/10' };
    return { text: 'Difícil', color: 'text-red-400 bg-red-500/10' };
  };

  // ── RESULT SCREEN ──
  if (mode === 'result' && simResult) {
    const score = simResult.score || {};
    const pct = score.percentage ?? 0;
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <div className="card-glass rounded-2xl p-8 text-center card-glow">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${pct >= 60 ? 'bg-emerald-500/15' : 'bg-red-500/10'}`}>
            <Trophy size={36} className={pct >= 60 ? 'text-emerald-400' : 'text-red-400'} />
          </div>
          <h2 className="text-white text-2xl font-bold mb-1">Simulado Concluído!</h2>
          <p className="text-gray-400 text-sm mb-6">{simPhase ? PHASES.find(p => p.value === simPhase)?.label : 'Geral'}</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="card-glass rounded-xl p-4">
              <p className="text-3xl font-bold gradient-text">{pct}%</p>
              <p className="text-gray-500 text-xs mt-1">Aproveitamento</p>
            </div>
            <div className="card-glass rounded-xl p-4">
              <p className="text-3xl font-bold text-emerald-400">{score.correct ?? 0}</p>
              <p className="text-gray-500 text-xs mt-1">Corretas</p>
            </div>
            <div className="card-glass rounded-xl p-4">
              <p className="text-3xl font-bold text-red-400">{(score.total ?? 0) - (score.correct ?? 0)}</p>
              <p className="text-gray-500 text-xs mt-1">Erradas</p>
            </div>
          </div>

          {/* Per-question review */}
          <div className="space-y-3 text-left max-h-80 overflow-y-auto">
            {(simResult.details || []).map((d: any, i: number) => {
              const q = simQuestions.find(q => q.id === d.question_id);
              if (!q) return null;
              return (
                <div key={d.question_id} className={`rounded-xl p-4 border ${d.is_correct ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                  <div className="flex items-start gap-2">
                    {d.is_correct ? <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" /> : <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium mb-1">{i + 1}. {q.statement}</p>
                      <p className={`text-xs mb-1 ${d.is_correct ? 'text-emerald-400' : 'text-red-400'}`}>
                        Sua resposta: {q.options[d.selected_index]}
                      </p>
                      {!d.is_correct && (
                        <p className="text-emerald-400 text-xs mb-1">Correta: {q.options[d.correct_index]}</p>
                      )}
                      <p className="text-gray-500 text-xs">{d.explanation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-6 justify-center">
            <button onClick={() => { setMode('browse'); setSimResult(null); }} className="btn-secondary text-sm py-2 px-5">
              <BookOpen size={14} /> Ver questões
            </button>
            <button onClick={() => { setMode('browse'); setSimResult(null); handleStartSim(); }} className="btn-primary text-sm py-2 px-5" disabled={simLoading}>
              <RotateCcw size={14} /> Novo simulado
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SIMULATE SCREEN ──
  if (mode === 'simulate' && simQuestions.length > 0) {
    const currentQ = simQuestions[simIdx];
    const answered = Object.keys(simAnswers).length;
    return (
      <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold">Simulado</h2>
            <p className="text-gray-500 text-xs">{answered}/{simQuestions.length} respondidas</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-sm font-mono font-bold ${simTimeLeft < 120 ? 'text-red-400' : 'text-gray-300'}`}>
              <Clock size={15} /> {formatTime(simTimeLeft)}
            </div>
            <button
              onClick={handleSubmitSim}
              className="btn-primary text-xs py-1.5 px-4"
            >
              Finalizar
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full bg-app-bg rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-primary-700 to-primary-400 h-1.5 rounded-full transition-all"
            style={{ width: `${(answered / simQuestions.length) * 100}%` }}
          />
        </div>

        {/* Question nav */}
        <div className="flex gap-1.5 flex-wrap">
          {simQuestions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setSimIdx(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                i === simIdx ? 'bg-primary-600 text-white' :
                simAnswers[q.id] !== undefined ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                'bg-app-card text-gray-500 hover:bg-white/10'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Current question */}
        <div className="card-glass rounded-2xl p-6 space-y-4 card-glow">
          <div className="flex items-center gap-2">
            <span className="badge bg-primary-600/20 text-primary-300 text-xs">{currentQ.subject}</span>
            <span className={`badge text-[10px] px-2 py-0.5 rounded-full font-semibold ${diffLabel(currentQ.difficulty).color}`}>
              {diffLabel(currentQ.difficulty).text}
            </span>
          </div>
          <p className="text-white font-medium leading-relaxed">{currentQ.statement}</p>
          <div className="space-y-2">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleSimAnswer(currentQ.id, idx)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                  simAnswers[currentQ.id] === idx
                    ? 'border-primary-500/60 bg-primary-600/20 text-white'
                    : 'border-white/10 bg-white/3 text-gray-300 hover:border-primary-500/30 hover:bg-white/5'
                }`}
              >
                <span className="font-bold mr-3 text-primary-400">{String.fromCharCode(65 + idx)}.</span>
                {opt}
              </button>
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <button
              onClick={() => setSimIdx(p => Math.max(0, p - 1))}
              disabled={simIdx === 0}
              className="btn-secondary text-xs py-1.5 px-4 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => simIdx < simQuestions.length - 1 ? setSimIdx(p => p + 1) : handleSubmitSim()}
              className="btn-primary text-xs py-1.5 px-4"
            >
              {simIdx < simQuestions.length - 1 ? <><ChevronRight size={14} /> Próxima</> : 'Finalizar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── BROWSE MODE ──
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{courseProfile.questionBankTitle}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{courseProfile.questionBankDescription}</p>
        </div>
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-white font-bold text-xl">{stats.accuracy}%</p>
            <p className="text-gray-500 text-xs">Aproveitamento geral</p>
          </div>
          <div className="text-right">
            <p className="text-white font-bold text-xl">{stats.total_attempts}</p>
            <p className="text-gray-500 text-xs">Questões respondidas</p>
          </div>
        </div>
      </div>

      <div className="card-glass rounded-2xl p-4 md:p-5">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">{courseProfile.title}</p>
        <p className="text-gray-300 text-sm">{courseProfile.dashboardFocus}</p>
      </div>

      {/* Simulado CTA */}
      <div className="card-glass rounded-2xl p-5 border border-primary-600/20 card-glow">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-white font-bold flex items-center gap-2"><Trophy size={18} className="text-yellow-400" /> Iniciar Simulado</h3>
            <p className="text-gray-400 text-sm mt-0.5">Teste seu conhecimento com cronômetro e gabarito automático</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="input-field text-sm py-2 w-36"
              value={simPhase}
              onChange={e => setSimPhase(e.target.value)}
            >
              {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select
              className="input-field text-sm py-2 w-20"
              value={simCount}
              onChange={e => setSimCount(Number(e.target.value))}
            >
              {subjects.filter(s => s).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={handleStartSim}
              disabled={simLoading}
              className="btn-primary text-sm py-2 px-5 whitespace-nowrap disabled:opacity-60"
            >
              {simLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Iniciar'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Filter size={14} className="text-gray-500" />
        <select
          className="input-field text-sm py-2 w-44"
          value={filterPhase}
          onChange={e => setFilterPhase(e.target.value)}
        >
          {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select
          className="input-field text-sm py-2 w-44"
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value)}
        >
          <option value="">Todas as matérias</option>
          {subjects.filter(s => s).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-gray-600 text-sm">{questions.length} questões</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <BookOpen size={32} className="mx-auto mb-3 opacity-50" />
              <p>Nenhuma questão encontrada.</p>
            </div>
          ) : (
            questions.map((q, idx) => {
              const isSelected = selectedQuestion?.id === q.id;
              const dl = diffLabel(q.difficulty);
              return (
                <div
                  key={q.id}
                  className={`card-glass rounded-2xl overflow-hidden transition-all ${isSelected ? 'border border-primary-600/30' : ''}`}
                >
                  {/* Question header */}
                  <button
                    onClick={() => {
                      if (isSelected) { setSelectedQuestion(null); setSelectedIndex(null); setResult(null); }
                      else { setSelectedQuestion(q); setSelectedIndex(null); setResult(null); }
                    }}
                    className="w-full text-left p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-primary-600/20 text-primary-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="badge bg-primary-600/20 text-primary-300 text-[10px]">{q.subject}</span>
                          <span className={`badge text-[10px] px-1.5 py-0.5 rounded-full ${dl.color}`}>{dl.text}</span>
                          <span className="text-gray-600 text-[10px]">{PHASES.find(p => p.value === q.phase)?.label || q.phase}</span>
                        </div>
                        <p className="text-white text-sm font-medium leading-relaxed">{q.statement}</p>
                      </div>
                      <ChevronRight size={16} className={`text-gray-500 shrink-0 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {/* Options */}
                  {isSelected && (
                    <div className="px-5 pb-5 space-y-2 border-t border-white/5 pt-4">
                      {q.options.map((opt, i) => {
                        let cls = 'border-white/10 bg-white/3 text-gray-300 hover:border-primary-500/30 hover:bg-white/5';
                        if (result) {
                          if (i === result.correct_index) cls = 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300';
                          else if (i === selectedIndex && !result.is_correct) cls = 'border-red-500/60 bg-red-500/10 text-red-300';
                        } else if (i === selectedIndex) {
                          cls = 'border-primary-500/60 bg-primary-600/20 text-white';
                        }
                        return (
                          <button
                            key={i}
                            disabled={!!result || answering}
                            onClick={() => handleAnswer(q.id, i)}
                            className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${cls} disabled:cursor-default`}
                          >
                            <span className="font-bold mr-3 text-primary-400">{String.fromCharCode(65 + i)}.</span>
                            {opt}
                          </button>
                        );
                      })}

                      {result && (
                        <div className={`rounded-xl p-4 mt-2 border flex gap-2 ${result.is_correct ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                          {result.is_correct
                            ? <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                            : <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                          }
                          <div>
                            <p className={`text-sm font-semibold ${result.is_correct ? 'text-emerald-400' : 'text-red-400'}`}>
                              {result.is_correct ? 'Correto!' : 'Incorreto'}
                            </p>
                            <p className="text-gray-400 text-xs mt-1 leading-relaxed">{result.explanation}</p>
                          </div>
                        </div>
                      )}

                      {answering && (
                        <div className="flex justify-center py-2">
                          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}

                      {result && (
                        <button
                          onClick={() => { setSelectedQuestion(null); setSelectedIndex(null); setResult(null); }}
                          className="btn-secondary text-xs py-1.5 px-4 mt-1"
                        >
                          <ChevronRight size={13} /> Próxima questão
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
