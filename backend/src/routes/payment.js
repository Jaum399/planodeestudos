const https = require('https');
const express = require('express');
const { getDatabase } = require('../database');
const { authenticate } = require('../middleware/auth');
const { sendPaymentConfirmationEmail } = require('../utils/email');

const router = express.Router();

const ASAAS_SUCCESS_EVENTS = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']);
const ASAAS_PENDING_EVENTS = new Set(['PAYMENT_CREATED', 'PAYMENT_AWAITING_RISK_ANALYSIS']);
const ASAAS_FAILURE_EVENTS = new Set([
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_REFUNDED',
  'PAYMENT_REFUND_IN_PROGRESS',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
  'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
]);

const PLAN_PREMIUM = 'premium';
const SINGLE_MONTHLY_PRICE = 19.90;

function normalizePlanType(_value) {
  return PLAN_PREMIUM;
}

function getPlanAmount(planType) {
  return SINGLE_MONTHLY_PRICE;
}

function resolvePlanSlug(planType) {
  return PLAN_PREMIUM;
}

function getAsaasConfig() {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) return null;

  const env = (process.env.ASAAS_ENV || 'sandbox').toLowerCase();
  const baseUrl = env === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3';

  return { apiKey, baseUrl };
}

function asaasRequest(method, path, body) {
  const config = getAsaasConfig();
  if (!config) {
    return Promise.reject(new Error('Asaas não configurado. Defina ASAAS_API_KEY.'));
  }

  return new Promise((resolve, reject) => {
    const url = new URL(`${config.baseUrl}${path}`);
    const payload = body ? JSON.stringify(body) : null;

    const req = https.request({
      method,
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Ordex/1.0 (+https://app-tigas-entregas.vercel.app)',
        access_token: config.apiKey,
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        let parsed = {};
        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch (_err) {
          parsed = { raw };
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
          return;
        }

        const apiError = new Error(parsed?.errors?.[0]?.description || parsed?.message || 'Erro no Asaas');
        apiError.statusCode = res.statusCode;
        apiError.details = parsed;
        reject(apiError);
      });
    });

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

function getCheckoutBillingType() {
  return 'UNDEFINED';
}

function getDateYYYYMMDD(daysFromNow = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function normalizeDocument(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidCpf(value) {
  const cpf = normalizeDocument(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calc = (base, factor) => {
    let total = 0;
    for (let i = 0; i < base.length; i += 1) total += Number(base[i]) * (factor - i);
    const mod = (total * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

function isValidCnpj(value) {
  const cnpj = normalizeDocument(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calc = (base, factors) => {
    let total = 0;
    for (let i = 0; i < factors.length; i += 1) {
      total += Number(base[i]) * factors[i];
    }
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const d1 = calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

function isValidCpfCnpj(value) {
  const doc = normalizeDocument(value);
  if (doc.length === 11) return isValidCpf(doc);
  if (doc.length === 14) return isValidCnpj(doc);
  return false;
}

async function ensureAsaasCustomer(user, users) {
  const doc = normalizeDocument(user?.billingDocument);
  if (user?.asaasCustomerId) {
    // Valida customer atual; se estiver sem CPF/CNPJ ou divergente, cria um novo customer correto.
    try {
      const current = await asaasRequest('GET', `/customers/${user.asaasCustomerId}`);
      const currentDoc = normalizeDocument(current?.cpfCnpj);
      if (isValidCpfCnpj(currentDoc) && currentDoc === doc) {
        return user.asaasCustomerId;
      }
    } catch (err) {
      console.warn('[Asaas] Falha ao ler customer atual; sera criado novo customer:', err.message);
    }
  }

  const created = await asaasRequest('POST', '/customers', {
    name: user.name,
    email: user.email,
    cpfCnpj: doc,
    externalReference: user._id,
    notificationDisabled: false,
  });

  await users.findOneAndUpdate(
    { _id: user._id },
    { $set: { asaasCustomerId: created.id, updated_at: new Date().toISOString() } }
  );

  return created.id;
}

async function applyPaymentStatusByAsaasPayment(userId, payment, users, pendingPlanType = PLAN_PREMIUM) {
  const now = new Date().toISOString();
  const status = (payment?.status || '').toUpperCase();
  const planSlug = resolvePlanSlug(pendingPlanType);

  if (status === 'CONFIRMED' || status === 'RECEIVED' || status === 'RECEIVED_IN_CASH') {
    await users.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          plan: planSlug,
          subscriptionStatus: 'active',
          asaasPaymentId: payment.id,
          asaasPaymentStatus: status,
          pending_plan_type: null,
          grace_period_ends_at: null,
          updated_at: now,
        },
      }
    );
    return { plan: planSlug, subscriptionStatus: 'active' };
  }

  if (status === 'OVERDUE') {
    const graceEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await users.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          plan: 'free',
          subscriptionStatus: 'past_due',
          asaasPaymentId: payment.id,
          asaasPaymentStatus: status,
          pending_plan_type: null,
          grace_period_ends_at: graceEnd,
          updated_at: now,
        },
      }
    );
    return { plan: 'free', subscriptionStatus: 'past_due' };
  }

  await users.findOneAndUpdate(
    { _id: userId },
    {
      $set: {
        plan: 'free',
        subscriptionStatus: 'pending',
        asaasPaymentId: payment.id,
        asaasPaymentStatus: status || 'PENDING',
        pending_plan_type: normalizePlanType(pendingPlanType),
        updated_at: now,
      },
    }
  );

  return { plan: 'free', subscriptionStatus: 'pending' };
}

// GET /api/payment/status
router.get('/status', authenticate, async (req, res) => {
  const { users } = getDatabase();
  let user = await users.findOne({ _id: req.user.id });

  // Se houver pagamento pendente no Asaas, sincroniza o status antes de responder.
  if (user?.asaasPaymentId && user?.subscriptionStatus === 'pending' && getAsaasConfig()) {
    try {
      const payment = await asaasRequest('GET', `/payments/${user.asaasPaymentId}`);
      await applyPaymentStatusByAsaasPayment(user._id, payment, users, user?.pending_plan_type || PLAN_PREMIUM);
      user = await users.findOne({ _id: req.user.id });
    } catch (err) {
      console.warn('[Asaas] Falha ao sincronizar status pendente:', err.message);
    }
  }

  res.json({
    plan: user?.plan || 'free',
    subscriptionStatus: user?.subscriptionStatus || null,
  });
});

// POST /api/payment/create-checkout
router.post('/create-checkout', authenticate, async (req, res) => {
  if (!getAsaasConfig()) {
    return res.status(503).json({ error: 'Pagamento não configurado. Adicione ASAAS_API_KEY.' });
  }

  try {
    const { users } = getDatabase();
    const user = await users.findOne({ _id: req.user.id });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const billingDoc = normalizeDocument(user.billingDocument);
    if (!isValidCpfCnpj(billingDoc)) {
      return res.status(400).json({
        error: 'Para gerar o checkout, informe um CPF/CNPJ válido no campo de cobrança.',
        code: 'MISSING_BILLING_DOCUMENT',
      });
    }

    const selectedPlanType = normalizePlanType(req.body?.planType);
    const selectedPlanAmount = getPlanAmount(selectedPlanType);
    const customerId = await ensureAsaasCustomer(user, users);
    const baseUrl = process.env.FRONTEND_URL || 'https://app-tigas-entregas.vercel.app';

    const planDescription = 'Ordex Premium - mensal';

    const payload = {
      customer: customerId,
      billingType: getCheckoutBillingType(),
      value: selectedPlanAmount,
      dueDate: getDateYYYYMMDD(0),
      description: planDescription,
      externalReference: req.user.id,
    };

    const payment = await asaasRequest('POST', '/payments', payload);

    await users.findOneAndUpdate(
      { _id: req.user.id },
      {
        $set: {
          asaasPaymentId: payment.id,
          asaasPaymentStatus: (payment.status || 'PENDING').toUpperCase(),
          pending_plan_type: selectedPlanType,
          subscriptionStatus: 'pending',
          plan: 'free',
          updated_at: new Date().toISOString(),
        },
      }
    );

    const checkoutUrl = payment.invoiceUrl || payment.bankSlipUrl || payment.transactionReceiptUrl;
    if (!checkoutUrl) {
      return res.status(500).json({ error: 'Asaas não retornou URL de checkout.' });
    }

    res.json({
      checkout_url: checkoutUrl,
      provider: 'asaas',
      return_url: `${baseUrl}/app/payment-success`,
      planType: selectedPlanType,
      amount: selectedPlanAmount,
    });
  } catch (err) {
    console.error('Asaas create-checkout error:', err.message);
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 500;
    res.status(status).json({ error: 'Erro ao criar checkout no Asaas', detail: err.message });
  }
});

// GET /api/payment/portal
router.get('/portal', authenticate, async (_req, res) => {
  // O Asaas não possui um billing portal equivalente ao Stripe para o mesmo fluxo.
  res.status(501).json({ error: 'Portal de assinatura não disponível para o provedor atual.' });
});

// POST /api/payment/webhook — recebe eventos do Asaas
router.post('/webhook', async (req, res) => {
  const { users } = getDatabase();

  try {
    const payloadRaw = req.body instanceof Buffer ? req.body.toString() : req.body;
    const payload = typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : payloadRaw;

    const eventName = payload?.event;
    const payment = payload?.payment || payload?.data || null;

    if (!eventName || !payment) {
      return res.status(400).json({ error: 'Evento inválido do Asaas' });
    }

    const userQuery = payment.externalReference
      ? { _id: payment.externalReference }
      : payment.customer
        ? { asaasCustomerId: payment.customer }
        : payment.id
          ? { asaasPaymentId: payment.id }
          : null;

    if (!userQuery) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const user = await users.findOne(userQuery);
    if (!user) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const now = new Date().toISOString();

    // Protecao extra: ignora eventos de pagamentos que nao foram criados no checkout desta conta.
    if (!user.asaasPaymentId || user.asaasPaymentId !== payment.id) {
      return res.status(200).json({ received: true, ignored: true, reason: 'payment_not_linked_to_checkout' });
    }

    // Consulta o Asaas para validar status oficial do pagamento (nao confia apenas no payload do webhook)
    let officialPayment = payment;
    try {
      officialPayment = await asaasRequest('GET', `/payments/${payment.id}`);
    } catch (err) {
      console.warn('[Asaas] Falha ao validar pagamento no webhook:', err.message);
      return res.status(200).json({ received: true, ignored: true, reason: 'asaas_validation_failed' });
    }

    if (ASAAS_SUCCESS_EVENTS.has(eventName)) {
      const resolvedPlan = resolvePlanSlug(user.pending_plan_type || PLAN_PREMIUM);
      await users.findOneAndUpdate(
        { _id: user._id },
        {
          $set: {
            plan: resolvedPlan,
            subscriptionStatus: 'active',
            asaasPaymentId: officialPayment.id,
            asaasPaymentStatus: (officialPayment.status || 'CONFIRMED').toUpperCase(),
            pending_plan_type: null,
            grace_period_ends_at: null,
            updated_at: now,
          },
        }
      );
      // Email de confirmação de pagamento (fire-and-forget)
      sendPaymentConfirmationEmail(user).catch(err => console.warn('[Email] Confirmação de pagamento falhou:', err.message));
    } else if (ASAAS_PENDING_EVENTS.has(eventName)) {
      await users.findOneAndUpdate(
        { _id: user._id },
        {
          $set: {
            plan: 'free',
            subscriptionStatus: 'pending',
            asaasPaymentId: officialPayment.id,
            asaasPaymentStatus: (officialPayment.status || 'PENDING').toUpperCase(),
            pending_plan_type: user.pending_plan_type || PLAN_PREMIUM,
            updated_at: now,
          },
        }
      );
    } else if (ASAAS_FAILURE_EVENTS.has(eventName)) {
      const isOverdue = eventName === 'PAYMENT_OVERDUE';
      const graceEnd = isOverdue
        ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      await users.findOneAndUpdate(
        { _id: user._id },
        {
          $set: {
            plan: 'free',
            subscriptionStatus: isOverdue ? 'past_due' : 'canceled',
            asaasPaymentId: officialPayment.id,
            asaasPaymentStatus: (officialPayment.status || 'OVERDUE').toUpperCase(),
            pending_plan_type: null,
            grace_period_ends_at: graceEnd,
            updated_at: now,
          },
        }
      );
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Asaas webhook processing error:', err.message);
    res.status(500).json({ error: 'Erro ao processar webhook do Asaas' });
  }
});

module.exports = router;
