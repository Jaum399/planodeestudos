const express = require('express');
const router = express.Router();
const { authenticate, requireAccess } = require('../middleware/auth');

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
        price: Number(process.env.PREMIUM_STANDARD_MONTHLY_PRICE || 50.00),
        features: ['Flashcards', 'Questionários', 'Cursos básicos'],
        billing_cycle: 'monthly',
      },
      premium: {
        name: 'Plano Premium',
        price: Number(process.env.PREMIUM_MONTHLY_PRICE || 49.90),
        features: ['Tudo do Básico', 'Analytics', 'Cronograma automático', 'Jarvis IA'],
        billing_cycle: 'monthly',
      },
      premium_medhub: {
        name: 'Plano Premium+ MedHub',
        price: Number(process.env.PREMIUM_MEDHUB_MONTHLY_PRICE || 89.90),
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

    const normalizedPrice = Number(price.toFixed(2));

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
      prices: {
        basic: Number(process.env.PREMIUM_STANDARD_MONTHLY_PRICE || 50.00),
        premium: Number(process.env.PREMIUM_MONTHLY_PRICE || 49.90),
        medhub: Number(process.env.PREMIUM_MEDHUB_MONTHLY_PRICE || 89.90),
      },
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

module.exports = router;
