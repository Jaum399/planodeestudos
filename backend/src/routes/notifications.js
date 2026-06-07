const express = require('express');
const mongoose = require('mongoose');
const {
  enqueueDailyReminderDigests,
  processDueNotificationJobs,
} = require('../services/reminderNotifications');

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

async function handleDaily(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const horizonDays = Number(req.query.horizonDays || req.body?.horizonDays || 7);
  const safeHorizon = Number.isFinite(horizonDays) ? Math.min(Math.max(horizonDays, 1), 30) : 7;

  const enqueueSummary = await enqueueDailyReminderDigests({ horizonDays: safeHorizon });
  const processSummary = await processDueNotificationJobs({ limit: 100 });

  return res.json({
    ok: true,
    enqueueSummary,
    processSummary,
  });
}

router.get('/daily-reminders', handleDaily);
router.post('/daily-reminders', handleDaily);

async function handleAutoDaily(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const horizonDays = Number(req.query.horizonDays || req.body?.horizonDays || 7);
  const safeHorizon = Number.isFinite(horizonDays) ? Math.min(Math.max(horizonDays, 1), 30) : 7;

  const enqueueSummary = await enqueueDailyReminderDigests({ horizonDays: safeHorizon });
  const processSummary = await processDueNotificationJobs({ limit: 200 });

  return res.json({
    ok: true,
    mode: 'daily',
    enqueueSummary,
    processSummary,
    timestamp: new Date().toISOString(),
  });
}

async function handleAutoProcess(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const limit = Number(req.query.limit || req.body?.limit || 100);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 300) : 100;
  const processSummary = await processDueNotificationJobs({ limit: safeLimit });

  return res.json({
    ok: true,
    mode: 'process',
    processSummary,
    timestamp: new Date().toISOString(),
  });
}

router.get('/auto-alerts/daily', handleAutoDaily);
router.post('/auto-alerts/daily', handleAutoDaily);
router.get('/auto-alerts/process', handleAutoProcess);
router.post('/auto-alerts/process', handleAutoProcess);

async function runDatabaseRoundTrip() {
  const db = mongoose.connection?.db;
  if (!db) {
    throw new Error('Conexao MongoDB indisponivel para health-check');
  }

  const collection = db.collection('_ops_health_checks');
  const probeId = `probe_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date();

  await collection.insertOne(
    {
      _id: probeId,
      source: 'db-health-check',
      createdAt: now,
    },
    { writeConcern: { w: 'majority' } }
  );

  const readBack = await collection.findOne({ _id: probeId });
  if (!readBack) {
    throw new Error('Round-trip falhou: documento nao encontrado apos escrita');
  }

  await collection.deleteOne({ _id: probeId }, { writeConcern: { w: 'majority' } });
}

async function handleDatabaseHealthCheck(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const startedAt = Date.now();

  try {
    await runDatabaseRoundTrip();

    return res.json({
      ok: true,
      check: 'database-roundtrip',
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      check: 'database-roundtrip',
      durationMs: Date.now() - startedAt,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

router.get('/db-health-check', handleDatabaseHealthCheck);
router.post('/db-health-check', handleDatabaseHealthCheck);

async function handleDatabaseReset(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const confirm = String(req.headers['x-reset-confirm'] || req.body?.confirm || '').trim();
  if (confirm !== 'YES_RESET_ALL_DATA') {
    return res.status(400).json({
      ok: false,
      error: 'Confirmação ausente. Envie x-reset-confirm=YES_RESET_ALL_DATA',
    });
  }

  const db = mongoose.connection?.db;
  if (!db) {
    return res.status(503).json({ ok: false, error: 'Conexao MongoDB indisponivel' });
  }

  try {
    const collections = await db.listCollections().toArray();
    const dropped = [];

    for (const col of collections) {
      const name = String(col.name || '');
      if (!name || name.startsWith('system.')) continue;
      await db.collection(name).drop();
      dropped.push(name);
    }

    return res.json({
      ok: true,
      message: 'Banco resetado com sucesso',
      droppedCollections: dropped,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

router.post('/db-reset', handleDatabaseReset);

module.exports = router;
