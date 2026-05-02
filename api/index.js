// Vercel serverless entry point — exports the Express app
// All /api/* requests are routed here by vercel.json rewrites
// Em produção as variáveis vêm do ambiente Vercel, dotenv só carrega localmente
if (process.env.NODE_ENV !== 'production') {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
}

const { initializeDatabase } = require('../backend/src/database');
const app = require('../backend/src/index');

// Garante que o MongoDB está conectado antes de cada request (serverless safe)
module.exports = async (req, res) => {
  const url = String(req.url || '');
  const isPublicRoute = url.startsWith('/api/public') || url.startsWith('/public') || url.startsWith('/api/health') || url.startsWith('/health');

  if (isPublicRoute) {
    return app(req, res);
  }

  try {
    await initializeDatabase();
  } catch (err) {
    console.error('Database init error:', err.message, err.name, JSON.stringify(err.reason || {}));

    const debugSecret = String(process.env.NOTIFICATION_CRON_SECRET || process.env.CRON_SECRET || '').trim();
    const requestDebugSecret = String(req.headers['x-debug-secret'] || '').trim();
    const canShowDebug = Boolean(debugSecret) && requestDebugSecret === debugSecret;

    return res.status(503).json({
      error: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.',
      code: 'DATABASE_UNAVAILABLE',
      ...(canShowDebug ? {
        debug: {
          message: err.message,
          name: err.name,
          reason: err.reason || null,
        },
      } : {}),
    });
  }
  return app(req, res);
};
