#!/usr/bin/env node

/**
 * Script Automático de Setup - Vercel + Gemini + Payment Plans
 * Configura variáveis de ambiente automaticamente no Vercel
 *
 * Uso: node setup-vercel-auto.js --gemini-key YOUR_KEY --project-id YOUR_PROJECT_ID
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Cores para output
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

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Fazer requisição HTTPS
function httpsRequest(method, path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Parsear argumentos
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--gemini-key') {
      config.geminiKey = args[i + 1];
      i++;
    } else if (args[i] === '--project-id') {
      config.projectId = args[i + 1];
      i++;
    } else if (args[i] === '--token') {
      config.vercelToken = args[i + 1];
      i++;
    } else if (args[i] === '--basic-price') {
      config.basicPrice = args[i + 1];
      i++;
    } else if (args[i] === '--premium-price') {
      config.premiumPrice = args[i + 1];
      i++;
    } else if (args[i] === '--medhub-price') {
      config.medhubPrice = args[i + 1];
      i++;
    }
  }

  return config;
}

// Ler .env.local se existir
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  const env = {};

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line) => {
      const match = line.match(/^([^=]+)="?([^"]*)"?/);
      if (match) {
        env[match[1]] = match[2];
      }
    });
  }

  return env;
}

// Main
async function main() {
  log('\n🚀 SETUP AUTOMÁTICO - VERCEL + GEMINI + PLANOS\n', 'bright');

  const args = parseArgs();
  const envFile = loadEnvFile();

  // Validar inputs obrigatórios
  const geminiKey = args.geminiKey || process.env.GOOGLE_GEMINI_API_KEY;
  const vercelToken = args.vercelToken || process.env.VERCEL_TOKEN;
  const projectId = args.projectId || process.env.VERCEL_PROJECT_ID;

  if (!geminiKey) {
    error('GOOGLE_GEMINI_API_KEY é obrigatória!');
    info('Obtenha em: https://ai.google.dev/aistudio');
    process.exit(1);
  }

  if (!vercelToken) {
    error('VERCEL_TOKEN é obrigatória!');
    info('Gere em: https://vercel.com/account/tokens');
    process.exit(1);
  }

  if (!projectId) {
    error('VERCEL_PROJECT_ID é obrigatória!');
    info('Encontre em: https://vercel.com/dashboard/[project-name]/settings');
    process.exit(1);
  }

  // Preços padrão
  const prices = {
    basic: args.basicPrice || process.env.PREMIUM_STANDARD_MONTHLY_PRICE || '50.00',
    premium: args.premiumPrice || process.env.PREMIUM_MONTHLY_PRICE || '49.90',
    medhub: args.medhubPrice || process.env.PREMIUM_MEDHUB_MONTHLY_PRICE || '89.90',
  };

  info(`Configurando projeto: ${projectId}`);
  info(`Ambiente: production\n`);

  // Variáveis a configurar
  const envVars = [
    { name: 'GOOGLE_GEMINI_API_KEY', value: geminiKey, target: ['production'] },
    { name: 'PREMIUM_STANDARD_MONTHLY_PRICE', value: prices.basic, target: ['production'] },
    { name: 'PREMIUM_MONTHLY_PRICE', value: prices.premium, target: ['production'] },
    { name: 'PREMIUM_MEDHUB_MONTHLY_PRICE', value: prices.medhub, target: ['production'] },
  ];

  log('⚙️  Configurando variáveis de ambiente:\n', 'blue');

  let successCount = 0;
  let errorCount = 0;

  for (const envVar of envVars) {
    try {
      info(`Adicionando ${envVar.name}...`);

      const response = await httpsRequest(
        'POST',
        `/v10/projects/${projectId}/env`,
        {
          key: envVar.name,
          value: envVar.value,
          target: envVar.target,
        },
        {
          Authorization: `Bearer ${vercelToken}`,
        }
      );

      if (response.status === 200 || response.status === 201) {
        success(`${envVar.name} configurada`);
        successCount++;
      } else {
        error(`Falha ao configurar ${envVar.name}: ${response.status}`);
        errorCount++;
      }
    } catch (err) {
      error(`Erro ao configurar ${envVar.name}: ${err.message}`);
      errorCount++;
    }
  }

  // Atualizar .env.local também
  log('\n📝 Atualizando .env.local...\n', 'blue');

  try {
    let envContent = '';
    for (const envVar of envVars) {
      envContent += `${envVar.name}="${envVar.value}"\n`;
    }

    // Preservar outras variáveis
    const existingVars = loadEnvFile();
    for (const [key, value] of Object.entries(existingVars)) {
      if (!envVars.some((v) => v.name === key)) {
        envContent += `${key}="${value}"\n`;
      }
    }

    fs.writeFileSync('.env.local', envContent);
    success('.env.local atualizado');
  } catch (err) {
    error(`Falha ao atualizar .env.local: ${err.message}`);
  }

  // Resumo
  log('\n' + '='.repeat(50), 'bright');
  log('\n📊 RESUMO DA CONFIGURAÇÃO\n', 'bright');

  log(`✅ Variáveis configuradas: ${successCount}`, 'green');
  if (errorCount > 0) {
    log(`❌ Variáveis com erro: ${errorCount}`, 'red');
  }

  log('\n💰 PREÇOS DOS PLANOS:', 'bright');
  log(`   • Plano BASIC: R$ ${prices.basic}`);
  log(`   • Plano PREMIUM: R$ ${prices.premium}`);
  log(`   • Plano PREMIUM+ MedHub: R$ ${prices.medhub}`);

  log('\n🔐 SERVIÇOS CONFIGURADOS:', 'bright');
  log('   ✅ Google Gemini AI');
  log('   ✅ Preços de Pagamento Dinâmicos');

  log('\n📌 PRÓXIMOS PASSOS:', 'bright');
  log('   1. Fazer push para GitHub: git push origin master');
  log('   2. Vercel fará deploy automático com as novas variáveis');
  log('   3. Acessar admin em: https://seu-app.vercel.app/app/admin/pricing');

  log('\n✨ Setup concluído com sucesso!\n', 'green');
}

main().catch((err) => {
  error(`Erro fatal: ${err.message}`);
  process.exit(1);
});
