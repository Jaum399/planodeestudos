const DEFAULT_SMS_SENDER_NUMBER = '+5565981307806';

function envValue(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return '';
}

function isSmsConfigured() {
  return Boolean(envValue('TWILIO_ACCOUNT_SID') && envValue('TWILIO_AUTH_TOKEN') && normalizePhone(envValue('SMS_FROM_NUMBER', DEFAULT_SMS_SENDER_NUMBER)));
}

async function sendSmsReminder({ to, userName, reminderText, dueAt }) {
  const recipient = normalizePhone(to);
  if (!recipient) return { sent: false, reason: 'invalid_recipient', provider: 'twilio' };
  if (!isSmsConfigured()) return { sent: false, reason: 'not_configured', provider: 'twilio' };

  const due = dueAt ? new Date(dueAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'sem horario definido';
  const body = `Ordex: ${userName || 'Estudante'}, lembrete: ${reminderText}. Prazo: ${due}.`;
  const auth = Buffer.from(`${envValue('TWILIO_ACCOUNT_SID')}:${envValue('TWILIO_AUTH_TOKEN')}`).toString('base64');
  const params = new URLSearchParams({
    To: recipient,
    From: normalizePhone(envValue('SMS_FROM_NUMBER', DEFAULT_SMS_SENDER_NUMBER)),
    Body: body.slice(0, 1500),
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(envValue('TWILIO_ACCOUNT_SID'))}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { sent: false, reason: 'provider_error', provider: 'twilio', status: response.status, data };
  }
  return { sent: true, provider: 'twilio', id: data.sid || null };
}

module.exports = { isSmsConfigured, sendSmsReminder, normalizePhone };
