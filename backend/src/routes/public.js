const express = require('express');

const router = express.Router();

const APP_INFO = {
  name: 'Ordex',
  brand: 'Ordex',
  apiVersion: 'v1',
};

function getSafeAndroidDownloadUrl(rawUrl) {
  const fallback = 'https://github.com/Jaum399/ordex/releases';
  const candidate = String(rawUrl || '').trim();
  if (!candidate) return fallback;
  if (/^\/download\//i.test(candidate)) return fallback;
  return candidate;
}

function getBaseUrl(req) {
  const forwardedHost = req.headers['x-forwarded-host'];
  const forwardedProto = req.headers['x-forwarded-proto'];
  const host = forwardedHost || req.get('host');
  const proto = forwardedProto || req.protocol;
  return `${proto}://${host}`;
}

function getPublicConfig(req) {
  const baseUrl = process.env.PUBLIC_APP_URL || getBaseUrl(req);
  const androidDownloadUrl = getSafeAndroidDownloadUrl(process.env.ANDROID_DOWNLOAD_URL);

  return {
    baseUrl,
    androidDownloadUrl,
    supportEmail: process.env.SUPPORT_EMAIL || 'contato@ordex.app',
  };
}

router.get('/', (req, res) => {
  const cfg = getPublicConfig(req);

  res.json({
    ok: true,
    ...APP_INFO,
    endpoints: {
      self: '/api/public',
      health: '/api/health',
      app: '/api/public/app',
      downloads: '/api/public/downloads',
      plans: '/api/public/plans',
    },
    links: {
      web: cfg.baseUrl,
      android: cfg.androidDownloadUrl,
    },
    timestamp: new Date().toISOString(),
  });
});

router.get('/app', (req, res) => {
  const cfg = getPublicConfig(req);

  res.json({
    ...APP_INFO,
    description: 'Aplicacao de organizacao de estudos com IA, planner, flashcards e analiticos.',
    channels: ['web', 'android'],
    links: {
      web: cfg.baseUrl,
      supportEmail: cfg.supportEmail,
    },
  });
});

router.get('/downloads', (req, res) => {
  const cfg = getPublicConfig(req);

  res.json({
    android: {
      type: 'apk',
      url: cfg.androidDownloadUrl,
      installable: true,
    },
  });
});

router.get('/plans', (_req, res) => {
  res.json({
    currency: 'BRL',
    plans: [
      {
        id: 'free',
        name: 'Gratuito',
        monthlyPrice: 0,
        features: ['Acesso basico', 'Dashboard', 'Configuracoes'],
      },
      {
        id: 'premium',
        name: 'Premium',
        monthlyPrice: 19.90,
        features: [
          'Planner completo',
          'Flashcards com revisao',
          'Cronograma automatico',
          'Analises avancadas',
          'Assistente IA',
        ],
      },
    ],
  });
});

module.exports = router;
