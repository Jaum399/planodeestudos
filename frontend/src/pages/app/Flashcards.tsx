import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Clock3, Download, Plus, Target, TrendingUp, X, Sparkles, Upload } from 'lucide-react';
import { flashcardDecksApi, flashcardsApi, goalsApi, pdfApi, studyToolsApi } from '../../services/api';
import GoalTracker from '../../components/GoalTracker';
import BatchFlashcardModal from '../../components/BatchFlashcardModal';
import MaterialFlashcardModal, { MaterialGenerationData } from '../../components/MaterialFlashcardModal';
import type {
  Flashcard,
  FlashcardDeck,
  FlashcardDeckProgress,
  FlashcardsProgressSummary,
} from '../../types';

type DeckTile = {
  id: string;
  name: string;
  color: string;
  description: string;
  card_count: number;
};

const DECK_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#dc2626', '#d97706',
  '#db2777', '#0891b2', '#65a30d', '#9333ea', '#ea580c',
];

const EMPTY_SUMMARY: FlashcardsProgressSummary = {
  tracked_decks: 0,
  reviewed_total: 0,
  correct_total: 0,
  wrong_total: 0,
  due_today_total: 0,
};

function formatLastReviewed(value?: string) {
  if (!value) return 'Sem revisão ainda';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem revisão ainda';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function encodeChunkToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const step = 0x8000;
  for (let index = 0; index < bytes.length; index += step) {
    binary += String.fromCharCode(...bytes.subarray(index, index + step));
  }
  return btoa(binary);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler o PDF selecionado.'));
    reader.readAsDataURL(file);
  });
}

function readBlobAsArrayBuffer(blob: Blob) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Não foi possível ler uma parte do PDF.'));
    reader.readAsArrayBuffer(blob);
  });
}

