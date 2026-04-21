import { FormEvent, useEffect, useMemo, useState } from 'react';

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'mentudo.notes.v1';

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Note[];
      setNotes(Array.isArray(parsed) ? parsed : []);
    } catch {
      setNotes([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  function addNote(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const now = new Date().toISOString();
    const next: Note = {
      id: crypto.randomUUID(),
      title: title.trim(),
      body: body.trim(),
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [next, ...prev]);
    setTitle('');
    setBody('');
  }

  function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
  }, [notes, query]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Minhas anotações</h1>
        <p className="text-gray-400 text-sm mt-1">Anotações rápidas salvas localmente no seu navegador.</p>
      </div>

      <form onSubmit={addNote} className="card-glass rounded-2xl p-5 card-glow space-y-3">
        <input className="input-field" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input-field min-h-[120px]" placeholder="Escreva sua anotação..." value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="submit" disabled={!title.trim() || !body.trim()} className="btn-primary text-sm px-5 py-3 disabled:opacity-60">
          Salvar anotação
        </button>
      </form>

      <input className="input-field" placeholder="Buscar anotação..." value={query} onChange={(e) => setQuery(e.target.value)} />

      {filtered.length === 0 ? (
        <div className="card-glass rounded-2xl p-6 text-gray-400 text-sm">Nenhuma anotação encontrada.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <div key={note.id} className="card-glass rounded-2xl p-5 card-glow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-white font-semibold">{note.title}</h3>
                  <p className="text-gray-500 text-xs mt-1">{new Date(note.updatedAt).toLocaleString('pt-BR')}</p>
                </div>
                <button type="button" onClick={() => removeNote(note.id)} className="text-xs text-red-400 hover:text-red-300">
                  Excluir
                </button>
              </div>
              <p className="text-sm text-gray-300 mt-3 whitespace-pre-wrap">{note.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
