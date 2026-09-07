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

interface ChapterAccordionProps {
  chapters: Chapter[];
  courseId: string;
  completedLessons?: string[];
}

export default function ChapterAccordion({
  chapters,
  courseId,
  completedLessons = [],
}: ChapterAccordionProps) {
  const [expandedChapter, setExpandedChapter] = useState<string | null>(
    chapters.length > 0 ? chapters[0]._id : null
  );

  return (
    <div className="space-y-2">
      {chapters.map((chapter) => {
        const isExpanded = expandedChapter === chapter._id;
        const completedInChapter = chapter.lessons.filter((l) => completedLessons.includes(l._id)).length;

        return (
          <div
            key={chapter._id}
            className="border border-app-border rounded-lg overflow-hidden bg-app-card hover:border-primary-500/30 transition-colors"
          >
            {/* Chapter Header */}
            <button
              onClick={() => setExpandedChapter(isExpanded ? null : chapter._id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <Book size={18} className="text-primary-400 flex-shrink-0" />
                <div className="text-left">
                  <div className="text-white font-semibold text-sm">
                    Capítulo {chapter.order}: {chapter.title}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {chapter.lessons_count} aula{chapter.lessons_count !== 1 ? 's' : ''} • {chapter.estimated_hours}h
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-primary-400 font-semibold">
                  {completedInChapter}/{chapter.lessons_count}
                </span>
                <ChevronDown
                  size={20}
                  className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {/* Lessons List */}
            {isExpanded && (
              <div className="border-t border-app-border bg-app-bg/50 divide-y divide-app-border">
                {chapter.lessons.map((lesson) => {
                  const isCompleted = completedLessons.includes(lesson._id);

                  return (
                    <Link
                      key={lesson._id}
                      to={`/app/course-player?course=${courseId}&lesson=${lesson._id}`}
                      className={`px-4 py-3 flex items-center gap-3 hover:bg-app-card/50 transition-colors group ${
                        isCompleted ? 'opacity-75' : ''
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-500 flex-shrink-0 group-hover:border-primary-400" />
                      )}
                      <div className="flex-1">
                        <div className={`text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-200'} group-hover:text-white`}>
                          {lesson.order}. {lesson.title}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{lesson.estimated_minutes} min</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
