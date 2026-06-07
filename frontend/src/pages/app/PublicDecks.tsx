import { useState, useEffect } from 'react';
import { Search, Filter, Star, Download, Heart, Zap, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PublicDeck {
  id: string;
  title: string;
  description: string;
  subject: string;
  category: string;
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  rating: number;
  rating_count: number;
  imports: number;
  favorites: number;
  views: number;
  user_id: string;
}

export default function PublicDecks() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<PublicDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sort, setSort] = useState<'rating' | 'trending' | 'newest'>('rating');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const difficultyColor = (level: string) => {
    switch (level) {
      case 'iniciante': return 'bg-green-500/20 text-green-400';
      case 'intermediario': return 'bg-yellow-500/20 text-yellow-400';
      case 'avancado': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const difficultyLabel = (level: string) => {
    switch (level) {
      case 'iniciante': return '🟢 Iniciante';
      case 'intermediario': return '🟡 Intermediário';
      case 'avancado': return '🔴 Avançado';
      default: return level;
    }
  };

  useEffect(() => {
    const loadDecks = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (subject) params.append('subject', subject);
        if (difficulty) params.append('difficulty', difficulty);
        params.append('sort', sort);
        params.append('page', page.toString());
        params.append('limit', '12');

        const res = await fetch(`/api/public-decks?${params}`, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) throw new Error('Erro ao buscar decks');

        const data = await res.json();
        setDecks(data.items);
        setTotal(data.pagination.total);
      } catch (error) {
        console.error('Erro:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(loadDecks, 300);
    return () => clearTimeout(timer);
  }, [search, subject, difficulty, sort, page]);

  const handleImport = async (deckId: string, title: string) => {
    try {
      const res = await fetch(`/api/public-decks/${deckId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error('Erro ao importar');

      const data = await res.json();
      alert(`✅ ${data.cards_imported} flashcards importados com sucesso!`);
      navigate('/app/flashcards');
    } catch (error) {
      alert('❌ Erro ao importar deck');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-8 h-8 text-primary-400" />
          <h1 className="text-4xl font-bold text-white">Biblioteca de Decks</h1>
        </div>
        <p className="text-gray-400 text-lg">Explore milhares de decks criados pela comunidade</p>
      </div>

      {/* Search & Filters */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar decks..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setPage(1);
            }}
            className="px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-primary-500 transition"
          >
            <option value="">Todas as matérias</option>
            <option value="Medicina">Medicina</option>
            <option value="Odontologia">Odontologia</option>
            <option value="Farmácia">Farmácia</option>
            <option value="Enfermagem">Enfermagem</option>
          </select>

          {/* Difficulty Filter */}
          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setPage(1);
            }}
            className="px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-primary-500 transition"
          >
            <option value="">Todas as dificuldades</option>
            <option value="iniciante">🟢 Iniciante</option>
            <option value="intermediario">🟡 Intermediário</option>
            <option value="avancado">🔴 Avançado</option>
          </select>
        </div>

        {/* Sort Options */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              setSort('rating');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              sort === 'rating'
                ? 'bg-primary-500 text-white'
                : 'bg-slate-800/50 text-gray-400 border border-slate-700 hover:text-white'
            }`}
          >
            ⭐ Melhores avaliados
          </button>
          <button
            onClick={() => {
              setSort('trending');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              sort === 'trending'
                ? 'bg-primary-500 text-white'
                : 'bg-slate-800/50 text-gray-400 border border-slate-700 hover:text-white'
            }`}
          >
            🔥 Em alta
          </button>
          <button
            onClick={() => {
              setSort('newest');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              sort === 'newest'
                ? 'bg-primary-500 text-white'
                : 'bg-slate-800/50 text-gray-400 border border-slate-700 hover:text-white'
            }`}
          >
            ✨ Mais novos
          </button>
        </div>
      </div>

      {/* Decks Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nenhum deck encontrado</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  className="group card-glass rounded-lg p-6 border border-white/10 hover:border-primary-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/20"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1 line-clamp-2 group-hover:text-primary-400 transition">
                        {deck.title}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-2">{deck.description}</p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded ${difficultyColor(deck.difficulty)}`}>
                      {difficultyLabel(deck.difficulty)}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-slate-700/50 text-gray-300">
                      {deck.subject}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center text-sm">
                    <div className="bg-slate-700/20 rounded p-2">
                      <div className="flex items-center justify-center gap-1 text-primary-400">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-semibold">{deck.rating.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-gray-500">{deck.rating_count} votos</p>
                    </div>
                    <div className="bg-slate-700/20 rounded p-2">
                      <div className="flex items-center justify-center gap-1 text-blue-400">
                        <Download className="w-4 h-4" />
                        <span className="font-semibold">{deck.imports}</span>
                      </div>
                      <p className="text-xs text-gray-500">importações</p>
                    </div>
                    <div className="bg-slate-700/20 rounded p-2">
                      <div className="flex items-center justify-center gap-1 text-pink-400">
                        <Heart className="w-4 h-4" />
                        <span className="font-semibold">{deck.favorites}</span>
                      </div>
                      <p className="text-xs text-gray-500">favoritos</p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleImport(deck.id, deck.title)}
                    className="w-full bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                  >
                    <Download className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    Importar Deck
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {total > 12 && (
              <div className="flex items-center justify-center gap-2 mb-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-slate-800/50 text-gray-400 disabled:opacity-50 hover:text-white transition"
                >
                  ← Anterior
                </button>
                <span className="text-gray-400">
                  Página {page} de {Math.ceil(total / 12)}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(total / 12)}
                  className="px-4 py-2 rounded-lg bg-slate-800/50 text-gray-400 disabled:opacity-50 hover:text-white transition"
                >
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
