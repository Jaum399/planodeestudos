import { useEffect, useState } from 'react';
import { Plus, X, Check, RotateCcw, BookOpen } from 'lucide-react';
import { flashcardsApi } from '../../services/api';
import type { Flashcard } from '../../types';

type Tab = 'review' | 'all' | 'create';

export default function Flashcards() {
  const [tab, setTab] = useState<Tab>('review');
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewed, setReviewed] = useState(0);
  const [searchSub, setSearchSub] = useState('');

  // Create form
  const [form, setForm] = useState({ subject: '', question: '', answer: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  const loadCards = async () => {
    try {
      const [allRes, reviewRes] = await Promise.all([
        flashcardsApi.getAll(),
        flashcardsApi.getReview(),
      ]);
      setAllCards(allRes.data.cards);
      setReviewCards(reviewRes.data.cards);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCards(); }, []);

  const currentCard = reviewCards[currentIdx];

  const handleRate = async (difficulty: number) => {
    if (!currentCard) return;
    try {
      await flashcardsApi.review(currentCard.id, difficulty);
      setFlipped(false);
      setReviewed(p => p + 1);
      setTimeout(() => {
        setCurrentIdx(p => p + 1);
      }, 300);
      // Refresh the card in allCards
      const updated = await flashcardsApi.getAll();
      setAllCards(updated.data.cards);
    } catch {
      //
    }
  };

  const handleCreate = async () => {
    if (!form.subject.trim() || !form.question.trim() || !form.answer.trim()) {
      setCreateError('Todos os campos são obrigatórios.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await flashcardsApi.create(form);
      setForm({ subject: '', question: '', answer: '' });
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 3000);
      loadCards();
    } catch {
      setCreateError('Erro ao criar flashcard.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este flashcard?')) return;
    try {
      await flashcardsApi.delete(id);
      setAllCards(prev => prev.filter(c => c.id !== id));
    } catch {
      //
    }
  };

  const filteredCards = allCards.filter(c =>
    !searchSub || c.subject.toLowerCase().includes(searchSub.toLowerCase())
  );

  const diffLabel = (d: number) => {
    if (d === 0) return { text: 'Novo', color: 'text-gray-400' };
    if (d === 1) return { text: 'Difícil', color: 'text-red-400' };
    if (d === 2) return { text: 'Médio', color: 'text-yellow-400' };
    return { text: 'Fácil', color: 'text-emerald-400' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Flashcards com IA</h1>
        <p className="text-gray-400 text-sm mt-1">Revise de forma rápida e inteligente com a curva de esquecimento</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-app-card rounded-xl p-1.5 w-fit">
        {([
          { key: 'review', label: `Revisar (${reviewCards.length})` },
          { key: 'all', label: `Todos (${allCards.length})` },
          { key: 'create', label: '+ Criar' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-primary-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* ── REVIEW TAB ── */}
          {tab === 'review' && (
            <div className="max-w-lg mx-auto">
              {reviewCards.length === 0 || currentIdx >= reviewCards.length ? (
                <div className="card-glass rounded-2xl p-10 text-center card-glow">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <Check size={28} className="text-emerald-400" />
                  </div>
                  <h3 className="text-white font-bold text-xl mb-2">
                    {reviewCards.length === 0 ? 'Nenhum card para revisar!' : 'Revisão concluída! 🎉'}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    {reviewCards.length === 0
                      ? 'Crie flashcards para começar a revisar.'
                      : `Você revisou ${reviewed} card(s) hoje. Continue assim!`}
                  </p>
                  {reviewed > 0 && (
                    <button onClick={() => { setCurrentIdx(0); setReviewed(0); loadCards(); }} className="btn-secondary text-sm py-2 px-5">
                      <RotateCcw size={14} /> Revisar novamente
                    </button>
                  )}
                  {reviewCards.length === 0 && (
                    <button onClick={() => setTab('create')} className="btn-primary text-sm py-2 px-5">
                      <Plus size={14} /> Criar meu primeiro card
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Progress */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{currentIdx + 1} / {reviewCards.length}</span>
                    <span className="text-primary-400 font-medium">{currentCard.subject}</span>
                  </div>
                  <div className="w-full bg-app-bg rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-primary-700 to-primary-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${((currentIdx) / reviewCards.length) * 100}%` }}
                    />
                  </div>

                  {/* Flip card */}
                  <div
                    className="flip-card w-full cursor-pointer select-none"
                    style={{ height: '220px' }}
                    onClick={() => setFlipped(p => !p)}
                  >
                    <div className={`flip-card-inner w-full h-full ${flipped ? 'flipped' : ''}`}>
                      {/* Front */}
                      <div className="flip-card-front card-glass rounded-2xl p-6 w-full h-full flex flex-col items-center justify-center card-glow border border-primary-600/20">
                        <span className="badge bg-primary-600/20 text-primary-300 mb-4">{currentCard.subject}</span>
                        <p className="text-white text-center font-medium text-base">{currentCard.question}</p>
                        <p className="text-gray-600 text-xs mt-6">Toque para ver a resposta</p>
                      </div>
                      {/* Back */}
                      <div className="flip-card-back card-glass rounded-2xl p-6 w-full h-full flex flex-col items-center justify-center border border-emerald-600/20" style={{ background: 'rgba(16,185,129,0.05)' }}>
                        <span className="badge bg-emerald-600/20 text-emerald-300 mb-4">RESPOSTA</span>
                        <p className="text-white text-center text-sm leading-relaxed">{currentCard.answer}</p>
                      </div>
                    </div>
                  </div>

                  {/* Rate buttons */}
                  <div className={`grid grid-cols-3 gap-3 transition-opacity duration-300 ${flipped ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                    <button onClick={() => handleRate(0)} className="py-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 text-sm font-semibold hover:bg-red-500/25 transition-all">
                      Não sabia
                    </button>
                    <button onClick={() => handleRate(2)} className="py-3 rounded-xl bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-sm font-semibold hover:bg-yellow-500/25 transition-all">
                      Quase
                    </button>
                    <button onClick={() => handleRate(3)} className="py-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm font-semibold hover:bg-emerald-500/25 transition-all">
                      Sabia!
                    </button>
                  </div>

                  <p className="text-center text-gray-600 text-xs">
                    Clique no card para revelar antes de avaliar
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── ALL TAB ── */}
          {tab === 'all' && (
            <div className="space-y-4">
              <input
                className="input-field max-w-xs"
                placeholder="Buscar por matéria..."
                value={searchSub}
                onChange={e => setSearchSub(e.target.value)}
              />

              {filteredCards.length === 0 ? (
                <div className="text-center py-16 text-gray-600">
                  <BookOpen size={32} className="mx-auto mb-3 opacity-50" />
                  <p>Nenhum flashcard encontrado.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCards.map(card => {
                    const dl = diffLabel(card.difficulty);
                    return (
                      <div key={card.id} className="card-glass rounded-xl p-4 group">
                        <div className="flex items-start justify-between mb-2">
                          <span className="badge bg-primary-600/20 text-primary-300 text-[10px]">{card.subject}</span>
                          <button
                            onClick={() => handleDelete(card.id)}
                            className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-white text-sm font-medium mb-2">{card.question}</p>
                        <p className="text-gray-500 text-xs line-clamp-2">{card.answer}</p>
                        <div className="flex items-center justify-between mt-3 text-[10px]">
                          <span className={dl.color}>{dl.text}</span>
                          <span className="text-gray-700">{card.review_count} revisões</span>
                          <span className="text-gray-700">Próx: {card.next_review ? new Date(card.next_review + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Hoje'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CREATE TAB ── */}
          {tab === 'create' && (
            <div className="max-w-lg mx-auto">
              <div className="card-glass rounded-2xl p-6 card-glow space-y-4">
                <h3 className="text-white font-bold">Criar novo flashcard</h3>

                {createSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm flex items-center gap-2">
                    <Check size={15} /> Flashcard criado com sucesso!
                  </div>
                )}
                {createError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{createError}</div>
                )}

                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Matéria</label>
                  <input
                    className="input-field"
                    placeholder="Ex: Cardiologia"
                    value={form.subject}
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Pergunta</label>
                  <textarea
                    className="input-field resize-none"
                    rows={3}
                    placeholder="Ex: Quais são os critérios de Framingham?"
                    value={form.question}
                    onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Resposta</label>
                  <textarea
                    className="input-field resize-none"
                    rows={4}
                    placeholder="Escreva a resposta completa aqui..."
                    value={form.answer}
                    onChange={e => setForm(p => ({ ...p, answer: e.target.value }))}
                  />
                </div>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-60"
                >
                  {creating
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Criando...</>
                    : <><Plus size={16} /> Criar flashcard</>
                  }
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
