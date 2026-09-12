const express = require('express');
const router = express.Router();
const { authenticate, requireAccess } = require('../middleware/auth');
const SINGLE_MONTHLY_PRICE = 19.90;

// Admin-only middleware
function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Check if user is admin (can be added to user schema later)
  const ADMIN_USERS = (process.env.ADMIN_USER_IDS || '').split(',').map(id => id.trim());
  if (!ADMIN_USERS.includes(user._id)) {
    return res.status(403).json({ error: 'Acesso negado - requer permissão admin' });
  }

  next();
}

// ── GET /api/admin/plans - Obter configuração atual dos planos ────────────────
router.get('/plans', authenticate, requireAdmin, (req, res) => {
  try {
    const plans = {
      basic: {
        name: 'Plano Básico',
        price: SINGLE_MONTHLY_PRICE,
        features: ['Flashcards', 'Questionários', 'Cursos básicos'],
        billing_cycle: 'monthly',
      },
      premium: {
        name: 'Plano Premium',
        price: SINGLE_MONTHLY_PRICE,
        features: ['Tudo do Básico', 'Analytics', 'Cronograma automático', 'Jarvis IA'],
        billing_cycle: 'monthly',
      },
      premium_medhub: {
        name: 'Plano Premium+ MedHub',
        price: SINGLE_MONTHLY_PRICE,
        features: ['Tudo do Premium', 'Centro Médico', 'Suporte prioritário'],
        billing_cycle: 'monthly',
      },
    };

    res.json({
      plans,
      lastUpdated: new Date().toISOString(),
      configSource: 'environment_variables',
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Erro ao obter configuração dos planos' });
  }
});

// ── PUT /api/admin/plans/:planType/price - Atualizar preço de um plano ────────
router.put('/plans/:planType/price', authenticate, requireAdmin, (req, res) => {
  try {
    const { planType } = req.params;
    const { price } = req.body;

    if (!price || typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: 'Preço inválido' });
    }

    const normalizedPrice = SINGLE_MONTHLY_PRICE;

    // Map plan type to environment variable
    let envVar;
    let planName;

    switch (planType.toLowerCase()) {
      case 'basic':
      case 'standard':
        envVar = 'PREMIUM_STANDARD_MONTHLY_PRICE';
        planName = 'Plano Básico';
        break;
      case 'premium':
        envVar = 'PREMIUM_MONTHLY_PRICE';
        planName = 'Plano Premium';
        break;
      case 'medhub':
      case 'premium_medhub':
        envVar = 'PREMIUM_MEDHUB_MONTHLY_PRICE';
        planName = 'Plano Premium+ MedHub';
        break;
      default:
        return res.status(400).json({ error: 'Tipo de plano inválido' });
    }

    // Update environment variable
    process.env[envVar] = String(normalizedPrice);

    // Log the change
    console.log(`[ADMIN] ${req.user._id} alterou ${planName} para R$ ${normalizedPrice}`);

    res.json({
      success: true,
      message: `${planName} atualizado para R$ ${normalizedPrice}`,
      plan: {
        type: planType.toLowerCase(),
        name: planName,
        newPrice: normalizedPrice,
        envVar: envVar,
      },
      note: 'Mudanças entrarão em vigor imediatamente. Use GET /plans para confirmar.',
    });
  } catch (error) {
    console.error('Update plan price error:', error);
    res.status(500).json({ error: 'Erro ao atualizar preço do plano' });
  }
});

