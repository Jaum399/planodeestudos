const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { sendWhatsAppReminder } = require('../utils/whatsapp');
const { sendReminderEmail } = require('../utils/email');
const { sendSmsReminder, isSmsConfigured } = require('../utils/sms');

const TERMINAL_STATUSES = new Set(['sent', 'failed']);

function nowIso() {
  return new Date().toISOString();
}

function computeBackoffMinutes(attemptCount) {
  const sequence = [1, 5, 15, 30, 60];
  return sequence[Math.min(Math.max(attemptCount - 1, 0), sequence.length - 1)];
}

function buildReminderFromPayload(payload) {
  return {
    text: payload?.reminder_text || '',
    due_at: payload?.reminder_due_at || null,
  };
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function dailyJobReminderId(dateKey) {
  return `daily:${dateKey}`;
}

function buildDailyDigestText(reminders) {
  if (!Array.isArray(reminders) || reminders.length === 0) {
    return 'Hoje voce nao tem prazos proximos cadastrados. Mantenha o ritmo de estudos!';
  }

  const lines = reminders.map((item, index) => {
    const dueLabel = new Date(item.due_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    return `${index + 1}) ${item.kind}: ${item.title} - ${dueLabel}`;
  });

  return `Resumo diario de lembretes:\n${lines.join('\n')}`;
}

async function enqueueDailyReminderDigests({ horizonDays = 7, dryRun = false } = {}) {
  const { users, deadlineReminders, notificationJobs } = getDatabase();

  const todayStart = startOfUtcDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const horizonEnd = addDays(todayStart, Number.isFinite(horizonDays) ? Math.max(1, horizonDays) : 7);
  const runAt = nowIso();
  const dateKey = todayStart.toISOString().slice(0, 10);

  const activeReminders = await deadlineReminders
    .find({
      active: true,
      due_at: {
        $gte: runAt,
        $lt: horizonEnd.toISOString(),
      },
    })
    .sort({ due_at: 1 });

  const groupedByUser = new Map();
  for (const reminder of activeReminders) {
    if (!groupedByUser.has(reminder.user_id)) groupedByUser.set(reminder.user_id, []);
    groupedByUser.get(reminder.user_id).push(reminder);
  }

  const userIds = Array.from(groupedByUser.keys());
  if (userIds.length === 0) {
    return {
      scannedUsers: 0,
      queuedJobs: 0,
      skippedNoChannel: 0,
      skippedAlreadyQueued: 0,
      window: {
        from: runAt,
        to: horizonEnd.toISOString(),
      },
    };
  }

  const usersById = new Map();
  const userDocs = await users.find({ _id: { $in: userIds } });
  for (const user of userDocs) usersById.set(user._id, user);

  const summary = {
    scannedUsers: userIds.length,
    queuedJobs: 0,
    skippedNoChannel: 0,
    skippedAlreadyQueued: 0,
    window: {
      from: runAt,
      to: horizonEnd.toISOString(),
    },
  };

  for (const userId of userIds) {
    const reminders = groupedByUser.get(userId) || [];
    const user = usersById.get(userId);
    if (!user || reminders.length === 0) continue;

    const targetWhatsApp = reminders.find((item) => item.alert_whatsapp)?.alert_whatsapp || user.whatsapp || '';
    const hasWhatsApp = Boolean(targetWhatsApp);
    const hasEmail = Boolean(user.email);
    const hasSms = Boolean(targetWhatsApp) && isSmsConfigured();
    if (!hasWhatsApp && !hasEmail && !hasSms) {
      summary.skippedNoChannel += 1;
      continue;
    }

    const reminderId = dailyJobReminderId(dateKey);
    const exists = await notificationJobs.findOne({ user_id: userId, reminder_id: reminderId });
    if (exists) {
      summary.skippedAlreadyQueued += 1;
      continue;
    }

    const nextDue = reminders[0]?.due_at || null;
    const digestText = buildDailyDigestText(reminders.slice(0, 5));

    if (dryRun) {
      summary.queuedJobs += 1;
      continue;
    }

    try {
      await notificationJobs.create({
        _id: randomUUID(),
        user_id: userId,
        reminder_id: reminderId,
        status: 'queued',
        attempt_count: 0,
        max_attempts: 5,
        next_attempt_at: runAt,
        sent_at: null,
        last_error: '',
        channels: {
          whatsapp: hasWhatsApp ? 'pending' : 'skipped',
          sms: hasSms ? 'pending' : 'skipped',
          email: hasEmail ? 'pending' : 'skipped',
        },
        payload: {
          user_name: user.name || '',
          user_email: user.email || '',
          user_whatsapp: targetWhatsApp,
          reminder_text: digestText,
          reminder_due_at: nextDue,
          source: 'daily_digest',
        },
        attempts: [],
        created_at: runAt,
        updated_at: runAt,
      });

      summary.queuedJobs += 1;
    } catch (error) {
      if (error?.code === 11000) {
        summary.skippedAlreadyQueued += 1;
        continue;
      }
      console.error('[Notifications] daily digest enqueue error:', error);
    }
  }

  return summary;
}

async function enqueueReminderNotifications(user, reminder, source = 'jarvis') {
  const userId = user?._id || user?.id;
  if (!userId) return { queued: false, reason: 'missing_user_id' };
  if (!reminder?.id) return { queued: false, reason: 'missing_reminder_id' };

  const hasWhatsApp = Boolean(user?.whatsapp);
  const hasEmail = Boolean(user?.email);
  const hasSms = Boolean(user?.whatsapp) && isSmsConfigured();
  if (!hasWhatsApp && !hasEmail && !hasSms) {
    return { queued: false, reason: 'no_contact_channel' };
  }

  const { notificationJobs } = getDatabase();
  const now = nowIso();

  try {
    const existing = await notificationJobs.findOne({ user_id: userId, reminder_id: reminder.id });
    if (existing) {
      return {
        queued: false,
        reason: TERMINAL_STATUSES.has(existing.status) ? 'already_processed' : 'already_queued',
        jobId: existing._id,
        status: existing.status,
      };
    }

    const job = await notificationJobs.create({
      _id: randomUUID(),
      user_id: userId,
      reminder_id: reminder.id,
      status: 'queued',
      attempt_count: 0,
      max_attempts: 5,
      next_attempt_at: now,
      sent_at: null,
      last_error: '',
      channels: {
        whatsapp: hasWhatsApp ? 'pending' : 'skipped',
        sms: hasSms ? 'pending' : 'skipped',
        email: hasEmail ? 'pending' : 'skipped',
      },
      payload: {
        user_name: user?.name || '',
        user_email: user?.email || '',
        user_whatsapp: user?.whatsapp || '',
        reminder_text: reminder.text || '',
        reminder_due_at: reminder.due_at || null,
        source,
      },
      attempts: [],
      created_at: now,
      updated_at: now,
    });

    return { queued: true, jobId: job._id, status: job.status };
  } catch (error) {
    // Unique index can race under concurrent requests. Treat as already queued.
    if (error?.code === 11000) {
      const existing = await notificationJobs.findOne({ user_id: userId, reminder_id: reminder.id });
      return { queued: false, reason: 'already_queued', jobId: existing?._id, status: existing?.status };
    }
    console.error('[Notifications] enqueue error:', error);
    return { queued: false, reason: 'enqueue_error' };
  }
}

async function enqueueDeadlineReminderNotification({
  user,
  reminderId,
  title,
  kind,
  recipientWhatsApp,
  dueAt,
  notifyAt,
  offsetDays,
  source = 'deadline_session',
}) {
  const userId = user?._id || user?.id;
  if (!userId || !reminderId || !title || !dueAt || !notifyAt) {
    return { queued: false, reason: 'invalid_payload' };
  }

  const targetWhatsApp = recipientWhatsApp || user?.whatsapp || '';
  const hasWhatsApp = Boolean(targetWhatsApp);
  const hasEmail = Boolean(user?.email);
  const hasSms = Boolean(targetWhatsApp) && isSmsConfigured();
  if (!hasWhatsApp && !hasEmail && !hasSms) {
    return { queued: false, reason: 'no_contact_channel' };
  }

  const normalizedKind = String(kind || 'tarefa').toLowerCase();
  const due = new Date(dueAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const summaryText = `Faltam ${offsetDays} dias para ${normalizedKind} "${title}". Prazo final: ${due}.`;

  const { notificationJobs } = getDatabase();
  const now = nowIso();
  const jobReminderId = `${reminderId}:d${offsetDays}`;

  try {
    const existing = await notificationJobs.findOne({ user_id: userId, reminder_id: jobReminderId });
    if (existing) {
      return {
        queued: false,
        reason: TERMINAL_STATUSES.has(existing.status) ? 'already_processed' : 'already_queued',
        jobId: existing._id,
      };
    }

    const effectiveNotifyAt = new Date(notifyAt) <= new Date() ? now : new Date(notifyAt).toISOString();

    const job = await notificationJobs.create({
      _id: randomUUID(),
      user_id: userId,
      reminder_id: jobReminderId,
      status: 'queued',
      attempt_count: 0,
      max_attempts: 5,
      next_attempt_at: effectiveNotifyAt,
      sent_at: null,
      last_error: '',
      channels: {
        whatsapp: hasWhatsApp ? 'pending' : 'skipped',
        sms: hasSms ? 'pending' : 'skipped',
        email: hasEmail ? 'pending' : 'skipped',
      },
      payload: {
        user_name: user?.name || '',
        user_email: user?.email || '',
        user_whatsapp: targetWhatsApp,
        reminder_text: summaryText,
        reminder_due_at: dueAt,
        source,
      },
      attempts: [],
      created_at: now,
      updated_at: now,
    });

    return { queued: true, jobId: job._id, notifyAt: effectiveNotifyAt };
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await notificationJobs.findOne({ user_id: userId, reminder_id: jobReminderId });
      return { queued: false, reason: 'already_queued', jobId: existing?._id };
    }
    console.error('[Notifications] deadline enqueue error:', error);
    return { queued: false, reason: 'enqueue_error' };
  }
}

async function enqueueReminderCreatedNotification({
  user,
  reminderId,
  title,
  kind,
  recipientWhatsApp,
  dueAt,
  source = 'reminder_session_created',
}) {
  const userId = user?._id || user?.id;
  if (!userId || !reminderId || !title || !dueAt) {
    return { queued: false, reason: 'invalid_payload' };
  }

  const targetWhatsApp = recipientWhatsApp || user?.whatsapp || '';
  const hasWhatsApp = Boolean(targetWhatsApp);
  const hasEmail = Boolean(user?.email);
  const hasSms = Boolean(targetWhatsApp) && isSmsConfigured();
  if (!hasWhatsApp && !hasEmail && !hasSms) {
    return { queued: false, reason: 'no_contact_channel' };
  }

  const normalizedKind = String(kind || 'tarefa').toLowerCase();
  const due = new Date(dueAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const summaryText = `Novo lembrete criado: ${normalizedKind} "${title}". Prazo final: ${due}.`;

  const { notificationJobs } = getDatabase();
  const now = nowIso();
  const jobReminderId = `${reminderId}:created`;

  try {
    const existing = await notificationJobs.findOne({ user_id: userId, reminder_id: jobReminderId });
    if (existing) {
      return {
        queued: false,
        reason: TERMINAL_STATUSES.has(existing.status) ? 'already_processed' : 'already_queued',
        jobId: existing._id,
      };
    }

    const job = await notificationJobs.create({
      _id: randomUUID(),
      user_id: userId,
      reminder_id: jobReminderId,
      status: 'queued',
      attempt_count: 0,
      max_attempts: 5,
      next_attempt_at: now,
      sent_at: null,
      last_error: '',
      channels: {
        whatsapp: hasWhatsApp ? 'pending' : 'skipped',
        sms: hasSms ? 'pending' : 'skipped',
        email: hasEmail ? 'pending' : 'skipped',
      },
      payload: {
        user_name: user?.name || '',
        user_email: user?.email || '',
        user_whatsapp: targetWhatsApp,
        reminder_text: summaryText,
        reminder_due_at: dueAt,
        source,
      },
      attempts: [],
      created_at: now,
      updated_at: now,
    });

    return { queued: true, jobId: job._id, notifyAt: now };
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await notificationJobs.findOne({ user_id: userId, reminder_id: jobReminderId });
      return { queued: false, reason: 'already_queued', jobId: existing?._id };
    }
    console.error('[Notifications] created enqueue error:', error);
    return { queued: false, reason: 'enqueue_error' };
  }
}

async function claimNextJob() {
  const { notificationJobs } = getDatabase();
  const now = nowIso();

  return notificationJobs.findOneAndUpdate(
    {
      status: { $in: ['queued', 'retrying'] },
      next_attempt_at: { $lte: now },
      attempt_count: { $lt: 5 },
    },
    { $set: { status: 'processing', updated_at: now } },
    { sort: { next_attempt_at: 1 }, new: true }
  );
}

async function processJob(job) {
  const { notificationJobs } = getDatabase();
  const now = nowIso();
  const reminder = buildReminderFromPayload(job.payload);
  const attempts = [];

  const whatsappPending = job.channels.whatsapp === 'pending' && Boolean(job.payload.user_whatsapp);
  const smsPending = job.channels.sms === 'pending' && Boolean(job.payload.user_whatsapp);
  const emailPending = job.channels.email === 'pending' && Boolean(job.payload.user_email);

  let whatsappSent = false;
  let smsSent = false;
  let emailSent = false;

  const [whatsAppAttempt, smsAttempt, emailAttempt] = await Promise.all([
    whatsappPending
      ? sendWhatsAppReminder({
          to: job.payload.user_whatsapp,
          userName: job.payload.user_name,
          reminderText: reminder.text,
          dueAt: reminder.due_at,
          source: job.payload.source || 'reminder_queue',
        })
          .then((result) => ({ success: Boolean(result?.sent), detail: result || {} }))
          .catch((error) => ({ success: false, detail: { error: error.message } }))
      : null,
    smsPending
      ? sendSmsReminder({
          to: job.payload.user_whatsapp,
          userName: job.payload.user_name,
          reminderText: reminder.text,
          dueAt: reminder.due_at,
        })
          .then((result) => ({ success: Boolean(result?.sent), detail: result || {} }))
          .catch((error) => ({ success: false, detail: { error: error.message } }))
      : null,
    emailPending
      ? sendReminderEmail({ name: job.payload.user_name, email: job.payload.user_email }, reminder)
          .then((result) => ({ success: Boolean(result?.sent), detail: result || {} }))
          .catch((error) => ({ success: false, detail: { error: error.message } }))
      : null,
  ]);

  if (whatsAppAttempt) {
    whatsappSent = whatsAppAttempt.success;
    attempts.push({ at: now, channel: 'whatsapp', success: whatsappSent, detail: whatsAppAttempt.detail });
  }

  if (smsAttempt) {
    smsSent = smsAttempt.success;
    attempts.push({ at: now, channel: 'sms', success: smsSent, detail: smsAttempt.detail });
  }

  if (emailAttempt) {
    emailSent = emailAttempt.success;
    attempts.push({ at: now, channel: 'email', success: emailSent, detail: emailAttempt.detail });
  }

  const nextAttemptCount = (job.attempt_count || 0) + 1;
  const channels = {
    whatsapp: job.channels.whatsapp,
    sms: job.channels.sms || 'skipped',
    email: job.channels.email,
  };

  if (whatsappPending) channels.whatsapp = whatsappSent ? 'sent' : 'failed';
  if (smsPending) channels.sms = smsSent ? 'sent' : 'failed';
  if (emailPending) channels.email = emailSent ? 'sent' : 'failed';

  const allPendingChannelsSent = (!whatsappPending || whatsappSent) && (!smsPending || smsSent) && (!emailPending || emailSent);

  if (allPendingChannelsSent) {
    await notificationJobs.updateOne(
      { _id: job._id },
      {
        $set: {
          status: 'sent',
          sent_at: now,
          updated_at: now,
          attempt_count: nextAttemptCount,
          channels,
          last_error: '',
        },
        $push: { attempts: { $each: attempts } },
      }
    );
    return { processed: true, sent: true, status: 'sent', jobId: job._id };
  }

  if (nextAttemptCount >= (job.max_attempts || 5)) {
    await notificationJobs.updateOne(
      { _id: job._id },
      {
        $set: {
          status: 'failed',
          updated_at: now,
          attempt_count: nextAttemptCount,
          channels,
          last_error: 'max_attempts_reached',
        },
        $push: { attempts: { $each: attempts } },
      }
    );
    return { processed: true, sent: false, status: 'failed', jobId: job._id };
  }

  const backoffMinutes = computeBackoffMinutes(nextAttemptCount);
  const nextAttemptAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

  await notificationJobs.updateOne(
    { _id: job._id },
    {
      $set: {
        status: 'retrying',
        updated_at: now,
        attempt_count: nextAttemptCount,
        next_attempt_at: nextAttemptAt,
        channels: {
          whatsapp: whatsappPending ? (whatsappSent ? 'sent' : 'pending') : channels.whatsapp,
          sms: smsPending ? (smsSent ? 'sent' : 'pending') : channels.sms,
          email: emailPending ? (emailSent ? 'sent' : 'pending') : channels.email,
        },
        last_error: 'delivery_failed',
      },
      $push: { attempts: { $each: attempts } },
    }
  );

  return { processed: true, sent: false, status: 'retrying', jobId: job._id, nextAttemptAt };
}

async function processDueNotificationJobs({ limit = 20 } = {}) {
  const summary = {
    scanned: 0,
    sent: 0,
    retrying: 0,
    failed: 0,
    errors: 0,
  };

  for (let i = 0; i < limit; i += 1) {
    const job = await claimNextJob();
    if (!job) break;

    summary.scanned += 1;

    try {
      const result = await processJob(job);
      if (result.status === 'sent') summary.sent += 1;
      if (result.status === 'retrying') summary.retrying += 1;
      if (result.status === 'failed') summary.failed += 1;
    } catch (error) {
      summary.errors += 1;
      console.error('[Notifications] process error:', error);

      const { notificationJobs } = getDatabase();
      await notificationJobs.updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'retrying',
            updated_at: nowIso(),
            next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            last_error: error.message || 'unknown_error',
          },
        }
      );
    }
  }

  return summary;
}

module.exports = {
  enqueueReminderNotifications,
  enqueueDeadlineReminderNotification,
  enqueueReminderCreatedNotification,
  enqueueDailyReminderDigests,
  processDueNotificationJobs,
};
