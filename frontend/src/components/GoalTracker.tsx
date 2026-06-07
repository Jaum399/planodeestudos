import { useState } from 'react';

interface Goal {
  _id: string;
  goal_name: string;
  target_value: number;
  target_unit: string;
  created_at: string;
}

interface GoalTrackerProps {
  goal: Goal;
  todayProgress: number;
  onUpdate?: () => void;
}

export default function GoalTracker({ goal, todayProgress, onUpdate }: GoalTrackerProps) {
  const percentage = Math.min((todayProgress / goal.target_value) * 100, 100);
  const isCompleted = todayProgress >= goal.target_value;

  return (
    <div className="card-glass mb-4 p-4 rounded-lg border border-white/10">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">{goal.goal_name}</h3>
          <p className="text-sm text-gray-400">
            {todayProgress} / {goal.target_value} {goal.target_unit === 'cards' ? 'cards' : 'minutos'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary-500">{Math.round(percentage)}%</div>
          <div className="text-xs text-gray-400">de progresso</div>
        </div>
      </div>

      <div className="w-full bg-gray-700 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-primary-500 to-purple-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {isCompleted && (
        <div className="text-sm text-green-400 font-medium">
          ✨ Parabéns! Você completou a meta de hoje!
        </div>
      )}

      {!isCompleted && (
        <div className="text-sm text-gray-400">
          Faltam {goal.target_value - todayProgress} {goal.target_unit === 'cards' ? 'cards' : 'minutos'} para completar
        </div>
      )}
    </div>
  );
}
