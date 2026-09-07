const express = require('express');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAccess);

// GET /api/study-dashboard - Comprehensive study analytics
router.get('/', async (req, res) => {
  try {
    const {
      questionAttempts,
      flashcards,
      studySessions,
      userStreaks,
      userAchievements,
      deckCollections,
    } = getDatabase();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = now.toISOString().slice(0, 7);
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [attempts, sessions, streak, achievements, collections] = await Promise.all([
      questionAttempts.find({ user_id: req.user.id }).sort({ created_at: -1 }).limit(500),
      studySessions.find({ user_id: req.user.id }).sort({ started_at: -1 }),
      userStreaks.findOne({ user_id: req.user.id }),
      userAchievements.find({ user_id: req.user.id }),
      deckCollections.find({ user_id: req.user.id }),
    ]);

    // Calculate accuracy trends
    const bySubject = new Map();
    for (const attempt of attempts) {
      const subject = attempt.subject || 'Geral';
      const stat = bySubject.get(subject) || { total: 0, correct: 0, recent_7d: 0, recent_7d_correct: 0 };
      stat.total += 1;
      if (attempt.is_correct) stat.correct += 1;
      if (attempt.created_at >= thisWeek) {
        stat.recent_7d += 1;
        if (attempt.is_correct) stat.recent_7d_correct += 1;
      }
      bySubject.set(subject, stat);
    }

    const subjectAnalytics = [...bySubject.entries()]
      .map(([subject, stat]) => ({
        subject,
        total_attempts: stat.total,
        correct_attempts: stat.correct,
        accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
        accuracy_7d: stat.recent_7d > 0 ? Math.round((stat.recent_7d_correct / stat.recent_7d) * 100) : 0,
        trend: stat.total > 0 && stat.recent_7d > 0
          ? (stat.recent_7d_correct / stat.recent_7d) - (stat.correct / stat.total)
          : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    // Study sessions analytics
    const todaySessions = sessions.filter(s => s.started_at.startsWith(today)).length;
    const weekSessions = sessions.filter(s => s.started_at >= thisWeek).length;
    const monthSessions = sessions.filter(s => s.started_at.startsWith(thisMonth)).length;

    const avgAccuracy = sessions.length > 0
      ? Math.round(sessions.reduce((acc, s) => acc + (s.accuracy_percent || 0), 0) / sessions.length)
      : 0;

    const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

    // Time distribution
    const timeDistribution = {
      morning: sessions.filter(s => {
        const hour = new Date(s.started_at).getHours();
        return hour >= 6 && hour < 12;
      }).length,
      afternoon: sessions.filter(s => {
        const hour = new Date(s.started_at).getHours();
        return hour >= 12 && hour < 18;
      }).length,
      evening: sessions.filter(s => {
        const hour = new Date(s.started_at).getHours();
        return hour >= 18 || hour < 6;
      }).length,
    };

    res.json({
      summary: {
        current_streak: streak?.current_streak || 0,
        longest_streak: streak?.longest_streak || 0,
        total_cards_reviewed: streak?.total_cards_reviewed || 0,
        total_correct: streak?.total_correct || 0,
        overall_accuracy: streak ? Math.round((streak.total_correct / streak.total_cards_reviewed) * 100) : 0,
        total_study_time_minutes: totalMinutes,
        total_achievements: achievements.length,
      },
      sessions: {
        today: todaySessions,
        this_week: weekSessions,
        this_month: monthSessions,
        average_accuracy: avgAccuracy,
        time_distribution: timeDistribution,
      },
      subject_analytics: subjectAnalytics.slice(0, 10),
      recent_sessions: sessions
        .slice(0, 5)
        .map(s => ({
          deck_id: s.deck_id,
          cards_reviewed: s.cards_reviewed,
          accuracy: s.accuracy_percent,
          duration: s.duration_minutes,
          started_at: s.started_at,
        })),
      achievements: achievements
        .map(a => ({
          badge_name: a.badge_name,
          icon: a.icon,
          unlocked_at: a.unlocked_at,
        }))
        .slice(0, 6),
      collections: collections.length,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

// GET /api/study-dashboard/detailed - Detailed analytics report
router.get('/detailed', async (req, res) => {
  try {
    const { questionAttempts, studySessions } = getDatabase();
    const period = req.query.period || '30';
    const days = Math.max(1, Math.min(365, Number(period)));

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const sessions = await studySessions.find({
      user_id: req.user.id,
      started_at: { $gte: startDateStr },
    });

    const attempts = await questionAttempts.find({
      user_id: req.user.id,
      created_at: { $gte: startDateStr },
    });

    const dailyStats = new Map();
    for (const session of sessions) {
      const date = session.started_at.split('T')[0];
      const stat = dailyStats.get(date) || {
        sessions: 0,
        cards: 0,
        correct: 0,
        duration: 0,
        accuracy: 0,
      };
      stat.sessions += 1;
      stat.cards += session.cards_reviewed || 0;
      stat.correct += session.cards_correct || 0;
      stat.duration += session.duration_minutes || 0;
      dailyStats.set(date, stat);
    }

    for (const [date, stat] of dailyStats) {
      stat.accuracy = stat.cards > 0 ? Math.round((stat.correct / stat.cards) * 100) : 0;
    }

    res.json({
      period_days: days,
      total_sessions: sessions.length,
      total_cards_reviewed: attempts.length,
      total_correct: attempts.filter(a => a.is_correct).length,
      average_daily_sessions: sessions.length > 0 ? (sessions.length / days).toFixed(1) : 0,
      daily_breakdown: Array.from(dailyStats.entries())
        .sort()
        .map(([date, stat]) => ({
          date,
          ...stat,
        })),
    });
  } catch (error) {
    console.error('Detailed dashboard error:', error);
    res.status(500).json({ error: 'Erro ao carregar relatório detalhado' });
  }
});

// GET /api/study-dashboard/heatmap - Study heatmap by day of week
router.get('/heatmap', async (req, res) => {
  try {
    const { studySessions } = getDatabase();

    const sessions = await studySessions.find({ user_id: req.user.id });

    const heatmap = {
      sunday: 0,
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
    };

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    for (const session of sessions) {
      const date = new Date(session.started_at);
      const dayOfWeek = dayNames[date.getDay()];
      heatmap[dayOfWeek] += 1;
    }

    res.json({ heatmap, total_sessions: sessions.length });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar heatmap' });
  }
});

module.exports = router;
