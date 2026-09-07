const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');
const {
  enqueueDeadlineReminderNotification,
  enqueueReminderCreatedNotification,
  processDueNotificationJobs,
} = require('../services/reminderNotifications');
const { normalizeWhatsapp } = require('../utils/whatsapp');

const router = express.Router();
router.use(authenticate, requireAccess);

function toItem(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const { __v, ...rest } = obj;
  return { ...rest, id: rest._id };
}

async function attachTriggerStatus(items, userId) {
  const list = Array.isArray(items) ? items : [items];
  if (list.length === 0) return [];

  const { notificationJobs } = getDatabase();
  const reminderJobIds = list.flatMap((item) => [`${item._id}:d7`, `${item._id}:d2`]);
  const jobs = await notificationJobs.find({ user_id: userId, reminder_id: { $in: reminderJobIds } });

  const statusMap = new Map();
  for (const job of jobs) {
    statusMap.set(job.reminder_id, job.status);
  }

  return list.map((item) => {
    const normalized = toItem(item);
    return {
      ...normalized,
      trigger_status: {
        d7: statusMap.get(`${item._id}:d7`) || 'missing',
        d2: statusMap.get(`${item._id}:d2`) || 'missing',
      },
    };
  });
}

function dueDateFromOffset(dueAt, days) {
  const base = new Date(dueAt).getTime();
  return new Date(base - days * 24 * 60 * 60 * 1000).toISOString();
}

async function scheduleDeadlineJobs(user, reminderDoc) {
  const d7NotifyAt = dueDateFromOffset(reminderDoc.due_at, 7);
  const d2NotifyAt = dueDateFromOffset(reminderDoc.due_at, 2);

  const d7 = await enqueueDeadlineReminderNotification({
    user,
    reminderId: reminderDoc._id,
    title: reminderDoc.title,
    kind: reminderDoc.kind,
    recipientWhatsApp: reminderDoc.alert_whatsapp || user?.whatsapp || '',
    dueAt: reminderDoc.due_at,
    notifyAt: d7NotifyAt,
    offsetDays: 7,
    source: 'reminder_session',
  });

  const d2 = await enqueueDeadlineReminderNotification({
    user,
    reminderId: reminderDoc._id,
    title: reminderDoc.title,
    kind: reminderDoc.kind,
    recipientWhatsApp: reminderDoc.alert_whatsapp || user?.whatsapp || '',
    dueAt: reminderDoc.due_at,
    notifyAt: d2NotifyAt,
    offsetDays: 2,
    source: 'reminder_session',
  });

  return {
    d7_job_id: d7.jobId || null,
    d2_job_id: d2.jobId || null,
    d7_notify_at: d7.notifyAt || d7NotifyAt,
    d2_notify_at: d2.notifyAt || d2NotifyAt,
  };
}

// GET /api/reminder-session
router.get('/', async (req, res) => {
  try {
    const includeFinalized = String(req.query.includeFinalized || '').toLowerCase() === 'true';
    const { deadlineReminders } = getDatabase();
    const query = includeFinalized
      ? { user_id: req.user.id }
      : { user_id: req.user.id, active: true };
    const items = await deadlineReminders.find(query).sort({ active: -1, due_at: 1 });
    const enriched = await attachTriggerStatus(items, req.user.id);
    return res.json({ items: enriched });
  } catch (error) {
    console.error('Reminder session list error:', error);
    return res.status(500).json({ error: 'Erro ao listar lembretes' });
  }
});

// POST /api/reminder-session
router.post('/', async (req, res) => {
  try {
    const { title, kind, due_at, alert_whatsapp } = req.body;

    if (!title || !due_at) {
      return res.status(400).json({ error: 'Título e prazo final são obrigatórios' });
    }

    const normalizedKind = String(kind || '').toLowerCase();
    if (!['prova', 'trabalho', 'apresentacao'].includes(normalizedKind)) {
      return res.status(400).json({ error: 'Tipo inválido. Use: prova, trabalho ou apresentacao' });
    }

    const dueDate = new Date(due_at);
    if (Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ error: 'Prazo final inválido' });
    }

    const normalizedAlertWhatsapp = normalizeWhatsapp(alert_whatsapp);
    if (alert_whatsapp && !normalizedAlertWhatsapp) {
      return res.status(400).json({ error: 'Número de alerta inválido. Use formato internacional com código do país (ex: +34641296849).' });
    }

    const now = new Date().toISOString();
    const { deadlineReminders } = getDatabase();

    const item = new deadlineReminders({
      _id: randomUUID(),
      user_id: req.user.id,
      title: String(title).trim(),
      kind: normalizedKind,
      alert_whatsapp: normalizedAlertWhatsapp || '',
      due_at: dueDate.toISOString(),
      active: true,
      schedule_meta: {},
      created_at: now,
      updated_at: now,
    });

    await item.save();
    await enqueueReminderCreatedNotification({
      user: req.user,
      reminderId: item._id,
      title: item.title,
      kind: item.kind,
      recipientWhatsApp: item.alert_whatsapp || req.user?.whatsapp || '',
      dueAt: item.due_at,
      source: 'reminder_session_created',
    });

    processDueNotificationJobs({ limit: 5 }).catch((processError) => {
      console.error('[Notifications] processamento imediato (criacao) falhou:', processError);
    });

    const scheduleMeta = await scheduleDeadlineJobs(req.user, item);

    const updated = await deadlineReminders.findOneAndUpdate(
      { _id: item._id, user_id: req.user.id },
      { $set: { schedule_meta: scheduleMeta, updated_at: new Date().toISOString() } },
      { new: true }
    );

    const [enrichedItem] = await attachTriggerStatus(updated, req.user.id);
    return res.status(201).json({ item: enrichedItem });
  } catch (error) {
    console.error('Reminder session create error:', error);
    return res.status(500).json({ error: 'Erro ao criar lembrete importante' });
  }
});

