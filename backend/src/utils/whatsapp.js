const DEFAULT_WHATSAPP_SENDER_NUMBER = '34641296849';

function envValue(name, fallback = '') {
  const rawValue = process.env[name];
  if (rawValue == null) return fallback;

  return String(rawValue)
    .replace(/\\r\\n/g, '')
    .replace(/[\r\n]+/g, '')
    .trim() || fallback;
}

function getSenderNumber() {
  return normalizeWhatsapp(envValue('WHATSAPP_SENDER_NUMBER', DEFAULT_WHATSAPP_SENDER_NUMBER))
    || normalizeWhatsapp(DEFAULT_WHATSAPP_SENDER_NUMBER)
    || DEFAULT_WHATSAPP_SENDER_NUMBER;
}

// ── Baileys Microservice (SEM API KEY — usa o numero +34641296849 direto) ────────
// Variaveis necessarias:
//   WHATSAPP_BAILEYS_URL=https://sua-url-do-railway-ou-render.app
//   WHATSAPP_BAILEYS_SECRET=segredo-compartilhado (opcional)

async function sendViaBaileysService({ toNumber, text, source }) {
  const serviceUrl = envValue('WHATSAPP_BAILEYS_URL').replace(/\/$/, '');
  const serviceSecret = envValue('WHATSAPP_BAILEYS_SECRET');
  if (!serviceUrl) return { sent: false, reason: 'not_configured' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (serviceSecret) headers['x-service-secret'] = serviceSecret;

    const response = await fetch(`${serviceUrl}/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to: toNumber, message: text }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn('[WhatsApp] Baileys service erro:', response.status, JSON.stringify(body));
      return { sent: false, reason: 'provider_error', provider: 'baileys', status: response.status, data: body };
    }

    return { sent: true, provider: 'baileys', from: DEFAULT_WHATSAPP_SENDER_NUMBER };
  } catch (err) {
    console.warn('[WhatsApp] Baileys service falhou:', err.message);
    return { sent: false, reason: 'request_error', provider: 'baileys' };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Infobip WhatsApp ───────────────────────────────────────────────────────────
// Variaveis necessarias:
//   WHATSAPP_PUBLIC_PROVIDER=infobip
//   WHATSAPP_PUBLIC_ENABLED=true
//   WHATSAPP_PUBLIC_API_URL=https://seu-subdominio.api.infobip.com
//   WHATSAPP_PUBLIC_API_KEY=sua-api-key

async function sendViaInfobipApi({ toNumber, text, source }) {
  const baseUrl = envValue('WHATSAPP_PUBLIC_API_URL').replace(/\/$/, '');
  const apiKey = envValue('WHATSAPP_PUBLIC_API_KEY');
  const senderNumber = getSenderNumber();

  if (!baseUrl || !apiKey) return { sent: false, reason: 'not_configured' };

  const endpoint = `${baseUrl}/whatsapp/1/message/text`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `App ${apiKey}`,
      },
      body: JSON.stringify({
        from: senderNumber,
        to: toNumber,
        content: { text },
        callbackData: source,
      }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn('[WhatsApp] Falha Infobip:', response.status, JSON.stringify(body));
      return { sent: false, reason: 'provider_error', provider: 'infobip', status: response.status, data: body };
    }

    const deliveryStatus = String(body?.status?.name || '').toUpperCase();
    const deliveryGroup = String(body?.status?.groupName || '').toUpperCase();
    if (deliveryStatus.startsWith('REJECTED') || deliveryGroup === 'REJECTED') {
      console.warn('[WhatsApp] Infobip rejeitou a mensagem:', JSON.stringify(body));
      return { sent: false, reason: 'provider_rejected', provider: 'infobip', data: body };
    }

    return { sent: true, provider: 'infobip', data: body };
  } catch (err) {
    console.warn('[WhatsApp] Erro Infobip:', err.message);
    return { sent: false, reason: 'request_error', provider: 'infobip' };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendViaPublicWhatsAppApi({ toNumber, text, source }) {
  const provider = envValue('WHATSAPP_PUBLIC_PROVIDER', 'infobip').toLowerCase();

  if (provider === 'infobip') {
    return sendViaInfobipApi({ toNumber, text, source });
  }

  // CallMeBot (chave por numero, uso pessoal)
  if (provider === 'callmebot') {
    const apiKey = envValue('WHATSAPP_PUBLIC_API_KEY');
    const endpoint = envValue('WHATSAPP_PUBLIC_API_URL', 'https://api.callmebot.com/whatsapp.php');
    if (!apiKey) return { sent: false, reason: 'not_configured' };

    const url = `${endpoint}?phone=${encodeURIComponent(toNumber)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      const bodyText = await response.text();
      console.warn('[WhatsApp] Falha CallMeBot:', response.status, bodyText);
      return { sent: false, reason: 'provider_error', provider: 'callmebot', status: response.status };
    }
    return { sent: true, provider: 'callmebot' };
  }

  // Endpoint generico POST JSON
  if (provider === 'generic') {
    const endpoint = envValue('WHATSAPP_PUBLIC_API_URL');
    const apiKey = envValue('WHATSAPP_PUBLIC_API_KEY');
    if (!endpoint) return { sent: false, reason: 'not_configured' };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        from: getSenderNumber(),
        to: toNumber,
        message: text,
        metadata: { source, type: 'important_reminder' },
      }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      console.warn('[WhatsApp] Falha Generic:', response.status, bodyText);
      return { sent: false, reason: 'provider_error', provider: 'generic', status: response.status };
    }

    return { sent: true, provider: 'generic' };
  }

  return { sent: false, reason: 'unknown_provider' };
}

