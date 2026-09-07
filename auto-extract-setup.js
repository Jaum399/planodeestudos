#!/usr/bin/env node

/**
 * Auto-Extrator de Chaves - Busca automaticamente todas as chaves no código
 * Executa setup sem necessidade de input manual
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function extractEnvVars() {
  const env = {};
  const envFiles = ['.env.local', '.env', '.env.verified', '.env.prod.current', '.env.updated'];

  log('\n🔍 Buscando chaves em arquivos .env...\n', 'cyan');

  for (const file of envFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line) => {
        const match = line.match(/^([^=#]+)=["']?([^"']*)/);
        if (match && match[1]) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (value && !env[key]) {
            env[key] = value;
          }
        }
      });

      log(`✅ Lido: ${file}`);
    }
  }

  return env;
}

function extractFromProcess() {
  const keys = {};

  log('\n🔍 Buscando em variáveis de ambiente do sistema...\n', 'cyan');

  if (process.env.GOOGLE_GEMINI_API_KEY) {
    keys.geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
    log('✅ GOOGLE_GEMINI_API_KEY encontrada');
  }

  if (process.env.ASAAS_API_KEY) {
    keys.asaasKey = process.env.ASAAS_API_KEY;
    log('✅ ASAAS_API_KEY encontrada');
  }

  if (process.env.VERCEL_TOKEN) {
    keys.vercelToken = process.env.VERCEL_TOKEN;
    log('✅ VERCEL_TOKEN encontrado');
  }

  if (process.env.VERCEL_PROJECT_ID) {
    keys.projectId = process.env.VERCEL_PROJECT_ID;
    log('✅ VERCEL_PROJECT_ID encontrado');
  }

  return keys;
}

function main() {
  log('\n🚀 AUTO-EXTRATOR DE CHAVES\n', 'bright');
  log('Buscando automaticamente todas as chaves configuradas...\n', 'blue');

  // 1. Extrair de .env
  const envVars = extractEnvVars();

  // 2. Extrair do processo
  const processVars = extractFromProcess();

  // 3. Montar comando
  const config = {
    asaasKey: processVars.asaasKey || envVars.ASAAS_API_KEY,
    geminiKey: processVars.geminiKey || envVars.GOOGLE_GEMINI_API_KEY,
    vercelToken: processVars.vercelToken || envVars.VERCEL_TOKEN,
    projectId: processVars.projectId || envVars.VERCEL_PROJECT_ID,
    basicPrice: envVars.PREMIUM_STANDARD_MONTHLY_PRICE || '50.00',
    premiumPrice: envVars.PREMIUM_MONTHLY_PRICE || '49.90',
    medhubPrice: envVars.PREMIUM_MEDHUB_MONTHLY_PRICE || '89.90',
  };

  log('\n' + '='.repeat(60), 'bright');
  log('\n📊 CHAVES ENCONTRADAS:\n', 'bright');

  if (config.asaasKey) {
    log(`✅ ASAAS_API_KEY: ${config.asaasKey.slice(0, 20)}...`, 'green');
  } else {
    log('❌ ASAAS_API_KEY: Não encontrada (será solicitada)', 'yellow');
  }

  if (config.geminiKey) {
    log(`✅ GOOGLE_GEMINI_API_KEY: ${config.geminiKey.slice(0, 20)}...`, 'green');
  } else {
    log('❌ GOOGLE_GEMINI_API_KEY: Não encontrada (será solicitada)', 'red');
  }

  if (config.vercelToken) {
    log(`✅ VERCEL_TOKEN: ${config.vercelToken.slice(0, 20)}...`, 'green');
  } else {
    log('❌ VERCEL_TOKEN: Não encontrada (será solicitada)', 'red');
  }

  if (config.projectId) {
    log(`✅ VERCEL_PROJECT_ID: ${config.projectId}`, 'green');
  } else {
    log('❌ VERCEL_PROJECT_ID: Não encontrada (será solicitada)', 'red');
  }

  log('\n💰 PREÇOS:\n', 'bright');
  log(`   • BASIC: R$ ${config.basicPrice}`);
  log(`   • PREMIUM: R$ ${config.premiumPrice}`);
  log(`   • PREMIUM+ MedHub: R$ ${config.medhubPrice}`);

  // 4. Validar se tem tudo
  if (!config.geminiKey || !config.vercelToken || !config.projectId) {
    log('\n⚠️  CHAVES OBRIGATÓRIAS FALTANDO!\n', 'red');

    if (!config.geminiKey) {
      log('   Adicione GOOGLE_GEMINI_API_KEY em:');
      log('   • .env.local');
      log('   • Variável de ambiente: export GOOGLE_GEMINI_API_KEY="..."');
    }

    if (!config.vercelToken) {
      log('   Adicione VERCEL_TOKEN em:');
      log('   • Variável de ambiente: export VERCEL_TOKEN="..."');
    }

    if (!config.projectId) {
      log('   Adicione VERCEL_PROJECT_ID em:');
      log('   • Variável de ambiente: export VERCEL_PROJECT_ID="..."\n');
    }

    process.exit(1);
  }

  // 5. Executar setup
  log('\n' + '='.repeat(60), 'bright');
  log('\n⚙️  Executando setup automático...\n', 'cyan');

  let cmd = 'node setup-vercel-full.js';
  cmd += ` --gemini-key "${config.geminiKey}"`;
  if (config.asaasKey) cmd += ` --asaas-key "${config.asaasKey}"`;
  cmd += ` --token "${config.vercelToken}"`;
  cmd += ` --project-id "${config.projectId}"`;
  cmd += ` --basic-price "${config.basicPrice}"`;
  cmd += ` --premium-price "${config.premiumPrice}"`;
  cmd += ` --medhub-price "${config.medhubPrice}"`;
  cmd += ' --ci';

  try {
    log('Executando:\n', 'blue');
    log(`${cmd.substring(0, 100)}...\n`);

    const output = execSync(cmd, { stdio: 'inherit', encoding: 'utf8' });
    log('\n✅ Setup completado com sucesso!\n', 'green');
  } catch (error) {
    log(`\n❌ Erro ao executar setup: ${error.message}\n`, 'red');
    process.exit(1);
  }
}

main();
