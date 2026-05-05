/**
 * Email utility — Nodemailer with configurable SMTP.
 *
 * Environment variables (add no Vercel > Settings > Environment Variables):
 *   EMAIL_HOST         — SMTP host        (padrão: smtp.gmail.com)
 *   EMAIL_PORT         — SMTP port        (padrão: 587)
 *   EMAIL_SECURE       — "true" p/ 465    (padrão: false)
 *   EMAIL_USER         — remetente (conta Gmail ou SMTP)
 *   EMAIL_PASS         — senha de app Gmail ou senha SMTP
 *   EMAIL_FROM_NAME    — nome exibido     (padrão: Ordex)
 *
 * Se EMAIL_USER/EMAIL_PASS não estiverem configurados, os emails são
 * suprimidos com aviso no log — a aplicação NUNCA quebra por falta de email.
 */
const nodemailer = require('nodemailer');

function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

function from() {
  const user = process.env.EMAIL_USER || '';
  const name = process.env.EMAIL_FROM_NAME || 'Ordex';
  return `"${name}" <${user}>`;
}

async function sendEmail(to, subject, html) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn(`[Email] Credenciais não configuradas — pulando envio para: ${to}`);
    return { skipped: true };
  }
  const info = await transporter.sendMail({ from: from(), to, subject, html });
  console.log(`[Email] Enviado para ${to}: ${info.messageId}`);
  return info;
}

// ── Templates ─────────────────────────────────────────────────────────────────

function baseTemplate(title, bodyHtml) {
  const appUrl = process.env.FRONTEND_URL || 'https://app-tigas-entregas.vercel.app';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Segoe UI',Roboto,sans-serif;color:#e4e4e7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#18181b;border-radius:16px;border:1px solid #27272a;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 36px;text-align:center;">
              <span style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">🎓 Ordex</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#09090b;padding:20px 36px;border-top:1px solid #27272a;text-align:center;">
              <p style="margin:0;font-size:12px;color:#71717a;">
                Ordex &mdash; <a href="${appUrl}" style="color:#a78bfa;text-decoration:none;">acessar plataforma</a>
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#52525b;">Este é um email automático. Não responda.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(text, url) {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;">${text}</a>`;
}

// ── Exported email senders ─────────────────────────────────────────────────────

async function sendWelcomeEmail(user) {
  const appUrl = process.env.FRONTEND_URL || 'https://app-tigas-entregas.vercel.app';
  const firstName = user.name.split(' ')[0];
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#fff;">Olá, ${firstName}! 👋</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.6;">
      Sua conta foi criada com sucesso. Você tem <strong style="color:#a78bfa;">7 dias de trial grátis</strong>
      para explorar todas as funcionalidades da plataforma.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0f;border:1px solid #27272a;border-radius:12px;padding:20px;margin:20px 0;">
      <tr>
        <td>
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#a78bfa;text-transform:uppercase;letter-spacing:0.5px;">O que está te esperando</p>
          <p style="margin:4px 0;font-size:14px;color:#d4d4d8;">📚 Planner Kanban de estudos</p>
          <p style="margin:4px 0;font-size:14px;color:#d4d4d8;">🃏 Flashcards com revisão espaçada</p>
          <p style="margin:4px 0;font-size:14px;color:#d4d4d8;">🗺️ Mapa Mental personalizado</p>
          <p style="margin:4px 0;font-size:14px;color:#d4d4d8;">🤖 Tigas, seu assistente de estudos por voz</p>
          <p style="margin:4px 0;font-size:14px;color:#d4d4d8;">📊 Analytics e progresso em tempo real</p>
        </td>
      </tr>
    </table>
    ${btn('Acessar minha conta', appUrl + '/app/dashboard')}
  `;
  return sendEmail(user.email, '🎓 Bem-vindo(a) ao Ordex!', baseTemplate('Bem-vindo!', body));
}

async function sendPaymentConfirmationEmail(user) {
  const appUrl = process.env.FRONTEND_URL || 'https://app-tigas-entregas.vercel.app';
  const firstName = user.name.split(' ')[0];
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#fff;">Pagamento confirmado! ✅</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.6;">
      Excelente, ${firstName}! Seu acesso <strong style="color:#a78bfa;">Premium</strong> já está ativo.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#052e16;border:1px solid #16a34a44;border-radius:12px;padding:20px;margin:20px 0;">
      <tr>
        <td>
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#4ade80;text-transform:uppercase;letter-spacing:0.5px;">Seu plano Premium inclui</p>
          <p style="margin:4px 0;font-size:14px;color:#bbf7d0;">✓ Acesso completo a todos os recursos</p>
          <p style="margin:4px 0;font-size:14px;color:#bbf7d0;">✓ Tigas por voz com modo conversa mãos-livres</p>
          <p style="margin:4px 0;font-size:14px;color:#bbf7d0;">✓ Mapa Mental ilimitado com IA</p>
          <p style="margin:4px 0;font-size:14px;color:#bbf7d0;">✓ Suporte prioritário</p>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#71717a;">Em caso de dúvidas, entre em contato pelo suporte.</p>
    ${btn('Acessar plataforma Premium', appUrl + '/app/dashboard')}
  `;
  return sendEmail(user.email, '✅ Premium ativado — Ordex', baseTemplate('Premium ativado!', body));
}

async function sendPasswordResetEmail(user, token) {
  const appUrl = process.env.FRONTEND_URL || 'https://app-tigas-entregas.vercel.app';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  const firstName = user.name.split(' ')[0];
  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#fff;">Redefinição de senha 🔒</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.6;">
      Olá, ${firstName}! Recebemos uma solicitação para redefinir a senha da sua conta.<br/>
      Clique no botão abaixo para criar uma nova senha. O link expira em <strong style="color:#a78bfa;">1 hora</strong>.
    </p>
    ${btn('Redefinir minha senha', resetUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:#71717a;">
      Se você não solicitou isso, ignore este email. Sua senha permanece a mesma.<br/>
      Ou copie este link: <span style="color:#a78bfa;word-break:break-all;">${resetUrl}</span>
    </p>
  `;
  return sendEmail(user.email, '🔒 Redefinição de senha — Ordex', baseTemplate('Redefinição de senha', body));
}

async function sendReminderEmail(user, reminder) {
  if (!user?.email) return { skipped: true, reason: 'no_email' };

  const appUrl = process.env.FRONTEND_URL || 'https://app-tigas-entregas.vercel.app';
  const firstName = (user.name || 'Estudante').split(' ')[0];
  const due = reminder?.due_at
    ? new Date(reminder.due_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : 'Sem horario definido';

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#fff;">Lembrete importante de estudo 📌</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.6;">
      Olá, ${firstName}! Este é um lembrete automático para você não perder prazo.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0f;border:1px solid #27272a;border-radius:12px;padding:20px;margin:20px 0;">
      <tr>
        <td>
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#a78bfa;text-transform:uppercase;letter-spacing:0.5px;">Detalhes</p>
          <p style="margin:4px 0;font-size:14px;color:#d4d4d8;"><strong>Tarefa:</strong> ${reminder?.text || 'Lembrete de estudo'}</p>
          <p style="margin:4px 0;font-size:14px;color:#d4d4d8;"><strong>Prazo:</strong> ${due}</p>
        </td>
      </tr>
    </table>
    ${btn('Abrir plataforma', appUrl + '/app/dashboard')}
  `;

  await sendEmail(user.email, '📌 Lembrete importante — Ordex', baseTemplate('Lembrete importante', body));
  return { sent: true, provider: 'smtp' };
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPaymentConfirmationEmail,
  sendPasswordResetEmail,
  sendReminderEmail,
};
