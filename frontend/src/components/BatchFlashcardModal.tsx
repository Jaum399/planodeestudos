import { useState } from 'react';
import { Plus, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
interface FlashcardPreview {
  question: string;
  answer: string;
  subject: string;
}

interface BatchFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cards: Array<{ subject: string; question: string; answer: string; deck_id?: string | null }>) => Promise<void>;
  deckId?: string | null;
  subjects?: string[];
}

export default function BatchFlashcardModal({
  isOpen,
  onClose,
  onSave,
  deckId,
  subjects = [],
}: BatchFlashcardModalProps) {
  const [activeTab, setActiveTab] = useState<'input' | 'preview'>('input');
  const [inputText, setInputText] = useState('');
  const [cards, setCards] = useState<FlashcardPreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || '');

  const parseInput = (text: string): FlashcardPreview[] => {
    const newErrors: string[] = [];
    const parsed: FlashcardPreview[] = [];

    if (!text.trim()) {
      setErrors(['Campo vazio. Preencha com as questões.']);
      return [];
    }

    // Try to detect format: CSV (Q1|A1\nQ2|A2) or JSON array
    const lines = text.trim().split('\n').filter(l => l.trim());

    lines.forEach((line, idx) => {
      // Support pipe separator or tab
      const parts = line.includes('|')
        ? line.split('|')
        : line.includes('\t')
          ? line.split('\t')
          : [line]; // Fallback to single part

      if (parts.length < 2) {
        newErrors.push(`Linha ${idx + 1}: Deve ter questão|resposta`);
        return;
      }

      const question = parts[0].trim();
      const answer = parts[1].trim();

      if (!question || !answer) {
        newErrors.push(`Linha ${idx + 1}: Questão e resposta não podem ser vazias`);
        return;
      }

      if (question.length > 500) {
        newErrors.push(`Linha ${idx + 1}: Questão muito longa (máx 500 caracteres)`);
        return;
      }

      if (answer.length > 1000) {
        newErrors.push(`Linha ${idx + 1}: Resposta muito longa (máx 1000 caracteres)`);
        return;
      }

      parsed.push({
        question,
        answer,
        subject: selectedSubject,
      });
    });

    // Check for duplicates
    const uniqueQuestions = new Set<string>();
    parsed.forEach((card, idx) => {
      const key = `${card.question.toLowerCase()}|${card.answer.toLowerCase()}`;
      if (uniqueQuestions.has(key)) {
        newErrors.push(`Linha ${idx + 1}: Duplicado (questão ou resposta já existe)`);
      }
      uniqueQuestions.add(key);
    });

    setErrors(newErrors);
    return parsed.filter((_, idx) => !newErrors.some(e => e.startsWith(`Linha ${idx + 1}`)));
  };

  const handleParse = () => {
    const parsed = parseInput(inputText);
    setCards(parsed);
    if (parsed.length > 0 && errors.length === 0) {
      setActiveTab('preview');
    }
  };

  const handleSave = async () => {
    if (cards.length === 0) return;

    setIsLoading(true);
    try {
      const flashcardsToSave = cards.map((card) => ({
        ...card,
        deck_id: deckId,
        user_id: '',
      }));

      await onSave(flashcardsToSave);
      setInputText('');
      setCards([]);
      setErrors([]);
      onClose();
    } catch (error) {
      setErrors([`Erro ao salvar: ${error instanceof Error ? error.message : 'Tente novamente'}`]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in p-4">
      <div className="bg-app-surface rounded-2xl shadow-2xl w-full max-w-2xl relative border border-primary-700/30 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-app-surface border-b border-white/10 p-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus size={18} />
            Criar Flashcards em Lote
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10 p-0">
          <div className="flex">
            <button
              onClick={() => setActiveTab('input')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'input'
                  ? 'border-b-2 border-primary-400 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Entrada
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              disabled={cards.length === 0}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'border-b-2 border-primary-400 text-white'
                  : 'text-gray-400 hover:text-gray-300 disabled:opacity-50'
              }`}
            >
              Preview ({cards.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {activeTab === 'input' ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Formato: Questão | Resposta (uma por linha)
                </label>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-400 focus:bg-white/10 min-h-[240px] font-mono text-sm"
                  placeholder="Ex:&#10;O que é fotossíntese? | Processo de conversão de luz em energia química&#10;Qual é a capital da França? | Paris"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

              {subjects.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">Matéria (Opcional)</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white focus:outline-none focus:border-primary-400"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <option value="">Selecionar matéria...</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {errors.length} erro(s) encontrado(s):
                  </p>
                  <ul className="space-y-1">
                    {errors.slice(0, 5).map((error, i) => (
                      <li key={i} className="text-red-300 text-xs">
                        • {error}
                      </li>
                    ))}
                    {errors.length > 5 && (
                      <li className="text-red-300 text-xs">• ... e mais {errors.length - 5}</li>
                    )}
                  </ul>
                </div>
              )}

              <button
                onClick={handleParse}
                disabled={!inputText.trim() || isLoading}
                className="w-full btn-primary py-2 disabled:opacity-50"
              >
                {isLoading ? 'Processando...' : 'Visualizar'}
              </button>
            </>
          ) : (
            <>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cards.map((card, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-1">#{idx + 1}</p>
                        <p className="text-white font-medium text-sm mb-2">{card.question}</p>
                        <p className="text-gray-400 text-sm">{card.answer}</p>
                        {card.subject && (
                          <p className="text-primary-400 text-xs mt-2">Matéria: {card.subject}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setCards(cards.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                        aria-label="Remover"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3">
                <p className="text-primary-300 text-sm">
                  ✅ {cards.length} flashcard(s) pronto(s) para salvar
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab('input')}
                  className="flex-1 btn-secondary py-2"
                  disabled={isLoading}
                >
                  Voltar
                </button>
                <button
                  onClick={handleSave}
                  disabled={cards.length === 0 || isLoading}
                  className="flex-1 btn-primary py-2 disabled:opacity-50"
                >
                  {isLoading ? 'Salvando...' : 'Salvar Tudo'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
