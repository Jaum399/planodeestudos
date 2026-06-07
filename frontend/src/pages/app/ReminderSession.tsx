import { FormEvent, useEffect, useState } from 'react';
import { Bell, CalendarClock, CheckCircle2, Edit3, Loader2, Plus, Save, Trash2, XCircle } from 'lucide-react';
import { reminderSessionApi } from '../../services/api';
import { removeReminderFromDevice, syncAllActiveRemindersToDevice, syncReminderToDevice } from '../../services/deviceReminders';
import type { DeadlineReminder } from '../../types';

function toDatetimeLocalValue(dateIso: string) {
  const d = new Date(dateIso);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function ReminderSessionPage() {
  const [items, setItems] = useState<DeadlineReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [onlyNext30Days, setOnlyNext30Days] = useState(false);
  const [showFinalized, setShowFinalized] = useState(false);

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'prova' | 'trabalho'>('prova');
  const [dueAt, setDueAt] = useState('');
  const [alertWhatsapp, setAlertWhatsapp] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingKind, setEditingKind] = useState<'prova' | 'trabalho'>('prova');
  const [editingDueAt, setEditingDueAt] = useState('');
  const [editingAlertWhatsapp, setEditingAlertWhatsapp] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await reminderSessionApi.getAll({ includeFinalized: showFinalized });
      const loadedItems = data.items || [];
      setItems(loadedItems);
      void syncAllActiveRemindersToDevice(loadedItems);
    } catch {
      setError('Não foi possível carregar a sessão de lembretes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [showFinalized]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        kind,
        due_at: new Date(dueAt).toISOString(),
        alert_whatsapp: alertWhatsapp.trim(),
      };

      const { data } = await reminderSessionApi.create(payload);
      setItems((prev) => [...prev, data.item].sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()));
      void syncReminderToDevice(data.item);
      setTitle('');
      setKind('prova');
      setDueAt('');
      setAlertWhatsapp('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Falha ao criar lembrete.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Deseja remover este lembrete importante?')) return;
    try {
      await reminderSessionApi.delete(id);
      void removeReminderFromDevice(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError('Falha ao remover lembrete.');
    }
  }

  function startEdit(item: DeadlineReminder) {
    setEditingId(item.id);
    setEditingTitle(item.title);
    setEditingKind(item.kind);
    setEditingDueAt(toDatetimeLocalValue(item.due_at));
    setEditingAlertWhatsapp(item.alert_whatsapp || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle('');
    setEditingKind('prova');
    setEditingDueAt('');
    setEditingAlertWhatsapp('');
  }

  async function saveEdit(id: string) {
    try {
      const payload = {
        title: editingTitle.trim(),
        kind: editingKind,
        due_at: new Date(editingDueAt).toISOString(),
        alert_whatsapp: editingAlertWhatsapp.trim(),
      };
      const { data } = await reminderSessionApi.update(id, payload);
      void syncReminderToDevice(data.item);
      setItems((prev) => prev.map((it) => (it.id === id ? data.item : it)));
      cancelEdit();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Falha ao editar lembrete.');
    }
  }

  async function finalizeReminder(id: string) {
    if (!confirm('Finalizar este lembrete? Ele deixará de ser editável e sairá da lista ativa.')) return;
    try {
      await reminderSessionApi.finalize(id);
      void removeReminderFromDevice(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      if (editingId === id) cancelEdit();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Falha ao finalizar lembrete.');
    }
  }

  function getTriggerBadge(status: DeadlineReminder['trigger_status'] extends infer T ? T extends { d7: infer S } ? S : never : never) {
    if (status === 'sent') return { label: 'Enviado', className: 'bg-green-500/10 text-green-300 border-green-500/30' };
    if (status === 'failed') return { label: 'Falhou', className: 'bg-red-500/10 text-red-300 border-red-500/30' };
    if (status === 'queued' || status === 'retrying' || status === 'processing') {
      return { label: 'Pendente', className: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
    }
    return { label: 'N/A', className: 'bg-gray-500/10 text-gray-300 border-gray-500/30' };
  }

  const now = Date.now();
  const next30Limit = now + 30 * 24 * 60 * 60 * 1000;
  const visibleItems = items.filter((item) => {
    if (!onlyNext30Days) return true;
    const due = new Date(item.due_at).getTime();
    return due >= now && due <= next30Limit;
  });
  const activeItems = visibleItems.filter((item) => item.active);
  const finalizedItems = visibleItems.filter((item) => !item.active);

  return (
    <div className="space-y-6 max-w-4xl">
      <section className="card-glass rounded-2xl p-6 card-glow">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
            <Bell size={18} className="text-primary-300" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Sessão de Lembretes Importantes</h1>
            <p className="text-sm text-gray-400">Cadastre provas e trabalhos para envio automático em D-7 e D-2 por WhatsApp e Email.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={onCreate} className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Título</label>
            <input
              className="input-field"
              placeholder="Ex: Prova final de Cardiologia"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select className="input-field" value={kind} onChange={(e) => setKind(e.target.value as 'prova' | 'trabalho')}>
              <option value="prova">Prova</option>
              <option value="trabalho">Trabalho</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Prazo final</label>
            <input
              type="datetime-local"
              className="input-field"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Número para alertas (opcional)</label>
            <input
              className="input-field"
              placeholder="(DDD) + número para WhatsApp"
              value={alertWhatsapp}
              onChange={(e) => setAlertWhatsapp(e.target.value)}
            />
          </div>

          <div className="md:col-span-4 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Adicionar lembrete
            </button>
          </div>
        </form>
      </section>

      <section className="card-glass rounded-2xl p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-lg font-semibold text-white">Próximos lembretes cadastrados</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setOnlyNext30Days((prev) => !prev)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${onlyNext30Days ? 'border-primary-500/40 text-primary-300 bg-primary-600/10' : 'border-app-border text-gray-400 hover:text-white'}`}
            >
              {onlyNext30Days ? 'Mostrando: Próximos 30 dias' : 'Filtrar: Próximos 30 dias'}
            </button>
            <button
              onClick={() => setShowFinalized((prev) => !prev)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showFinalized ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' : 'border-app-border text-gray-400 hover:text-white'}`}
            >
              {showFinalized ? 'Ocultar finalizados' : 'Mostrar finalizados'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" /> Carregando...
          </div>
        ) : activeItems.length === 0 && finalizedItems.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-gray-500 text-sm border border-app-border rounded-xl bg-app-card/40">
            {onlyNext30Days ? 'Nenhum lembrete nos próximos 30 dias.' : 'Nenhum lembrete importante cadastrado ainda.'}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              {activeItems.map((item) => {
              const d7 = getTriggerBadge(item.trigger_status?.d7 || 'missing');
              const d2 = getTriggerBadge(item.trigger_status?.d2 || 'missing');
              return (
              <div key={item.id} className="rounded-xl border border-app-border bg-app-card/50 p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <input className="input-field" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} />
                      <div className="grid sm:grid-cols-3 gap-2">
                        <select className="input-field" value={editingKind} onChange={(e) => setEditingKind(e.target.value as 'prova' | 'trabalho')}>
                          <option value="prova">Prova</option>
                          <option value="trabalho">Trabalho</option>
                        </select>
                        <input type="datetime-local" className="input-field" value={editingDueAt} onChange={(e) => setEditingDueAt(e.target.value)} />
                        <input className="input-field" placeholder="WhatsApp de alerta (opcional)" value={editingAlertWhatsapp} onChange={(e) => setEditingAlertWhatsapp(e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-white font-medium truncate">{item.title}</p>
                  )}
                  <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-1"><CalendarClock size={12} /> Prazo: {new Date(item.due_at).toLocaleString('pt-BR')}</span>
                    <span className="uppercase tracking-wide text-primary-300">{item.kind}</span>
                    <span>Número alerta: {item.alert_whatsapp || 'perfil padrão'}</span>
                    <span className="text-emerald-300">Status: Ativo</span>
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500">
                    D-7: {item.schedule_meta?.d7_notify_at ? new Date(item.schedule_meta.d7_notify_at).toLocaleString('pt-BR') : 'n/a'}
                    {' · '}
                    D-2: {item.schedule_meta?.d2_notify_at ? new Date(item.schedule_meta.d2_notify_at).toLocaleString('pt-BR') : 'n/a'}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md border ${d7.className}`}>D-7: {d7.label}</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-md border ${d2.className}`}>D-2: {d2.label}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {editingId === item.id ? (
                    <>
                      <button onClick={() => saveEdit(item.id)} className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-primary-500/30 text-primary-300 hover:bg-primary-500/10">
                        <Save size={13} /> Salvar
                      </button>
                      <button onClick={cancelEdit} className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-gray-500/30 text-gray-300 hover:bg-gray-500/10">
                        <XCircle size={13} /> Cancelar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(item)} className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-blue-500/30 text-blue-300 hover:bg-blue-500/10">
                      <Edit3 size={13} /> Editar
                    </button>
                  )}

                  <button onClick={() => finalizeReminder(item.id)} className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">
                    <CheckCircle2 size={13} /> Finalizar
                  </button>

                  <button
                    onClick={() => onDelete(item.id)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 size={13} /> Remover
                  </button>
                </div>
              </div>
              );
            })}
            </div>

            {showFinalized && finalizedItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Histórico de finalizados</h3>
                <div className="space-y-3">
                  {finalizedItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-app-border bg-app-card/30 p-4 flex flex-col md:flex-row md:items-center gap-3 opacity-85">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-200 font-medium truncate">{item.title}</p>
                        <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-3">
                          <span className="inline-flex items-center gap-1"><CalendarClock size={12} /> Prazo: {new Date(item.due_at).toLocaleString('pt-BR')}</span>
                          <span className="uppercase tracking-wide text-gray-300">{item.kind}</span>
                          <span>Número alerta: {item.alert_whatsapp || 'perfil padrão'}</span>
                          <span className="text-amber-300">Status: Finalizado</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onDelete(item.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 size={13} /> Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
