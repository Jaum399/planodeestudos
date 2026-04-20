const express = require('express');
const { processDueNotificationJobs } = require('../services/reminderNotifications');

const router = express.Router();

function isAuthorized(req) {
  const secret = String(process.env.NOTIFICATION_CRON_SECRET || process.env.CRON_SECRET || '')
    .replace(/\\r\\n/g, '')
    .replace(/[\r\n]+/g, '')
    .trim();
  if (!secret) return process.env.NODE_ENV !== 'production';

  const headerSecret = req.headers['x-cron-secret'];
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return headerSecret === secret || bearer === secret;
}

async function handleProcess(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const limit = Number(req.query.limit || req.body?.limit || 20);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;

  const summary = await processDueNotificationJobs({ limit: safeLimit });
  return res.json({ ok: true, summary });
}

router.get('/process-reminders', handleProcess);
router.post('/process-reminders', handleProcess);

module.exports = router;