// ── GET /api/admin/status - Status do sistema (Gemini, Planos, etc) ────────────
router.get('/status', authenticate, requireAdmin, (req, res) => {
  try {
    const geminiAvailable = Boolean(process.env.GOOGLE_GEMINI_API_KEY);
    const asaasAvailable = Boolean(process.env.ASAAS_API_KEY);

    res.json({
      status: 'operational',
      services: {
        gemini: {
          available: geminiAvailable,
          apiKey: geminiAvailable ? '***' + process.env.GOOGLE_GEMINI_API_KEY.slice(-8) : 'NOT_CONFIGURED',
          model: 'gemini-1.5-flash',
        },
        payment: {
          available: asaasAvailable,
          provider: 'Asaas',
          apiKey: asaasAvailable ? '***' + process.env.ASAAS_API_KEY.slice(-8) : 'NOT_CONFIGURED',
          demoMode: process.env.PAYMENT_DEMO_MODE === 'true',
        },
        database: {
          type: 'MongoDB',
          connected: process.env.MONGODB_URI ? 'configured' : 'not_configured',
        },
      },
      prices: { basic: SINGLE_MONTHLY_PRICE, premium: SINGLE_MONTHLY_PRICE, medhub: SINGLE_MONTHLY_PRICE },
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Erro ao obter status do sistema' });
  }
});

// ── PUT /api/admin/keys/:keyType - Atualizar chaves de API ───────────────────
router.put('/keys/:keyType', authenticate, requireAdmin, (req, res) => {
  try {
    const { keyType } = req.params;
    const { value } = req.body;

    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return res.status(400).json({ error: 'Valor de chave inválido' });
    }

    const trimmedValue = value.trim();
    let envVar;
    let keyName;

    switch (keyType.toLowerCase()) {
      case 'gemini':
      case 'google':
        envVar = 'GOOGLE_GEMINI_API_KEY';
        keyName = 'Google Gemini API Key';
        if (!trimmedValue.startsWith('AIza') && !trimmedValue.match(/^[A-Za-z0-9_-]{39,}$/)) {
          return res.status(400).json({ error: 'Formato de chave Gemini inválido' });
        }
        break;
      case 'payment':
      case 'asaas':
        envVar = 'ASAAS_API_KEY';
        keyName = 'Asaas Payment API Key';
        if (!trimmedValue.match(/^[A-Za-z0-9_-]{20,}$/)) {
          return res.status(400).json({ error: 'Formato de chave Asaas inválido' });
        }
        break;
      default:
        return res.status(400).json({ error: 'Tipo de chave inválido' });
    }

    // Update environment variable
    process.env[envVar] = trimmedValue;

    // Log the change
    console.log(`[ADMIN] ${req.user._id} atualizou ${keyName}`);

    res.json({
      success: true,
      message: `${keyName} atualizada com sucesso`,
      key: {
        type: keyType.toLowerCase(),
        name: keyName,
        envVar: envVar,
        preview: '***' + trimmedValue.slice(-8),
      },
      note: 'Mudanças entrarão em vigor imediatamente.',
    });
  } catch (error) {
    console.error('Update key error:', error);
    res.status(500).json({ error: 'Erro ao atualizar chave' });
  }
});

// ──────────── NOVAS ROTAS: DECKS PRÉ-CONFIGURADOS E NOTIFICAÇÕES ────────────

// ── POST /api/admin/seed-presets - Executar seed de decks especializados ────────
router.post('/seed-presets', authenticate, requireAdmin, async (req, res) => {
  try {
    const { seedPresetsDecks } = require('../seeds/presetDecks');
    const result = await seedPresetsDecks();
    return res.json({
      success: true,
      message: result.message,
      decksCreated: result.decksCreated,
      totalCards: result.totalCards,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao executar seed',
    });
  }
});

// ── GET /api/admin/notifications/status - Dashboard de notificações ─────────────
router.get('/notifications/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { getDatabase } = require('../database');
    const { notificationJobs, deadlineReminders, users } = getDatabase();

    // Estatísticas de jobs
    const jobStats = await Promise.all([
      notificationJobs.countDocuments({ status: 'queued' }),
      notificationJobs.countDocuments({ status: 'processing' }),
      notificationJobs.countDocuments({ status: 'retrying' }),
      notificationJobs.countDocuments({ status: 'sent' }),
      notificationJobs.countDocuments({ status: 'failed' }),
    ]);

    const [queued, processing, retrying, sent, failed] = jobStats;

    // Estatísticas de lembretes
    const reminders = await deadlineReminders.countDocuments({ active: true });
    const remindersInactive = await deadlineReminders.countDocuments({ active: false });

    // Jobs que falharam
    const failedJobs = await notificationJobs
      .find({ status: 'failed' })
      .limit(10)
      .sort({ updated_at: -1 });

    // Próximos lembretes
    const now = new Date().toISOString();
    const upcomingReminders = await deadlineReminders
      .find({ active: true, due_at: { $gte: now } })
      .limit(10)
      .sort({ due_at: 1 });

    const userCount = await users.countDocuments({});
    const usersWithNotifications = await notificationJobs
      .distinct('user_id', { status: { $in: ['queued', 'processing'] } });

    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      jobs: {
        queued,
        processing,
        retrying,
        sent,
        failed,
        total: queued + processing + retrying + sent + failed,
      },
      reminders: {
        active: reminders,
        inactive: remindersInactive,
        total: reminders + remindersInactive,
      },
      users: {
        total: userCount,
        withPendingNotifications: usersWithNotifications.length,
      },
      recentFailures: failedJobs.slice(0, 5).map(j => ({
        jobId: j._id,
        reminderId: j.reminder_id,
        userId: j.user_id,
        attempts: j.attempt_count,
        lastError: j.last_error,
        updatedAt: j.updated_at,
      })),
      upcomingReminders: upcomingReminders.map(r => ({
        reminderId: r._id,
        title: r.title,
        kind: r.kind,
        dueAt: r.due_at,
      })),
    });
  } catch (error) {
    console.error('Notifications status error:', error);
    return res.status(500).json({ error: 'Erro ao buscar status' });
  }
});

