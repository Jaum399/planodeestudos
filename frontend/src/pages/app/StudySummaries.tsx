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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