// PUT /api/reminder-session/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, kind, due_at, active, alert_whatsapp } = req.body;
    const { deadlineReminders, notificationJobs } = getDatabase();

    const existing = await deadlineReminders.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!existing) return res.status(404).json({ error: 'Lembrete não encontrado' });

    if (!existing.active) {
      return res.status(400).json({ error: 'Somente lembretes não finalizados podem ser editados' });
    }

    const normalizedAlertWhatsapp = normalizeWhatsapp(alert_whatsapp);
    if (alert_whatsapp !== undefined && alert_whatsapp !== '' && !normalizedAlertWhatsapp) {
      return res.status(400).json({ error: 'Número de alerta inválido. Use formato internacional com código do país (ex: +34641296849).' });
    }

    const updates = {
      title: title !== undefined ? String(title).trim() : existing.title,
      kind: kind !== undefined ? String(kind).toLowerCase() : existing.kind,
      alert_whatsapp: alert_whatsapp !== undefined ? (normalizedAlertWhatsapp || '') : (existing.alert_whatsapp || ''),
      due_at: due_at !== undefined ? new Date(due_at).toISOString() : existing.due_at,
      active: active !== undefined ? Boolean(active) : existing.active,
      updated_at: new Date().toISOString(),
    };

    if (!['prova', 'trabalho', 'apresentacao'].includes(updates.kind)) {
      return res.status(400).json({ error: 'Tipo inválido. Use: prova, trabalho ou apresentacao' });
    }

    if (Number.isNaN(new Date(updates.due_at).getTime())) {
      return res.status(400).json({ error: 'Prazo final inválido' });
    }

    await deadlineReminders.updateOne({ _id: req.params.id, user_id: req.user.id }, { $set: updates });

    // Remove jobs pendentes anteriores para esse lembrete e recria programação
    await notificationJobs.deleteMany({
      user_id: req.user.id,
      reminder_id: { $in: [`${req.params.id}:d7`, `${req.params.id}:d2`] },
      status: { $in: ['queued', 'retrying', 'processing'] },
    });

    const refreshed = await deadlineReminders.findOne({ _id: req.params.id, user_id: req.user.id });
    let scheduleMeta = refreshed.schedule_meta || {};

    if (refreshed.active) {
      scheduleMeta = await scheduleDeadlineJobs(req.user, refreshed);
      await deadlineReminders.updateOne(
        { _id: req.params.id, user_id: req.user.id },
        { $set: { schedule_meta: scheduleMeta, updated_at: new Date().toISOString() } }
      );
    }

    const finalItem = await deadlineReminders.findOne({ _id: req.params.id, user_id: req.user.id });
    const [enrichedItem] = await attachTriggerStatus(finalItem, req.user.id);
    return res.json({ item: enrichedItem });
  } catch (error) {
    console.error('Reminder session update error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar lembrete importante' });
  }
});

// PATCH /api/reminder-session/:id/finalize
router.patch('/:id/finalize', async (req, res) => {
  try {
    const { deadlineReminders, notificationJobs } = getDatabase();
    const existing = await deadlineReminders.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!existing) return res.status(404).json({ error: 'Lembrete não encontrado' });

    await deadlineReminders.updateOne(
      { _id: req.params.id, user_id: req.user.id },
      { $set: { active: false, updated_at: new Date().toISOString() } }
    );

    await notificationJobs.deleteMany({
      user_id: req.user.id,
      reminder_id: { $in: [`${req.params.id}:d7`, `${req.params.id}:d2`] },
      status: { $in: ['queued', 'retrying', 'processing'] },
    });

    return res.json({ message: 'Lembrete finalizado com sucesso' });
  } catch (error) {
    console.error('Reminder finalize error:', error);
    return res.status(500).json({ error: 'Erro ao finalizar lembrete' });
  }
});

// DELETE /api/reminder-session/:id
router.delete('/:id', async (req, res) => {
  try {
    const { deadlineReminders, notificationJobs } = getDatabase();
    const existing = await deadlineReminders.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!existing) return res.status(404).json({ error: 'Lembrete não encontrado' });

    await deadlineReminders.deleteOne({ _id: req.params.id, user_id: req.user.id });
    await notificationJobs.deleteMany({
      user_id: req.user.id,
      reminder_id: { $in: [`${req.params.id}:d7`, `${req.params.id}:d2`] },
      status: { $in: ['queued', 'retrying', 'processing'] },
    });

    return res.json({ message: 'Lembrete removido com sucesso' });
  } catch (error) {
    console.error('Reminder session delete error:', error);
    return res.status(500).json({ error: 'Erro ao remover lembrete importante' });
  }
});

module.exports = router;
