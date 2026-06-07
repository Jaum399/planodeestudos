import { useState } from 'react';
import { ChevronDown, Book, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

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

interface LessonSidebarProps {
  chapters: Chapter[];
  courseId: string;
  currentLessonId: string;
  completedLessons: string[];
}

export default function LessonSidebar({
  chapters,
  courseId,
  currentLessonId,
  completedLessons,
}: LessonSidebarProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(chapters.length > 0 ? [chapters[0]._id] : [])
  );

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  return (
    <div className="h-screen overflow-y-auto bg-app-card border-r border-app-border p-4">
      <div className="mb-6">
        <h2 className="text-white font-bold text-sm">Conteúdo do Curso</h2>
      </div>

      <div className="space-y-2">
        {chapters.map((chapter) => {
          const isExpanded = expandedChapters.has(chapter._id);
          const completedInChapter = chapter.lessons.filter((l) =>
            completedLessons.includes(l._id)
          ).length;

          return (
            <div key={chapter._id}>
              <button
                onClick={() => toggleChapter(chapter._id)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-app-bg/50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Book size={16} className="text-primary-400 flex-shrink-0" />
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-white font-semibold text-xs truncate group-hover:text-primary-400">
                      Cap. {chapter.order}
                    </div>
                    <div className="text-gray-400 text-xs truncate">{chapter.title}</div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 flex-shrink-0 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {chapter.lessons.map((lesson) => {
                    const isCompleted = completedLessons.includes(lesson._id);
                    const isCurrent = currentLessonId === lesson._id;

                    return (
                      <Link
                        key={lesson._id}
                        to={`/app/course-player?course=${courseId}&lesson=${lesson._id}`}
                        className={`px-3 py-2 flex items-center gap-2 rounded-lg transition-colors text-xs ${
                          isCurrent
                            ? 'bg-primary-600/20 border border-primary-500/30 text-primary-300'
                            : isCompleted
                              ? 'text-gray-400 hover:bg-app-bg/50'
                              : 'text-gray-300 hover:bg-app-bg/50 hover:text-white'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-gray-500 flex-shrink-0" />
                        )}
                        <span className="truncate flex-1">
                          {lesson.order}. {lesson.title}
                        </span>
                        <span className="text-gray-500 flex-shrink-0">{lesson.estimated_minutes}m</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Summary */}
      <div className="mt-8 pt-4 border-t border-app-border">
        <div className="text-xs text-gray-400 mb-2">Progresso Geral</div>
        <div className="text-xs text-white font-semibold">
          {completedLessons.length} de{' '}
          {chapters.reduce((acc, ch) => acc + ch.lessons.length, 0)} aulas
        </div>
      </div>
    </div>
  );
}