export default function Flashcards() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [deckCards, setDeckCards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);

  const [progress, setProgress] = useState<FlashcardDeckProgress[]>([]);
  const [recentDecks, setRecentDecks] = useState<FlashcardDeckProgress[]>([]);
  const [dueTodayDecks, setDueTodayDecks] = useState<FlashcardDeckProgress[]>([]);
  const [summary, setSummary] = useState<FlashcardsProgressSummary>(EMPTY_SUMMARY);

  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [deckLoading, setDeckLoading] = useState(false);
  const [deckForm, setDeckForm] = useState({ name: '', color: '#7c3aed', description: '' });

  const [showBatchCreation, setShowBatchCreation] = useState(false);
  const [showMaterialGeneration, setShowMaterialGeneration] = useState(false);

  const [showAIGeneration, setShowAIGeneration] = useState(false);
  const [aiForm, setAiForm] = useState({
    theme: '',
    source_text: '',
    subject: '',
    quantity: 8,
    target_deck_id: '',
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const [dailyGoal, setDailyGoal] = useState<any>(null);
  const [todayProgress, setTodayProgress] = useState(0);

  const deckTiles = useMemo<DeckTile[]>(() => {
    const base = decks.map((deck) => ({
      id: deck.id,
      name: deck.name,
      color: deck.color || '#7c3aed',
      description: deck.description || '',
      card_count: deck.card_count || 0,
    }));

    if (uncategorizedCount > 0) {
      base.push({
        id: 'none',
        name: 'Sem categoria',
        color: '#64748b',
        description: 'Cards sem deck definido',
        card_count: uncategorizedCount,
      });
    }

    return base;
  }, [decks, uncategorizedCount]);

  const selectedDeck = useMemo(
    () => deckTiles.find((deck) => deck.id === selectedDeckId) || null,
    [deckTiles, selectedDeckId]
  );

  useEffect(() => {
    const deckIdFromQuery = searchParams.get('deck');
    if (!deckIdFromQuery) return;

    const exists = deckTiles.some((deck) => deck.id === deckIdFromQuery);
    if (!exists) {
      setSearchParams({}, { replace: true });
      if (selectedDeckId) setSelectedDeckId(null);
      return;
    }

    if (selectedDeckId !== deckIdFromQuery) {
      setSelectedDeckId(deckIdFromQuery);
    }
  }, [searchParams, deckTiles, selectedDeckId, setSearchParams]);

  async function loadDecksAndProgress() {
    setLoading(true);
    try {
      const [decksRes, progressRes, goalsRes] = await Promise.all([
        flashcardDecksApi.getAll(),
        flashcardsApi.getProgress(),
        goalsApi.getDailySummary().catch(() => ({ data: { goals: [] } })),
      ]);

      setDecks(Array.isArray(decksRes.data?.decks) ? decksRes.data.decks : []);
      setUncategorizedCount(Number(decksRes.data?.uncategorized_count || 0));

      setProgress(Array.isArray(progressRes.data?.progress) ? progressRes.data.progress : []);
      setRecentDecks(Array.isArray(progressRes.data?.recentDecks) ? progressRes.data.recentDecks : []);
      setDueTodayDecks(Array.isArray(progressRes.data?.dueTodayDecks) ? progressRes.data.dueTodayDecks : []);
      setSummary(progressRes.data?.summary || EMPTY_SUMMARY);

      if (goalsRes.data?.goals?.length > 0) {
        const goal = goalsRes.data.goals[0];
        setDailyGoal(goal);
        setTodayProgress(goal.today_progress || 0);
      } else {
        setDailyGoal(null);
        setTodayProgress(0);
      }
    } catch {
      setDecks([]);
      setUncategorizedCount(0);
      setProgress([]);
      setRecentDecks([]);
      setDueTodayDecks([]);
      setSummary(EMPTY_SUMMARY);
      setDailyGoal(null);
      setTodayProgress(0);
    } finally {
      setLoading(false);
    }
  }

  async function loadDeckCards(deckId: string) {
    setLoading(true);
    try {
      const cardsRes = await flashcardsApi.getAll(deckId);
      setDeckCards(Array.isArray(cardsRes.data?.cards) ? cardsRes.data.cards : []);
      setCurrentIdx(0);
      setFlipped(false);
    } catch {
      setDeckCards([]);
      setCurrentIdx(0);
      setFlipped(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDecksAndProgress();
  }, []);

  useEffect(() => {
    if (!selectedDeckId) return;
    loadDeckCards(selectedDeckId);
  }, [selectedDeckId]);

  const currentCard = deckCards[currentIdx];

  const handleRate = async (difficulty: number) => {
    if (!currentCard) return;
    try {
      await flashcardsApi.review(currentCard.id, difficulty);

      // Update goal progress if goal exists
      if (dailyGoal && dailyGoal._id) {
        try {
          const goalRes = await goalsApi.updateProgress(dailyGoal._id);
          setTodayProgress(goalRes.data?.progress_value || todayProgress + 1);
        } catch {
          // Goal update failed, but card review succeeded
          setTodayProgress(todayProgress + 1);
        }
      }

      setFlipped(false);
      setTimeout(() => {
        setCurrentIdx((idx) => idx + 1);
      }, 250);
    } catch {
      // mantém card atual se falhar
    }
  };

  const handleCreateDeck = async () => {
    if (!deckForm.name.trim()) return;
    setDeckLoading(true);
    try {
      await flashcardDecksApi.create(deckForm);
      setDeckForm({ name: '', color: '#7c3aed', description: '' });
      setShowCreateDeck(false);
      await loadDecksAndProgress();
    } catch {
      // noop
    } finally {
      setDeckLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiForm.theme.trim() && aiForm.source_text.trim().length < 40) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const { data } = await studyToolsApi.generateFlashcardsByTheme({
        theme: aiForm.theme.trim() || undefined,
        quantity: aiForm.quantity,
        subject: aiForm.subject.trim() || undefined,
        source_text: aiForm.source_text.trim() || undefined,
        deck_id: aiForm.target_deck_id || undefined,
      });

      const created = Number(data?.created || 0);
      setAiResult(`✨ IA criou ${created} flashcards para você!`);
      setAiForm({ theme: '', source_text: '', subject: '', quantity: 8, target_deck_id: '' });
      setTimeout(() => {
        setShowAIGeneration(false);
        loadDecksAndProgress();
      }, 1500);
    } catch (error) {
      setAiResult('❌ Não foi possível gerar flashcards. Tente novamente.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleBatchCreate = async (cards: any[]) => {
    try {
      await flashcardsApi.batchCreate(cards);
      await loadDecksAndProgress();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Erro ao criar flashcards');
    }
  };

  const handleGenerateFromMaterial = async (material: MaterialGenerationData) => {
    let extractedText = '';
    if (material.material_type === 'pdf' && material.file) {
      if (material.file.type !== 'application/pdf' && !/\.pdf$/i.test(material.file.name)) {
        throw new Error('Selecione um arquivo PDF válido.');
      }

      let documentId = '';
      const inlineLimit = 2 * 1024 * 1024;
      if (material.file.size <= inlineLimit) {
        const dataUrl = await readFileAsDataUrl(material.file);
        const { data } = await pdfApi.uploadDocument({
          title: material.material_name || material.file.name.replace(/\.pdf$/i, ''),
          file_name: material.file.name,
          mime_type: 'application/pdf',
          size_bytes: material.file.size,
          data_url: dataUrl,
        });
        documentId = String(data?.document?.id || '');
      } else {
        const { data } = await pdfApi.initUpload({
          title: material.material_name || material.file.name.replace(/\.pdf$/i, ''),
          file_name: material.file.name,
          mime_type: 'application/pdf',
          size_bytes: material.file.size,
        });
        documentId = String(data?.upload?.documentId || '');
        const chunkSize = Number(data?.upload?.chunkSizeBytes || inlineLimit);
        const totalChunks = Math.ceil(material.file.size / chunkSize);
        for (let index = 0; index < totalChunks; index += 1) {
          const start = index * chunkSize;
          const buffer = await readBlobAsArrayBuffer(material.file.slice(start, Math.min(material.file.size, start + chunkSize)));
          await pdfApi.uploadChunk(documentId, {
            chunk_index: index,
            total_chunks: totalChunks,
            chunk_data: encodeChunkToBase64(buffer),
          });
        }
        await pdfApi.completeUpload(documentId);
      }

      if (!documentId) throw new Error('Não foi possível salvar o PDF para análise.');
      const { data: extracted } = await pdfApi.extractText(documentId);
      extractedText = String(extracted?.text || '');
    }

    const materialContext = [
      `Tipo de material: ${material.material_type}`,
      material.material_name ? `Nome: ${material.material_name}` : '',
      material.material_url ? `Link: ${material.material_url}` : '',
      extractedText,
      material.source_text || '',
    ].filter(Boolean).join('\n\n');

    const { data } = await studyToolsApi.generateFlashcardsByTheme({
      theme: material.theme,
      quantity: material.quantity,
      subject: material.subject,
      source_text: materialContext || undefined,
      deck_id: material.deck_id,
    });
    await loadDecksAndProgress();
    return Number(data?.created || 0);
  };

  const downloadExport = (format: 'csv' | 'json') => {
    if (!selectedDeck || deckCards.length === 0) return;
    const escapeCsv = (value: string) => `"${String(value || '').replace(/"/g, '""')}"`;
    const content = format === 'csv'
      ? [
        ['Pergunta', 'Resposta', 'Disciplina'].map(escapeCsv).join(','),
        ...deckCards.map((card) => [card.question, card.answer, card.subject].map(escapeCsv).join(',')),
      ].join('\n')
      : JSON.stringify(deckCards.map(({ question, answer, subject }) => ({ question, answer, subject })), null, 2);
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedDeck.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'flashcards'}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openDeckFromProgress = (deckId: string) => {
    const exists = deckTiles.some((deck) => deck.id === deckId);
    if (!exists) return;
    setSearchParams({ deck: deckId });
    setSelectedDeckId(deckId);
  };

  const backToDecks = async () => {
    setSearchParams({}, { replace: true });
    setSelectedDeckId(null);
    setDeckCards([]);
    setCurrentIdx(0);
    setFlipped(false);
    await loadDecksAndProgress();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-300">Carregando...</div>;
  }

  if (!selectedDeck) {
    return (
      <div className="space-y-6 animate-fade-in">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <article className="card-glass rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-2 text-gray-300 text-sm mb-2">
              <BookOpen size={16} className="text-primary-400" />
              Continuar de onde parou
            </div>
            {recentDecks.length > 0 ? (
              <div className="space-y-2">
                {recentDecks.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openDeckFromProgress(item.deck_id)}
                    className="w-full rounded-xl px-3 py-2 bg-white/5 hover:bg-white/10 text-left transition-colors"
                  >
                    <div className="text-white text-sm font-medium truncate">{item.deck_name}</div>
                    <div className="text-gray-400 text-xs">Última revisão: {formatLastReviewed(item.last_reviewed_at)}</div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nenhum deck revisado ainda.</p>
            )}
          </article>

          <article className="card-glass rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-2 text-gray-300 text-sm mb-2">
              <Clock3 size={16} className="text-amber-400" />
              Revisar hoje
            </div>
            {dueTodayDecks.length > 0 ? (
              <div className="space-y-2">
                {dueTodayDecks.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openDeckFromProgress(item.deck_id)}
                    className="w-full rounded-xl px-3 py-2 bg-white/5 hover:bg-white/10 text-left transition-colors"
                  >
                    <div className="text-white text-sm font-medium truncate">{item.deck_name}</div>
                    <div className="text-amber-300 text-xs">{item.due_today} card(s) para revisar</div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sem revisões pendentes para hoje.</p>
            )}
          </article>

          <article className="card-glass rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-2 text-gray-300 text-sm mb-3">
              <TrendingUp size={16} className="text-emerald-400" />
              Resumo do dia
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-300">
                <span>Revisados</span>
                <span className="text-white font-semibold">{summary.reviewed_total}</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>Acertos</span>
                <span className="text-emerald-300 font-semibold">{summary.correct_total}</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>Erros</span>
                <span className="text-rose-300 font-semibold">{summary.wrong_total}</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>Pendentes hoje</span>
                <span className="text-amber-300 font-semibold">{summary.due_today_total}</span>
              </div>
            </div>
          </article>
        </section>

        {dailyGoal && <GoalTracker goal={dailyGoal} todayProgress={todayProgress} onUpdate={loadDecksAndProgress} />}

        <section className="card-glass rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Meus Decks</h2>
              <p className="text-gray-400 text-sm">Escolha um deck para abrir seus flashcards</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                className="btn-primary py-2 px-3 inline-flex items-center gap-2 text-sm"
                onClick={() => setShowAIGeneration(true)}
              >
                <Sparkles size={14} />
                Gerar com IA
              </button>
              <button
                className="btn-primary py-2 px-3 inline-flex items-center gap-2 text-sm"
                onClick={() => setShowMaterialGeneration(true)}
              >
                <Upload size={14} />
                PDF ou vídeo
              </button>
              <button
                className="btn-primary py-2 px-3 inline-flex items-center gap-2 text-sm"
                onClick={() => setShowBatchCreation(true)}
              >
                <Upload size={14} />
                Importar Lote
              </button>
              <button
                className="btn-primary py-2 px-3 inline-flex items-center gap-2"
                onClick={() => setShowCreateDeck(true)}
              >
                <Plus size={14} />
                Novo deck
              </button>
            </div>
          </div>

          {deckTiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {deckTiles.map((deck) => {
                const deckProgress = progress.find((p) => p.deck_id === deck.id);
                return (
                  <button
                    key={deck.id}
                    onClick={() => {
                      setSearchParams({ deck: deck.id });
                      setSelectedDeckId(deck.id);
                    }}
                    className="rounded-2xl p-4 bg-app-surface border border-white/10 hover:border-white/20 hover:-translate-y-0.5 transition-all text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: deck.color }} />
                      <span className="text-xs text-gray-400">{deck.card_count} cards</span>
                    </div>
                    <h3 className="text-white font-semibold truncate">{deck.name}</h3>
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2 min-h-[2rem]">{deck.description || 'Sem descrição'}</p>
                    {deckProgress ? (
                      <div className="mt-3 text-xs text-gray-400 flex items-center justify-between">
                        <span>Acerto: {deckProgress.accuracy}%</span>
                        <span>Hoje: {deckProgress.due_today}</span>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-gray-500">Ainda sem progresso registrado</div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">Nenhum deck criado ainda.</div>
          )}
        </section>

        {showCreateDeck && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in p-4">
            <div className="bg-app-surface rounded-2xl shadow-2xl p-6 w-full max-w-sm relative border border-primary-700/30">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-white"
                onClick={() => setShowCreateDeck(false)}
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold text-white mb-4">Novo Deck</h3>
              <div className="flex flex-col gap-3">
                <input
                  className="input-field text-base py-2"
                  placeholder="Nome do deck"
                  value={deckForm.name}
                  onChange={(e) => setDeckForm((p) => ({ ...p, name: e.target.value }))}
                  maxLength={40}
                  autoFocus
                />
                <textarea
                  className="input-field text-base py-2 min-h-[60px]"
                  placeholder="Descrição (opcional)"
                  value={deckForm.description}
                  onChange={(e) => setDeckForm((p) => ({ ...p, description: e.target.value }))}
                  maxLength={120}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {DECK_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setDeckForm((p) => ({ ...p, color }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${deckForm.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ background: color }}
                      aria-label={`Escolher cor ${color}`}
                    />
                  ))}
                </div>
                <button
                  className="btn-primary py-2 mt-2"
                  disabled={deckLoading || !deckForm.name.trim()}
                  onClick={handleCreateDeck}
                >
                  {deckLoading ? 'Salvando...' : 'Criar deck'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAIGeneration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in p-4">
            <div className="bg-app-surface rounded-2xl shadow-2xl p-6 w-full max-w-md relative border border-primary-700/30">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-white"
                onClick={() => {
                  setShowAIGeneration(false);
                  setAiResult('');
                }}
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles size={18} className="text-yellow-400" />
                Gerar Flashcards com IA
              </h3>

              {aiResult ? (
                <div className="text-center py-8">
                  <p className="text-white text-lg mb-4">{aiResult}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Tema</label>
                    <input
                      className="input-field text-sm py-2"
                      placeholder="Ex: Fisiologia renal, Farmacologia"
                      value={aiForm.theme}
                      onChange={(e) => setAiForm({ ...aiForm, theme: e.target.value })}
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Conteúdo (opcional, recomendado)
                    </label>
                    <textarea
                      className="input-field text-sm py-2 min-h-[80px]"
                      placeholder="Cole o conteúdo da aula/capítulo para personalizados"
                      value={aiForm.source_text}
                      onChange={(e) => setAiForm({ ...aiForm, source_text: e.target.value })}
                      maxLength={2000}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Disciplina</label>
                      <input
                        className="input-field text-sm py-2"
                        placeholder="Opcional"
                        value={aiForm.subject}
                        onChange={(e) => setAiForm({ ...aiForm, subject: e.target.value })}
                        maxLength={30}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Quantidade</label>
                      <input
                        type="number"
                        min={3}
                        max={20}
                        className="input-field text-sm py-2"
                        value={aiForm.quantity}
                        onChange={(e) => setAiForm({ ...aiForm, quantity: Number(e.target.value || 8) })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Deck de destino</label>
                    <select
                      className="input-field text-sm py-2"
                      value={aiForm.target_deck_id}
                      onChange={(e) => setAiForm({ ...aiForm, target_deck_id: e.target.value })}
                    >
                      <option value="">Criar novo deck</option>
                      {deckTiles.map((deck) => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    className="btn-primary py-2.5 mt-2"
                    disabled={
                      aiLoading ||
                      (!aiForm.theme.trim() && aiForm.source_text.trim().length < 40)
                    }
                    onClick={handleGenerateAI}
                  >
                    {aiLoading ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⚡</span>
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} className="inline mr-1" />
                        Gerar Cards
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <BatchFlashcardModal
          isOpen={showBatchCreation}
          onClose={() => setShowBatchCreation(false)}
          onSave={handleBatchCreate}
          deckId={selectedDeckId}
          subjects={[...new Set(deckTiles.map(d => d.id).filter(id => id !== 'none'))]}
        />
        <MaterialFlashcardModal
          isOpen={showMaterialGeneration}
          onClose={() => setShowMaterialGeneration(false)}
          onGenerate={handleGenerateFromMaterial}
          decks={deckTiles.filter((deck) => deck.id !== 'none').map((deck) => ({ id: deck.id, name: deck.name }))}
        />
      </div>
    );
  }

  const progressPct = deckCards.length
    ? Math.min(100, Math.round(((currentIdx + 1) / deckCards.length) * 100))
    : 100;

  return (
    <div className="flex flex-col items-center gap-6 py-8 animate-fade-in">
      <div className="w-full max-w-3xl flex items-center gap-3">
        <button className="text-primary-400 hover:underline text-sm" onClick={backToDecks}>
          ← Voltar para decks
        </button>
        <h2 className="text-xl font-bold text-white flex-1 text-center truncate">{selectedDeck.name}</h2>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary p-2 disabled:opacity-40"
            onClick={() => downloadExport('csv')}
            disabled={deckCards.length === 0}
            aria-label="Exportar flashcards em CSV"
            title="Exportar CSV"
          >
            <Download size={16} />
          </button>
          <button
            className="btn-secondary text-xs px-2 py-2 disabled:opacity-40"
            onClick={() => downloadExport('json')}
            disabled={deckCards.length === 0}
            title="Exportar JSON"
          >
            JSON
          </button>
        </div>
        <span className="w-5 h-5 rounded-full" style={{ background: selectedDeck.color }} />
      </div>

      <div className="w-full max-w-3xl bg-white/5 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-primary-500 transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="text-xs text-gray-400">{Math.min(currentIdx + 1, Math.max(deckCards.length, 1))} de {Math.max(deckCards.length, 1)}</p>

      {currentCard ? (
        <div className="w-full max-w-2xl flex flex-col items-center gap-4">
          <button
            className={`w-full rounded-2xl p-8 bg-app-card shadow-lg cursor-pointer select-none text-center text-white text-lg min-h-[180px] flex items-center justify-center ${flipped ? 'bg-primary-900/70' : ''}`}
            onClick={() => setFlipped((prev) => !prev)}
            aria-label="Virar card"
          >
            {flipped ? currentCard.answer : currentCard.question}
          </button>

          <div className="text-xs text-gray-400">Clique no card para ver a resposta</div>

          <div className="flex flex-wrap justify-center gap-3 mt-1">
            <button className="btn-secondary" onClick={() => handleRate(1)}>Difícil</button>
            <button className="btn-secondary" onClick={() => handleRate(2)}>Médio</button>
            <button className="btn-secondary" onClick={() => handleRate(3)}>Fácil</button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-2xl card-glass rounded-2xl p-8 text-center border border-white/10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/15 mb-3">
            <Target className="text-emerald-300" size={22} />
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">Deck finalizado</h3>
          <p className="text-gray-400 text-sm mb-4">Você revisou todos os cards deste deck.</p>
          <button className="btn-primary" onClick={backToDecks}>Escolher outro deck</button>
        </div>
      )}
    </div>
  );
}
