import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, TrendingUp, BarChart3, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Question {
  id: string;
  subject: string;
  statement: string;
  options: string[];
  phase: string;
  difficulty: number;
}

interface ExamResult {
  exam_id: string;
  name: string;
  phase: string;
  accuracy_percentage: number;
  score_percentage: number;
  percentile_rank: number;
  correct_count: number;
  answered_count: number;
  total_questions: number;
  duration_seconds: number;
  started_at: string;
  finished_at: string;
  performance: any[];
  subject_breakdown: any[];
}

type ExamPhase = 'basico' | 'clinico' | 'internato' | 'residencia';

export default function MockExams() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState<'builder' | 'exam' | 'results'>('builder');
  const [examConfig, setExamConfig] = useState({
    name: '',
    subject: 'Medicina',
    phase: 'clinico' as ExamPhase,
    timeLimit: 60,
    questionCount: 20,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [currentExamId, setCurrentExamId] = useState<string>('');
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [showResults, setShowResults] = useState(false);

  // Fetch available questions
  useEffect(() => {
    if (mode === 'builder') {
      fetchAvailableQuestions();
      fetchExamHistory();
    }
  }, [mode]);

  // Timer for exam
  useEffect(() => {
    if (mode !== 'exam' || timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, mode]);

  // Auto-finish when time expires
  useEffect(() => {
    if (timeLeft === 0 && mode === 'exam' && currentExamId) {
      finishExam();
    }
  }, [timeLeft]);

  const fetchAvailableQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/question-bank?subject=${examConfig.subject}&phase=${examConfig.phase}&limit=100`);
      if (!response.ok) throw new Error('Erro ao buscar questões');
      const data = await response.json();
      setQuestions(data.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExamHistory = async () => {
    try {
      const response = await fetch('/api/mock-exams?limit=10');
      if (!response.ok) throw new Error('Erro ao buscar histórico');
      const data = await response.json();
      setHistory(data.items || []);
    } catch (error) {
      console.error(error);
    }
  };

  const startExam = async () => {
    if (!examConfig.name || selectedQuestions.length === 0) {
      alert('Configure o exame e selecione questões');
      return;
    }

    try {
      setLoading(true);

      // Create exam
      const createRes = await fetch('/api/mock-exams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: examConfig.name,
          subject: examConfig.subject,
          phase: examConfig.phase,
          questions: selectedQuestions.map(q => ({ id: q.id, subject: q.subject, difficulty: q.difficulty })),
          time_limit_minutes: examConfig.timeLimit,
        }),
      });

      if (!createRes.ok) throw new Error('Erro ao criar exame');
      const created = await createRes.json();
      setCurrentExamId(created.exam_id);

      // Start exam
      const startRes = await fetch(`/api/mock-exams/${created.exam_id}/start`, { method: 'POST' });
      if (!startRes.ok) throw new Error('Erro ao iniciar exame');

      setTimeLeft(examConfig.timeLimit * 60);
      setCurrentQuestionIdx(0);
      setAnswers(new Map());
      setMode('exam');
    } catch (error) {
      console.error(error);
      alert('Erro ao iniciar exame');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (selectedIndex: number) => {
    if (!currentExamId) return;

    const currentQuestion = selectedQuestions[currentQuestionIdx];
    const timeSpent = (examConfig.timeLimit * 60) - timeLeft;

    try {
      const response = await fetch(`/api/mock-exams/${currentExamId}/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          selected_index: selectedIndex,
          time_spent_seconds: timeSpent,
        }),
      });

      if (!response.ok) throw new Error('Erro ao enviar resposta');

      // Move to next question
      if (currentQuestionIdx < selectedQuestions.length - 1) {
        setCurrentQuestionIdx(currentQuestionIdx + 1);
      } else {
        finishExam();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const finishExam = async () => {
    if (!currentExamId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/mock-exams/${currentExamId}/finish`, { method: 'POST' });
      if (!response.ok) throw new Error('Erro ao finalizar exame');

      const results = await response.json();

      // Fetch full results
      const resultsRes = await fetch(`/api/mock-exams/${currentExamId}/results`);
      if (resultsRes.ok) {
        const fullResults = await resultsRes.json();
        setExamResult(fullResults);
      }

      setMode('results');
    } catch (error) {
      console.error(error);
      alert('Erro ao finalizar exame');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Builder Mode
  if (mode === 'builder') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-8 h-8 text-primary-400" />
            <h1 className="text-4xl font-bold text-white">Simulados</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Builder Panel */}
            <div className="lg:col-span-2">
              <div className="card-glass rounded-lg p-8 border border-white/10">
                <h2 className="text-2xl font-semibold text-white mb-6">Criar Simulado</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Nome do Simulado</label>
                    <input
                      type="text"
                      value={examConfig.name}
                      onChange={(e) => setExamConfig({ ...examConfig, name: e.target.value })}
                      placeholder="Ex: Simulado ENEM 2024"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder-gray-500 rounded-lg focus:border-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Matéria</label>
                      <select
                        value={examConfig.subject}
                        onChange={(e) => setExamConfig({ ...examConfig, subject: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:border-primary-500"
                      >
                        <option>Medicina</option>
                        <option>Odontologia</option>
                        <option>Farmácia</option>
                        <option>Enfermagem</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Fase</label>
                      <select
                        value={examConfig.phase}
                        onChange={(e) => setExamConfig({ ...examConfig, phase: e.target.value as ExamPhase })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:border-primary-500"
                      >
                        <option value="basico">Básico</option>
                        <option value="clinico">Clínico</option>
                        <option value="internato">Internato</option>
                        <option value="residencia">Residência</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Questões ({selectedQuestions.length})</label>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={examConfig.questionCount}
                        onChange={(e) => setExamConfig({ ...examConfig, questionCount: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Tempo (minutos)</label>
                      <input
                        type="number"
                        min="10"
                        max="240"
                        value={examConfig.timeLimit}
                        onChange={(e) => setExamConfig({ ...examConfig, timeLimit: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Question Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Selecionar Questões</h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {questions.slice(0, examConfig.questionCount * 2).map((q) => (
                      <label key={q.id} className="flex items-center p-3 bg-slate-800/50 rounded cursor-pointer hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={selectedQuestions.some(sq => sq.id === q.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (selectedQuestions.length < examConfig.questionCount) {
                                setSelectedQuestions([...selectedQuestions, q]);
                              }
                            } else {
                              setSelectedQuestions(selectedQuestions.filter(sq => sq.id !== q.id));
                            }
                          }}
                          disabled={selectedQuestions.length >= examConfig.questionCount && !selectedQuestions.some(sq => sq.id === q.id)}
                          className="rounded"
                        />
                        <span className="ml-3 text-sm text-gray-300 flex-1">{q.statement.substring(0, 80)}...</span>
                        <span className="text-xs text-gray-500">Dif: {q.difficulty}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startExam}
                  disabled={loading || selectedQuestions.length === 0}
                  className="w-full bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition"
                >
                  {loading ? '⏳ Iniciando...' : '▶️ Iniciar Simulado'}
                </button>
              </div>
            </div>

            {/* History Panel */}
            <div>
              <div className="card-glass rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">📊 Histórico</h3>
                <div className="space-y-2">
                  {history.map((exam) => (
                    <div key={exam.id} className="p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-sm font-medium text-white">{exam.name}</p>
                      <p className="text-xs text-gray-400">{new Date(exam.created_at).toLocaleDateString('pt-BR')}</p>
                      <p className="text-sm text-primary-400 font-semibold">{exam.score}% • {exam.accuracy}% acurácia</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Exam Mode
  if (mode === 'exam' && selectedQuestions.length > 0) {
    const currentQuestion = selectedQuestions[currentQuestionIdx];
    const progress = ((currentQuestionIdx + 1) / selectedQuestions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
                <Clock className="w-5 h-5 text-orange-400" />
                <span className={`font-mono font-bold text-lg ${timeLeft < 300 ? 'text-red-400' : 'text-white'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="text-gray-400 text-sm">
                Questão {currentQuestionIdx + 1} de {selectedQuestions.length}
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('Deseja sair do simulado?')) {
                  finishExam();
                }
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg"
            >
              ← Sair
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1 mb-8">
            <div className="bg-gradient-to-r from-primary-500 to-purple-500 h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>

          {/* Question Card */}
          <div className="card-glass rounded-lg p-8 border border-white/10 mb-8">
            <h2 className="text-xl font-semibold text-white mb-6">{currentQuestion.statement}</h2>

            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => submitAnswer(idx)}
                  className="w-full p-4 text-left bg-slate-800/50 hover:bg-primary-500/20 border border-slate-700 hover:border-primary-500 text-white rounded-lg transition"
                >
                  <span className="font-semibold">{'ABCDE'[idx]}.</span> {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results Mode
  if (mode === 'results' && examResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setMode('builder')} className="p-2 hover:bg-slate-800 rounded-lg">
              <ArrowLeft className="w-6 h-6 text-gray-400" />
            </button>
            <h1 className="text-4xl font-bold text-white">Resultado do Simulado</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Score Card */}
            <div className="card-glass rounded-lg p-6 border border-primary-500/30 bg-gradient-to-br from-primary-500/10 to-transparent">
              <p className="text-gray-400 text-sm mb-2">Pontuação</p>
              <p className="text-5xl font-bold text-primary-400">{examResult.score_percentage}%</p>
            </div>

            {/* Accuracy Card */}
            <div className="card-glass rounded-lg p-6 border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
              <p className="text-gray-400 text-sm mb-2">Acurácia</p>
              <p className="text-5xl font-bold text-blue-400">{examResult.accuracy_percentage}%</p>
              <p className="text-sm text-gray-400 mt-2">{examResult.correct_count}/{examResult.answered_count}</p>
            </div>

            {/* Percentile Card */}
            <div className="card-glass rounded-lg p-6 border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
              <p className="text-gray-400 text-sm mb-2">Percentil</p>
              <p className="text-5xl font-bold text-purple-400">{examResult.percentile_rank}%</p>
              <p className="text-sm text-gray-400 mt-2">vs {Math.round(examResult.peers_average)}% média</p>
            </div>
          </div>

          {/* Subject Breakdown */}
          <div className="card-glass rounded-lg p-6 border border-white/10 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Desempenho por Matéria</h2>
            <div className="space-y-3">
              {examResult.subject_breakdown.map((subj) => (
                <div key={subj.subject}>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-300">{subj.subject}</span>
                    <span className="text-primary-400 font-semibold">{subj.accuracy}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${subj.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setMode('builder')}
            className="w-full bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 text-white font-semibold py-3 px-4 rounded-lg transition"
          >
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  return null;
}
