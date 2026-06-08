#!/usr/bin/env node

/**
 * Setup Helper Interativo - Facilita configuração de chaves
 *
 * Uso: node setup-helper.js
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function validateGeminiKey(key) {
  if (!key) return false;
  return key.match(/^AIza[A-Za-z0-9_-]{35,}$/) || key.length >= 39;
}

async function validateAsaasKey(key) {
  if (!key) return false;
  return key.match(/^\$aas[A-Za-z0-9_-]{25,}$/) || key.length >= 20;
}

async function validateVercelToken(token) {
  if (!token) return false;
  return token.length >= 30;
}

async function checkSetupMethod() {
  log('\n🔧 HELPER DE SETUP - VERCEL + GEMINI + ASAAS\n', 'bright');

  log('Escolha o método de setup:\n', 'blue');
  log('1️⃣  Setup Local (node setup-vercel-full.js)');
  log('2️⃣  GitHub Actions (automatic via CI/CD)');
  log('3️⃣  Mostrar instruções');
  log('4️⃣  Sair\n');

  const choice = await question('Escolha (1-4): ');

  switch (choice) {
    case '1':
      await setupLocal();
      break;
    case '2':
      await setupGitHub();
      break;
    case '3':
      showInstructions();
      rl.close();
      break;
    case '4':
      log('\nAté logo! 👋\n', 'cyan');
      rl.close();
      break;
    default:
      log('❌ Opção inválida\n', 'red');
      await checkSetupMethod();
  }
}

async function setupLocal() {
  log('\n📦 SETUP LOCAL\n', 'bright');
  log('Você pode preencher manualmente ou usar auto-detect.\n', 'cyan');

  let useAuto = false;

  const autoDetect = await question('Deseja usar auto-detect de chaves? (s/n): ');
  if (autoDetect.toLowerCase() === 's' || autoDetect.toLowerCase() === 'sim') {
    useAuto = true;
  }

  let geminiKey = '';
  let asaasKey = '';
  let vercelToken = '';
  let projectId = '';

  if (useAuto) {
    log('\n🔍 Detectando chaves automaticamente...\n', 'cyan');

    // Tentar detectar do .env.local
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line) => {
        const match = line.match(/^([^=]+)=["']?([^"']*)/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();

          if (key === 'GOOGLE_GEMINI_API_KEY') geminiKey = value;
          if (key === 'ASAAS_API_KEY') asaasKey = value;
          if (key === 'VERCEL_TOKEN') vercelToken = value;
          if (key === 'VERCEL_PROJECT_ID') projectId = value;
        }
      });
    }

    // Tentar detectar de variáveis de ambiente
    geminiKey = process.env.GOOGLE_GEMINI_API_KEY || geminiKey;
    asaasKey = process.env.ASAAS_API_KEY || asaasKey;
    vercelToken = process.env.VERCEL_TOKEN || vercelToken;
    projectId = process.env.VERCEL_PROJECT_ID || projectId;

    if (geminiKey) log('✅ Gemini Key detectada', 'green');
    if (asaasKey) log('✅ Asaas Key detectada', 'green');
    if (vercelToken) log('✅ Vercel Token detectado', 'green');
    if (projectId) log('✅ Vercel Project ID detectado', 'green');
  }

  // Pedir inputs faltantes
  log('\n📋 Preencha os dados:\n', 'blue');

  if (!geminiKey) {
    log('📌 Google Gemini API Key: https://ai.google.dev/aistudio', 'yellow');
    while (!geminiKey || !(await validateGeminiKey(geminiKey))) {
      geminiKey = await question('Cole sua GOOGLE_GEMINI_API_KEY: ');
      if (!(await validateGeminiKey(geminiKey))) {
        log('❌ Formato inválido (deve começar com AIza)', 'red');
        geminiKey = '';
      }
    }
  }

  const useAsaas = await question('\nConfigurar Asaas (s/n)?: ');
  if (useAsaas.toLowerCase() === 's' || useAsaas.toLowerCase() === 'sim') {
    if (!asaasKey) {
      log('📌 Asaas API Key: https://asaas.com/dashboard', 'yellow');
      asaasKey = await question('Cole sua ASAAS_API_KEY (ou deixe vazio): ');
    }
  }

  if (!vercelToken) {
    log('📌 Vercel Token: https://vercel.com/account/tokens', 'yellow');
    while (!vercelToken || !(await validateVercelToken(vercelToken))) {
      vercelToken = await question('Cole seu VERCEL_TOKEN: ');
      if (!(await validateVercelToken(vercelToken))) {
        log('❌ Token inválido (muito curto)', 'red');
        vercelToken = '';
      }
    }
  }

  if (!projectId) {
    log('📌 Project ID: https://vercel.com/dashboard/[projeto]/settings', 'yellow');
    projectId = await question('Cole seu VERCEL_PROJECT_ID: ');
  }

  // Perguntar preços
  log('\n💰 Preços dos planos (pressione Enter para manter padrão):\n', 'blue');

  const basicPrice = await question('Preço BASIC (padrão 50.00): ');
  const premiumPrice = await question('Preço PREMIUM (padrão 49.90): ');
  const medhubPrice = await question('Preço PREMIUM+ MedHub (padrão 89.90): ');

  // Confirmar e executar
  log('\n📊 Resumo:\n', 'bright');
  log(`✅ Gemini API Key: ${geminiKey.slice(0, 10)}...`);
  if (asaasKey) log(`✅ Asaas API Key: ${asaasKey.slice(0, 10)}...`);
  log(`✅ Vercel Token: ${vercelToken.slice(0, 10)}...`);
  log(`✅ Project ID: ${projectId}`);
  log(`✅ Preço BASIC: R$ ${basicPrice || '50.00'}`);
  log(`✅ Preço PREMIUM: R$ ${premiumPrice || '49.90'}`);
  log(`✅ Preço PREMIUM+ MedHub: R$ ${medhubPrice || '89.90'}`);

  const confirm = await question('\n✨ Aplicar configuração? (s/n): ');
  if (confirm.toLowerCase() !== 's' && confirm.toLowerCase() !== 'sim') {
    log('Cancelado.', 'yellow');
    rl.close();
    return;
  }

  log('\n⚙️  Executando setup...\n', 'cyan');

  try {
    let cmd = 'node setup-vercel-full.js';
    cmd += ` --gemini-key "${geminiKey}"`;
    if (asaasKey) cmd += ` --asaas-key "${asaasKey}"`;
    cmd += ` --token "${vercelToken}"`;
    cmd += ` --project-id "${projectId}"`;
    if (basicPrice) cmd += ` --basic-price "${basicPrice}"`;
    if (premiumPrice) cmd += ` --premium-price "${premiumPrice}"`;
    if (medhubPrice) cmd += ` --medhub-price "${medhubPrice}"`;

    const { stdout, stderr } = await execAsync(cmd);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    log('\n✅ Setup concluído!\n', 'green');
  } catch (error) {
    log(`\n❌ Erro: ${error.message}\n`, 'red');
  }

  rl.close();
}

async function setupGitHub() {
  log('\n🤖 SETUP VIA GITHUB ACTIONS\n', 'bright');

  log('Para usar GitHub Actions, você precisa configurar Repository Secrets:\n', 'cyan');
  log('1. Vá para: Settings > Secrets and variables > Actions\n');
  log('2. Clique em "New repository secret"\n');
  log('3. Adicione os seguintes secrets:\n', 'blue');

  const secrets = [
    { name: 'GOOGLE_GEMINI_API_KEY', description: 'Google Gemini API Key' },
    { name: 'ASAAS_API_KEY', description: 'Asaas Payment API Key (opcional)' },
    { name: 'VERCEL_TOKEN', description: 'Vercel API Token' },
    { name: 'VERCEL_PROJECT_ID', description: 'Vercel Project ID' },
    { name: 'PREMIUM_STANDARD_MONTHLY_PRICE', description: 'Preço BASIC (opcional, padrão: 50.00)' },
    { name: 'PREMIUM_MONTHLY_PRICE', description: 'Preço PREMIUM (opcional, padrão: 49.90)' },
    { name: 'PREMIUM_MEDHUB_MONTHLY_PRICE', description: 'Preço PREMIUM+ (opcional, padrão: 89.90)' },
  ];

  secrets.forEach((secret, idx) => {
    log(`  ${idx + 1}. ${secret.name}`);
    log(`     → ${secret.description}\n`);
  });

  log('Após configurar os secrets:\n', 'cyan');
  log('1. O workflow será acionado ao fazer push para master\n');
  log('2. Vá para Actions > Auto Setup para acompanhar\n');
  log('3. As variáveis serão configuradas automaticamente no Vercel\n');

  log('URLs úteis:\n', 'blue');
  log('  🔗 Secrets: https://github.com/[seu-repo]/settings/secrets/actions');
  log('  🔗 Actions: https://github.com/[seu-repo]/actions');
  log('  🔗 Vercel: https://vercel.com/dashboard\n');

  rl.close();
}

function showInstructions() {
  log('\n📖 INSTRUÇÕES DETALHADAS\n', 'bright');

  log('\n🔑 CHAVES NECESSÁRIAS:\n', 'blue');
  log('1. Google Gemini API Key');
  log('   • Obtenha em: https://ai.google.dev/aistudio');
  log('   • Formato: Começa com AIza, ~40+ caracteres');
  log('   • Variável: GOOGLE_GEMINI_API_KEY\n');

  log('2. Asaas Payment API Key (Opcional)');
  log('   • Obtenha em: https://asaas.com/dashboard');
  log('   • Formato: Começa com $aas, ~30 caracteres');
  log('   • Variável: ASAAS_API_KEY\n');

  log('3. Vercel Token');
  log('   • Gere em: https://vercel.com/account/tokens');
  log('   • Escopos: read, write');
  log('   • Variável: VERCEL_TOKEN\n');

  log('4. Vercel Project ID');
  log('   • Encontre em: Settings > General > Project ID');
  log('   • Formato: Alfanumérico único');
  log('   • Variável: VERCEL_PROJECT_ID\n');

  log('\n⚡ MÉTODOS DE SETUP:\n', 'blue');
  log('1. Local: node setup-vercel-full.js --auto');
  log('2. GitHub Actions: Configure secrets e faça git push\n');

  log('\n📚 Mais informações:\n', 'cyan');
  log('Leia: SETUP_AUTO_COMPLETE.md\n');
}

checkSetupMethod();
