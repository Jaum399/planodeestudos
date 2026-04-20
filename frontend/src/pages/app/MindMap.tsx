import { useState, useEffect, useCallback } from 'react';
import { Trophy, Star, Target, CheckCircle, Clock, Zap, RotateCcw, Loader2 } from 'lucide-react';
import { mindmapApi } from '../../services/api';
import type { MindMapData, MindMapNode, MindMapChallenge, MindMapInsights } from '../../types';

// ── SVG Mind Map ──────────────────────────────────────────────────────────────

const NODE_COLORS = {
  root: { fill: '#7c3aed', stroke: '#a78bfa', text: '#fff' },
  branch_done: { fill: '#065f46', stroke: '#34d399', text: '#fff' },
  branch_open: { fill: '#1e1b4b', stroke: '#6d28d9', text: '#c4b5fd' },
  branch_locked: { fill: '#111', stroke: '#333', text: '#444' },
  leaf_done: { fill: '#052e16', stroke: '#22c55e', text: '#86efac' },
  leaf_open: { fill: '#1a1a2e', stroke: '#4f46e5', text: '#a5b4fc' },
  leaf_locked: { fill: '#0a0a0a', stroke: '#222', text: '#333' },
};

function nodeColor(n: MindMapNode) {
  if (n.type === 'root') return NODE_COLORS.root;
  if (!n.unlocked) return n.type === 'branch' ? NODE_COLORS.branch_locked : NODE_COLORS.leaf_locked;
  if (n.completed) return n.type === 'branch' ? NODE_COLORS.branch_done : NODE_COLORS.leaf_done;
  return n.type === 'branch' ? NODE_COLORS.branch_open : NODE_COLORS.leaf_open;
}

function nodeSize(n: MindMapNode) {
  if (n.type === 'root') return { rx: 60, ry: 25 };
  if (n.type === 'branch') return { rx: 55, ry: 20 };
  return { rx: 45, ry: 16 };
}

interface MapSVGProps {
  data: MindMapData;
  onNodeClick: (node: MindMapNode) => void;
}

