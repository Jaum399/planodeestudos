const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAccess);

// GET /api/goals - List active goals for user
router.get('/', async (req, res) => {
  try {
    const { userGoals } = getDatabase();
    const goals = await userGoals.find({
      user_id: req.user.id,
      status: 'active',
    }).sort({ created_at: -1 });

    res.json(goals);
  } catch (error) {
    console.error('List goals error:', error);
    res.status(500).json({ error: 'Erro ao listar metas' });
  }
});

// GET /api/goals/daily-summary - Get today's progress for all active goals
router.get('/daily-summary', async (req, res) => {
  try {
    const { userGoals, dailyGoalProgress } = getDatabase();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const goals = await userGoals.find({
      user_id: req.user.id,
      status: 'active',
    });

    if (!goals.length) {
      return res.json({ goals: [] });
    }

    const progressMap = new Map();
    for (const goal of goals) {
      const progDoc = await dailyGoalProgress.findOne({
        user_id: req.user.id,
        goal_id: goal._id,
        date: today,
      });

      progressMap.set(goal._id, progDoc?.progress_value || 0);
    }

    const goalsWithProgress = goals.map(goal => ({
      ...goal,
      today_progress: progressMap.get(goal._id) || 0,
    }));

    res.json({
      date: today,
      goals: goalsWithProgress,
    });
  } catch (error) {
    console.error('Daily summary error:', error);
    res.status(500).json({ error: 'Erro ao carregar resumo diário' });
  }
});

// POST /api/goals - Create new goal
router.post('/', async (req, res) => {
  try {
    const { goal_name, goal_type = 'daily', target_value, target_unit } = req.body;

    if (!goal_name || !target_value || !target_unit) {
      return res.status(400).json({ error: 'goal_name, target_value e target_unit são obrigatórios' });
    }

    if (!['daily', 'weekly', 'monthly'].includes(goal_type)) {
      return res.status(400).json({ error: 'goal_type deve ser daily, weekly ou monthly' });
    }

    if (!['cards', 'minutes'].includes(target_unit)) {
      return res.status(400).json({ error: 'target_unit deve ser cards ou minutes' });
    }

    const { userGoals } = getDatabase();
    const now = new Date().toISOString();
    const goalId = randomUUID();

    const newGoal = {
      _id: goalId,
      user_id: req.user.id,
      goal_name,
      goal_type,
      target_value,
      target_unit,
      current_progress: 0,
      status: 'active',
      started_at: now,
      created_at: now,
      updated_at: now,
    };

    await userGoals.insertOne(newGoal);
    res.status(201).json(newGoal);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

// GET /api/goals/:id/progress - Get daily progress breakdown for past N days
router.get('/:id/progress', async (req, res) => {
  try {
    const { userGoals, dailyGoalProgress } = getDatabase();
    const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));

    const goal = await userGoals.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const progressEntries = await dailyGoalProgress.find({
      user_id: req.user.id,
      goal_id: req.params.id,
      date: { $gte: startDateStr },
    }).sort({ date: -1 });

    res.json({
      goal,
      period_days: days,
      progress: progressEntries,
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Erro ao carregar progresso' });
  }
});

// POST /api/goals/:id/update-progress - Update progress after flashcard review
router.post('/:id/update-progress', async (req, res) => {
  try {
    const { userGoals, dailyGoalProgress } = getDatabase();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const goal = await userGoals.findOne({
      _id: req.params.id,
      user_id: req.user.id,
      status: 'active',
    });

    if (!goal) {
      return res.status(404).json({ error: 'Meta não encontrada ou inativa' });
    }

    const progressId = `${req.user.id}_${req.params.id}_${today}`;
    const existingProgress = await dailyGoalProgress.findOne({
      _id: progressId,
    });

    let newProgress = (existingProgress?.progress_value || 0) + 1;
    const isCompleted = newProgress >= goal.target_value;

    const updatedProgress = {
      _id: progressId,
      user_id: req.user.id,
      goal_id: req.params.id,
      date: today,
      progress_value: newProgress,
      completed: isCompleted,
      recorded_at: new Date().toISOString(),
    };

    await dailyGoalProgress.updateOne(
      { _id: progressId },
      updatedProgress,
      { upsert: true }
    );

    if (isCompleted && !existingProgress?.completed) {
      await userGoals.updateOne(
        { _id: req.params.id },
        {
          $set: {
            status: 'completed',
            updated_at: new Date().toISOString(),
          },
        }
      );
    }

    res.json({
      progress_value: newProgress,
      completed: isCompleted,
      target_value: goal.target_value,
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Erro ao atualizar progresso' });
  }
});

// PUT /api/goals/:id - Update goal
router.put('/:id', async (req, res) => {
  try {
    const { goal_name, target_value, target_unit, status } = req.body;
    const { userGoals } = getDatabase();

    const goal = await userGoals.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    const updateFields = {};
    if (goal_name) updateFields.goal_name = goal_name;
    if (target_value) updateFields.target_value = target_value;
    if (target_unit) updateFields.target_unit = target_unit;
    if (status && ['active', 'completed', 'abandoned'].includes(status)) {
      updateFields.status = status;
    }
    updateFields.updated_at = new Date().toISOString();

    await userGoals.updateOne({ _id: req.params.id }, { $set: updateFields });

    const updated = await userGoals.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
});

// DELETE /api/goals/:id - Soft delete (mark as abandoned)
router.delete('/:id', async (req, res) => {
  try {
    const { userGoals } = getDatabase();

    const goal = await userGoals.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    await userGoals.updateOne(
      { _id: req.params.id },
      {
        $set: {
          status: 'abandoned',
          updated_at: new Date().toISOString(),
        },
      }
    );

    res.json({ message: 'Meta removida com sucesso' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Erro ao remover meta' });
  }
});

module.exports = router;
