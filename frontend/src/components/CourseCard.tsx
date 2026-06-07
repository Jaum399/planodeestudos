import { Link } from 'react-router-dom';
import { BookOpen, Users, Clock, TrendingUp } from 'lucide-react';

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  rating: number;
  enrollment_count: number;
  total_hours: number;
  progress?: number;
  category: string;
}

export default function CourseCard({
  id,
  title,
  description,
  difficulty,
  rating,
  enrollment_count,
  total_hours,
  progress = 0,
  category,
}: CourseCardProps) {
  const difficultyLabel = {
    1: 'Muito Fácil',
    5: 'Intermediário',
    10: 'Muito Difícil',
  }[difficulty] || `Nível ${difficulty}`;

  const difficultyColor = difficulty <= 3 ? 'text-green-400' : difficulty <= 7 ? 'text-yellow-400' : 'text-red-400';

  return (
    <Link to={`/app/courses/${id}`} className="block h-full">
      <div className="group bg-app-card border border-app-border rounded-xl overflow-hidden hover:border-primary-500/50 transition-all hover:shadow-lg hover:shadow-primary-900/20 h-full flex flex-col">
        {/* Header with thumbnail */}
        <div className="relative bg-gradient-to-br from-primary-600/20 to-primary-900/20 h-40 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-primary-400 transition-opacity" />
          <BookOpen size={48} className="text-primary-400" />
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 rounded-full bg-app-bg/80 text-xs font-semibold text-primary-400 capitalize">
              {category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-white font-bold text-sm mb-1 line-clamp-2 group-hover:text-primary-400 transition-colors">
            {title}
          </h3>
          <p className="text-gray-400 text-xs mb-3 line-clamp-2">{description}</p>

          {/* Stats */}
          <div className="space-y-2 mb-4 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-primary-400" />
              {total_hours}h de conteúdo
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-primary-400" />
              {enrollment_count.toLocaleString()} inscritos
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className={difficultyColor} />
              {difficultyLabel}
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${i < Math.round(rating) ? 'bg-yellow-400' : 'bg-gray-600'}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">{rating.toFixed(1)}</span>
          </div>

          {/* Progress */}
          {progress > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">{progress}% completo</div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* CTA */}
          <button className="w-full py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs transition-colors">
            {progress > 0 ? 'Continuar' : 'Começar'}
          </button>
        </div>
      </div>
    </Link>
  );
}