function MapSVG({ data, onNodeClick }: MapSVGProps) {
  const [viewBox, setViewBox] = useState('0 0 860 500');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ background: 'transparent' }}
    >
      <g transform={`translate(${pan.x},${pan.y})`}>
        {/* Edges */}
        {data.edges.map((edge, i) => {
          const from = data.nodes.find(n => n.id === edge.from);
          const to = data.nodes.find(n => n.id === edge.to);
          if (!from || !to) return null;
          const unlocked = to.unlocked;
          return (
            <line
              key={i}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={unlocked ? '#4f46e5' : '#1f1f1f'}
              strokeWidth={unlocked ? 1.5 : 1}
              strokeDasharray={unlocked ? undefined : '4,4'}
              opacity={unlocked ? 0.6 : 0.3}
            />
          );
        })}

        {/* Nodes */}
        {data.nodes.map(node => {
          const c = nodeColor(node);
          const { rx, ry } = nodeSize(node);
          const fontSize = node.type === 'root' ? 13 : node.type === 'branch' ? 11 : 9;
          const maxChars = node.type === 'root' ? 14 : 12;
          const label = node.label.length > maxChars ? node.label.substring(0, maxChars - 1) + '…' : node.label;

          return (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              onClick={() => node.unlocked && !node.completed && onNodeClick(node)}
              style={{ cursor: node.unlocked && !node.completed ? 'pointer' : 'default' }}
            >
              {/* Glow for unlocked incomplete */}
              {node.unlocked && !node.completed && node.type !== 'root' && (
                <ellipse cx={0} cy={0} rx={rx + 8} ry={ry + 8}
                  fill={c.stroke} opacity={0.08}
                />
              )}
              <ellipse cx={0} cy={0} rx={rx} ry={ry}
                fill={c.fill} stroke={c.stroke} strokeWidth={node.completed ? 2 : 1}
              />
              {node.completed && (
                <circle cx={rx - 8} cy={-ry + 8} r={8} fill="#22c55e" />
              )}
              {node.completed && (
                <text x={rx - 8} y={-ry + 12} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">✓</text>
              )}
              <text
                x={0} y={1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={fontSize} fill={c.text} fontWeight={node.type === 'root' ? 'bold' : 'normal'}
              >
                {label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

// ── Challenge Card ─────────────────────────────────────────────────────────────

function ChallengeCard({
  challenge, onAccept, onComplete
}: {
  challenge: MindMapChallenge;
  onAccept: () => void;
  onComplete: () => void;
}) {
  const statusColor = {
    pending: 'border-app-border',
    accepted: 'border-primary-500/40 bg-primary-900/10',
    completed: 'border-green-500/30 bg-green-900/10',
  }[challenge.status];

  return (
    <div className={`rounded-xl border p-4 transition-all ${statusColor}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-white text-sm font-semibold">{challenge.title}</p>
        <span className="flex items-center gap-1 text-xs text-amber-400 font-bold shrink-0">
          <Star size={11} /> +{challenge.xp_reward} XP
        </span>
      </div>
      <p className="text-gray-400 text-xs mb-3">{challenge.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Target size={10} /> Dif: {challenge.difficulty}/5
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {new Date(challenge.due_at).toLocaleDateString('pt-BR')}
          </span>
        </div>

        {challenge.status === 'pending' && (
          <button onClick={onAccept} className="text-xs px-3 py-1 rounded-lg bg-primary-600/20 border border-primary-500/30 text-primary-400 hover:bg-primary-600/30 transition-colors">
            Aceitar
          </button>
        )}
        {challenge.status === 'accepted' && (
          <button onClick={onComplete} className="text-xs px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors flex items-center gap-1">
            <CheckCircle size={11} /> Concluir
          </button>
        )}
        {challenge.status === 'completed' && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <CheckCircle size={11} /> Completo
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MindMapPage() {
  const [mapData, setMapData] = useState<MindMapData | null>(null);
  const [insights, setInsights] = useState<MindMapInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [tab, setTab] = useState<'map' | 'challenges' | 'reports'>('map');

  const loadMap = useCallback(() => {
    setLoading(true);
    Promise.all([mindmapApi.get(), mindmapApi.getInsights()])
      .then(([mapRes, insightsRes]) => {
        setMapData(mapRes.data);
        setInsights(insightsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadMap(); }, [loadMap]);

  const handleNodeClick = (node: MindMapNode) => {
    setSelectedNode(node);
  };

  const handleCompleteNode = async (nodeId: string) => {
    setCompleting(nodeId);
    try {
      await mindmapApi.completeNode(nodeId);
      setSelectedNode(null);
      loadMap();
    } finally {
      setCompleting(null);
    }
  };

  const handleChallenge = async (challengeId: string, status: 'accepted' | 'completed') => {
    try {
      await mindmapApi.updateChallenge(challengeId, status);
      loadMap();
    } catch {
      // noop
    }
  };

  const handleResetMap = async () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Resetar o mapa mental vai recriar toda a trilha a partir do seu perfil atual. Deseja continuar?');
      if (!confirmed) return;
    }

    setResetting(true);
    try {
      setSelectedNode(null);
      await mindmapApi.reset();
      loadMap();
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary-500/50 border-t-primary-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Gerando seu mapa mental...</p>
        </div>
      </div>
    );
  }

  if (!mapData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-400 mb-3">Erro ao carregar mapa</p>
          <button onClick={loadMap} className="btn-primary text-sm">Tentar novamente</button>
        </div>
      </div>
    );
  }

  const completed = mapData.nodes.filter(n => n.completed).length;
  const total = mapData.nodes.length;
  const progress = Math.round((completed / total) * 100);
  const activeChallenges = mapData.challenges.filter(c => c.status !== 'completed');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mapa Mental</h1>
          <p className="text-gray-400 text-sm mt-1">Evolua nó por nó e desbloqueie novos conteúdos</p>
        </div>

        {/* XP / Progress */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button
            onClick={handleResetMap}
            disabled={resetting || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-app-card border border-app-border text-gray-300 hover:text-white hover:border-red-500/40 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            <span className="text-sm font-medium">Resetar mapa</span>
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Trophy size={16} className="text-amber-400" />
            <span className="text-amber-300 font-bold text-sm">{mapData.total_xp} XP</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-app-card border border-app-border">
            <Zap size={16} className="text-primary-400" />
            <span className="text-white font-bold text-sm">{completed}/{total}</span>
            <span className="text-gray-500 text-xs">nós</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Progresso geral</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-app-card rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-app-card rounded-xl w-fit border border-app-border">
        {(['map', 'challenges', 'reports'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'map' ? 'Mapa' : t === 'challenges' ? `Desafios (${activeChallenges.length})` : 'Relatórios IA'}
          </button>
        ))}
      </div>

      {/* Map View */}
      {tab === 'map' && (
        <div className="relative">
          <div className="h-[480px] bg-app-card border border-app-border rounded-2xl overflow-hidden">
            <MapSVG data={mapData} onNodeClick={handleNodeClick} />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-600 border border-green-400" />Concluído</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-900 border border-indigo-500" />Disponível</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-neutral-900 border border-neutral-700" />Bloqueado</span>
            <span className="text-gray-600 ml-auto">Arraste para mover • Clique em um nó disponível para concluí-lo</span>
          </div>

          {/* Node modal */}
          {selectedNode && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl" onClick={() => setSelectedNode(null)}>
              <div className="bg-app-surface border border-app-border rounded-2xl p-6 max-w-sm mx-4 w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-white font-bold text-lg mb-1">{selectedNode.label}</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Marcar este tópico como concluído irá desbloquear os nós dependentes e adicionar XP.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedNode(null)} className="flex-1 py-2 rounded-xl border border-app-border text-gray-400 hover:text-white text-sm transition-colors">
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleCompleteNode(selectedNode.id)}
                    disabled={completing === selectedNode.id}
                    className="flex-1 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {completing === selectedNode.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    Concluir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Challenges View */}
      {tab === 'challenges' && (
        <div>
          <div className="grid gap-3 md:grid-cols-2">
            {mapData.challenges.length === 0 ? (
              <p className="text-gray-500 col-span-2 text-center py-8">
                Complete nós no mapa para desbloquear desafios!
              </p>
            ) : (
              mapData.challenges.map(c => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  onAccept={() => handleChallenge(c.id, 'accepted')}
                  onComplete={() => handleChallenge(c.id, 'completed')}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Reports View */}
      {tab === 'reports' && (
        <div className="space-y-4">
          {!insights ? (
            <div className="card-glass rounded-2xl p-5 text-gray-400 text-sm">Sem dados suficientes para relatório ainda.</div>
          ) : (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="card-glass rounded-2xl p-4">
                  <p className="text-gray-400 text-xs">Foco 14d</p>
                  <p className="text-2xl font-bold text-white">{Math.round(insights.weeklyComparison.current14 / 60)}h</p>
                </div>
                <div className="card-glass rounded-2xl p-4">
                  <p className="text-gray-400 text-xs">Tendência</p>
                  <p className={`text-2xl font-bold ${insights.weeklyComparison.trendPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {insights.weeklyComparison.trendPct >= 0 ? '+' : ''}{insights.weeklyComparison.trendPct}%
                  </p>
                </div>
                <div className="card-glass rounded-2xl p-4">
                  <p className="text-gray-400 text-xs">Planner concluído</p>
                  <p className="text-2xl font-bold text-white">{insights.plannerCompletionRate}%</p>
                </div>
              </div>

              <div className="card-glass rounded-2xl p-5">
                <p className="text-white font-semibold mb-3">Gráfico de foco (últimos 14 dias)</p>
                <div className="flex items-end gap-2 h-44">
                  {(() => {
                    const max = Math.max(...insights.focusSeries14.map((d) => d.minutes), 1);
                    return insights.focusSeries14.map((d) => {
                      const h = Math.max(4, Math.round((d.minutes / max) * 100));
                      const label = new Date(`${d.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-primary-500/20 rounded-sm flex items-end" style={{ height: '100%' }}>
                            <div className="w-full bg-gradient-to-t from-primary-700 to-primary-400 rounded-sm" style={{ height: `${h}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-500">{label}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="card-glass rounded-2xl p-5">
                  <p className="text-white font-semibold mb-3">Sinais de Progresso</p>
                  {insights.progressSignals.length === 0 ? (
                    <p className="text-gray-500 text-sm">Sem sinais fortes no momento.</p>
                  ) : (
                    <ul className="space-y-2">
                      {insights.progressSignals.map((s) => (
                        <li key={s} className="text-sm text-emerald-300">• {s}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="card-glass rounded-2xl p-5">
                  <p className="text-white font-semibold mb-3">Sinais de Regresso</p>
                  {insights.regressionSignals.length === 0 ? (
                    <p className="text-gray-500 text-sm">Sem regressões críticas detectadas.</p>
                  ) : (
                    <ul className="space-y-2">
                      {insights.regressionSignals.map((s) => (
                        <li key={s} className="text-sm text-rose-300">• {s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
