import { FormEvent, useEffect, useState } from 'react';
import { studyToolsApi } from '../../services/api';

type SummaryItem = {
  id: string;
  title: string;
  subject?: string;
  bullets?: string[];
  key_terms?: string[];
  created_at: string;
};

export default function StudySummariesPage() {
  const [items, setItems] = useState<SummaryItem[]>([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [flashTheme, setFlashTheme] = useState('');
  const [flashQuantity, setFlashQuantity] = useState(8);
  const [flashSubject, setFlashSubject] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialType, setMaterialType] = useState<'pdf' | 'video' | 'texto'>('pdf');
  const [materialUrl, setMaterialUrl] = useState('');
  const [flashSourceText, setFlashSourceText] = useState('');
  const [flashResult, setFlashResult] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await studyToolsApi.listSummaries();
      setItems(data?.items || []);
    } catch {
      setError('Não foi possível carregar os resumos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createSummary(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;
    setSaving(true);
    setError('');
    try {
      await studyToolsApi.summarize({ title: title.trim(), text: text.trim(), subject: subject.trim() || undefined });
      setTitle('');
      setSubject('');
      setText('');
      await load();
    } catch {
      setError('Não foi possível gerar o resumo.');
    } finally {
      setSaving(false);
    }
  }

  async function generateFlashcards(e: FormEvent) {
    e.preventDefault();
    const sourceText = [
      materialTitle.trim(),
      materialUrl.trim(),
      flashSourceText.trim(),
    ].filter(Boolean).join('\n\n');

    if (!flashTheme.trim() && sourceText.length < 40) return;

    setGeneratingFlashcards(true);
    setError('');
    setFlashResult('');

    try {
      const { data } = await studyToolsApi.generateFlashcardsByTheme({
        theme: flashTheme.trim() || (materialTitle.trim() || `Material ${materialType}`),
        quantity: flashQuantity,
        subject: flashSubject.trim() || undefined,
        source_text: sourceText || undefined,
      });

      const created = Number(data?.created || 0);
      const label = materialTitle.trim() || flashTheme.trim() || 'material';
      setFlashResult(`IA criou ${created} flashcards automaticamente a partir de "${label}".`);
      setFlashTheme('');
      setFlashSubject('');
      setMaterialTitle('');
      setMaterialType('pdf');
      setMaterialUrl('');
      setFlashSourceText('');
      setFlashQuantity(8);
    } catch {
      setError('Não foi possível gerar flashcards automáticos a partir do material informado.');
    } finally {
      setGeneratingFlashcards(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Biblioteca de resumos</h1>
        <p className="text-gray-400 text-sm mt-1">Transforme textos longos em pontos-chave de revisão.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}

      <form onSubmit={createSummary} className="card-glass rounded-2xl p-5 card-glow space-y-3">
        <input className="input-field" placeholder="Título do resumo" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input-field" placeholder="Disciplina (opcional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea
          className="input-field min-h-[140px]"
          placeholder="Cole o conteúdo para resumir..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" disabled={saving || !title.trim() || !text.trim()} className="btn-primary text-sm px-5 py-3 disabled:opacity-60">
          {saving ? 'Gerando resumo...' : 'Gerar resumo'}
        </button>
      </form>

      <form onSubmit={generateFlashcards} className="card-glass rounded-2xl p-5 card-glow space-y-3">
        <h2 className="text-white font-semibold text-lg">Gerar flashcards a partir de PDF, vídeo ou texto</h2>
        <p className="text-gray-400 text-sm">Use um tema, um link do material ou cole o conteúdo principal da aula para transformar em cards de revisão.</p>

        <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-3">
          <input
            className="input-field"
            placeholder="Tema ou nome do material (ex: fisiologia renal, aula de bioquímica)"
            value={flashTheme}
            onChange={(e) => setFlashTheme(e.target.value)}
          />
          <select
            className="input-field"
            value={materialType}
            onChange={(e) => setMaterialType(e.target.value as 'pdf' | 'video' | 'texto')}
          >
            <option value="pdf">PDF</option>
            <option value="video">Vídeo</option>
            <option value="texto">Texto</option>
          </select>
        </div>

        <input
          className="input-field"
          placeholder="Nome do material (opcional)"
          value={materialTitle}
          onChange={(e) => setMaterialTitle(e.target.value)}
        />

        <input
          className="input-field"
          placeholder="URL do PDF ou vídeo (opcional)"
          value={materialUrl}
          onChange={(e) => setMaterialUrl(e.target.value)}
        />

        <textarea
          className="input-field min-h-[120px]"
          placeholder="Cole trechos da aula, resumo do PDF, roteiro do vídeo ou outras anotações para personalizar a geração dos flashcards"
          value={flashSourceText}
          onChange={(e) => setFlashSourceText(e.target.value)}
        />
        <div className="grid md:grid-cols-2 gap-3">
          <input
            className="input-field"
            placeholder="Disciplina (opcional)"
            value={flashSubject}
            onChange={(e) => setFlashSubject(e.target.value)}
          />
          <input
            type="number"
            min={3}
            max={20}
            className="input-field"
            value={flashQuantity}
            onChange={(e) => setFlashQuantity(Number(e.target.value || 8))}
          />
        </div>
        <button
          type="submit"
          disabled={generatingFlashcards || (!flashTheme.trim() && !materialTitle.trim() && !materialUrl.trim() && flashSourceText.trim().length < 40)}
          className="btn-primary text-sm px-5 py-3 disabled:opacity-60"
        >
          {generatingFlashcards ? 'Criando flashcards...' : 'Criar flashcards automaticamente'}
        </button>
        {flashResult && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-300 text-sm">
            {flashResult}
          </div>
        )}
      </form>

      {loading ? (
        <div className="text-gray-400 text-sm">Carregando resumos...</div>
      ) : items.length === 0 ? (
        <div className="card-glass rounded-2xl p-6 text-gray-400 text-sm">Nenhum resumo criado ainda.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card-glass rounded-2xl p-5 card-glow">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="text-white font-semibold">{item.title}</h3>
                <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              {item.subject && <p className="text-xs text-primary-300 mb-2">{item.subject}</p>}

              {Array.isArray(item.bullets) && item.bullets.length > 0 && (
                <ul className="space-y-1 text-sm text-gray-300 list-disc pl-5">
                  {item.bullets.slice(0, 5).map((b, i) => (
                    <li key={`${item.id}-b-${i}`}>{b}</li>
                  ))}
                </ul>
              )}

              {Array.isArray(item.key_terms) && item.key_terms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {item.key_terms.slice(0, 8).map((term, idx) => (
                    <span key={`${item.id}-k-${idx}`} className="text-[11px] px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-300 border border-primary-500/30">
                      {term}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
