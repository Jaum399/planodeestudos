const gemini = require('./geminiService');
const openai = require('./openaiService');

// Configuration
const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const AI_FALLBACK_ENABLED = process.env.AI_FALLBACK_ENABLED !== 'false';

function getAvailableProviders() {
  return {
    gemini: gemini.isAvailable(),
    openai: openai.isAvailable(),
  };
}

function selectProvider(preferredProvider = null) {
  const available = getAvailableProviders();
  const preferred = preferredProvider || AI_PROVIDER;

  if (preferred === 'openai' && available.openai) {
    return { provider: 'openai', service: openai };
  }
  if (preferred === 'gemini' && available.gemini) {
    return { provider: 'gemini', service: gemini };
  }

  // Fallback to available provider
  if (AI_FALLBACK_ENABLED) {
    if (preferred === 'openai' && available.gemini) {
      console.warn('[AI Provider] OpenAI not available, falling back to Gemini');
      return { provider: 'gemini', service: gemini };
    }
    if (preferred === 'gemini' && available.openai) {
      console.warn('[AI Provider] Gemini not available, falling back to OpenAI');
      return { provider: 'openai', service: openai };
    }
  }

  throw new Error('NO_AI_PROVIDER_AVAILABLE');
}

async function generateFlashcardsWithAI(params) {
  const { provider, service } = selectProvider();
  try {
    return await service.generateFlashcardsWithAI(params);
  } catch (error) {
    if (AI_FALLBACK_ENABLED && error.message !== 'NO_AI_PROVIDER_AVAILABLE') {
      console.warn(`[AI Provider] ${provider} failed, attempting fallback:`, error.message);
      const fallback = provider === 'gemini' ? openai : gemini;
      if (fallback.isAvailable()) {
        return await fallback.generateFlashcardsWithAI(params);
      }
    }
    throw error;
  }
}

async function generateSummaryWithAI(params) {
  const { provider, service } = selectProvider();
  try {
    return await service.generateSummaryWithAI(params);
  } catch (error) {
    if (AI_FALLBACK_ENABLED && error.message !== 'NO_AI_PROVIDER_AVAILABLE') {
      console.warn(`[AI Provider] ${provider} failed, attempting fallback:`, error.message);
      const fallback = provider === 'gemini' ? openai : gemini;
      if (fallback.isAvailable()) {
        return await fallback.generateSummaryWithAI(params);
      }
    }
    throw error;
  }
}

async function generateJarvisResponse(params) {
  const { provider, service } = selectProvider();
  try {
    return await service.generateJarvisResponse(params);
  } catch (error) {
    if (AI_FALLBACK_ENABLED && error.message !== 'NO_AI_PROVIDER_AVAILABLE') {
      console.warn(`[AI Provider] ${provider} failed, attempting fallback:`, error.message);
      const fallback = provider === 'gemini' ? openai : gemini;
      if (fallback.isAvailable()) {
        return await fallback.generateJarvisResponse(params);
      }
    }
    throw error;
  }
}

function isAvailable() {
  return getAvailableProviders().gemini || getAvailableProviders().openai;
}

function getStatus() {
  const available = getAvailableProviders();
  return {
    available: isAvailable(),
    providers: available,
    current: AI_PROVIDER,
    fallbackEnabled: AI_FALLBACK_ENABLED,
  };
}

module.exports = {
  isAvailable,
  getStatus,
  getAvailableProviders,
  selectProvider,
  generateFlashcardsWithAI,
  generateSummaryWithAI,
  generateJarvisResponse,
};
