const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAccess);

function toItem(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const { __v, ...rest } = obj;
  return { ...rest, id: rest._id };
}

// GET /api/planner
router.get('/', async (req, res) => {
  try {
    const { planner, users } = getDatabase();
    const query = { user_id: req.user.id };

    // Auto-filter by user's area if no subject specified
    if (!req.query.subject && !req.query.all) {
      const user = await users.findOne({ _id: req.user.id });
      if (user?.area) {
        query.subject = new RegExp(user.area, 'i');
      }
    } else if (req.query.subject) {
      query.subject = new RegExp(req.query.subject, 'i');
    }

    const items = await planner.find(query).sort({ created_at: -1 });
    res.json({ items: items.map(toItem) });
  } catch (error) {
    console.error('Planner list error:', error);
    res.status(500).json({ error: 'Erro ao carregar planner' });
  }
});

// POST /api/planner
router.post('/', async (req, res) => {
  try {
    const { title, subject, status, difficulty, notes } = req.body;
    if (!title || !subject) {
      return res.status(400).json({ error: 'Título e matéria são obrigatórios' });
    }
    const { planner } = getDatabase();
    const now = new Date().toISOString();
    const item = new planner({
      _id: randomUUID(),
      user_id: req.user.id,
      title: title.trim(),
      subject: subject.trim(),
      status: status || 'todo',
      difficulty: difficulty || 5,
      notes: notes || '',
      next_review: null,
      created_at: now,
      updated_at: now,
    });
    await item.save();
    res.status(201).json({ item: toItem(item) });
  } catch (err) {
    console.error('Create planner item error:', err);
    res.status(500).json({ error: 'Erro ao criar item' });
  }
});

// PUT /api/planner/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, subject, status, difficulty, notes, next_review } = req.body;
    const { planner } = getDatabase();
    const item = await planner.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!item) return res.status(404).json({ error: 'Item não encontrado' });

    const updated = await planner.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: {
        title: title || item.title,
        subject: subject || item.subject,
        status: status || item.status,
        difficulty: difficulty !== undefined ? difficulty : item.difficulty,
        notes: notes !== undefined ? notes : item.notes,
        next_review: next_review !== undefined ? next_review : item.next_review,
        updated_at: new Date().toISOString(),
      }},
      { new: true }
    );
    res.json({ item: toItem(updated) });
  } catch (err) {
    console.error('Update planner item error:', err);
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

// DELETE /api/planner/:id
router.delete('/:id', async (req, res) => {
  const { planner } = getDatabase();
  const item = await planner.findOne({ _id: req.params.id, user_id: req.user.id });
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  await planner.deleteOne({ _id: req.params.id, user_id: req.user.id });
  res.json({ message: 'Item removido com sucesso' });
});

module.exports = router;
