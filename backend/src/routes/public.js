const express = require('express');

const router = express.Router();

const APP_INFO = {
  name: 'Plano de Estudos',
  brand: 'Mentudo',
  apiVersion: 'v1',
};

function getSafeIosInstallUrl(rawUrl) {
  const fallback = 'https://testflight.apple.com';
  const candidate = String(rawUrl || '').trim();
  if (!candidate) return fallback;
  if (/\.zip($|\?)/i.test(candidate)) return fallback;
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
  const androidDownloadUrl = process.env.ANDROID_DOWNLOAD_URL || `${baseUrl}/download/app-planodeestudos-android.apk`;
  const iosInstallUrl = getSafeIosInstallUrl(process.env.IOS_INSTALL_URL || process.env.VITE_IOS_INSTALL_URL);

  return {
    baseUrl,
    androidDownloadUrl,
    iosInstallUrl,
    supportEmail: process.env.SUPPORT_EMAIL || 'contato@mentoriaestudantil.com.br',
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
      ios: cfg.iosInstallUrl,
    },
    timestamp: new Date().toISOString(),
  });
});

router.get('/app', (req, res) => {
  const cfg = getPublicConfig(req);

  res.json({
    ...APP_INFO,
    description: 'Aplicacao de organizacao de estudos com IA, planner, flashcards e analiticos.',
    channels: ['web', 'android', 'ios'],
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
    ios: {
      type: 'testflight',
      url: cfg.iosInstallUrl,
      installable: true,
      note: 'Para instalacao nativa no iPhone, use TestFlight.',
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
        monthlyPrice: 29.9,
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
