// Runner temporário — carrega .env.seed e chama o upsert nos dois bancos
const fs = require('fs');
const path = require('path');

// Lê .env.seed manualmente (sem dependência de dotenv)
const envFile = path.join(__dirname, '..', '.env.seed');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// Redireciona para o script principal com os argumentos fixos
process.argv.push('ttavaresmed@gmail.com', 'demolidor', 'Thiago Tavares');
require('./add-user-both');
