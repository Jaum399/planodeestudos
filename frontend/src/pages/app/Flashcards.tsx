import { useEffect, useState } from 'react';
import { Plus, X, Check, RotateCcw, BookOpen, Layers, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { flashcardsApi, flashcardDecksApi } from '../../services/api';
import type { Flashcard, FlashcardDeck } from '../../types';

type Tab = 'review' | 'all' | 'create';

const DECK_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#dc2626', '#d97706',
  '#db2777', '#0891b2', '#65a30d', '#9333ea', '#ea580c',
];

export default function Flashcards() {
  const [tab, setTab] = useState<Tab>('review');
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null); // null = all, 'none' = uncategorized, else deck id
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewed, setReviewed] = useState(0);
  const [searchSub, setSearchSub] = useState('');

  // Deck panel
  const [showDeckPanel, setShowDeckPanel] = useState(true);
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [deckForm, setDeckForm] = useState({ name: '', color: '#7c3aed', description: '' });
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
  const [deckLoading, setDeckLoading] = useState(false);

  // Create form
  const [form, setForm] = useState({ subject: '', question: '', answer: '', deck_id: null as string | null });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  const loadAll = async () => {
    try {
      const deckFilter = selectedDeck;
      const [allRes, reviewRes, decksRes] = await Promise.all([
        flashcardsApi.getAll(deckFilter),
        flashcardsApi.getReview(deckFilter),
        flashcardDecksApi.getAll(),
      ]);
      setAllCards(allRes.data.cards);
      setReviewCards(reviewRes.data.cards);
      setDecks(decksRes.data.decks);
      setUncategorizedCount(decksRes.data.uncategorized_count);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentIdx(0);
    setFlipped(false);
    setReviewed(0);
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeck]);

  const currentCard = reviewCards[currentIdx];

  const handleRate = async (difficulty: number) => {
    if (!currentCard) return;
    try {
      await flashcardsApi.review(currentCard.id, difficulty);
      setFlipped(false);
      setReviewed(p => p + 1);
      setTimeout(() => setCurrentIdx(p => p + 1), 300);
      const updated = await flashcardsApi.getAll(selectedDeck);
      setAllCards(updated.data.cards);
    } catch { /* noop */ }
  };

  const handleCreate = async () => {
    if (!form.subject.trim() || !form.question.trim() || !form.answer.trim()) {
      setCreateError('Todos os campos são obrigatórios.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await flashcardsApi.create({
        subject: form.subject,
        question: form.question,
        answer: form.answer,
        deck_id: form.deck_id,
      });
      setForm({ subject: '', question: '', answer: '', deck_id: selectedDeck === 'none' ? null : selectedDeck });
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 3000);
      loadAll();
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
    } catch { /* noop */ }
  };

  const handleCreateDeck = async () => {
    if (!deckForm.name.trim()) return;
    setDeckLoading(true);
    try {
      await flashcardDecksApi.create(deckForm);
      setDeckForm({ name: '', color: '#7c3aed', description: '' });
      setShowCreateDeck(false);
      loadAll();
    } catch { /* noop */ } finally {
      setDeckLoading(false);
    }
  };

  const handleSaveDeck = async () => {
    if (!editingDeck || !deckForm.name.trim()) return;
    setDeckLoading(true);
    try {
      await flashcardDecksApi.update(editingDeck.id, deckForm);
      setEditingDeck(null);
      setDeckForm({ name: '', color: '#7c3aed', description: '' });
      loadAll();
    } catch { /* noop */ } finally {
      setDeckLoading(false);
    }
  };

  const handleDeleteDeck = async (deck: FlashcardDeck) => {
    if (!confirm(`Excluir deck "${deck.name}"? Os cards serão movidos para Sem Categoria.`)) return;
    try {
      await flashcardDecksApi.delete(deck.id);
      if (selectedDeck === deck.id) setSelectedDeck(null);
      loadAll();
    } catch { /* noop */ }
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

  const activeDeckName = selectedDeck === null
    ? 'Todos os Decks'
    : selectedDeck === 'none'
    ? 'Sem Categoria'
    : decks.find(d => d.id === selectedDeck)?.name ?? 'Deck';

  const activeDeckColor = selectedDeck === null || selectedDeck === 'none'
    ? '#7c3aed'
    : decks.find(d => d.id === selectedDeck)?.color ?? '#7c3aed';

  return (
    <div className="flex gap-4 animate-fade-in min-h-0">
      {/* Deck sidebar */}
      <div className={`transition-all duration-300 ${showDeckPanel ? 'w-56 min-w-[14rem]' : 'w-0 overflow-hidden'}`}>
        {showDeckPanel && (
          <div className="card-glass rounded-2xl p-3 space-y-1 h-fit">
            <div className="flex items-center justify-between px-2 pb-2 border-b border-white/5">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Decks</span>
              <button
                onClick={() => { setShowCreateDeck(true); setEditingDeck(null); setDeckForm({ name: '', color: '#7c3aed', description: '' }); }}
                className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary-600/20 transition-all"
                title="Criar deck"
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Create / Edit deck inline */}
            {(showCreateDeck || editingDeck) && (
              <div className="bg-app-bg rounded-xl p-3 space-y-2 mb-1">
                <input
                  className="input-field text-xs py-1.5"
                  placeholder="Nome do deck"
                  value={deckForm.name}
                  onChange={e => setDeckForm(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && (editingDeck ? handleSaveDeck() : handleCreateDeck())}
                  autoFocus
                />
                <div className="flex flex-wrap gap-1.5">
                  {DECK_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setDeckForm(p => ({ ...p, color: c }))}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${deckForm.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={editingDeck ? handleSaveDeck : handleCreateDeck}
                    disabled={deckLoading}
                    className="flex-1 py-1 text-xs rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-500 transition-all disabled:opacity-60"
                  >
                    {deckLoading ? '...' : editingDeck ? 'Salvar' : 'Criar'}
                  </button>
                  <button
                    onClick={() => { setShowCreateDeck(false); setEditingDeck(null); }}
                    className="px-2 text-xs rounded-lg bg-white/5 text-gray-400 hover:text-white transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* All decks */}
            <button
              onClick={() => setSelectedDeck(null)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all group ${selectedDeck === null ? 'bg-primary-600/20 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Layers size={14} className="shrink-0" />
              <span className="text-xs font-medium flex-1">Todos</span>
              <span className="text-[10px] text-gray-600">{allCards.length}</span>
            </button>

            {/* Deck list */}
            {decks.map(deck => (
              <div key={deck.id} className={`flex items-center gap-1 rounded-lg group transition-all ${selectedDeck === deck.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                <button
                  onClick={() => setSelectedDeck(deck.id)}
                  className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left"
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: deck.color }} />
                  <span className={`text-xs font-medium flex-1 truncate ${selectedDeck === deck.id ? 'text-white' : 'text-gray-400'}`}>{deck.name}</span>
                  <span className="text-[10px] text-gray-600">{deck.card_count}</span>
                </button>
                <div className="flex items-center opacity-0 group-hover:opacity-100 pr-1 gap-0.5">
                  <button
                    onClick={() => { setEditingDeck(deck); setDeckForm({ name: deck.name, color: deck.color, description: deck.description }); setShowCreateDeck(false); }}
                    className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-white rounded transition-all"
                  >
                    <Pencil size={10} />
                  </button>
                  <button
                    onClick={() => handleDeleteDeck(deck)}
                    className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-red-400 rounded transition-all"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}

            {/* Uncategorized */}
            {uncategorizedCount > 0 && (
              <button
                onClick={() => setSelectedDeck('none')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${selectedDeck === 'none' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
              >
                <span className="w-3 h-3 rounded-full shrink-0 bg-gray-600" />
                <span className="text-xs flex-1">Sem categoria</span>
                <span className="text-[10px] text-gray-600">{uncategorizedCount}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeckPanel(p => !p)}
                className="text-gray-500 hover:text-white transition-colors"
                title="Mostrar/ocultar decks"
              >
                <ChevronRight size={18} className={`transition-transform ${showDeckPanel ? 'rotate-180' : ''}`} />
              </button>
              <h1 className="text-2xl font-bold text-white">Flashcards</h1>
              {selectedDeck !== null && (
                <span className="badge text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: activeDeckColor + '33', border: `1px solid ${activeDeckColor}55`, color: activeDeckColor }}>
                  {activeDeckName}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-0.5">Revisão espaçada com SM-2 · {allCards.length} cards</p>
          </div>
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
                tab === t.key ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
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
            {/* Review tab */}
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
                        : `Você revisou ${reviewed} card(s). Continue assim!`}
                    </p>
                    {reviewed > 0 && (
                      <button onClick={() => { setCurrentIdx(0); setReviewed(0); loadAll(); }} className="btn-secondary text-sm py-2 px-5">
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
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{currentIdx + 1} / {reviewCards.length}</span>
                      <span className="text-primary-400 font-medium">{currentCard.subject}</span>
                    </div>
                    <div className="w-full bg-app-bg rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-primary-700 to-primary-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${(currentIdx / reviewCards.length) * 100}%` }}
                      />
                    </div>

                    <div
                      className="flip-card w-full cursor-pointer select-none"
                      style={{ height: '220px' }}
                      onClick={() => setFlipped(p => !p)}
                    >
                      <div className={`flip-card-inner w-full h-full ${flipped ? 'flipped' : ''}`}>
                        <div className="flip-card-front card-glass rounded-2xl p-6 w-full h-full flex flex-col items-center justify-center card-glow border border-primary-600/20">
                          <span className="badge bg-primary-600/20 text-primary-300 mb-4">{currentCard.subject}</span>
                          <p className="text-white text-center font-medium text-base">{currentCard.question}</p>
                          <p className="text-gray-600 text-xs mt-6">Toque para ver a resposta</p>
                        </div>
                        <div className="flip-card-back card-glass rounded-2xl p-6 w-full h-full flex flex-col items-center justify-center border border-emerald-600/20" style={{ background: 'rgba(16,185,129,0.05)' }}>
                          <span className="badge bg-emerald-600/20 text-emerald-300 mb-4">RESPOSTA</span>
                          <p className="text-white text-center text-sm leading-relaxed">{currentCard.answer}</p>
                        </div>
                      </div>
                    </div>

                    <div className={`grid grid-cols-3 gap-3 transition-opacity duration-300 ${flipped ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                      <button onClick={() => handleRate(0)} className="py-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 text-sm font-semibold hover:bg-red-500/25 transition-all">Não sabia</button>
                      <button onClick={() => handleRate(2)} className="py-3 rounded-xl bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-sm font-semibold hover:bg-yellow-500/25 transition-all">Quase</button>
                      <button onClick={() => handleRate(3)} className="py-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm font-semibold hover:bg-emerald-500/25 transition-all">Sabia!</button>
                    </div>
                    <p className="text-center text-gray-600 text-xs">Clique no card para revelar antes de avaliar</p>
                  </div>
                )}
              </div>
            )}

            {/* All tab */}
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
                      const deck = decks.find(d => d.id === card.deck_id);
                      return (
                        <div key={card.id} className="card-glass rounded-xl p-4 group">
                          <div className="flex items-start justify-between mb-2 gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="badge bg-primary-600/20 text-primary-300 text-[10px]">{card.subject}</span>
                              {deck && (
                                <span className="badge text-[10px] px-1.5 py-0.5" style={{ background: deck.color + '22', color: deck.color, border: `1px solid ${deck.color}44` }}>
                                  {deck.name}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDelete(card.id)}
                              className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1 shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <p className="text-white text-sm font-medium mb-2">{card.question}</p>
                          <p className="text-gray-500 text-xs line-clamp-2">{card.answer}</p>
                          <div className="flex items-center justify-between mt-3 text-[10px]">
                            <span className={dl.color}>{dl.text}</span>
                            <span className="text-gray-700">{card.review_count} rev.</span>
                            <span className="text-gray-700">Próx: {card.next_review ? new Date(card.next_review + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Hoje'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Create tab */}
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
                    <label className="block text-gray-400 text-xs font-medium mb-1.5">Deck</label>
                    <select
                      className="input-field"
                      value={form.deck_id ?? ''}
                      onChange={e => setForm(p => ({ ...p, deck_id: e.target.value || null }))}
                    >
                      <option value="">Sem categoria</option>
                      {decks.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
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
    </div>
  );
}
