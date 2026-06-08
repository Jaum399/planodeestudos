#!/usr/bin/env node

/**
 * Setup Automático Completo - Vercel + Gemini + Asaas + Planos
 * Configura todas as variáveis de ambiente automaticamente
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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

// Fazer requisição HTTPS para Vercel API
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
    if (args[i] === '--gemini-key' && i + 1 < args.length) {
      config.geminiKey = args[i + 1];
      i++;
    } else if (args[i] === '--asaas-key' && i + 1 < args.length) {
      config.asaasKey = args[i + 1];
      i++;
    } else if (args[i] === '--payment-key' && i + 1 < args.length) {
      config.asaasKey = args[i + 1];
      i++;
    } else if (args[i] === '--project-id' && i + 1 < args.length) {
      config.projectId = args[i + 1];
      i++;
    } else if (args[i] === '--token' && i + 1 < args.length) {
      config.vercelToken = args[i + 1];
      i++;
    } else if (args[i] === '--basic-price' && i + 1 < args.length) {
      config.basicPrice = args[i + 1];
      i++;
    } else if (args[i] === '--premium-price' && i + 1 < args.length) {
      config.premiumPrice = args[i + 1];
      i++;
    } else if (args[i] === '--medhub-price' && i + 1 < args.length) {
      config.medhubPrice = args[i + 1];
      i++;
    } else if (args[i] === '--auto') {
      config.autoDetect = true;
    } else if (args[i] === '--ci') {
      config.ciMode = true;
    }
  }

  return config;
}

// Carregar arquivo .env
function loadEnvFile(filePath = '.env.local') {
  const env = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && match[1] && match[1].trim()) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    });
  }
  return env;
}

// Salvar arquivo .env
function saveEnvFile(env, filePath = '.env.local') {
  let content = '';
  for (const [key, value] of Object.entries(env)) {
    content += `${key}="${value}"\n`;
  }
  fs.writeFileSync(filePath, content);
}

// Validar chaves
function validateKeys(keys) {
  const errors = [];

  if (keys.gemini) {
    if (!keys.gemini.match(/^[A-Za-z0-9_-]{39,}$/) && !keys.gemini.startsWith('AIza')) {
      errors.push('Chave Gemini tem formato inválido');
    }
  }

  if (keys.asaas) {
    if (!keys.asaas.match(/^[A-Za-z0-9_-]{20,}$/) && !keys.asaas.startsWith('$aas') && !keys.asaas.startsWith('$aact')) {
      warning('Chave Asaas pode ter formato inválido (prosseguindo mesmo assim)');
    }
  }

  return errors;
}

// Detectar chaves automaticamente
async function autoDetectKeys() {
  const keys = {};
  const env = loadEnvFile();

  info('🔍 Detectando chaves automaticamente...\n');

  // Verificar variáveis de ambiente do sistema
  if (process.env.GOOGLE_GEMINI_API_KEY) {
    keys.gemini = process.env.GOOGLE_GEMINI_API_KEY;
    success('Gemini API Key detectada (env var)');
  } else if (env.GOOGLE_GEMINI_API_KEY) {
    keys.gemini = env.GOOGLE_GEMINI_API_KEY;
    success('Gemini API Key detectada (.env)');
  }

  if (process.env.ASAAS_API_KEY) {
    keys.asaas = process.env.ASAAS_API_KEY;
    success('Asaas API Key detectada (env var)');
  } else if (env.ASAAS_API_KEY) {
    keys.asaas = env.ASAAS_API_KEY;
    success('Asaas API Key detectada (.env)');
  }

  if (process.env.VERCEL_TOKEN) {
    keys.vercelToken = process.env.VERCEL_TOKEN;
    success('Vercel Token detectado (env var)');
  }

  if (process.env.VERCEL_PROJECT_ID) {
    keys.projectId = process.env.VERCEL_PROJECT_ID;
    success('Vercel Project ID detectado (env var)');
  }

  return keys;
}

// Main
async function main() {
  log('\n🚀 SETUP AUTOMÁTICO COMPLETO - VERCEL + GEMINI + ASAAS\n', 'bright');

  const args = parseArgs();
  let config = {
    geminiKey: args.geminiKey,
    asaasKey: args.asaasKey,
    projectId: args.projectId,
    vercelToken: args.vercelToken,
    basicPrice: args.basicPrice || '50.00',
    premiumPrice: args.premiumPrice || '49.90',
    medhubPrice: args.medhubPrice || '89.90',
  };

  // Auto-detect se solicitado
  if (args.autoDetect || args.ciMode) {
    const detected = await autoDetectKeys();
    config.geminiKey = detected.gemini || config.geminiKey;
    config.asaasKey = detected.asaas || config.asaasKey;
    config.projectId = detected.projectId || config.projectId;
    config.vercelToken = detected.vercelToken || config.vercelToken;
  }

  // Validar chaves obrigatórias
  if (!config.geminiKey) {
    error('GOOGLE_GEMINI_API_KEY é obrigatória!');
    info('Obtenha em: https://ai.google.dev/aistudio');
    if (!args.ciMode) process.exit(1);
    return;
  }

  if (!config.vercelToken) {
    error('VERCEL_TOKEN é obrigatória!');
    info('Gere em: https://vercel.com/account/tokens');
    if (!args.ciMode) process.exit(1);
    return;
  }

  if (!config.projectId) {
    error('VERCEL_PROJECT_ID é obrigatória!');
    info('Encontre em: https://vercel.com/dashboard/[project-name]/settings');
    if (!args.ciMode) process.exit(1);
    return;
  }

  // Validar formato das chaves
  const validationErrors = validateKeys({
    gemini: config.geminiKey,
    asaas: config.asaasKey,
  });

  if (validationErrors.length > 0) {
    validationErrors.forEach((err) => error(err));
    if (!args.ciMode) process.exit(1);
  }

  info(`Configurando projeto: ${config.projectId}`);
  info(`Ambiente: production\n`);

  // Variáveis a configurar
  const envVars = [
    { name: 'GOOGLE_GEMINI_API_KEY', value: config.geminiKey, target: ['production'], label: 'Google Gemini API' },
    ...(config.asaasKey ? [{ name: 'ASAAS_API_KEY', value: config.asaasKey, target: ['production'], label: 'Asaas Payment API' }] : []),
    { name: 'PREMIUM_STANDARD_MONTHLY_PRICE', value: config.basicPrice, target: ['production'], label: 'Preço Plano BASIC' },
    { name: 'PREMIUM_MONTHLY_PRICE', value: config.premiumPrice, target: ['production'], label: 'Preço Plano PREMIUM' },
    { name: 'PREMIUM_MEDHUB_MONTHLY_PRICE', value: config.medhubPrice, target: ['production'], label: 'Preço Plano PREMIUM+ MedHub' },
  ];

  log('⚙️  Configurando variáveis de ambiente:\n', 'blue');

  let successCount = 0;
  let errorCount = 0;

  for (const envVar of envVars) {
    try {
      info(`Adicionando ${envVar.label}...`);

      const response = await httpsRequest(
        'POST',
        `/v10/projects/${config.projectId}/env`,
        {
          key: envVar.name,
          value: envVar.value,
          target: envVar.target,
        },
        {
          Authorization: `Bearer ${config.vercelToken}`,
        }
      );

      if (response.status === 200 || response.status === 201) {
        success(`${envVar.label} configurada`);
        successCount++;
      } else {
        error(`Falha ao configurar ${envVar.label}: ${response.status}`);
        if (response.body && response.body.error) {
          console.error(`  Detalhes: ${response.body.error.message || response.body.error}`);
        }
        errorCount++;
      }
    } catch (err) {
      error(`Erro ao configurar ${envVar.label}: ${err.message}`);
      errorCount++;
    }
  }

  // Atualizar .env.local
  log('\n📝 Atualizando .env.local...\n', 'blue');

  try {
    const existingEnv = loadEnvFile();
    const newEnv = { ...existingEnv };

    for (const envVar of envVars) {
      newEnv[envVar.name] = envVar.value;
    }

    saveEnvFile(newEnv);
    success('.env.local atualizado');
  } catch (err) {
    error(`Falha ao atualizar .env.local: ${err.message}`);
  }

  // Resumo
  log('\n' + '='.repeat(60), 'bright');
  log('\n📊 RESUMO DA CONFIGURAÇÃO\n', 'bright');

  log(`✅ Variáveis configuradas: ${successCount}`, 'green');
  if (errorCount > 0) {
    log(`❌ Variáveis com erro: ${errorCount}`, 'red');
  }

  log('\n💰 PREÇOS DOS PLANOS:', 'bright');
  log(`   • Plano BASIC: R$ ${config.basicPrice}`);
  log(`   • Plano PREMIUM: R$ ${config.premiumPrice}`);
  log(`   • Plano PREMIUM+ MedHub: R$ ${config.medhubPrice}`);

  log('\n🔐 SERVIÇOS CONFIGURADOS:', 'bright');
  log('   ✅ Google Gemini AI');
  if (config.asaasKey) {
    log('   ✅ Asaas Payment Gateway');
  } else {
    log('   ⚠️  Asaas Payment Gateway (não configurado)');
  }
  log('   ✅ Preços de Pagamento Dinâmicos');

  log('\n📌 PRÓXIMOS PASSOS:', 'bright');
  log('   1. Verificar Vercel Dashboard: https://vercel.com/dashboard');
  log('   2. git add . && git commit -m "chore: configure env vars"');
  log('   3. git push origin master');
  log('   4. Vercel fará deploy automático');
  log('   5. Acessar admin: https://seu-app.vercel.app/app/admin/pricing');

  log('\n✨ Setup concluído com sucesso!\n', 'green');

  // Em CI mode, sair com sucesso
  if (args.ciMode || (successCount > 0 && errorCount === 0)) {
    process.exit(0);
  } else if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  error(`Erro fatal: ${err.message}`);
  process.exit(1);
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

// Fazer requisição HTTPS para Vercel API
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
    } else if (args[i] === '--asaas-key') {
      config.asaasKey = args[i + 1];
      i++;
    } else if (args[i] === '--payment-key') {
      config.asaasKey = args[i + 1];
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
    } else if (args[i] === '--auto') {
      config.autoDetect = true;
    } else if (args[i] === '--interactive') {
      config.interactive = true;
    } else if (args[i] === '--ci') {
      config.ciMode = true;
    }
  }

  return config;
}

// Carregar arquivo .env
function loadEnvFile(filePath = '.env.local') {
  const env = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && match[1] && match[1].trim()) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    });
  }
  return env;
}

// Salvar arquivo .env
function saveEnvFile(env, filePath = '.env.local') {
  let content = '';
  for (const [key, value] of Object.entries(env)) {
    content += `${key}="${value}"\n`;
  }
  fs.writeFileSync(filePath, content);
}

// Validar chaves
function validateKeys(keys) {
  const errors = [];

  if (keys.gemini) {
    if (!keys.gemini.match(/^[A-Za-z0-9_-]{39,}$/) && !keys.gemini.startsWith('AIza')) {
      errors.push('Chave Gemini tem formato inválido');
    }
  }

  if (keys.asaas) {
    if (!keys.asaas.match(/^[A-Za-z0-9_-]{20,}$/) && !keys.asaas.startsWith('$aas')) {
      warning('Chave Asaas pode ter formato inválido (prosseguindo mesmo assim)');
    }
  }

  return errors;
}

// Detectar chaves automaticamente
async function autoDetectKeys() {
  const keys = {};
  const env = loadEnvFile();

  info('🔍 Detectando chaves automaticamente...\n');

  // Verificar variáveis de ambiente do sistema
  if (process.env.GOOGLE_GEMINI_API_KEY) {
    keys.gemini = process.env.GOOGLE_GEMINI_API_KEY;
    info('✓ Gemini API Key detectada (variável de ambiente)');
  } else if (env.GOOGLE_GEMINI_API_KEY) {
    keys.gemini = env.GOOGLE_GEMINI_API_KEY;
    info('✓ Gemini API Key detectada (.env.local)');
  }

  if (process.env.ASAAS_API_KEY) {
    keys.asaas = process.env.ASAAS_API_KEY;
    info('✓ Asaas API Key detectada (variável de ambiente)');
  } else if (env.ASAAS_API_KEY) {
    keys.asaas = env.ASAAS_API_KEY;
    info('✓ Asaas API Key detectada (.env.local)');
  }

  if (process.env.VERCEL_TOKEN) {
    keys.vercelToken = process.env.VERCEL_TOKEN;
    info('✓ Vercel Token detectado (variável de ambiente)');
  }

  if (process.env.VERCEL_PROJECT_ID) {
    keys.projectId = process.env.VERCEL_PROJECT_ID;
    info('✓ Vercel Project ID detectado (variável de ambiente)');
  }

  return keys;
}

// Main
async function main() {
  log('\n🚀 SETUP AUTOMÁTICO COMPLETO - VERCEL + GEMINI + ASAAS\n', 'bright');

  const args = parseArgs();
  let config = {
    geminiKey: args.geminiKey,
    asaasKey: args.asaasKey,
    projectId: args.projectId,
    vercelToken: args.vercelToken,
    basicPrice: args.basicPrice || '50.00',
    premiumPrice: args.premiumPrice || '49.90',
    medhubPrice: args.medhubPrice || '89.90',
  };

  // Auto-detect se solicitado
  if (args.autoDetect) {
    const detected = await autoDetectKeys();
    config.geminiKey = detected.gemini || config.geminiKey;
    config.asaasKey = detected.asaas || config.asaasKey;
    config.projectId = detected.projectId || config.projectId;
    config.vercelToken = detected.vercelToken || config.vercelToken;
  }

  // Validar chaves obrigatórias
  if (!config.geminiKey) {
    error('GOOGLE_GEMINI_API_KEY é obrigatória!');
    info('Obtenha em: https://ai.google.dev/aistudio');
    if (!args.ciMode) process.exit(1);
    return;
  }

  if (!config.vercelToken) {
    error('VERCEL_TOKEN é obrigatória!');
    info('Gere em: https://vercel.com/account/tokens');
    if (!args.ciMode) process.exit(1);
    return;
  }

  if (!config.projectId) {
    error('VERCEL_PROJECT_ID é obrigatória!');
    info('Encontre em: https://vercel.com/dashboard/[project-name]/settings');
    if (!args.ciMode) process.exit(1);
    return;
  }

  // Validar formato das chaves
  const validationErrors = validateKeys({
    gemini: config.geminiKey,
    asaas: config.asaasKey,
  });

  if (validationErrors.length > 0) {
    validationErrors.forEach((err) => error(err));
    if (!args.ciMode) process.exit(1);
  }

  info(`Configurando projeto: ${config.projectId}`);
  info(`Ambiente: production\n`);

  // Variáveis a configurar
  const envVars = [
    { name: 'GOOGLE_GEMINI_API_KEY', value: config.geminiKey, target: ['production'], label: 'Google Gemini API' },
    ...(config.asaasKey ? [{ name: 'ASAAS_API_KEY', value: config.asaasKey, target: ['production'], label: 'Asaas Payment API' }] : []),
    { name: 'PREMIUM_STANDARD_MONTHLY_PRICE', value: config.basicPrice, target: ['production'], label: 'Preço Plano BASIC' },
    { name: 'PREMIUM_MONTHLY_PRICE', value: config.premiumPrice, target: ['production'], label: 'Preço Plano PREMIUM' },
    { name: 'PREMIUM_MEDHUB_MONTHLY_PRICE', value: config.medhubPrice, target: ['production'], label: 'Preço Plano PREMIUM+ MedHub' },
  ];

  log('⚙️  Configurando variáveis de ambiente:\n', 'blue');

  let successCount = 0;
  let errorCount = 0;

  for (const envVar of envVars) {
    try {
      info(`Adicionando ${envVar.label}...`);

      const response = await httpsRequest(
        'POST',
        `/v10/projects/${config.projectId}/env`,
        {
          key: envVar.name,
          value: envVar.value,
          target: envVar.target,
        },
        {
          Authorization: `Bearer ${config.vercelToken}`,
        }
      );

      if (response.status === 200 || response.status === 201) {
        success(`${envVar.label} configurada`);
        successCount++;
      } else {
        error(`Falha ao configurar ${envVar.label}: ${response.status}`);
        if (response.body && response.body.error) {
          console.error(`  Detalhes: ${response.body.error.message || response.body.error}`);
        }
        errorCount++;
      }
    } catch (err) {
      error(`Erro ao configurar ${envVar.label}: ${err.message}`);
      errorCount++;
    }
  }

  // Atualizar .env.local
  log('\n📝 Atualizando .env.local...\n', 'blue');

  try {
    const existingEnv = loadEnvFile();
    const newEnv = { ...existingEnv };

    for (const envVar of envVars) {
      newEnv[envVar.name] = envVar.value;
    }

    saveEnvFile(newEnv);
    success('.env.local atualizado');
  } catch (err) {
    error(`Falha ao atualizar .env.local: ${err.message}`);
  }

  // Resumo
  log('\n' + '='.repeat(60), 'bright');
  log('\n📊 RESUMO DA CONFIGURAÇÃO\n', 'bright');

  log(`✅ Variáveis configuradas: ${successCount}`, 'green');
  if (errorCount > 0) {
    log(`❌ Variáveis com erro: ${errorCount}`, 'red');
  }

  log('\n💰 PREÇOS DOS PLANOS:', 'bright');
  log(`   • Plano BASIC: R$ ${config.basicPrice}`);
  log(`   • Plano PREMIUM: R$ ${config.premiumPrice}`);
  log(`   • Plano PREMIUM+ MedHub: R$ ${config.medhubPrice}`);

  log('\n🔐 SERVIÇOS CONFIGURADOS:', 'bright');
  log('   ✅ Google Gemini AI');
  if (config.asaasKey) {
    log('   ✅ Asaas Payment Gateway');
  } else {
    log('   ⚠️  Asaas Payment Gateway (não configurado)');
  }
  log('   ✅ Preços de Pagamento Dinâmicos');

  log('\n📌 PRÓXIMOS PASSOS:', 'bright');
  log('   1. Verificar Vercel Dashboard: https://vercel.com/dashboard');
  log('   2. git add . && git commit -m "chore: configure env vars"');
  log('   3. git push origin master');
  log('   4. Vercel fará deploy automático');
  log('   5. Acessar admin: https://seu-app.vercel.app/app/admin/pricing');

  log('\n✨ Setup concluído com sucesso!\n', 'green');
}

main().catch((err) => {
  error(`Erro fatal: ${err.message}`);
  process.exit(1);
});
