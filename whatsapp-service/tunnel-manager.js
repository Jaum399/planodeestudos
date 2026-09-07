/**
 * Tigas — Tunnel Manager
 * Inicia o cloudflared, captura a URL publica gerada e atualiza
 * automaticamente a variavel WHATSAPP_BAILEYS_URL na Vercel via CLI local
 * (nao depende de VERCEL_TOKEN — usa a sessao autenticada do npx vercel).
 */

const { spawn, spawnSync } = require('child_process');
const path = require('path');

const VERCEL_PROJECT = process.env.VERCEL_PROJECT || 'app-tigas-entregas';
const PROJECT_ROOT = process.env.PROJECT_ROOT || path.join(__dirname, '..');

// Ambiente limpo para CLI da Vercel: remove tokens expirados para que a CLI
// use a autenticacao local (~/.vercel/) em vez do VERCEL_TOKEN do .env
function cliEnv() {
  const env = { ...process.env };
  delete env.VERCEL_TOKEN;
  delete env.VERCEL_ORG_ID;
  delete env.VERCEL_PROJECT_ID;
  return env;
}

function runVercelRedeploy() {
  console.log('[Tunnel] Iniciando redeploy na Vercel para aplicar nova URL...');

  const deployProc = spawn(
    'npx',
    ['vercel', '--prod', '--yes'],
    {
      cwd: PROJECT_ROOT,
      shell: true,
      env: cliEnv(),
    }
  );

  deployProc.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Tunnel][Deploy] ${msg}`);
  });

  deployProc.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.error(`[Tunnel][Deploy] ${msg}`);
  });

  deployProc.on('exit', (code) => {
    if (code === 0) {
      console.log('[Tunnel] ✅ Redeploy Vercel concluido com sucesso.');
    } else {
      console.error(`[Tunnel] ❌ Redeploy Vercel falhou com codigo ${code}.`);
    }
  });
}

async function updateVercelEnv(url) {
  console.log(`[Tunnel] Atualizando WHATSAPP_BAILEYS_URL para: ${url}`);

  // Remove env existente via CLI (ignora erro se nao existir)
  const rmResult = spawnSync(
    'npx',
    ['vercel', 'env', 'rm', 'WHATSAPP_BAILEYS_URL', 'production', '--yes'],
    { cwd: PROJECT_ROOT, shell: true, encoding: 'utf8', timeout: 30000, env: cliEnv() }
  );
  if (rmResult.status === 0) {
    console.log('[Tunnel] Env antiga removida.');
  } else {
    // Pode nao existir ainda — nao e erro fatal
    console.warn('[Tunnel] remove env (ignorado):', (rmResult.stderr || '').trim().split('\n')[0]);
  }

  // Adiciona nova URL via CLI com --value
  const addResult = spawnSync(
    'npx',
    ['vercel', 'env', 'add', 'WHATSAPP_BAILEYS_URL', 'production', '--value', url, '--yes'],
    { cwd: PROJECT_ROOT, shell: true, encoding: 'utf8', timeout: 30000, env: cliEnv() }
  );

  if (addResult.status !== 0) {
    console.error('[Tunnel] ❌ Erro ao adicionar WHATSAPP_BAILEYS_URL:', (addResult.stderr || addResult.stdout || '').trim());
    console.log(`[Tunnel] ⚠️  URL atual do tunel: ${url}`);
    console.log('[Tunnel] Para atualizar manualmente: npx vercel env add WHATSAPP_BAILEYS_URL production --value "' + url + '" --yes');
    return;
  }

  console.log('[Tunnel] ✅ WHATSAPP_BAILEYS_URL atualizada via CLI.');
  runVercelRedeploy();
}

function startTunnel() {
  const cloudflaredBin = path.join(
    __dirname, 'node_modules', '.bin',
    process.platform === 'win32' ? 'cloudflared.cmd' : 'cloudflared'
  );

  // Fallback: cloudflared global
  const bin = require('fs').existsSync(cloudflaredBin) ? cloudflaredBin : 'cloudflared';

  console.log('[Tunnel] Iniciando tunel Cloudflare na porta 3333...');

  const proc = spawn('npx', ['cloudflared', 'tunnel', '--url', 'http://localhost:3333'], {
    shell: true,
    env: { ...process.env },  // cloudflared nao usa VERCEL_TOKEN, pode manter
  });

  let urlFound = false;

  proc.stderr.on('data', (data) => {
    const line = data.toString();
    if (!urlFound) {
      const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        urlFound = true;
        const tunnelUrl = match[0];
        console.log(`\n[Tunnel] ✅ URL publica: ${tunnelUrl}\n`);
        updateVercelEnv(tunnelUrl);
      }
    }
  });

  proc.stdout.on('data', (data) => {
    const line = data.toString();
    if (!urlFound) {
      const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        urlFound = true;
        const tunnelUrl = match[0];
        console.log(`\n[Tunnel] ✅ URL publica: ${tunnelUrl}\n`);
        updateVercelEnv(tunnelUrl);
      }
    }
  });

  proc.on('exit', (code) => {
    console.log(`[Tunnel] Processo encerrado (${code}). Reiniciando em 5s...`);
    setTimeout(startTunnel, 5000);
  });
}

startTunnel();
