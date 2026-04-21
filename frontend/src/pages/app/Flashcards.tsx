import { useEffect, useState } from 'react';
import { Plus, X, Check, RotateCcw, BookOpen, Trash2, FolderPlus, Play, ChevronDown, ArrowLeft, Share2, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { flashcardsApi } from '../../services/api';
import type { Flashcard, Deck } from '../../types';

type Tab = 'review' | 'all' | 'decks' | 'create';

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

  // Decks
  const [decks, setDecks] = useState<Deck[]>([]);
  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false);
  const [deckForm, setDeckForm] = useState({ name: '', subject: '', color: '#3b82f6', description: '' });
  const [creatingDeck, setCreatingDeck] = useState(false);

  // Deck study mode
  const [studyDeck, setStudyDeck] = useState<Deck | null>(null);
  const [studyDeckIdx, setStudyDeckIdx] = useState(0);
  const [studyDeckFlipped, setStudyDeckFlipped] = useState(false);
  const [studyDeckDone, setStudyDeckDone] = useState(0);

  // Deck detail modal
  const [deckDetail, setDeckDetail] = useState<Deck | null>(null);

  // Add card to deck popover
  const [addToDeckCardId, setAddToDeckCardId] = useState<string | null>(null);

  // Create form – optional deck assignment
  const [createDeckId, setCreateDeckId] = useState('');

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

  useEffect(() => {
    loadCards();
    flashcardsApi.getDecks().then(({ data }) => setDecks(data)).catch(() => {});
  }, []);

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
      // Update card locally instead of fetching all
      setAllCards(prev =>
        prev.map(c => c.id === currentCard.id ? { ...c, review_count: c.review_count + 1 } : c)
      );
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
      const { data } = await flashcardsApi.create(form);
      const cardId = data.card?.id || data.card?._id;
      if (createDeckId && cardId) {
        await flashcardsApi.addCardToDeck(createDeckId, cardId).catch(() => {});
        setDecks(prev => prev.map(d =>
          d.id === createDeckId
            ? { ...d, card_count: d.card_count + 1, flashcard_ids: [...(d.flashcard_ids || []), cardId] }
            : d
        ));
      }
      setForm({ subject: '', question: '', answer: '' });
      setCreateDeckId('');
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

  const handleCreateDeck = async () => {
    if (!deckForm.name.trim() || !deckForm.subject.trim()) {
      alert('Nome e matéria são obrigatórios');
      return;
    }
    setCreatingDeck(true);
    try {
      const { data } = await flashcardsApi.createDeck(deckForm);
      setDeckForm({ name: '', subject: '', color: '#3b82f6', description: '' });
      setShowCreateDeckModal(false);
      // Add new deck to state instead of refetching all
      setDecks(prev => [...prev, data.deck || data]);
    } catch {
      alert('Erro ao criar deck');
    } finally {
      setCreatingDeck(false);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm('Excluir este deck?')) return;
    try {
      await flashcardsApi.deleteDeck(deckId);
      setDecks(prev => prev.filter(d => d.id !== deckId));
      if (deckDetail?.id === deckId) setDeckDetail(null);
    } catch {
      alert('Erro ao deletar deck');
    }
  };

  const handleAddToDeck = async (deckId: string, cardId: string) => {
    try {
      await flashcardsApi.addCardToDeck(deckId, cardId);
      setDecks(prev => prev.map(d =>
        d.id === deckId
          ? { ...d, card_count: d.card_count + 1, flashcard_ids: [...(d.flashcard_ids || []), cardId] }
          : d
      ));
      if (deckDetail?.id === deckId) {
        setDeckDetail(prev => prev ? { ...prev, card_count: prev.card_count + 1, flashcard_ids: [...(prev.flashcard_ids || []), cardId] } : prev);
      }
      setAddToDeckCardId(null);
    } catch {
      alert('Erro ao adicionar ao deck');
    }
  };

  const handleRemoveFromDeck = async (deckId: string, cardId: string) => {
    try {
      await flashcardsApi.removeCardFromDeck(deckId, cardId);
      setDecks(prev => prev.map(d =>
        d.id === deckId
          ? { ...d, card_count: Math.max(0, d.card_count - 1), flashcard_ids: (d.flashcard_ids || []).filter(id => id !== cardId) }
          : d
      ));
      if (deckDetail?.id === deckId) {
        setDeckDetail(prev => prev ? { ...prev, card_count: Math.max(0, prev.card_count - 1), flashcard_ids: (prev.flashcard_ids || []).filter(id => id !== cardId) } : prev);
      }
    } catch {
      alert('Erro ao remover do deck');
    }
  };

  const startStudyDeck = (deck: Deck) => {
    const cards = allCards.filter(c => deck.flashcard_ids?.includes(c.id));
    if (cards.length === 0) { alert('Este deck não tem cards. Adicione cards primeiro.'); return; }
    setStudyDeck(deck);
    setStudyDeckIdx(0);
    setStudyDeckFlipped(false);
    setStudyDeckDone(0);
    setDeckDetail(null);
  };

  const handleDeckStudyRate = async (difficulty: number) => {
    if (!studyDeck) return;
    const deckCards = allCards.filter(c => studyDeck.flashcard_ids?.includes(c.id));
    const card = deckCards[studyDeckIdx];
    if (!card) return;
    try {
      await flashcardsApi.review(card.id, difficulty);
      setStudyDeckFlipped(false);
      setStudyDeckDone(p => p + 1);
      setTimeout(() => setStudyDeckIdx(p => p + 1), 300);
    } catch { /* silent */ }
  };

  const filteredCards = allCards.filter(c =>
    !searchSub || c.subject.toLowerCase().includes(searchSub.toLowerCase())
  );

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsJson = () => {
    if (filteredCards.length === 0) return;
    downloadFile(
      `flashcards-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(filteredCards, null, 2),
      'application/json'
    );
  };

  const exportAsCsv = () => {
    if (filteredCards.length === 0) return;
    const escapeCell = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = ['subject', 'question', 'answer', 'review_count', 'next_review'];
    const rows = filteredCards.map((card) => [
      card.subject,
      card.question,
      card.answer,
      card.review_count,
      card.next_review || '',
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
    downloadFile(`flashcards-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
  };

  const exportAsPdf = () => {
    if (filteredCards.length === 0) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (required = 80) => {
      if (y + required <= pageHeight - margin) return;
      doc.addPage();
      y = margin;
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Flashcards exportados', margin, y);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, y);
    y += 24;

    filteredCards.forEach((card, index) => {
      const questionLines = doc.splitTextToSize(`Pergunta: ${card.question}`, maxWidth - 24);
      const answerLines = doc.splitTextToSize(`Resposta: ${card.answer}`, maxWidth - 24);
      const estimatedHeight = Math.max(92, 34 + questionLines.length * 12 + answerLines.length * 12 + 22);

      ensureSpace(estimatedHeight + 20);
      doc.setDrawColor(80, 80, 100);
      doc.roundedRect(margin, y, maxWidth, estimatedHeight, 10, 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${index + 1}. ${card.subject}`, margin + 12, y + 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(questionLines, margin + 12, y + 36);
      doc.text(answerLines, margin + 12, y + 54 + questionLines.length * 12);

      y += estimatedHeight + 14;
    });

    doc.save(`flashcards-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleShareCard = async (card: Flashcard) => {
    const text = `Flashcard: ${card.subject}\n\nPergunta: ${card.question}\n\nResposta: ${card.answer}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Flashcard - ${card.subject}`,
          text,
        });
        return;
      }
      await navigator.clipboard.writeText(text);
      alert('Flashcard copiado para compartilhamento.');
    } catch {
      alert('Não foi possível compartilhar este flashcard.');
    }
  };

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
          { key: 'decks', label: `📚 Decks (${decks.length})` },
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
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <input
                  className="input-field max-w-xs"
                  placeholder="Buscar por matéria..."
                  value={searchSub}
                  onChange={e => setSearchSub(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <button onClick={exportAsPdf} className="btn-secondary text-xs px-3" disabled={filteredCards.length === 0}>
                    <Download size={12} /> Exportar PDF
                  </button>
                  <button onClick={exportAsJson} className="btn-secondary text-xs px-3" disabled={filteredCards.length === 0}>
                    <Download size={12} /> Exportar JSON
                  </button>
                  <button onClick={exportAsCsv} className="btn-secondary text-xs px-3" disabled={filteredCards.length === 0}>
                    <Download size={12} /> Exportar CSV
                  </button>
                </div>
              </div>

              {filteredCards.length === 0 ? (
                <div className="text-center py-16 text-gray-600">
                  <BookOpen size={32} className="mx-auto mb-3 opacity-50" />
                  <p>Nenhum flashcard encontrado.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCards.map(card => {
                    const dl = diffLabel(card.difficulty);
                    const inDecks = decks.filter(d => d.flashcard_ids?.includes(card.id));
                    return (
                      <div key={card.id} className="card-glass rounded-xl p-4 group relative">
                        <div className="flex items-start justify-between mb-2">
                          <span className="badge bg-primary-600/20 text-primary-300 text-[10px]">{card.subject}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleShareCard(card)}
                              className="text-gray-500 hover:text-cyan-400 transition-colors p-1"
                              title="Compartilhar"
                            >
                              <Share2 size={13} />
                            </button>
                            <button
                              onClick={() => setAddToDeckCardId(addToDeckCardId === card.id ? null : card.id)}
                              className="text-gray-500 hover:text-primary-400 transition-colors p-1"
                              title="Adicionar ao deck"
                            >
                              <FolderPlus size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(card.id)}
                              className="text-gray-700 hover:text-red-400 transition-colors p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                        {/* Add-to-deck dropdown */}
                        {addToDeckCardId === card.id && (
                          <div className="absolute right-2 top-8 z-30 bg-app-bg border border-white/10 rounded-xl shadow-xl p-2 w-48">
                            <p className="text-gray-500 text-[10px] px-2 pb-1">Adicionar ao deck</p>
                            {decks.length === 0 ? (
                              <p className="text-gray-600 text-xs px-2 py-1">Crie um deck primeiro</p>
                            ) : decks.map(d => {
                              const alreadyIn = d.flashcard_ids?.includes(card.id);
                              return (
                                <button
                                  key={d.id}
                                  onClick={() => !alreadyIn && handleAddToDeck(d.id, card.id)}
                                  disabled={alreadyIn}
                                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
                                    alreadyIn ? 'text-gray-600 cursor-default' : 'text-gray-300 hover:bg-white/5'
                                  }`}
                                >
                                  <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: d.color }} />
                                  {d.name} {alreadyIn && '✓'}
                                </button>
                              );
                            })}
                            <div className="border-t border-white/10 mt-1 pt-1">
                              <button onClick={() => setAddToDeckCardId(null)} className="w-full text-center text-gray-600 text-[10px] py-1">Fechar</button>
                            </div>
                          </div>
                        )}
                        <p className="text-white text-sm font-medium mb-2">{card.question}</p>
                        <p className="text-gray-500 text-xs line-clamp-2">{card.answer}</p>
                        <div className="flex items-center justify-between mt-3 text-[10px]">
                          <span className={dl.color}>{dl.text}</span>
                          <span className="text-gray-700">{card.review_count} revisões</span>
                          <span className="text-gray-700">Próx: {card.next_review ? new Date(card.next_review + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Hoje'}</span>
                        </div>
                        {inDecks.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {inDecks.map(d => (
                              <span key={d.id} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: d.color + '25', color: d.color }}>{d.name}</span>
                            ))}
                          </div>
                        )}
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
                {decks.length > 0 && (
                  <div>
                    <label className="block text-gray-400 text-xs font-medium mb-1.5">Adicionar ao deck <span className="text-gray-600">(opcional)</span></label>
                    <select
                      className="input-field"
                      value={createDeckId}
                      onChange={e => setCreateDeckId(e.target.value)}
                    >
                      <option value="">Nenhum deck</option>
                      {decks.map(d => (
                        <option key={d.id} value={d.id}>{d.name} — {d.subject}</option>
                      ))}
                    </select>
                  </div>
                )}
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

          {/* ── DECKS TAB ── */}
          {tab === 'decks' && (
            <div className="space-y-4">
              <button
                onClick={() => setShowCreateDeckModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={16} /> Novo Deck
              </button>

              {decks.length === 0 ? (
                <div className="text-center py-16 text-gray-600">
                  <BookOpen size={32} className="mx-auto mb-3 opacity-50" />
                  <p>Nenhum deck criado ainda.</p>
                  <p className="text-xs mt-1">Crie um deck e adicione cards a ele pela aba <strong className="text-gray-500">Todos</strong>.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {decks.map(deck => (
                    <div
                      key={deck.id}
                      className="card-glass rounded-2xl p-5 group cursor-pointer hover:border-white/10 transition-all"
                      style={{ borderLeft: `4px solid ${deck.color}` }}
                      onClick={() => setDeckDetail(deck)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-white font-semibold">{deck.name}</h3>
                          <p className="text-gray-500 text-sm">{deck.subject}</p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteDeck(deck.id); }}
                          className="text-gray-700 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {deck.description && (
                        <p className="text-gray-400 text-xs mb-3">{deck.description}</p>
                      )}
                      <p className="text-gray-400 text-xs mb-4">
                        <span className="font-medium" style={{ color: deck.color }}>{deck.card_count}</span> cartões
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); setDeckDetail(deck); }}
                          className="btn-secondary text-xs flex-1"
                        >
                          Ver cards
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); startStudyDeck(deck); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ backgroundColor: deck.color + '25', color: deck.color }}
                        >
                          <Play size={12} /> Estudar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create Deck Modal */}
          {showCreateDeckModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-app-card rounded-2xl p-6 max-w-md w-full card-glow">
                <h2 className="text-white font-semibold mb-4">Novo Deck</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-xs font-medium mb-1.5">Nome do Deck</label>
                    <input
                      type="text"
                      className="input-field w-full"
                      placeholder="Ex: Cardiologia Básica"
                      value={deckForm.name}
                      onChange={e => setDeckForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs font-medium mb-1.5">Matéria</label>
                    <input
                      type="text"
                      className="input-field w-full"
                      placeholder="Ex: Cardiologia"
                      value={deckForm.subject}
                      onChange={e => setDeckForm(p => ({ ...p, subject: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs font-medium mb-1.5">Descrição (opcional)</label>
                    <textarea
                      className="input-field w-full resize-none"
                      rows={2}
                      placeholder="Descrição do deck..."
                      value={deckForm.description}
                      onChange={e => setDeckForm(p => ({ ...p, description: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs font-medium mb-2">Cor</label>
                    <div className="flex gap-2">
                      {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-lg transition-transform ${
                            deckForm.color === color ? 'ring-2 ring-white scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setDeckForm(p => ({ ...p, color }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setShowCreateDeckModal(false)}
                    className="btn-secondary flex-1"
                    disabled={creatingDeck}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateDeck}
                    className="btn-primary flex-1 disabled:opacity-60"
                    disabled={creatingDeck}
                  >
                    {creatingDeck ? 'Criando...' : 'Criar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── DECK STUDY OVERLAY ── */}
      {studyDeck && (() => {
        const deckCards = allCards.filter(c => studyDeck.flashcard_ids?.includes(c.id));
        const card = deckCards[studyDeckIdx];
        const done = studyDeckIdx >= deckCards.length;
        return (
          <div className="fixed inset-0 bg-app-bg/95 z-50 flex flex-col overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <button
                onClick={() => setStudyDeck(null)}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
              >
                <ArrowLeft size={16} /> Sair do estudo
              </button>
              <div className="text-center">
                <p className="text-white font-semibold text-sm">{studyDeck.name}</p>
                <p className="text-gray-500 text-xs">{studyDeck.subject}</p>
              </div>
              <div className="text-gray-500 text-sm">{Math.min(studyDeckIdx, deckCards.length)}/{deckCards.length}</div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-lg space-y-4">
                {done ? (
                  <div className="card-glass rounded-2xl p-10 text-center card-glow">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <Check size={28} className="text-emerald-400" />
                    </div>
                    <h3 className="text-white font-bold text-xl mb-2">Deck concluído! 🎉</h3>
                    <p className="text-gray-400 text-sm mb-6">Você revisou {studyDeckDone} card(s) do deck <strong className="text-white">{studyDeck.name}</strong>.</p>
                    <div className="flex gap-3 justify-center">
                      <button onClick={() => { setStudyDeckIdx(0); setStudyDeckDone(0); setStudyDeckFlipped(false); }} className="btn-secondary text-sm">
                        <RotateCcw size={14} /> Repetir
                      </button>
                      <button onClick={() => setStudyDeck(null)} className="btn-primary text-sm">
                        Voltar aos Decks
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-full bg-app-bg rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${(studyDeckIdx / deckCards.length) * 100}%`, backgroundColor: studyDeck.color }}
                      />
                    </div>
                    <div
                      className="flip-card w-full cursor-pointer select-none"
                      style={{ height: '220px' }}
                      onClick={() => setStudyDeckFlipped(p => !p)}
                    >
                      <div className={`flip-card-inner w-full h-full ${studyDeckFlipped ? 'flipped' : ''}`}>
                        <div className="flip-card-front card-glass rounded-2xl p-6 w-full h-full flex flex-col items-center justify-center card-glow" style={{ borderColor: studyDeck.color + '40' }}>
                          <span className="badge mb-4" style={{ backgroundColor: studyDeck.color + '25', color: studyDeck.color }}>{card?.subject}</span>
                          <p className="text-white text-center font-medium text-base">{card?.question}</p>
                          <p className="text-gray-600 text-xs mt-6">Toque para ver a resposta</p>
                        </div>
                        <div className="flip-card-back card-glass rounded-2xl p-6 w-full h-full flex flex-col items-center justify-center border border-emerald-600/20" style={{ background: 'rgba(16,185,129,0.05)' }}>
                          <span className="badge bg-emerald-600/20 text-emerald-300 mb-4">RESPOSTA</span>
                          <p className="text-white text-center text-sm leading-relaxed">{card?.answer}</p>
                        </div>
                      </div>
                    </div>
                    <div className={`grid grid-cols-3 gap-3 transition-opacity duration-300 ${studyDeckFlipped ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                      <button onClick={() => handleDeckStudyRate(0)} className="py-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 text-sm font-semibold hover:bg-red-500/25 transition-all">Não sabia</button>
                      <button onClick={() => handleDeckStudyRate(2)} className="py-3 rounded-xl bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-sm font-semibold hover:bg-yellow-500/25 transition-all">Quase</button>
                      <button onClick={() => handleDeckStudyRate(3)} className="py-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm font-semibold hover:bg-emerald-500/25 transition-all">Sabia!</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── DECK DETAIL MODAL ── */}
      {deckDetail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setDeckDetail(null)}>
          <div className="bg-app-card rounded-2xl p-6 max-w-lg w-full card-glow max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: deckDetail.color }} />
                <div>
                  <h2 className="text-white font-semibold">{deckDetail.name}</h2>
                  <p className="text-gray-500 text-xs">{deckDetail.subject} · {deckDetail.card_count} cartões</p>
                </div>
              </div>
              <button onClick={() => setDeckDetail(null)} className="text-gray-600 hover:text-white p-1"><X size={18} /></button>
            </div>

            {deckDetail.description && (
              <p className="text-gray-400 text-xs mb-4 px-1">{deckDetail.description}</p>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {allCards.filter(c => deckDetail.flashcard_ids?.includes(c.id)).length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <BookOpen size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum card neste deck ainda.</p>
                  <p className="text-xs mt-1">Adicione cards pela aba <strong className="text-gray-500">Todos</strong> usando o 📂.</p>
                </div>
              ) : allCards.filter(c => deckDetail.flashcard_ids?.includes(c.id)).map(card => (
                <div key={card.id} className="flex items-center gap-3 bg-white/3 rounded-xl p-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{card.question}</p>
                    <p className="text-gray-500 text-xs truncate">{card.answer}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveFromDeck(deckDetail.id, card.id)}
                    className="text-gray-700 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="Remover do deck"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => startStudyDeck(deckDetail)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: deckDetail.color }}
            >
              <Play size={15} /> Estudar Deck
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
