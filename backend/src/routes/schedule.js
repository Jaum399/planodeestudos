const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAccess);

function toItem(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const { __v, ...rest } = obj;
  return { ...rest, id: rest._id };
}

// GET /api/schedule
router.get('/', async (req, res) => {
  const { schedule } = getDatabase();
  const items = await schedule.find({ user_id: req.user.id });
  items.sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    return (a.time_slot || '').localeCompare(b.time_slot || '');
  });
  res.json({ items: items.map(toItem) });
});

// POST /api/schedule
router.post('/', async (req, res) => {
  try {
    const { day_of_week, subject, duration_minutes, time_slot, color } = req.body;

    if (day_of_week === undefined || !subject || !duration_minutes) {
      return res.status(400).json({ error: 'Dia da semana, matéria e duração são obrigatórios' });
    }

    const { schedule } = getDatabase();
    const item = new schedule({
      _id: uuidv4(),
      user_id: req.user.id,
      day_of_week,
      subject: subject.trim(),
      duration_minutes,
      time_slot: time_slot || '08:00',
      color: color || '#7c3aed',
      created_at: new Date().toISOString(),
    });
    await item.save();

    res.status(201).json({ item: toItem(item) });
  } catch (err) {
    console.error('Create schedule item error:', err);
    res.status(500).json({ error: 'Erro ao criar item de cronograma' });
  }
});

// PUT /api/schedule/:id
router.put('/:id', async (req, res) => {
  try {
    const { day_of_week, subject, duration_minutes, time_slot, color } = req.body;
    const { schedule } = getDatabase();
    const item = await schedule.findOne({ _id: req.params.id, user_id: req.user.id });

    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    const updated = await schedule.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: {
        day_of_week: day_of_week !== undefined ? day_of_week : item.day_of_week,
        subject: subject || item.subject,
        duration_minutes: duration_minutes || item.duration_minutes,
        time_slot: time_slot || item.time_slot,
        color: color || item.color,
      }},
      { new: true }
    );

    res.json({ item: toItem(updated) });
  } catch (err) {
    console.error('Update schedule item error:', err);
    res.status(500).json({ error: 'Erro ao atualizar cronograma' });
  }
});

// DELETE /api/schedule/:id
router.delete('/:id', async (req, res) => {
  const { schedule } = getDatabase();
  const item = await schedule.findOne({ _id: req.params.id, user_id: req.user.id });

  if (!item) {
    return res.status(404).json({ error: 'Item não encontrado' });
  }

  await schedule.deleteOne({ _id: req.params.id, user_id: req.user.id });
  res.json({ message: 'Item removido com sucesso' });
});

module.exports = router;
