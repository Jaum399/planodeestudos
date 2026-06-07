import { useEffect, useMemo, useState } from 'react';
import { PlayCircle, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { lessonsApi } from '../../services/api';
import type { CourseRoadmap, Lesson, LessonFeedbackResponse } from '../../types';
import VideoPlayer from '../../components/VideoPlayer';
import { getCourseProfile } from '../../utils/courseProfiles';

const fallbackLessons: Lesson[] = [
  {
    title: 'Introdução à Revisão Espaçada',
    description: 'Fundamentos para revisar com consistência e retenção de longo prazo.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '12 min',
    free: true,
    tags: ['Método de Estudo'],
  },
  {
    title: 'Como montar seu plano semanal',
    description: 'Estruture uma semana de estudos com foco e metas alcançáveis.',
    videoUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    duration: '18 min',
    free: true,
    tags: ['Planejamento'],
  },
  {
    title: 'Técnica de leitura ativa e sublinhado seletivo',
    description: 'Aprenda a extrair o que importa sem desperdiçar tempo.',
    videoUrl: 'https://vimeo.com/76979871',
    duration: '22 min',
    free: false,
    tags: ['Leitura'],
  },
  {
    title: 'Gestão de tempo em provas e simulados',
    description: 'Estratégias práticas para distribuir tempo e maximizar desempenho.',
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    duration: '15 min',
    free: false,
    tags: ['Desempenho'],
  },
  {
    title: 'Flashcards de alto impacto: criação e revisão',
    description: 'Como criar cartões que realmente ajudam na memorização ativa.',
    videoUrl: 'https://www.youtube.com/watch?v=oUFJJNQGwhk',
    duration: '20 min',
    free: false,
    tags: ['Flashcards'],
  },
  {
    title: 'Rotina de alto rendimento para estudantes',
    description: 'Construa hábitos sustentáveis para manter a constância no estudo.',
    videoUrl: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    duration: '25 min',
    free: false,
    tags: ['Consistência'],
  },
];

export default function LessonsPage() {
  const { user } = useAuth();
  const isPremium = user && user.plan !== 'free';
  const courseProfile = useMemo(() => getCourseProfile(user?.area, user?.goal), [user?.area, user?.goal]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [roadmap, setRoadmap] = useState<CourseRoadmap[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<LessonFeedbackResponse | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);

  async function loadFeedback(lessonId: string) {
    try {
      const { data } = await lessonsApi.getFeedback(lessonId);
      setFeedback(data);
    } catch {
      setFeedback(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadLessons() {
      try {
        const [{ data }, roadmapRes] = await Promise.all([
          lessonsApi.getAll(),
          lessonsApi.getRoadmap(),
        ]);
        if (!isMounted) return;

        const normalized = Array.isArray(data)
          ? data.map((item: Lesson) => ({
              ...item,
              id: item.id || item._id,
            }))
          : [];

        if (normalized.length > 0) {
          setLessons(normalized);
          const first = normalized[0].id || null;
          setSelectedLessonId(first);
          if (first) loadFeedback(first);
        } else {
          setLessons(fallbackLessons);
          setSelectedLessonId(fallbackLessons[0].title);
        }

        setRoadmap(Array.isArray(roadmapRes.data) ? roadmapRes.data : []);
      } catch {
        if (!isMounted) return;
        setLessons(fallbackLessons);
        setSelectedLessonId(fallbackLessons[0].title);
        setRoadmap([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadLessons();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedLesson = useMemo(() => {
    if (!selectedLessonId) return null;
    return lessons.find((lesson) => (lesson.id || lesson._id || lesson.title) === selectedLessonId) || null;
  }, [lessons, selectedLessonId]);

  async function saveProgress(payload: { watched_seconds: number; duration_seconds?: number; last_position_seconds?: number; completed?: boolean }) {
    if (!selectedLesson || !selectedLesson._id) return;
    setIsSavingProgress(true);
    try {
      await lessonsApi.saveProgress(selectedLesson._id, payload);
      const { data } = await lessonsApi.getAll();
      const normalized = Array.isArray(data)
        ? data.map((item: Lesson) => ({
            ...item,
            id: item.id || item._id,
          }))
        : [];
      setLessons(normalized.length > 0 ? normalized : fallbackLessons);
    } catch {
      // noop
    } finally {
      setIsSavingProgress(false);
    }
  }

  async function completeLesson() {
    if (!selectedLesson || !selectedLesson._id) return;
    setIsSavingProgress(true);
    try {
      await lessonsApi.complete(selectedLesson._id);
      const [{ data }, roadmapRes] = await Promise.all([
        lessonsApi.getAll(),
        lessonsApi.getRoadmap(),
      ]);
      const normalized = Array.isArray(data)
        ? data.map((item: Lesson) => ({
            ...item,
            id: item.id || item._id,
          }))
        : [];
      setLessons(normalized.length > 0 ? normalized : fallbackLessons);
      setRoadmap(Array.isArray(roadmapRes.data) ? roadmapRes.data : []);
    } catch {
      // noop
    } finally {
      setIsSavingProgress(false);
    }
  }

  async function submitFeedback() {
    if (!selectedLesson || !selectedLesson._id) return;
    setIsSavingFeedback(true);
    try {
      await lessonsApi.saveFeedback(selectedLesson._id, { rating, comment });
      await loadFeedback(selectedLesson._id);
      setComment('');
    } finally {
      setIsSavingFeedback(false);
    }
  }

  const selectedProgressPct = useMemo(() => {
    if (!selectedLesson?.progress) return 0;
    const watched = selectedLesson.progress.watched_seconds || 0;
    const duration = selectedLesson.progress.duration_seconds || 0;
    if (duration <= 0) return selectedLesson.progress.completed ? 100 : 0;
    return Math.max(0, Math.min(100, Math.round((watched / duration) * 100)));
  }, [selectedLesson]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">{courseProfile.lessonsTitle}</h1>
        <p className="text-gray-400 text-sm mt-1">{courseProfile.lessonsDescription}</p>
      </div>

      <div className="card-glass rounded-2xl p-4 md:p-5">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Conteúdo sugerido para {courseProfile.title}</p>
        <p className="text-gray-300 text-sm">{courseProfile.dashboardFocus}</p>
      </div>

      {selectedLesson && (
        <div className="card-glass rounded-2xl p-4 md:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-white font-semibold text-lg">{selectedLesson.title}</h2>
              {!!selectedLesson.description && (
                <p className="text-sm text-gray-300 mt-1">{selectedLesson.description}</p>
              )}
            </div>
            {!selectedLesson.free && !isPremium && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">Premium</span>
            )}
          </div>

          {selectedLesson.free || isPremium ? (
            <>
              <VideoPlayer
                title={selectedLesson.title}
                videoUrl={selectedLesson.videoUrl}
                startAtSeconds={selectedLesson.progress?.last_position_seconds || 0}
                onProgress={(currentSeconds, durationSeconds) => {
                  if (!selectedLesson._id) return;
                  if (Math.floor(currentSeconds) % 20 !== 0) return;
                  saveProgress({
                    watched_seconds: currentSeconds,
                    duration_seconds: durationSeconds,
                    last_position_seconds: currentSeconds,
                  });
                }}
                onEnded={(durationSeconds) => {
                  saveProgress({
                    watched_seconds: durationSeconds,
                    duration_seconds: durationSeconds,
                    last_position_seconds: durationSeconds,
                    completed: true,
                  });
                }}
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-500 disabled:opacity-50"
                  onClick={completeLesson}
                  disabled={isSavingProgress}
                >
                  {isSavingProgress ? 'Salvando...' : 'Marcar como assistida'}
                </button>
                <span className="text-xs text-gray-400">
                  Progresso: {selectedProgressPct}% {selectedLesson.progress?.completed ? '• Concluída' : ''}
                </span>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-amber-300 text-sm">
              Esta aula está disponível para assinantes premium.
            </div>
          )}

          {!!selectedLesson._id && (
            <div className="card-glass rounded-2xl p-4 space-y-3">
              <h3 className="text-white font-semibold">Avaliação da aula</h3>
              <p className="text-xs text-gray-400">
                Média: {feedback?.average_rating ?? 0} ({feedback?.total ?? 0} avaliações)
              </p>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-300">Nota</label>
                <select
                  className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-sm text-white"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <textarea
                className="w-full min-h-[90px] bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-gray-500"
                placeholder="Escreva seu comentário (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-500 disabled:opacity-50"
                onClick={submitFeedback}
                disabled={isSavingFeedback}
              >
                {isSavingFeedback ? 'Enviando...' : 'Enviar avaliação'}
              </button>
            </div>
          )}
        </div>
      )}

      {roadmap.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-white font-semibold">Trilhas com desbloqueio progressivo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roadmap.map((course) => (
              <div key={course._id || course.title} className="card-glass rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-white font-semibold text-sm">{course.title}</h3>
                  <span className="text-xs text-primary-300">{course.completion_pct}%</span>
                </div>
                <p className="text-xs text-gray-400">{course.completed_lessons}/{course.total_lessons} aulas concluídas</p>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500" style={{ width: `${course.completion_pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && lessons.length === 0 ? (
          <div className="card-glass rounded-2xl p-5 text-sm text-gray-400">Carregando aulas...</div>
        ) : lessons.map((lesson) => {
          const locked = lesson.canAccess === false || (!lesson.free && !isPremium);
          const lessonKey = lesson.id || lesson._id || lesson.title;
          const lessonTag = lesson.tags?.[0] || 'Aula';
          return (
            <div
              key={lessonKey}
              onClick={() => {
                if (!locked) {
                  setSelectedLessonId(lessonKey);
                  if (lesson._id) loadFeedback(lesson._id);
                }
              }}
              className={`card-glass rounded-2xl p-5 card-glow flex items-start gap-4 transition-all duration-200 ${locked ? 'opacity-60' : 'hover:-translate-y-1 cursor-pointer'} ${selectedLessonId === lessonKey ? 'ring-1 ring-primary-500/50' : ''}`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${locked ? 'bg-gray-700/40' : 'bg-primary-600/20'}`}>
                {locked
                  ? <Lock size={18} className="text-gray-500" />
                  : <PlayCircle size={18} className="text-primary-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-white font-semibold text-sm leading-snug">{lesson.title}</h3>
                  {locked && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">Premium</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-primary-300 bg-primary-600/10 border border-primary-500/20 px-2 py-0.5 rounded-full">{lessonTag}</span>
                  <span className="text-gray-500 text-xs">{lesson.duration}</span>
                  {lesson.progress?.completed && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                      Concluída
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
