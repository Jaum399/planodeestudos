import { useEffect, useState } from 'react';
import { lessonsApi } from '../../services/api';
import type { CourseRoadmap } from '../../types';

export default function CoursesPage() {
  const [tracks, setTracks] = useState<CourseRoadmap[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadRoadmap() {
      try {
        const { data } = await lessonsApi.getRoadmap();
        if (!isMounted) return;
        setTracks(Array.isArray(data) ? data : []);
      } catch {
        if (!isMounted) return;
        setTracks([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRoadmap();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Cursos</h1>
        <p className="text-gray-400 text-sm mt-1">Trilhas de execução para acelerar evolução sem perder consistência.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="card-glass rounded-2xl p-5 text-sm text-gray-400">Carregando trilhas...</div>
        ) : tracks.length === 0 ? (
          <div className="card-glass rounded-2xl p-5 text-sm text-gray-400">Nenhuma trilha disponível no momento.</div>
        ) : tracks.map((track) => {
          const firstBlocked = track.lessons.find((lesson) => lesson.unlockedBySequence === false);
          return (
            <div key={track._id || track.title} className="card-glass rounded-2xl p-5 card-glow space-y-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="text-white font-semibold">{track.title}</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-300 border border-primary-500/30">
                  {track.completion_pct}%
                </span>
              </div>
              <p className="text-sm text-gray-300">{track.description || 'Trilha com execução progressiva por etapas.'}</p>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500" style={{ width: `${track.completion_pct}%` }} />
              </div>
              <p className="text-xs text-gray-400">{track.completed_lessons}/{track.total_lessons} aulas concluídas</p>
              {firstBlocked && (
                <p className="text-xs text-amber-300">Próxima etapa bloqueada até concluir as aulas anteriores.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
