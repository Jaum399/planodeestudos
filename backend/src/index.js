const path = require('path');
const dotenv = require('dotenv');

[
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
].forEach((envPath) => {
  dotenv.config({ path: envPath, override: false });
});

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const plannerRoutes = require('./routes/planner');
const flashcardsRoutes = require('./routes/flashcards');
const flashcardDecksRoutes = require('./routes/flashcardDecks');
const scheduleRoutes = require('./routes/schedule');
const analyticsRoutes = require('./routes/analytics');
const paymentRoutes = require('./routes/payment');
const jarvisRoutes = require('./routes/jarvis');
const mindmapRoutes = require('./routes/mindmap');
const notificationRoutes = require('./routes/notifications');
const reminderSessionRoutes = require('./routes/reminderSession');
const questionBankRoutes = require('./routes/questionBank');
const studyToolsRoutes = require('./routes/studyTools');
const publicRoutes = require('./routes/public');

const { initializeDatabase } = require('./database');

// Garante que JWT_SECRET sempre existe para evitar crash
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'mentoria-estudantil-dev-secret-mude-em-producao';
  console.warn('[AVISO] JWT_SECRET não configurado — usando chave padrão. Configure no Vercel: Settings > Environment Variables');
}

const app = express();

// Webhook do gateway de pagamento precisa receber o body raw (antes do express.json())
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/flashcards', flashcardsRoutes);
app.use('/api/flashcard-decks', flashcardDecksRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/jarvis', jarvisRoutes);
app.use('/api/mindmap', mindmapRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reminder-session', reminderSessionRoutes);
app.use('/api/question-bank', questionBankRoutes);
app.use('/api/study-tools', studyToolsRoutes);
app.use('/api/public', publicRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Em ambiente local/dedicado, conecta ao MongoDB e sobe o servidor HTTP.
// Em serverless (Vercel), a conexão é garantida por request no `api/index.js`.
if (process.env.NODE_ENV !== 'production' || process.env.LOCAL_DEV) {
  initializeDatabase().then(() => {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  }).catch(err => {
    console.error('Falha ao conectar ao banco de dados:', err.message);
  });
}

module.exports = app;
