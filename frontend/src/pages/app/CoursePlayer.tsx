import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import LessonSidebar from '../../components/LessonSidebar';

interface Lesson {
  _id: string;
  title: string;
  estimated_minutes: number;
  order: number;
  content?: {
    video_url?: string;
    text_markdown?: string;
    embedded_content?: string;
  };
  learning_objectives?: string[];
  course_id: string;
  chapter_id: string;
}

interface Chapter {
  _id: string;
  title: string;
  order: number;
  lessons: Lesson[];
  estimated_hours: number;
  lessons_count: number;
}

interface Course {
  _id: string;
  title: string;
}

export default function CoursePlayer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const courseId = searchParams.get('course');
  const lessonId = searchParams.get('lesson');

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    if (!courseId || !lessonId) return;
    fetchCourseAndLesson();
  }, [courseId, lessonId]);

  const fetchCourseAndLesson = async () => {
    if (!courseId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch course with chapters
      const courseRes = await fetch(`/api/courses/${courseId}`);
      if (!courseRes.ok) throw new Error('Course not found');
      const { course: courseData, chapters: chaptersData } = await courseRes.json();
      setCourse(courseData);
      setChapters(chaptersData);

      // Find and set current lesson
      if (lessonId) {
        const allLessons = chaptersData.flatMap((ch: Chapter) => ch.lessons);
        const lesson = allLessons.find((l: Lesson) => l._id === lessonId);
        if (lesson) {
          setCurrentLesson(lesson);
        }
      }
    } catch (err) {
      console.error('Error fetching course:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!lessonId) return;

    try {
      setMarking(true);
      const res = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to mark complete');

      setCompletedLessons((prev) => [...new Set([...prev, lessonId])]);
      setShowCompletion(true);

      // Hide completion message after 3 seconds
      setTimeout(() => setShowCompletion(false), 3000);
    } catch (err) {
      console.error('Error marking lesson complete:', err);
    } finally {
      setMarking(false);
    }
  };

  const getAllLessons = () => {
    return chapters.flatMap((ch) => ch.lessons);
  };

  const getCurrentLessonIndex = () => {
    const allLessons = getAllLessons();
    return allLessons.findIndex((l) => l._id === lessonId);
  };

  const getNextLesson = () => {
    const allLessons = getAllLessons();
    const currentIndex = getCurrentLessonIndex();
    return allLessons[currentIndex + 1] || null;
  };

  const getPreviousLesson = () => {
    const allLessons = getAllLessons();
    const currentIndex = getCurrentLessonIndex();
    return allLessons[currentIndex - 1] || null;
  };

  const isCompleted = completedLessons.includes(lessonId || '');
  const nextLesson = getNextLesson();
  const prevLesson = getPreviousLesson();
  const allLessons = getAllLessons();
  const currentIndex = getCurrentLessonIndex();

  if (loading || !course || !currentLesson) {
    return (
      <div className="h-screen bg-app-bg flex items-center justify-center">
        <div className="text-gray-400">Carregando aula...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-app-bg overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-app-border hidden lg:block overflow-y-auto">
        <LessonSidebar
          chapters={chapters}
          courseId={courseId!}
          currentLessonId={lessonId!}
          completedLessons={completedLessons}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="bg-app-card border-b border-app-border p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-400 text-sm mb-1">
                {currentIndex + 1} de {allLessons.length} • {currentLesson.estimated_minutes} min
              </div>
              <h1 className="text-2xl font-bold text-white">{currentLesson.title}</h1>
            </div>
            <div className="text-right">
              <div className="text-gray-400 text-sm">{course.title}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Learning Objectives */}
            {currentLesson.learning_objectives && currentLesson.learning_objectives.length > 0 && (
              <div className="bg-primary-900/20 border border-primary-500/20 rounded-lg p-6 mb-8">
                <h2 className="text-white font-semibold mb-4">Objetivos de Aprendizado</h2>
                <ul className="space-y-2">
                  {currentLesson.learning_objectives.map((objective, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-300">
                      <CheckCircle2 size={16} className="text-primary-400 flex-shrink-0 mt-1" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Video Content */}
            {currentLesson.content?.video_url && (
              <div className="mb-8">
                <iframe
                  src={currentLesson.content.video_url}
                  title={currentLesson.title}
                  className="w-full h-96 rounded-lg border border-app-border"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            )}

            {/* Text Content */}
            {currentLesson.content?.text_markdown && (
              <div className="prose prose-invert max-w-none mb-8">
                <div
                  className="text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: currentLesson.content.text_markdown,
                  }}
                />
              </div>
            )}

            {/* Embedded Content */}
            {currentLesson.content?.embedded_content && (
              <div
                className="mb-8 border border-app-border rounded-lg p-6 bg-app-card/30"
                dangerouslySetInnerHTML={{
                  __html: currentLesson.content.embedded_content,
                }}
              />
            )}

            {/* No Content Message */}
            {!currentLesson.content?.video_url &&
              !currentLesson.content?.text_markdown &&
              !currentLesson.content?.embedded_content && (
                <div className="text-center py-12 text-gray-400">
                  Conteúdo da aula em breve...
                </div>
              )}
          </div>
        </div>

        {/* Footer with Navigation */}
        <div className="bg-app-card border-t border-app-border p-6">
          <div className="max-w-4xl mx-auto">
            {/* Completion Banner */}
            {showCompletion && (
              <div className="mb-4 p-4 bg-green-900/20 border border-green-500/20 rounded-lg text-green-300 text-sm">
                ✓ Aula marcada como completa!
              </div>
            )}

            {/* Mark as Complete Button */}
            {!isCompleted && (
              <div className="mb-6">
                <button
                  onClick={handleMarkComplete}
                  disabled={marking}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  {marking ? 'Marcando...' : '✓ Marcar como Completa'}
                </button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              {prevLesson ? (
                <button
                  onClick={() =>
                    navigate(
                      `/app/course-player?course=${courseId}&lesson=${prevLesson._id}`
                    )
                  }
                  className="flex items-center gap-2 px-4 py-2 border border-app-border rounded-lg text-gray-300 hover:text-white hover:border-primary-500/50 transition-colors"
                >
                  <ChevronLeft size={18} />
                  Aula Anterior
                </button>
              ) : (
                <div />
              )}

              <span className="text-sm text-gray-400">
                {currentIndex + 1} / {allLessons.length}
              </span>

              {nextLesson ? (
                <button
                  onClick={() =>
                    navigate(
                      `/app/course-player?course=${courseId}&lesson=${nextLesson._id}`
                    )
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-white font-semibold transition-colors"
                >
                  Próxima Aula
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/app/courses/${courseId}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-white font-semibold transition-colors"
                >
                  Voltar ao Curso
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
