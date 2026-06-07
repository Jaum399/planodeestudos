import { useState, useEffect } from 'react';
import { Award, Trophy, Sparkles, Zap, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at?: string;
  is_featured: boolean;
}

interface AchievementProgress {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  max: number;
  progress_percent: number;
  unlocked: boolean;
}

export default function Achievements() {
  const { user } = useAuth();
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [inProgress, setInProgress] = useState<AchievementProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'unlocked' | 'progress'>('unlocked');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      setLoading(true);

      // Fetch unlocked achievements
      const unlockedRes = await fetch('/api/achievements/my-achievements');
      if (unlockedRes.ok) {
        const data = await unlockedRes.json();
        setUnlockedAchievements(data.items || []);
      }

      // Fetch progress
      const progressRes = await fetch('/api/achievements/progress');
      if (progressRes.ok) {
        const data = await progressRes.json();
        setInProgress(data.in_progress || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Award className="w-8 h-8 text-primary-400" />
          <div>
            <h1 className="text-4xl font-bold text-white">Conquistas</h1>
            <p className="text-gray-400">Desbloqueadas: {unlockedAchievements.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('unlocked')}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              activeTab === 'unlocked'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            ✨ Desbloqueadas ({unlockedAchievements.length})
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              activeTab === 'progress'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            🚀 Em Progresso ({inProgress.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'unlocked' ? (
          unlockedAchievements.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Nenhuma conquista desbloqueada ainda</p>
              <p className="text-sm">Comece a estudar para desbloquear conquistas!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unlockedAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className="card-glass rounded-lg p-6 border border-primary-500/50 bg-gradient-to-br from-primary-500/10 to-transparent hover:border-primary-500 transition"
                >
                  <div className="text-5xl mb-4">{ach.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{ach.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{ach.description}</p>
                  {ach.unlocked_at && (
                    <p className="text-xs text-gray-500">
                      Desbloqueada em {new Date(ach.unlocked_at).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  {ach.is_featured && (
                    <div className="mt-3 inline-block bg-primary-500/20 text-primary-400 text-xs px-3 py-1 rounded-full">
                      ⭐ Em destaque
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          inProgress.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Você já desbloqueou todas as conquistas!</p>
              <p className="text-sm">Parabéns! 🎉</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inProgress.map((ach) => (
                <div
                  key={ach.id}
                  className="card-glass rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex gap-4 flex-1">
                      <div className="text-4xl">{ach.icon}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">{ach.name}</h3>
                        <p className="text-sm text-gray-400">{ach.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary-400">
                        {ach.progress}/{ach.max}
                      </p>
                      <p className="text-xs text-gray-500">{ach.progress_percent}%</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-purple-500 h-3 rounded-full transition-all"
                      style={{ width: `${ach.progress_percent}%` }}
                    />
                  </div>

                  {ach.progress_percent === 100 && (
                    <div className="mt-4 p-3 bg-primary-500/20 text-primary-400 text-sm rounded-lg border border-primary-500/30">
                      🎉 Pronto para desbloquear! Atue o navegador para verificar.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