// ── POST /api/admin/notifications/process-queue - Forçar processamento ─────────
router.post('/notifications/process-queue', authenticate, requireAdmin, async (req, res) => {
  try {
    const { processDueNotificationJobs } = require('../services/reminderNotifications');
    const { limit = 50 } = req.body;
    const safeLimit = Math.min(Math.max(Number(limit), 1), 500);

    const summary = await processDueNotificationJobs({ limit: safeLimit });

    return res.json({
      success: true,
      processed: summary.processed,
      succeeded: summary.succeeded,
      failed: summary.failed,
    });
  } catch (error) {
    console.error('Process queue error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ── POST /api/admin/notifications/schedule-daily - Agendar digest diário ───────
router.post('/notifications/schedule-daily', authenticate, requireAdmin, async (req, res) => {
  try {
    const { enqueueDailyReminderDigests } = require('../services/reminderNotifications');
    const { horizonDays = 7 } = req.body;
    const safeHorizon = Math.min(Math.max(Number(horizonDays), 1), 30);

    const enqueueSummary = await enqueueDailyReminderDigests({
      horizonDays: safeHorizon,
      dryRun: false,
    });

    return res.json({
      success: true,
      queued: enqueueSummary.queuedJobs,
      summary: enqueueSummary,
    });
  } catch (error) {
    console.error('Schedule daily error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ── POST /api/admin/notifications/test-send - Enviar notificação de teste ─────
router.post('/notifications/test-send', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId, channel = 'email', title = 'Teste', message = 'Notificação de teste' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId obrigatório' });
    }

    const { getDatabase } = require('../database');
    const { users } = getDatabase();
    const user = await users.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    let result = { success: false, channel, details: {} };

    if (channel === 'email' && user.email) {
      const { sendReminderEmail } = require('../utils/email');
      try {
        await sendReminderEmail({
          email: user.email,
          subject: title,
          text: message,
        });
        result.success = true;
        result.details = { email: user.email };
      } catch (err) {
        result.error = err.message;
      }
    } else if (channel === 'whatsapp' && user.whatsapp) {
      const { sendWhatsAppReminder } = require('../utils/whatsapp');
      try {
        await sendWhatsAppReminder({
          whatsapp: user.whatsapp,
          message: `${title}\n\n${message}`,
        });
        result.success = true;
        result.details = { whatsapp: user.whatsapp };
      } catch (err) {
        result.error = err.message;
      }
    } else {
      return res.status(400).json({ error: `${channel} não disponível para este usuário` });
    }

    return res.json(result);
  } catch (error) {
    console.error('Test send error:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
