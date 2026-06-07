const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAccess);

// GET /api/leaderboards - Get leaderboards for period
router.get('/', async (req, res) => {
  try {
    const { period = 'all_time', metric = 'study_minutes' } = req.query;
    const { leaderboards } = getDatabase();

    // Get or generate leaderboard
    let leaderboard = await leaderboards.findOne({
      period,
      metric,
    });

    if (!leaderboard) {
      // Generate leaderboard on-the-fly if not cached
      leaderboard = await generateLeaderboard(period, metric);
      if (leaderboard) {
        await leaderboards.insertOne(leaderboard);
      }
    }

    if (!leaderboard) {
      return res.json({ rankings: [] });
    }

    // Return top 100
    const rankings = (leaderboard.rankings || []).slice(0, 100).map((r, idx) => ({
      rank: idx + 1,
      user_id: r.user_id,
      username: r.username,
      score: r.score,
      metric,
    }));

    res.json({
      period,
      metric,
      rankings,
      updated_at: leaderboard.updated_at,
    });
  } catch (error) {
    console.error('Get leaderboards error:', error);
    res.status(500).json({ error: 'Erro ao buscar rankings' });
  }
});

// GET /api/leaderboards/my-rank - Get current user's rank
router.get('/my-rank', async (req, res) => {
  try {
    const { period = 'all_time', metric = 'study_minutes' } = req.query;
    const { leaderboards } = getDatabase();

    let leaderboard = await leaderboards.findOne({ period, metric });

    if (!leaderboard) {
      leaderboard = await generateLeaderboard(period, metric);
      if (leaderboard) {
        await leaderboards.insertOne(leaderboard);
      }
    }

    if (!leaderboard) {
      return res.json({ rank: null, score: 0, percentile: 0 });
    }

    const userRanking = leaderboard.rankings?.find(r => r.user_id === req.user.id);
    const rank = leaderboard.rankings?.findIndex(r => r.user_id === req.user.id);
    const percentile = rank !== -1 ? Math.max(1, 100 - Math.round((rank / leaderboard.rankings.length) * 100)) : 0;

    res.json({
      user_id: req.user.id,
      rank: rank !== -1 ? rank + 1 : null,
      score: userRanking?.score || 0,
      percentile,
      period,
      metric,
    });
  } catch (error) {
    console.error('Get my rank error:', error);
    res.status(500).json({ error: 'Erro ao buscar sua classificação' });
  }
});

// GET /api/leaderboards/by-subject/:subject - Subject-specific rankings
router.get('/by-subject/:subject', async (req, res) => {
  try {
    const { subject } = req.params;
    const { period = 'all_time' } = req.query;
    const { leaderboards } = getDatabase();

    // For subject-specific rankings, aggregate by subject accuracy
    const leaderboard = await leaderboards.findOne({
      period,
      metric: `subject_${subject}`,
    });

    if (!leaderboard) {
      return res.json({ rankings: [] });
    }

    const rankings = (leaderboard.rankings || []).slice(0, 50).map((r, idx) => ({
      rank: idx + 1,
      user_id: r.user_id,
      username: r.username,
      score: r.score, // accuracy percentage
      subject,
    }));

    res.json({ subject, rankings, period });
  } catch (error) {
    console.error('Get subject rankings error:', error);
    res.status(500).json({ error: 'Erro ao buscar rankings por matéria' });
  }
});

// Helper function to generate leaderboard
async function generateLeaderboard(period, metric) {
  const { mockExams, sessions, userGoals, users } = getDatabase();
  const now = new Date();
  let startDate;

  switch (period) {
    case 'daily':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all_time':
      startDate = new Date('2020-01-01');
      break;
    default:
      startDate = new Date('2020-01-01');
  }

  let rankings = [];

  if (metric === 'study_minutes') {
    // Aggregate from sessions
    const sessionData = await sessions
      .aggregate([
        { $match: { created_at: { $gte: startDate.toISOString() } } },
        {
          $group: {
            _id: '$user_id',
            total_minutes: { $sum: '$duration_minutes' },
          },
        },
        { $sort: { total_minutes: -1 } },
      ])
      .toArray();

    rankings = await Promise.all(
      sessionData.map(async (data, idx) => {
        const user = await users.findOne({ _id: data._id });
        return {
          rank: idx + 1,
          user_id: data._id,
          username: user?.name || 'Usuário',
          score: data.total_minutes,
        };
      })
    );
  } else if (metric === 'accuracy') {
    // Aggregate from mock exams
    const examData = await mockExams
      .aggregate([
        { $match: { created_at: { $gte: startDate.toISOString() }, status: 'completed' } },
        {
          $group: {
            _id: '$user_id',
            avg_accuracy: { $avg: '$accuracy_percentage' },
            count: { $sum: 1 },
          },
        },
        { $sort: { avg_accuracy: -1 } },
      ])
      .toArray();

    rankings = await Promise.all(
      examData.map(async (data, idx) => {
        const user = await users.findOne({ _id: data._id });
        return {
          rank: idx + 1,
          user_id: data._id,
          username: user?.name || 'Usuário',
          score: Math.round(data.avg_accuracy),
        };
      })
    );
  } else if (metric === 'streak') {
    // Simplified streak ranking (would need real streak tracking)
    const allUsers = await users.find({}).toArray();
    rankings = allUsers.map((user, idx) => ({
      rank: idx + 1,
      user_id: user._id,
      username: user.name,
      score: 0, // TODO: implement real streak tracking
    }));
  }

  return {
    _id: randomUUID(),
    period,
    metric,
    period_start: startDate.toISOString(),
    period_end: now.toISOString(),
    rankings,
    updated_at: now.toISOString(),
  };
}

module.exports = router;
