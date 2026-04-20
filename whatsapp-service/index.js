/**
 * Tigas WhatsApp Microservice
 * ─────────────────────────────────────────────────────────────
 * Roda como processo persistente (Railway / Render / VPS).
 * Conecta ao WhatsApp do numero 31971481340 via QR code (uma unica vez).
 * Expoe POST /send para o backend Vercel enviar mensagens.
 *
 * Variaveis de ambiente:
 *   PORT             - porta HTTP (padrao: 3333)
 *   SERVICE_SECRET   - segredo compartilhado com o backend (opcional mas recomendado)
 *   AUTH_DIR         - onde salvar a sessao WA (padrao: ./auth_info)
 */

const express = require('express');
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

// ── Config ────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT || 3333);
const SERVICE_SECRET = process.env.SERVICE_SECRET || '';
const AUTH_DIR = process.env.AUTH_DIR || path.join(__dirname, 'auth_info');
const SENDER_NUMBER = '31971481340';

if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

const logger = pino({ level: 'silent' }); // silencia logs internos do Baileys

// ── Estado global ─────────────────────────────────────────────────────────────

let sock = null;
let isReady = false;
let lastQr = null;
let reconnectTimer = null;

// ── WhatsApp core ─────────────────────────────────────────────────────────────

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    browser: ['Tigas', 'Chrome', '20.0'],
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      lastQr = qr;
      console.log('\n');
      console.log('╔══════════════════════════════════════════════════╗');
      console.log('║  Abra o WhatsApp no celular do numero             ║');
      console.log(`║  ${SENDER_NUMBER}                              ║`);
      console.log('║  Vá em: Dispositivos conectados > Conectar        ║');
      console.log('║  e escaneie o QR code abaixo:                     ║');
      console.log('╚══════════════════════════════════════════════════╝\n');
      qrcode.generate(qr, { small: true });
      console.log('\n(O QR code tambem esta disponivel em GET /qr)\n');
    }

    if (connection === 'open') {
      isReady = true;
      lastQr = null;
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      console.log(`[WA] ✅ Conectado como ${SENDER_NUMBER}. Pronto para enviar.`);
    }

    if (connection === 'close') {
      isReady = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        console.log('[WA] Sessao encerrada (logout). Delete auth_info/ e reinicie para reautenticar.');
      } else {
        const delay = 5000;
        console.log(`[WA] Conexao encerrada (${statusCode}). Reconectando em ${delay / 1000}s...`);
        reconnectTimer = setTimeout(startWhatsApp, delay);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

// ── Express ───────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

function checkSecret(req) {
  if (!SERVICE_SECRET) return true;
  const header = req.headers['x-service-secret'];
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return header === SERVICE_SECRET || bearer === SERVICE_SECRET;
}

// GET /health — verificar status (sem autenticacao)
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    ready: isReady,
    sender: SENDER_NUMBER,
    waitingQr: Boolean(lastQr),
    message: isReady
      ? 'connected'
      : lastQr
        ? 'waiting_qr_scan'
        : 'connecting',
  });
});

// GET /qr — obter QR code atual (para exibir em painel remoto se necessario)
app.get('/qr', (req, res) => {
  if (!checkSecret(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (isReady) return res.json({ qr: null, ready: true, message: 'already_connected' });
  if (!lastQr) return res.json({ qr: null, ready: false, message: 'no_qr_yet_try_again' });
  return res.json({ qr: lastQr, ready: false, message: 'scan_to_connect' });
});

// POST /send — enviar mensagem
app.post('/send', async (req, res) => {
  if (!checkSecret(req)) return res.status(401).json({ error: 'Unauthorized' });

  if (!isReady) {
    return res.status(503).json({
      sent: false,
      error: 'WhatsApp nao conectado',
      hint: lastQr ? 'escaneie o QR code em GET /qr' : 'aguarde reconexao',
    });
  }

  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'Campos obrigatorios: to, message' });
  }

  const digits = String(to).replace(/\D/g, '');
  if (digits.length < 10) {
    return res.status(400).json({ error: 'Numero invalido' });
  }

  const jid = `${digits}@s.whatsapp.net`;

  try {
    await sock.sendMessage(jid, { text: message });
    console.log(`[WA] ✉ Enviado de ${SENDER_NUMBER} para ${digits}`);
    return res.json({ sent: true, from: SENDER_NUMBER, to: digits });
  } catch (err) {
    console.error('[WA] Erro ao enviar:', err.message);
    return res.status(500).json({ sent: false, error: err.message });
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────

startWhatsApp().catch((err) => {
  console.error('[WA] Falha ao iniciar:', err.message);
  process.exit(1);
});

app.listen(PORT, () => {
  console.log(`\n[WA Service] Servico rodando na porta ${PORT}`);
  console.log(`[WA Service] Remetente: ${SENDER_NUMBER}`);
  if (SERVICE_SECRET) {
    console.log('[WA Service] Segredo configurado — use x-service-secret no header');
  } else {
    console.log('[WA Service] ⚠ SERVICE_SECRET nao definido — endpoint aberto');
  }
  console.log('[WA Service] Aguardando conexao WhatsApp...\n');
});
