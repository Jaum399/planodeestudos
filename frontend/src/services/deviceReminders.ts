import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { DeadlineReminder } from '../types';

type DeviceReminderMeta = {
  notificationIds: number[];
  calendarEventId?: string | number;
};

const STORAGE_KEY = 'ordex_device_reminders_v1';

function isNativeMobile() {
  return Capacitor.isNativePlatform();
}

function getStore(): Record<string, DeviceReminderMeta> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStore(store: Record<string, DeviceReminderMeta>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function hashToPositiveInt(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483000;
}

function buildNotificationIds(reminderId: string) {
  const base = hashToPositiveInt(reminderId);
  return {
    due: base + 1,
    d2: base + 2,
    d7: base + 3,
  };
}

function getFutureTriggers(dueAtIso: string) {
  const dueAt = new Date(dueAtIso);
  const d2 = new Date(dueAt.getTime() - (2 * 24 * 60 * 60 * 1000));
  const d7 = new Date(dueAt.getTime() - (7 * 24 * 60 * 60 * 1000));
  const now = Date.now();

  return {
    due: dueAt.getTime() > now ? dueAt : null,
    d2: d2.getTime() > now ? d2 : null,
    d7: d7.getTime() > now ? d7 : null,
  };
}

async function ensureNotificationPermission() {
  if (!isNativeMobile()) return false;
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return true;

  const requested = await LocalNotifications.requestPermissions();
  return requested.display === 'granted';
}

/**
 * Abre o app de calendário nativo do dispositivo via Intent URL.
 * Android: scheme content://com.android.calendar com parâmetros do evento.
 * iOS:     calshow:// com o timestamp do evento.
 * Não requer plugin adicional — o Capacitor intercepta window.open com '_system'.
 */
async function openCalendarForEvent(reminder: DeadlineReminder): Promise<void> {
  if (!isNativeMobile()) return;

  const platform = Capacitor.getPlatform();
  const dueAt = new Date(reminder.due_at);
  const startMs = dueAt.getTime() - 60 * 60 * 1000;
  const endMs = dueAt.getTime();
  const title = encodeURIComponent(reminder.title);
  const desc = encodeURIComponent(`Ordex - ${reminder.kind}`);

  let url: string;
  if (platform === 'ios') {
    const secondsSince2001 = Math.floor(startMs / 1000) - 978307200;
    url = `calshow:${secondsSince2001}`;
  } else {
    url = `content://com.android.calendar/events?title=${title}&description=${desc}&beginTime=${startMs}&endTime=${endMs}`;
  }

  try {
    window.open(url, '_system');
  } catch {
    // Falha silenciosa — calendário é feature extra, não bloqueia o fluxo
  }
}

async function upsertCalendarEvent(reminder: DeadlineReminder, _previousEventId?: string | number) {
  await openCalendarForEvent(reminder);
  return undefined;
}

export async function syncReminderToDevice(reminder: DeadlineReminder) {
  if (!isNativeMobile() || !reminder.active) return;

  const canNotify = await ensureNotificationPermission();
  if (!canNotify) return;

  const ids = buildNotificationIds(reminder.id);
  const triggers = getFutureTriggers(reminder.due_at);

  const notifications = [] as Array<{
    id: number;
    title: string;
    body: string;
    schedule: { at: Date };
  }>;

  if (triggers.d7) {
    notifications.push({
      id: ids.d7,
      title: `${reminder.kind === 'prova' ? 'Prova' : 'Trabalho'} em 7 dias`,
      body: reminder.title,
      schedule: { at: triggers.d7 },
    });
  }

  if (triggers.d2) {
    notifications.push({
      id: ids.d2,
      title: `${reminder.kind === 'prova' ? 'Prova' : 'Trabalho'} em 2 dias`,
      body: reminder.title,
      schedule: { at: triggers.d2 },
    });
  }

  if (triggers.due) {
    notifications.push({
      id: ids.due,
      title: `${reminder.kind === 'prova' ? 'Prova' : 'Trabalho'} hoje`,
      body: reminder.title,
      schedule: { at: triggers.due },
    });
  }

  await LocalNotifications.cancel({ notifications: [{ id: ids.d7 }, { id: ids.d2 }, { id: ids.due }] });

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }

  const store = getStore();
  const previousMeta = store[reminder.id];
  const calendarEventId = await upsertCalendarEvent(reminder, previousMeta?.calendarEventId);

  store[reminder.id] = {
    notificationIds: [ids.d7, ids.d2, ids.due],
    calendarEventId,
  };
  setStore(store);
}

export async function removeReminderFromDevice(reminderId: string) {
  if (!isNativeMobile()) return;

  const store = getStore();
  const meta = store[reminderId];
  const ids = meta?.notificationIds || Object.values(buildNotificationIds(reminderId));

  await LocalNotifications.cancel({
    notifications: ids.map((id) => ({ id })),
  });

  try {
    // Calendário via Intent URL não cria IDs rastreáveis — nada a deletar
  } catch {
    // Melhor esforço
  }

  delete store[reminderId];
  setStore(store);
}

export async function syncAllActiveRemindersToDevice(items: DeadlineReminder[]) {
  if (!isNativeMobile()) return;
  const activeItems = items.filter((item) => item.active);
  await Promise.all(activeItems.map((item) => syncReminderToDevice(item)));
}