function normalizeWhatsapp(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';

  // E.164 internacional sem o sinal de + (8 a 15 dígitos).
  if (digits.length >= 8 && digits.length <= 15) {
    // Compatibilidade: números locais BR continuam aceitos sem prefixo de país.
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    return digits;
  }

  return '';
}

function isImportantReminder(text) {
  const source = String(text || '').toLowerCase();
  return /(prova|trabalho|entrega|deadline|apresenta[cç][aã]o|semin[aá]rio|avalia[cç][aã]o|teste|exame)/i.test(source);
}

async function sendWhatsAppReminder({ to, userName, reminderText, dueAt, source = 'jarvis' }) {
  const toNumber = normalizeWhatsapp(to);

  if (!toNumber) return { sent: false, reason: 'invalid_recipient' };

  const due = dueAt
    ? new Date(dueAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : 'sem horario definido';

  const text = `Oi ${userName || 'estudante'}! Lembrete importante: ${reminderText}. Prazo: ${due}.`;

  // 0) Prioridade maxima: Microservico Baileys (sem API key, usa numero +34641296849)
  if (envValue('WHATSAPP_BAILEYS_URL')) {
    try {
      const baileysResult = await sendViaBaileysService({ toNumber, text, source });
      if (baileysResult.sent) return baileysResult;
      if (baileysResult.reason !== 'not_configured') {
        console.warn('[WhatsApp] Baileys nao enviou, tentando proximo provider:', baileysResult.reason);
      }
    } catch (err) {
      console.warn('[WhatsApp] Erro Baileys Service:', err.message);
    }
  }

  // 1) API publica configuravel (Infobip, CallMeBot, Generic)
  if (envValue('WHATSAPP_PUBLIC_ENABLED') === 'true') {
    try {
      const publicResult = await sendViaPublicWhatsAppApi({ toNumber, text, source });
      if (publicResult.sent) return publicResult;
      if (publicResult.reason !== 'not_configured') return publicResult;
    } catch (err) {
      console.warn('[WhatsApp] Erro API publica:', err.message);
      return { sent: false, reason: 'request_error', provider: 'public' };
    }
  }

  // 1) Prioridade: WhatsApp Cloud API (Meta)
  const metaToken = envValue('WHATSAPP_ACCESS_TOKEN');
  const metaPhoneNumberId = envValue('WHATSAPP_PHONE_NUMBER_ID');
  const metaApiVersion = envValue('WHATSAPP_API_VERSION', 'v20.0');
  if (metaToken && metaPhoneNumberId) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(
        `https://graph.facebook.com/${metaApiVersion}/${metaPhoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${metaToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: toNumber,
            type: 'text',
            text: { body: text },
            metadata: { source, sender_base: getSenderNumber() },
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const bodyText = await response.text();
        console.warn('[WhatsApp] Falha Meta API:', response.status, bodyText);
        return { sent: false, reason: 'provider_error', provider: 'meta', status: response.status };
      }

      return { sent: true, provider: 'meta' };
    } catch (err) {
      console.warn('[WhatsApp] Erro Meta API:', err.message);
      return { sent: false, reason: 'request_error', provider: 'meta' };
    } finally {
      clearTimeout(timeout);
    }
  }

  // 2) Fallback opcional: CAMO
  const camoUrl = envValue('CAMO_API_URL');
  const camoKey = envValue('CAMO_API_KEY');
  if (!camoUrl || !camoKey) {
    console.warn('[WhatsApp] Não configurado. Defina WHATSAPP_PUBLIC_API_URL + WHATSAPP_PUBLIC_API_KEY (Infobip), WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID (Meta) ou CAMO_API_URL + CAMO_API_KEY.');
    return { sent: false, reason: 'not_configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(camoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${camoKey}`,
      },
      body: JSON.stringify({
        from: getSenderNumber(),
        to: toNumber,
        message: text,
        metadata: { source, type: 'important_reminder' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text();
      console.warn('[WhatsApp] Falha CAMO:', response.status, bodyText);
      return { sent: false, reason: 'provider_error', provider: 'camo', status: response.status };
    }

    return { sent: true, provider: 'camo' };
  } catch (err) {
    console.warn('[WhatsApp] Erro ao enviar:', err.message);
    return { sent: false, reason: 'request_error', provider: 'camo' };
  } finally {
    clearTimeout(timeout);
  }
}

async function maybeSendImportantReminderWhatsApp(user, reminder) {
  if (!user?.whatsapp) return { sent: false, reason: 'no_whatsapp' };
  if (!isImportantReminder(reminder?.text)) return { sent: false, reason: 'not_important' };

  return sendWhatsAppReminder({
    to: user.whatsapp,
    userName: user.name,
    reminderText: reminder.text,
    dueAt: reminder.due_at,
    source: 'tigas_reminder',
  });
}

module.exports = {
  WHATSAPP_SENDER_NUMBER: getSenderNumber(),
  normalizeWhatsapp,
  isImportantReminder,
  sendViaPublicWhatsAppApi,
  sendViaBaileysService,
  sendWhatsAppReminder,
  maybeSendImportantReminderWhatsApp,
};
