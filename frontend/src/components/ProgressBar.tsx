interface ProgressBarProps {
  current: number;
  total: number;
  variant?: 'linear' | 'circular';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ProgressBar({
  current,
  total,
  variant = 'linear',
  showLabel = true,
  size = 'md',
  className = '',
}: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100);

  if (variant === 'circular') {
    const circleSize = size === 'sm' ? 60 : size === 'md' ? 100 : 140;
    const circumference = 2 * Math.PI * (circleSize / 2 - 8);
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <div className="relative" style={{ width: circleSize, height: circleSize }}>
          {/* Background circle */}
          <svg
            width={circleSize}
            height={circleSize}
            className="absolute inset-0"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={circleSize / 2 - 8}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={circleSize / 2 - 8}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-primary-500 transition-all duration-300"
            />
          </svg>

          {/* Center text */}
          {showLabel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-white font-bold text-lg">{percentage}%</div>
              <div className="text-gray-400 text-xs">
                {current}/{total}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">Progresso</span>
          <span className="text-sm font-bold text-primary-400">{percentage}%</span>
        </div>
      )}

      {/* Background bar */}
      <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${
        size === 'sm' ? 'h-1' : size === 'md' ? 'h-2' : 'h-3'
      }`}>
        {/* Progress bar */}
        <div
          className="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showLabel && (
        <div className="mt-2 text-xs text-gray-400">
          {current} de {total} aulas completadas
        </div>
      )}
    </div>
  );
}
