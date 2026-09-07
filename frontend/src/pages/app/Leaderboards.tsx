import { useState, useEffect } from 'react';
import { TrendingUp, Trophy, Zap, Clock, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface RankingItem {
  rank: number;
  user_id: string;
  username: string;
  score: number;
}

interface UserRank {
  user_id: string;
  rank: number | null;
  score: number;
  percentile: number;
  period: string;
  metric: string;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'all_time';
type Metric = 'study_minutes' | 'accuracy' | 'streak' | 'cards_learned';

export default function Leaderboards() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('all_time');
  const [metric, setMetric] = useState<Metric>('study_minutes');
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [myRank, setMyRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);

  const metrics: { value: Metric; label: string; icon: React.ComponentType }[] = [
    { value: 'study_minutes', label: '⏱️ Tempo de Estudo', icon: Clock },
    { value: 'accuracy', label: '🎯 Acurácia', icon: Target },
    { value: 'cards_learned', label: '📚 Flashcards', icon: Zap },
    { value: 'streak', label: '🔥 Sequência', icon: TrendingUp },
  ];

  const periods = [
    { value: 'daily' as Period, label: 'Hoje' },
    { value: 'weekly' as Period, label: 'Semana' },
    { value: 'monthly' as Period, label: 'Mês' },
    { value: 'all_time' as Period, label: 'Todo Tempo' },
  ];

  useEffect(() => {
    fetchLeaderboards();
  }, [period, metric]);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);

      // Fetch rankings
      const rankRes = await fetch(`/api/leaderboards?period=${period}&metric=${metric}`);
      if (rankRes.ok) {
        const rankData = await rankRes.json();
        setRankings(rankData.rankings || []);
      }

      // Fetch user's rank
      const myRes = await fetch(`/api/leaderboards/my-rank?period=${period}&metric=${metric}`);
      if (myRes.ok) {
        const myData = await myRes.json();
        setMyRank(myData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'study_minutes':
        return 'minutos';
      case 'accuracy':
        return '%';
      case 'cards_learned':
        return 'cards';
      case 'streak':
        return 'dias';
      default:
        return '';
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-500 to-yellow-600';
    if (rank === 2) return 'from-gray-400 to-gray-500';
    if (rank === 3) return 'from-orange-400 to-orange-600';
    return 'from-slate-700 to-slate-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-primary-400" />
          <h1 className="text-4xl font-bold text-white">Rankings</h1>
        </div>

        {/* Controls */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Metric Selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-3">Métrica</label>
            <div className="grid grid-cols-2 gap-2">
              {metrics.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMetric(m.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    metric === m.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-800/50 text-gray-300 border border-slate-700 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period Selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-3">Período</label>
            <div className="grid grid-cols-4 gap-2">
              {periods.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-2 rounded-lg font-medium transition text-sm ${
                    period === p.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-800/50 text-gray-300 border border-slate-700 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User's Rank Card */}
        {myRank && (
          <div className="mb-8 card-glass rounded-lg p-6 border border-primary-500/30 bg-gradient-to-r from-primary-500/10 to-purple-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Sua Classificação</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold text-primary-400">
                    {myRank.rank || '—'}
                  </span>
                  <span className="text-2xl font-semibold text-white">
                    {myRank.score} {getMetricLabel()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Percentil</p>
                <p className="text-4xl font-bold text-purple-400">{myRank.percentile}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Rankings Table */}
        <div className="card-glass rounded-lg p-6 border border-white/10">
          <h2 className="text-2xl font-semibold text-white mb-6">Top 100 Estudantes</h2>

          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rankings.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum ranking disponível</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rankings.slice(0, 100).map((item) => {
                const medalEmoji = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : '•';

                return (
                  <div
                    key={item.user_id}
                    className={`flex items-center justify-between p-4 rounded-lg bg-gradient-to-r ${getRankColor(item.rank)} bg-opacity-10 border ${
                      item.user_id === user?.id
                        ? 'border-primary-500/50 bg-primary-500/20'
                        : 'border-slate-700'
                    } transition hover:bg-opacity-20`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 text-center">
                        <span className="text-xl">{medalEmoji}</span>
                        <p className="text-xs text-gray-400">#{item.rank}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">
                          {item.username}
                          {item.user_id === user?.id && (
                            <span className="ml-2 text-xs bg-primary-500 px-2 py-1 rounded text-white">
                              Você
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${item.rank <= 3 ? 'text-yellow-400' : 'text-primary-400'}`}>
                        {item.score}
                      </p>
                      <p className="text-xs text-gray-400">{getMetricLabel()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
