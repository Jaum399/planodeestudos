import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, Timer, Coffee, Brain, Flag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { analyticsApi } from '../../services/api';

type Mode = 'focus' | 'shortBreak' | 'longBreak';

type PomodoroConfig = {
  focus: number;
  shortBreak: number;
  longBreak: number;
  roundsUntilLongBreak: number;
};

const STORAGE_KEY = 'mentudo.pomodoro.config.v1';

const defaultConfig: PomodoroConfig = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  roundsUntilLongBreak: 4,
};

const modeMeta: Record<Mode, { label: string; icon: LucideIcon; color: string }> = {
  focus: { label: 'Foco', icon: Brain, color: 'text-primary-400' },
  shortBreak: { label: 'Pausa Curta', icon: Coffee, color: 'text-emerald-400' },
  longBreak: { label: 'Pausa Longa', icon: Flag, color: 'text-amber-400' },
};

function toSeconds(minutes: number) {
  return Math.max(1, Math.floor(minutes)) * 60;
}

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function getModeSeconds(mode: Mode, config: PomodoroConfig) {
  if (mode === 'focus') return toSeconds(config.focus);
  if (mode === 'shortBreak') return toSeconds(config.shortBreak);
  return toSeconds(config.longBreak);
}

export default function PomodoroPage() {
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState<PomodoroConfig>(defaultConfig);
  const [mode, setMode] = useState<Mode>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [completedFocusRounds, setCompletedFocusRounds] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(toSeconds(defaultConfig.focus));
  const [autoStartBreaks, setAutoStartBreaks] = useState(true);
  const [autoStartFocus, setAutoStartFocus] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<PomodoroConfig>;
      const next: PomodoroConfig = {
        focus: Number(parsed.focus) || defaultConfig.focus,
        shortBreak: Number(parsed.shortBreak) || defaultConfig.shortBreak,
        longBreak: Number(parsed.longBreak) || defaultConfig.longBreak,
        roundsUntilLongBreak: Number(parsed.roundsUntilLongBreak) || defaultConfig.roundsUntilLongBreak,
      };
      setConfig(next);
      setSecondsLeft(getModeSeconds('focus', next));
    } catch {
      setConfig(defaultConfig);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (!isRunning) {
      setSecondsLeft(getModeSeconds(mode, config));
    }
  }, [mode, config, isRunning]);

  useEffect(() => {
    if (searchParams.get('autostart') !== '1') return;
    setMode('focus');
    setSecondsLeft(getModeSeconds('focus', config));
    setIsRunning(true);
  }, [searchParams, config]);

  const totalSecondsForMode = useMemo(() => getModeSeconds(mode, config), [mode, config]);
  const progressPct = useMemo(() => {
    const elapsed = totalSecondsForMode - secondsLeft;
    return Math.max(0, Math.min(100, (elapsed / totalSecondsForMode) * 100));
  }, [secondsLeft, totalSecondsForMode]);

  function moveToMode(nextMode: Mode, runImmediately: boolean) {
    setMode(nextMode);
    setSecondsLeft(getModeSeconds(nextMode, config));
    setIsRunning(runImmediately);
  }

  function handleCycleFinished() {
    if (mode === 'focus') {
      analyticsApi.logSession({
        subject: 'Pomodoro Foco',
        duration_minutes: config.focus,
        correct_answers: 0,
        total_questions: 0,
      }).catch(() => {});

      const nextRounds = completedFocusRounds + 1;
      setCompletedFocusRounds(nextRounds);
      const useLongBreak = nextRounds % Math.max(1, config.roundsUntilLongBreak) === 0;
      moveToMode(useLongBreak ? 'longBreak' : 'shortBreak', autoStartBreaks);
      return;
    }

    moveToMode('focus', autoStartFocus);
  }

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          handleCycleFinished();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, mode, completedFocusRounds, config, autoStartBreaks, autoStartFocus]);

  useEffect(() => {
    document.title = `${formatTime(secondsLeft)} • Pomodoro`;
    return () => {
      document.title = 'Mentudo';
    };
  }, [secondsLeft]);

  const ModeIcon = modeMeta[mode].icon;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Timer size={26} className="text-primary-400" />
            Relogio Pomodoro
          </h1>
          <p className="text-gray-400 mt-1">Alterna blocos de foco e pausas para estudar com consistencia.</p>
        </div>
        <div className="text-sm text-gray-400">
          Ciclos de foco concluidos: <span className="text-white font-semibold">{completedFocusRounds}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card-glass rounded-2xl p-6 card-glow">
          <div className="flex flex-wrap gap-2 mb-6">
            {(['focus', 'shortBreak', 'longBreak'] as Mode[]).map((item) => {
              const itemIcon = modeMeta[item].icon;
              const ItemIcon = itemIcon;
              const active = item === mode;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => moveToMode(item, false)}
                  className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all inline-flex items-center gap-2 ${
                    active
                      ? 'bg-primary-600/25 border-primary-500/50 text-white'
                      : 'bg-app-card border-app-border text-gray-400 hover:text-white hover:border-primary-500/40'
                  }`}
                >
                  <ItemIcon size={15} className={modeMeta[item].color} />
                  {modeMeta[item].label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-5">
            <div
              className="w-56 h-56 rounded-full p-2"
              style={{
                background: `conic-gradient(rgba(183,155,88,0.95) ${progressPct}%, rgba(183,155,88,0.18) ${progressPct}%)`,
              }}
            >
              <div className="w-full h-full rounded-full bg-app-bg border border-app-border flex flex-col items-center justify-center">
                <ModeIcon size={26} className={modeMeta[mode].color} />
                <div className="text-5xl font-black text-white mt-2 tabular-nums">{formatTime(secondsLeft)}</div>
                <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{modeMeta[mode].label}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsRunning((prev) => !prev)}
                className="btn-primary"
              >
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
                {isRunning ? 'Pausar' : 'Iniciar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRunning(false);
                  setSecondsLeft(getModeSeconds(mode, config));
                }}
                className="btn-secondary"
              >
                <RotateCcw size={16} /> Reiniciar
              </button>
            </div>
          </div>
        </div>

        <div className="card-glass rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold">Configuracoes</h2>

          <label className="block">
            <span className="text-xs text-gray-400">Foco (min)</span>
            <input
              type="number"
              min={1}
              max={180}
              value={config.focus}
              onChange={(e) => setConfig((prev) => ({ ...prev, focus: Number(e.target.value) || 25 }))}
              className="input-field mt-1"
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-400">Pausa curta (min)</span>
            <input
              type="number"
              min={1}
              max={60}
              value={config.shortBreak}
              onChange={(e) => setConfig((prev) => ({ ...prev, shortBreak: Number(e.target.value) || 5 }))}
              className="input-field mt-1"
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-400">Pausa longa (min)</span>
            <input
              type="number"
              min={1}
              max={90}
              value={config.longBreak}
              onChange={(e) => setConfig((prev) => ({ ...prev, longBreak: Number(e.target.value) || 15 }))}
              className="input-field mt-1"
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-400">Rodadas ate pausa longa</span>
            <input
              type="number"
              min={1}
              max={8}
              value={config.roundsUntilLongBreak}
              onChange={(e) => setConfig((prev) => ({ ...prev, roundsUntilLongBreak: Number(e.target.value) || 4 }))}
              className="input-field mt-1"
            />
          </label>

          <label className="flex items-center justify-between text-sm text-gray-300 pt-1">
            <span>Auto iniciar pausas</span>
            <input
              type="checkbox"
              checked={autoStartBreaks}
              onChange={(e) => setAutoStartBreaks(e.target.checked)}
              className="accent-primary-500"
            />
          </label>

          <label className="flex items-center justify-between text-sm text-gray-300">
            <span>Auto iniciar foco</span>
            <input
              type="checkbox"
              checked={autoStartFocus}
              onChange={(e) => setAutoStartFocus(e.target.checked)}
              className="accent-primary-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
