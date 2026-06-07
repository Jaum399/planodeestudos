import { useState, useEffect } from 'react';
import { Search, Star, Download, Heart, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
}

export default function PublicDecks() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [decks, setDecks] = useState<PublicDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sort, setSort] = useState<'rating' | 'trending' | 'newest'>('rating');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [featured, setFeatured] = useState<PublicDeck[]>([]);
  const [trending, setTrending] = useState<PublicDeck[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map());

  const [previewDeck, setPreviewDeck] = useState<PublicDeck | null>(null);
  const [previewCards, setPreviewCards] = useState<any[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [ratingDeckId, setRatingDeckId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingReview, setRatingReview] = useState('');

  const [importingDeck, setImportingDeck] = useState<string | null>(null);

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
    loadMainDecks();
    loadFeaturedDecks();
    loadTrendingDecks();
    if (user) loadUserFavorites();
  }, [search, subject, difficulty, sort, page]);

  const loadMainDecks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (subject) params.append('subject', subject);
      if (difficulty) params.append('difficulty', difficulty);
      params.append('sort', sort);
      params.append('page', page.toString());
      params.append('limit', '12');

      const res = await fetch(`/api/public-decks?${params}`);
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

  const loadFeaturedDecks = async () => {
    try {
      const res = await fetch('/api/public-decks/featured');
      if (res.ok) {
        const data = await res.json();
        setFeatured(data.items);
      }
    } catch (error) {
      console.error('Erro ao carregar featured:', error);
    }
  };

  const loadTrendingDecks = async () => {
    try {
      const res = await fetch('/api/public-decks/trending?period=7days');
      if (res.ok) {
        const data = await res.json();
        setTrending(data.items);
      }
    } catch (error) {
      console.error('Erro ao carregar trending:', error);
    }
  };

  const loadUserFavorites = async () => {
    try {
      const res = await fetch('/api/public-decks/user/favorites/list');
      if (res.ok) {
        const data = await res.json();
        setFavorites(new Set(data.items.map((d: any) => d.id)));
      }
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    }
  };

  const handleViewDetails = async (deck: PublicDeck) => {
    try {
      const res = await fetch(`/api/public-decks/${deck.id}`);
      if (!res.ok) throw new Error('Erro ao buscar detalhes');
      const details = await res.json();

      let userRatingValue = 0;
      if (user) {
        const ratingRes = await fetch(`/api/public-decks/${deck.id}/my-rating`);
        if (ratingRes.ok) {
          const ratingData = await ratingRes.json();
          userRatingValue = ratingData.rating;
        }
      }

      setPreviewDeck(details);
      setPreviewCards(details.preview || []);
      setUserRating(userRatingValue);
      setIsPreviewOpen(true);
    } catch (error) {
      alert('❌ Erro ao carregar detalhes do deck');
      console.error(error);
    }
  };

  const handleImportDeck = async (deckId: string) => {
    if (!user) {
      alert('Faça login para importar decks');
      navigate('/login');
      return;
    }

    try {
      setImportingDeck(deckId);
      const res = await fetch(`/api/public-decks/${deckId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error('Erro ao importar');

      const data = await res.json();
      alert(`✅ ${data.cards_imported} flashcards importados com sucesso!`);
      setIsPreviewOpen(false);
      navigate('/app/flashcards');
    } catch (error) {
      alert('❌ Erro ao importar deck');
      console.error(error);
    } finally {
      setImportingDeck(null);
    }
  };

  const handleToggleFavorite = async (deckId: string) => {
    if (!user) {
      alert('Faça login para adicionar favoritos');
      navigate('/login');
      return;
    }

    try {
      const isFav = favorites.has(deckId);
      const res = await fetch(`/api/public-decks/${deckId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: !isFav }),
      });

      if (res.ok) {
        const newFavorites = new Set(favorites);
        if (isFav) newFavorites.delete(deckId);
        else newFavorites.add(deckId);
        setFavorites(newFavorites);
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingDeckId) return;

    try {
      const res = await fetch(`/api/public-decks/${ratingDeckId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingValue, review: ratingReview }),
      });

      if (res.ok) {
        const newRatings = new Map(userRatings);
        newRatings.set(ratingDeckId, ratingValue);
        setUserRatings(newRatings);
        setRatingDeckId(null);
        alert('✅ Avaliação registrada com sucesso!');
        loadMainDecks();
        loadFeaturedDecks();
        loadTrendingDecks();
      }
    } catch (error) {
      alert('❌ Erro ao avaliar deck');
      console.error(error);
    }
  };

  const renderDeckCard = (deck: PublicDeck, compact = false) => (
    <div
      key={deck.id}
      className={`group card-glass rounded-lg border border-white/10 hover:border-primary-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/20 ${
        compact ? 'p-4' : 'p-6'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3
            className="font-semibold text-white mb-1 line-clamp-2 group-hover:text-primary-400 transition cursor-pointer"
            onClick={() => handleViewDetails(deck)}
          >
            {deck.title}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2">{deck.description}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <span className={`text-xs px-2 py-1 rounded ${difficultyColor(deck.difficulty)}`}>
          {difficultyLabel(deck.difficulty)}
        </span>
        <span className="text-xs px-2 py-1 rounded bg-slate-700/50 text-gray-300">{deck.subject}</span>
      </div>

      <div className={`grid gap-2 mb-4 text-center text-sm ${compact ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <div className="bg-slate-700/20 rounded p-2">
          <div className="flex items-center justify-center gap-1 text-primary-400">
            <Star className="w-4 h-4 fill-current" />
            <span className="font-semibold">{deck.rating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-gray-500">{deck.rating_count}</p>
        </div>
        <div className="bg-slate-700/20 rounded p-2">
          <div className="flex items-center justify-center gap-1 text-blue-400">
            <Download className="w-4 h-4" />
            <span className="font-semibold">{deck.imports}</span>
          </div>
          <p className="text-xs text-gray-500">importações</p>
        </div>
        {!compact && (
          <div className="bg-slate-700/20 rounded p-2">
            <div className="flex items-center justify-center gap-1 text-pink-400">
              <Heart className="w-4 h-4" />
              <span className="font-semibold">{deck.favorites}</span>
            </div>
            <p className="text-xs text-gray-500">favoritos</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleImportDeck(deck.id)}
          disabled={importingDeck === deck.id}
          className="flex-1 bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          {importingDeck === deck.id ? 'Importando...' : 'Importar'}
        </button>
        <button
          onClick={() => handleToggleFavorite(deck.id)}
          className={`px-3 py-2 rounded-lg transition ${
            favorites.has(deck.id)
              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50'
              : 'bg-slate-800/50 text-gray-400 border border-slate-700 hover:text-pink-400'
          }`}
        >
          <Heart className={`w-4 h-4 ${favorites.has(deck.id) ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );

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

      {/* Featured Section */}
      {featured.length > 0 && !search && !subject && !difficulty && page === 1 && (
        <div className="max-w-7xl mx-auto mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">✨ Em Destaque</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.slice(0, 4).map(deck => renderDeckCard(deck, true))}
          </div>
        </div>
      )}

      {/* Trending Section */}
      {trending.length > 0 && !search && !subject && !difficulty && page === 1 && (
        <div className="max-w-7xl mx-auto mb-12">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            <h2 className="text-2xl font-bold text-white">🔥 Em Alta</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {trending.slice(0, 4).map(deck => renderDeckCard(deck, true))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <div className="flex gap-3 mt-4 flex-wrap">
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

      {/* Main Decks Grid */}
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
              {decks.map(deck => renderDeckCard(deck))}
            </div>

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

      {/* Preview Modal */}
      {isPreviewOpen && previewDeck && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">{previewDeck.title}</h2>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-gray-400">{previewDeck.description}</p>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded p-4 text-center">
                  <div className="text-primary-400 font-bold text-lg">{previewDeck.rating.toFixed(1)}</div>
                  <div className="text-gray-400 text-sm">{previewDeck.rating_count} votos</div>
                </div>
                <div className="bg-slate-800/50 rounded p-4 text-center">
                  <div className="text-blue-400 font-bold text-lg">{previewDeck.imports}</div>
                  <div className="text-gray-400 text-sm">importações</div>
                </div>
                <div className="bg-slate-800/50 rounded p-4 text-center">
                  <div className="text-pink-400 font-bold text-lg">{previewDeck.favorites}</div>
                  <div className="text-gray-400 text-sm">favoritos</div>
                </div>
              </div>

              {previewCards.length > 0 && (
                <div className="border-t border-slate-700 pt-4">
                  <h3 className="text-lg font-semibold text-white mb-4">📋 Preview de Cards</h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {previewCards.map((card: any, idx: number) => (
                      <div key={idx} className="bg-slate-800/50 rounded p-3">
                        <p className="text-white text-sm">{card.question?.substring(0, 80)}...</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => handleToggleFavorite(previewDeck.id)}
                  className={`px-4 py-2 rounded-lg transition ${
                    favorites.has(previewDeck.id)
                      ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50'
                      : 'bg-slate-800/50 text-gray-400 border border-slate-700'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${favorites.has(previewDeck.id) ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={() => setRatingDeckId(previewDeck.id)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-800/50 text-gray-400 border border-slate-700 hover:text-primary-400 transition"
                >
                  ⭐ Avaliar
                </button>

                <button
                  onClick={() => handleImportDeck(previewDeck.id)}
                  disabled={importingDeck === previewDeck.id}
                  className="flex-1 bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  {importingDeck === previewDeck.id ? '⏳ Importando...' : '📥 Importar Agora'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingDeckId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg max-w-md w-full border border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Avaliar Deck</h2>
            <p className="text-gray-400 mb-6">Sua opinião nos ajuda a melhorar!</p>

            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRatingValue(star)}
                  className={`text-4xl transition ${star <= ratingValue ? 'text-yellow-400' : 'text-gray-600'}`}
                >
                  ⭐
                </button>
              ))}
            </div>

            <textarea
              placeholder="Comentário (opcional)..."
              value={ratingReview}
              onChange={(e) => setRatingReview(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-gray-500 mb-4 resize-none"
              rows={3}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setRatingDeckId(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-800/50 text-gray-400 border border-slate-700 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={ratingValue === 0}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-600 hover:to-purple-600 disabled:opacity-50 text-white font-medium transition"
              >
                Enviar Avaliação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
