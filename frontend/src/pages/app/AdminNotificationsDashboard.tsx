import { useEffect, useState } from 'react';
import { Bell, Calendar, CheckCircle, AlertCircle, Clock, Play, RefreshCw } from 'lucide-react';

interface NotificationStatus {
  status: string;
  timestamp: string;
  jobs: {
    queued: number;
    processing: number;
    retrying: number;
    sent: number;
    failed: number;
    total: number;
  };
  reminders: {
    active: number;
    inactive: number;
    total: number;
  };
  users: {
    total: number;
    withPendingNotifications: number;
  };
  recentFailures: any[];
  upcomingReminders: any[];
}

export default function AdminNotificationsDashboard() {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Auto-atualizar a cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(fetchStatus, 30000);
    fetchStatus(); // Fetch inicial

    return () => clearInterval(timer);
  }, [autoRefresh]);

  async function fetchStatus() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/notifications/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessQueue() {
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/notifications/process-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ limit: 100 }),
      });
      if (res.ok) {
        await fetchStatus();
        alert('✅ Fila de notificações processada!');
      }
    } catch (error) {
      alert('❌ Erro ao processar fila');
    } finally {
      setProcessing(false);
    }
  }

  async function handleScheduleDaily() {
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/notifications/schedule-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ horizonDays: 7 }),
      });
      if (res.ok) {
        await fetchStatus();
        alert('✅ Digest diário agendado!');
      }
    } catch (error) {
      alert('❌ Erro ao agendar');
    } finally {
      setProcessing(false);
    }
  }

  if (loading && !status) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-4xl font-bold mb-8 flex items-center gap-3">
        <Bell className="w-10 h-10 text-blue-400" />
        Dashboard de Notificações e Lembretes
      </h1>

      {/* Controles */}
      <div className="mb-8 flex gap-4">
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
        <button
          onClick={handleProcessQueue}
          disabled={processing}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center gap-2 disabled:opacity-50"
        >
          <Play className="w-4 h-4" /> Processar Fila
        </button>
        <button
          onClick={handleScheduleDaily}
          disabled={processing}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2 disabled:opacity-50"
        >
          <Calendar className="w-4 h-4" /> Agendar Digest
        </button>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Auto-atualizar (30s)</span>
        </label>
      </div>

      {status && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Jobs */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-400" /> Jobs
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Enfileirados:</span>
                  <span className="font-mono bg-blue-900 px-2 py-1 rounded">{status.jobs.queued}</span>
                </div>
                <div className="flex justify-between">
                  <span>Processando:</span>
                  <span className="font-mono bg-yellow-900 px-2 py-1 rounded">{status.jobs.processing}</span>
                </div>
                <div className="flex justify-between">
                  <span>Retentando:</span>
                  <span className="font-mono bg-orange-900 px-2 py-1 rounded">{status.jobs.retrying}</span>
                </div>
                <div className="flex justify-between">
                  <span>Enviados:</span>
                  <span className="font-mono bg-green-900 px-2 py-1 rounded">{status.jobs.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span>Falhados:</span>
                  <span className="font-mono bg-red-900 px-2 py-1 rounded">{status.jobs.failed}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-gray-700 pt-2 mt-2">
                  <span>Total:</span>
                  <span className="font-mono">{status.jobs.total}</span>
                </div>
              </div>
            </div>

            {/* Lembretes */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" /> Lembretes
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Ativos:</span>
                  <span className="font-mono bg-green-900 px-2 py-1 rounded">{status.reminders.active}</span>
                </div>
                <div className="flex justify-between">
                  <span>Inativos:</span>
                  <span className="font-mono bg-gray-700 px-2 py-1 rounded">{status.reminders.inactive}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-gray-700 pt-2 mt-2">
                  <span>Total:</span>
                  <span className="font-mono">{status.reminders.total}</span>
                </div>
              </div>
            </div>

            {/* Usuários */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-cyan-400" /> Usuários
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-mono bg-blue-900 px-2 py-1 rounded">{status.users.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Com notif. pendentes:</span>
                  <span className="font-mono bg-yellow-900 px-2 py-1 rounded">
                    {status.users.withPendingNotifications}
                  </span>
                </div>
                <div className="text-sm text-gray-400 mt-4">
                  Atualizado: {new Date(status.timestamp).toLocaleTimeString('pt-BR')}
                </div>
              </div>
            </div>
          </div>

          {/* Falhas Recentes */}
          {status.recentFailures.length > 0 && (
            <div className="mb-8 bg-gray-800 p-6 rounded-lg border border-red-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" /> Falhas Recentes ({status.recentFailures.length})
              </h2>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {status.recentFailures.map((failure: any) => (
                  <div key={failure.jobId} className="bg-gray-900 p-4 rounded border border-red-500 text-sm">
                    <div className="flex justify-between">
                      <span className="font-mono text-red-400">{failure.jobId}</span>
                      <span className="text-gray-400">Tentativa {failure.attempts}/{failure.maxAttempts}</span>
                    </div>
                    <div className="text-gray-300 mt-2">Erro: {failure.lastError}</div>
                    <div className="text-gray-500 text-xs mt-2">
                      Atualizado: {new Date(failure.updatedAt).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Próximos Lembretes */}
          {status.upcomingReminders.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-lg border border-green-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-400" /> Próximos Lembretes ({status.upcomingReminders.length})
              </h2>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {status.upcomingReminders.map((reminder: any) => (
                  <div key={reminder.reminderId} className="bg-gray-900 p-4 rounded border border-green-600">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-green-300">{reminder.title}</div>
                        <div className="text-sm text-gray-400">Tipo: {reminder.kind}</div>
                      </div>
                      <span className="text-xs bg-green-900 px-2 py-1 rounded">
                        {new Date(reminder.dueAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
