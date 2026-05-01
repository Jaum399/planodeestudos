// Atualiza URI do MongoDB na Vercel para usar o usuário que existe no Atlas
// e reseta o banco mentoria remoto (apaga coleções de usuários de teste)
const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');

const NEW_URI = 'mongodb+srv://jmsfagundes_db_user:iH9k2D9Xi6dkV0rq@planodeestudos.vya09ut.mongodb.net/?retryWrites=true&w=majority&appName=planodeestudos';

console.log('Nova URI (sanitizada):', NEW_URI.replace(/:([^@]+)@/, ':REDACTED@'));
console.log('\nAtualizando Vercel env var...');

// Usa vercel CLI para atualizar a env var
try {
  // Remove a variável antiga
  try {
    execSync(`vercel env rm appplanodeestudosvercelapp_MONGODB_URI production --yes`, { stdio: 'pipe' });
    console.log('Var antiga removida.');
  } catch {}

  // Adiciona nova com pipe para evitar interação
  const result = execSync(
    `echo "${NEW_URI}" | vercel env add appplanodeestudosvercelapp_MONGODB_URI production`,
    { stdio: 'pipe', input: NEW_URI + '\n' }
  );
  console.log('✅ Variável atualizada na Vercel!');
} catch (e) {
  console.error('Erro ao atualizar Vercel:', e.message);
  process.exit(1);
}
