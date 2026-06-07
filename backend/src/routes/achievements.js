const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAccess);

// All available achievements definition
const ACHIEVEMENTS = [
  {
    id: 'first_card',
    name: '🚀 Primeiro Passo',
    description: 'Aprendeu seu primeiro flashcard',
    icon: '🎯',
    type: 'milestone',
    condition: { field: 'cards_reviewed', value: 1 },
  },
  {
    id: 'cards_100',
    name: '💯 Centena',
    description: 'Revisou 100 flashcards',
    icon: '⭐',
    type: 'milestone',
    condition: { field: 'cards_reviewed', value: 100 },
  },
  {
    id: 'cards_1000',
    name: '🔥 Milhar',
    description: 'Revisou 1000 flashcards',
    icon: '🔥',
    type: 'milestone',
    condition: { field: 'cards_reviewed', value: 1000 },
  },
  {
    id: 'streak_7',
    name: '📅 Semana Consistente',
    description: 'Estudou por 7 dias consecutivos',
    icon: '📅',
    type: 'streak',
    condition: { field: 'current_streak', value: 7 },
  },
  {
    id: 'streak_30',
    name: '🏆 Mês de Ouro',
    description: 'Estudou por 30 dias consecutivos',
    icon: '🏆',
    type: 'streak',
    condition: { field: 'current_streak', value: 30 },
  },
  {
    id: 'accuracy_75',
    name: '📈 Precisão 75%',
    description: 'Atingiu 75% de precisão',
    icon: '📈',
    type: 'perfection',
    condition: { field: 'accuracy_rate', value: 75 },
  },
  {
    id: 'accuracy_90',
    name: '⚡ Precisão 90%',
    description: 'Atingiu 90% de precisão',
    icon: '⚡',
    type: 'perfection',
    condition: { field: 'accuracy_rate', value: 90 },
  },
  {
    id: 'accuracy_95',
    name: '✨ Precisão 95%',
    description: 'Atingiu 95% de precisão',
    icon: '✨',
    type: 'perfection',
    condition: { field: 'accuracy_rate', value: 95 },
  },
  {
    id: 'deck_shared',
    name: '🤝 Compartilhador',
    description: 'Compartilhou um deck com outro usuário',
    icon: '🤝',
    type: 'social',
    condition: { field: 'decks_shared', value: 1 },
  },
  {
    id: 'deck_imported',
    name: '📚 Aprendiz',
    description: 'Importou seu primeiro deck público',
    icon: '📚',
    type: 'collection',
    condition: { field: 'decks_imported', value: 1 },
  },
  {
    id: 'decks_5',
    name: '🎒 Colecionador',
    description: 'Criou 5 decks diferentes',
    icon: '🎒',
    type: 'collection',
    condition: { field: 'decks_created', value: 5 },
  },
  {
    id: 'exam_perfect',
    name: '🎓 Exame Perfeito',
    description: 'Acertou todas as questões em um simulado',
    icon: '🎓',
    type: 'perfection',
    condition: { field: 'exam_perfect', value: 1 },
  },
];

// GET /api/achievements - Get all available achievements
router.get('/', async (req, res) => {
  try {
    const achievements = ACHIEVEMENTS.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      type: a.type,
    }));

    res.json({ achievements });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Erro ao buscar conquistas' });
  }
});

// GET /api/achievements/my-achievements - Get user's unlocked achievements
router.get('/my-achievements', async (req, res) => {
  try {
    const { userAchievements } = getDatabase();

    const achievements = await userAchievements
      .find({ user_id: req.user.id })
      .sort({ unlocked_at: -1 })
      .toArray();

    const items = achievements.map(ach => {
      const def = ACHIEVEMENTS.find(a => a.id === ach.achievement_id);
      return {
        id: ach.achievement_id,
        name: def?.name || ach.achievement_name,
        description: def?.description || ach.achievement_description,
        icon: def?.icon || ach.achievement_icon,
        unlocked_at: ach.unlocked_at,
        is_featured: ach.is_featured || false,
      };
    });

    res.json({ items, total: items.length });
  } catch (error) {
    console.error('Get my achievements error:', error);
    res.status(500).json({ error: 'Erro ao buscar suas conquistas' });
  }
});

// GET /api/achievements/progress - Progress toward upcoming achievements
router.get('/progress', async (req, res) => {
  try {
    const { users, userAchievements } = getDatabase();

    // Get user stats
    const user = await users.findOne({ _id: req.user.id });
    const unlockedIds = (
      await userAchievements.find({ user_id: req.user.id }).toArray()
    ).map(a => a.achievement_id);

    // Check progress on each achievement
    const progress = ACHIEVEMENTS.filter(a => !unlockedIds.includes(a.id))
      .map(achievement => {
        const { field, value } = achievement.condition;
        const currentValue = user?.[field] || 0;
        const progressPercent = Math.min(100, Math.round((currentValue / value) * 100));

        return {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          progress: currentValue,
          max: value,
          progress_percent: progressPercent,
          unlocked: progressPercent >= 100,
        };
      })
      .filter(p => p.progress_percent > 0 || Math.random() < 0.3) // Show relevant or random
      .slice(0, 5); // Top 5 in progress

    res.json({ in_progress: progress });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
});

// POST /api/achievements/check-unlock - Check and unlock achievements (internal use)
router.post('/check-unlock', async (req, res) => {
  try {
    const { users, userAchievements } = getDatabase();

    const user = await users.findOne({ _id: req.user.id });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const unlockedIds = (
      await userAchievements.find({ user_id: req.user.id }).toArray()
    ).map(a => a.achievement_id);

    const newlyUnlocked = [];
    const now = new Date().toISOString();

    // Check each achievement condition
    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.includes(achievement.id)) continue;

      const { field, value } = achievement.condition;
      const currentValue = user[field] || 0;

      if (currentValue >= value) {
        // Unlock achievement
        const ach = new userAchievements({
          _id: randomUUID(),
          user_id: req.user.id,
          achievement_id: achievement.id,
          achievement_name: achievement.name,
          achievement_icon: achievement.icon,
          achievement_description: achievement.description,
          type: achievement.type,
          unlocked_at: now,
          progress: value,
          progress_max: value,
          is_featured: false,
          created_at: now,
        });

        await userAchievements.insertOne(ach.toObject ? ach.toObject() : ach);
        newlyUnlocked.push(achievement);
      }
    }

    res.json({ newly_unlocked: newlyUnlocked.length, achievements: newlyUnlocked });
  } catch (error) {
    console.error('Check unlock error:', error);
    res.status(500).json({ error: 'Erro ao verificar conquistas' });
  }
});

// Internal helper to unlock specific achievement
async function unlockAchievement(userId, achievementId) {
  const { userAchievements } = getDatabase();
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);

  if (!achievement) return false;

  const existing = await userAchievements.findOne({
    user_id: userId,
    achievement_id: achievementId,
  });

  if (existing) return false; // Already unlocked

  const now = new Date().toISOString();
  const { field, value } = achievement.condition;

  await userAchievements.insertOne({
    _id: randomUUID(),
    user_id: userId,
    achievement_id: achievementId,
    achievement_name: achievement.name,
    achievement_icon: achievement.icon,
    achievement_description: achievement.description,
    type: achievement.type,
    unlocked_at: now,
    progress: value,
    progress_max: value,
    is_featured: false,
    created_at: now,
  });

  return true;
}

// Export helper for use in other routes
router.unlockAchievement = unlockAchievement;

module.exports = router;
