import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Users, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import ChapterAccordion from '../../components/ChapterAccordion';
import ProgressBar from '../../components/ProgressBar';

interface Lesson {
  _id: string;
  title: string;
  estimated_minutes: number;
  order: number;
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
  description: string;
  difficulty: number;
  rating: number;
  enrollment_count: number;
  total_hours: number;
  category: string;
}

interface Progress {
  user_id: string;
  course_id: string;
  status: string;
  progress_percent: number;
  lessons_completed: number;
  total_lessons: number;
}

export default function CourseLanding() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchCourseData();
  }, [id]);

  const fetchCourseData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch course details
      const courseRes = await fetch(`/api/courses/${id}`);
      if (!courseRes.ok) throw new Error('Course not found');
      const { course: courseData, chapters: chaptersData } = await courseRes.json();
      setCourse(courseData);
      setChapters(chaptersData);

      // Fetch user progress
      const progressRes = await fetch(`/api/courses/${id}/progress`);
      const { progress: progressData } = await progressRes.json();
      setProgress(progressData);

      setError(null);
    } catch (err) {
      setError('Erro ao carregar curso');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!id) return;
    try {
      setEnrolling(true);
      const res = await fetch(`/api/courses/${id}/enroll`, { method: 'POST' });
      if (!res.ok) throw new Error('Enrollment failed');

      const { progress: newProgress } = await res.json();
      setProgress(newProgress);

      // Redirect to course player
      if (chapters.length > 0 && chapters[0].lessons.length > 0) {
        navigate(
          `/app/course-player?course=${id}&lesson=${chapters[0].lessons[0]._id}`
        );
      }
    } catch (err) {
      console.error('Enrollment error:', err);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-gray-400">Carregando curso...</div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-red-400">{error || 'Curso não encontrado'}</div>
      </div>
    );
  }

  const isEnrolled = progress && progress.status !== 'not_started';
  const difficultyLabel = {
    1: 'Muito Fácil',
    5: 'Intermediário',
    10: 'Muito Difícil',
  }[course.difficulty] || `Nível ${course.difficulty}`;

  const difficultyColor =
    course.difficulty <= 3
      ? 'text-green-400'
      : course.difficulty <= 7
        ? 'text-yellow-400'
        : 'text-red-400';

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600/20 to-primary-900/20 border-b border-app-border py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-start gap-8">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-4">{course.title}</h1>
              <p className="text-gray-300 text-lg mb-6">{course.description}</p>

              {/* Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-app-card/50 border border-app-border rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">Duração</div>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Clock size={16} className="text-primary-400" />
                    {course.total_hours}h
                  </div>
                </div>

                <div className="bg-app-card/50 border border-app-border rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">Inscritos</div>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Users size={16} className="text-primary-400" />
                    {course.enrollment_count.toLocaleString()}
                  </div>
                </div>

                <div className="bg-app-card/50 border border-app-border rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">Dificuldade</div>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <TrendingUp size={16} className={difficultyColor} />
                    <span className={difficultyColor}>{difficultyLabel}</span>
                  </div>
                </div>

                <div className="bg-app-card/50 border border-app-border rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">Rating</div>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    {'★'.repeat(Math.round(course.rating))}
                    {course.rating.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              {!isEnrolled ? (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  {enrolling ? 'Inscrevendo...' : 'Começar Agora'}
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (chapters.length > 0 && chapters[0].lessons.length > 0) {
                      navigate(
                        `/app/course-player?course=${id}&lesson=${chapters[0].lessons[0]._id}`
                      );
                    }
                  }}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  Continuar Aprendendo
                  <ChevronRight size={18} />
                </button>
              )}
            </div>

            {/* Icon */}
            <div className="hidden md:flex items-center justify-center w-48 h-48 bg-primary-600/10 rounded-lg">
              <BookOpen size={96} className="text-primary-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      {isEnrolled && progress && (
        <div className="border-b border-app-border py-8 bg-app-card/30">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-white font-bold text-lg mb-4">Seu Progresso</h2>
            <ProgressBar
              current={progress.lessons_completed}
              total={progress.total_lessons}
              variant="linear"
              showLabel={true}
            />
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-white font-bold text-xl mb-6">Estrutura do Curso</h2>

        {chapters.length === 0 ? (
          <div className="text-gray-400 text-center py-8">Nenhum capítulo disponível</div>
        ) : (
          <ChapterAccordion
            chapters={chapters}
            courseId={id!}
            completedLessons={completedLessons}
          />
        )}
      </div>
    </div>
  );
}
