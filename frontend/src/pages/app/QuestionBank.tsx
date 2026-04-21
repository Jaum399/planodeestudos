import { useEffect, useState } from 'react';
import { questionBankApi } from '../../services/api';

type Question = {
  id: string;
  subject: string;
  phase: string;
  statement: string;
  options: string[];
  explanation?: string;
};

type AttemptResult = {
  is_correct: boolean;
  correct_index: number;
  explanation?: string;
};

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answeringId, setAnsweringId] = useState('');
  const [resultByQuestion, setResultByQuestion] = useState<Record<string, AttemptResult>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data } = await questionBankApi.getAll({ limit: 40 });
        if (!cancelled) setQuestions(data?.items || []);
      } catch {
        if (!cancelled) setError('Não foi possível carregar o banco de questões.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function answer(questionId: string, selectedIndex: number) {
    setAnsweringId(questionId);
    try {
      const { data } = await questionBankApi.attempt({ question_id: questionId, selected_index: selectedIndex });
      setResultByQuestion((prev) => ({ ...prev, [questionId]: data?.result }));
    } catch {
      setError('Não foi possível registrar a resposta.');
    } finally {
      setAnsweringId('');
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Banco de questões</h1>
        <p className="text-gray-400 text-sm mt-1">Treine por assunto e receba correção instantânea.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">Carregando questões...</div>
      ) : questions.length === 0 ? (
        <div className="card-glass rounded-2xl p-6 text-gray-400 text-sm">Nenhuma questão disponível no momento.</div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const result = resultByQuestion[q.id];
            return (
              <div key={q.id} className="card-glass rounded-2xl p-5 card-glow">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-300 border border-primary-500/30">
                    {q.subject}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-app-card text-gray-400 border border-app-border">
                    {q.phase}
                  </span>
                </div>

                <p className="text-white text-sm font-medium mb-3">{q.statement}</p>

                <div className="space-y-2">
                  {q.options.map((opt, idx) => (
                    <button
                      key={`${q.id}-${idx}`}
                      type="button"
                      onClick={() => answer(q.id, idx)}
                      disabled={Boolean(result) || answeringId === q.id}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        result
                          ? idx === result.correct_index
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : 'border-app-border text-gray-500'
                          : 'border-app-border text-gray-300 hover:border-primary-500/40 hover:text-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {result && (
                  <div className={`mt-3 rounded-lg px-3 py-2 text-xs border ${result.is_correct ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
                    {result.is_correct ? 'Resposta correta.' : 'Resposta incorreta.'}
                    {result.explanation ? ` ${result.explanation}` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
