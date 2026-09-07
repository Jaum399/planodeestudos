import { FormEvent, useState } from 'react';
import { FileUp, Link2, Sparkles, X } from 'lucide-react';

type MaterialType = 'pdf' | 'video';

export type MaterialGenerationData = {
  theme: string;
  subject?: string;
  quantity: number;
  source_text?: string;
  material_type: MaterialType;
  material_name?: string;
  material_url?: string;
  deck_id?: string;
  file?: File;
};

interface MaterialFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: MaterialGenerationData) => Promise<number>;
  decks: Array<{ id: string; name: string }>;
}

export default function MaterialFlashcardModal({ isOpen, onClose, onGenerate, decks }: MaterialFlashcardModalProps) {
  const [materialType, setMaterialType] = useState<MaterialType>('pdf');
  const [materialName, setMaterialName] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [theme, setTheme] = useState('');
  const [subject, setSubject] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [quantity, setQuantity] = useState(8);
  const [deckId, setDeckId] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFile = (file?: File) => {
    if (!file) return;
    setSelectedFileName(file.name);
    setSelectedFile(file);
    if (!materialName.trim()) {
      setMaterialName(file.name.replace(/\.(pdf|mp4|webm|mov|mkv)$/i, ''));
    }
  };

  const reset = () => {
    setMaterialType('pdf');
    setMaterialName('');
    setMaterialUrl('');
    setTheme('');
    setSubject('');
    setSourceText('');
    setQuantity(8);
    setDeckId('');
    setSelectedFileName('');
    setSelectedFile(undefined);
    setResult('');
    setError('');
  };

  const close = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const finalTheme = theme.trim() || materialName.trim();
    if (!finalTheme && sourceText.trim().length < 40) {
      setError('Informe o tema/material ou cole pelo menos 40 caracteres da transcricao ou do PDF.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const created = await onGenerate({
        theme: finalTheme,
        subject: subject.trim() || undefined,
        quantity,
        source_text: sourceText.trim() || undefined,
        material_type: materialType,
        material_name: materialName.trim() || selectedFileName || undefined,
        material_url: materialUrl.trim() || undefined,
        file: selectedFile,
        deck_id: deckId || undefined,
      });
      setResult(`${created} flashcard(s) criado(s) a partir do material.`);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Nao foi possivel gerar os flashcards.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in p-4">
      <div className="bg-app-surface rounded-2xl shadow-2xl p-6 w-full max-w-2xl relative border border-primary-700/30 max-h-[90vh] overflow-y-auto">
        <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={close} aria-label="Fechar">
          <X size={20} />
        </button>

        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-yellow-400" />
          Criar cards de um material
        </h3>
        <p className="text-gray-400 text-sm mb-5">Selecione um PDF ou video e forneca o texto extraido, a transcricao ou um tema para a IA.</p>

        {result ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-300 text-sm">{result}</div>
            <button className="btn-primary w-full py-2" onClick={close}>Concluir</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMaterialType('pdf')}
                className={`rounded-xl border p-3 text-left ${materialType === 'pdf' ? 'border-primary-400 bg-primary-500/15' : 'border-white/10 bg-white/5'}`}
              >
                <FileUp size={17} className="text-primary-300 mb-1" />
                <span className="block text-white text-sm font-medium">PDF</span>
                <span className="text-gray-400 text-xs">Apostila ou artigo</span>
              </button>
              <button
                type="button"
                onClick={() => setMaterialType('video')}
                className={`rounded-xl border p-3 text-left ${materialType === 'video' ? 'border-primary-400 bg-primary-500/15' : 'border-white/10 bg-white/5'}`}
              >
                <Sparkles size={17} className="text-primary-300 mb-1" />
                <span className="block text-white text-sm font-medium">Video</span>
                <span className="text-gray-400 text-xs">Aula ou revisao</span>
              </button>
            </div>

            <input
              type="file"
              accept={materialType === 'pdf' ? 'application/pdf,.pdf' : 'video/*'}
              className="input-field text-sm"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            {selectedFileName && <p className="text-xs text-primary-300 truncate">Arquivo selecionado: {selectedFileName}</p>}

            <div className="grid md:grid-cols-2 gap-3">
              <input className="input-field" placeholder="Nome ou tema do material" value={materialName} onChange={(event) => setMaterialName(event.target.value)} />
              <input className="input-field" placeholder="Link do material (opcional)" value={materialUrl} onChange={(event) => setMaterialUrl(event.target.value)} />
            </div>
            <div className="relative">
              <Link2 size={15} className="absolute left-3 top-3 text-gray-500" />
              <input className="input-field pl-9" placeholder="Tema especifico (opcional)" value={theme} onChange={(event) => setTheme(event.target.value)} />
            </div>
            <textarea
              className="input-field min-h-[140px]"
              placeholder="Cole aqui a transcricao do video, o texto extraido do PDF ou suas anotacoes..."
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
            />

            <div className="grid md:grid-cols-3 gap-3">
              <input className="input-field" placeholder="Disciplina" value={subject} onChange={(event) => setSubject(event.target.value)} />
              <input type="number" min={3} max={20} className="input-field" value={quantity} onChange={(event) => setQuantity(Number(event.target.value || 8))} />
              <select className="input-field" value={deckId} onChange={(event) => setDeckId(event.target.value)}>
                <option value="">Novo deck automatico</option>
                {decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
              </select>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>}
            <button type="submit" className="btn-primary w-full py-2.5 disabled:opacity-60" disabled={loading}>
              {loading ? 'Gerando flashcards...' : 'Gerar flashcards'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
