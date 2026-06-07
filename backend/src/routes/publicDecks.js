const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication needed)
router.get('/', async (req, res) => {
  try {
    const { publicDeckLibrary, flashcards } = getDatabase();
    const { subject, difficulty, search, category, sort = 'rating', page = 1, limit = 20 } = req.query;

    const query = { visibility: 'published' };

    if (subject) query.subject = new RegExp(subject, 'i');
    if (difficulty) query.difficulty = difficulty;
    if (category) query.category = new RegExp(category, 'i');
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') },
      ];
    }

    const sortBy = sort === 'newest' ? { listed_at: -1 }
      : sort === 'trending' ? { imports: -1, views: -1 }
      : sort === 'rating' ? { rating: -1, rating_count: -1 }
      : { views: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const items = await publicDeckLibrary.find(query).sort(sortBy).skip(skip).limit(Number(limit));
    const total = await publicDeckLibrary.countDocuments(query);

    res.json({
      items: items.map(doc => {
        const obj = doc.toObject ? doc.toObject() : doc;
        return { ...obj, id: obj._id };
      }),
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (error) {
    console.error('Public decks list error:', error);
    res.status(500).json({ error: 'Erro ao listar decks públicos' });
  }
});

// Get featured decks
router.get('/featured', async (req, res) => {
  try {
    const { publicDeckLibrary } = getDatabase();
    const items = await publicDeckLibrary.find({ visibility: 'featured' }).sort({ rating: -1 }).limit(10);

    res.json({
      items: items.map(doc => {
        const obj = doc.toObject ? doc.toObject() : doc;
        return { ...obj, id: obj._id };
      }),
    });
  } catch (error) {
    console.error('Featured decks error:', error);
    res.status(500).json({ error: 'Erro ao buscar decks em destaque' });
  }
});

// Get trending decks
router.get('/trending', async (req, res) => {
  try {
    const { publicDeckLibrary } = getDatabase();
    const { period = '7days' } = req.query;

    const daysAgo = period === '30days' ? 30 : period === '7days' ? 7 : 1;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const items = await publicDeckLibrary
      .find({ visibility: 'published', listed_at: { $gte: startDate.toISOString() } })
      .sort({ imports: -1, views: -1 })
      .limit(20);

    res.json({
      items: items.map(doc => {
        const obj = doc.toObject ? doc.toObject() : doc;
        return { ...obj, id: obj._id };
      }),
    });
  } catch (error) {
    console.error('Trending decks error:', error);
    res.status(500).json({ error: 'Erro ao buscar decks em tendência' });
  }
});

// Get decks by category
router.get('/category/:category', async (req, res) => {
  try {
    const { publicDeckLibrary } = getDatabase();
    const { category } = req.params;
    const { sort = 'rating', page = 1, limit = 20 } = req.query;

    const sortBy = sort === 'newest' ? { listed_at: -1 }
      : sort === 'trending' ? { imports: -1 }
      : { rating: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const items = await publicDeckLibrary
      .find({ category: new RegExp(category, 'i'), visibility: 'published' })
      .sort(sortBy)
      .skip(skip)
      .limit(Number(limit));

    const total = await publicDeckLibrary.countDocuments({
      category: new RegExp(category, 'i'),
      visibility: 'published',
    });

    res.json({
      items: items.map(doc => {
        const obj = doc.toObject ? doc.toObject() : doc;
        return { ...obj, id: obj._id };
      }),
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (error) {
    console.error('Category decks error:', error);
    res.status(500).json({ error: 'Erro ao buscar decks por categoria' });
  }
});

// Get single deck details
router.get('/:id', async (req, res) => {
  try {
    const { publicDeckLibrary, flashcards } = getDatabase();
    const { id } = req.params;

    const deck = await publicDeckLibrary.findOne({ _id: id });
    if (!deck) return res.status(404).json({ error: 'Deck não encontrado' });

    // Increment view count
    await publicDeckLibrary.updateOne({ _id: id }, { $inc: { views: 1 } });

    // Get preview cards
    const previewCards = await flashcards.find({ _id: { $in: deck.preview_cards } }).limit(5);

    const obj = deck.toObject ? deck.toObject() : deck;
    res.json({
      ...obj,
      id: obj._id,
      preview: previewCards.map(c => {
        const cardObj = c.toObject ? c.toObject() : c;
        return { id: cardObj._id, question: cardObj.question, type: cardObj.type };
      }),
    });
  } catch (error) {
    console.error('Deck details error:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes do deck' });
  }
});

// Protected routes (authentication required)
router.use(authenticate, requireAccess);

// Import public deck to user collection
router.post('/:id/import', async (req, res) => {
  try {
    const { publicDeckLibrary, flashcardDecks, flashcards } = getDatabase();
    const { id } = req.params;

    const publicDeck = await publicDeckLibrary.findOne({ _id: id });
    if (!publicDeck) return res.status(404).json({ error: 'Deck não encontrado' });

    // Increment import count
    await publicDeckLibrary.updateOne({ _id: id }, { $inc: { imports: 1 } });

    // Get original deck details
    const originalDeck = await flashcardDecks.findOne({ _id: publicDeck.deck_id });
    if (!originalDeck) return res.status(404).json({ error: 'Deck original não encontrado' });

    // Create new deck copy for user
    const newDeckId = randomUUID();
    const now = new Date().toISOString();
    const newDeck = new flashcardDecks({
      _id: newDeckId,
      user_id: req.user.id,
      name: `${publicDeck.title} (importado)`,
      description: publicDeck.description,
      subject: publicDeck.subject,
      category: publicDeck.category,
      color: originalDeck.color || '#7c3aed',
      difficulty_level: publicDeck.difficulty,
      created_at: now,
      updated_at: now,
    });
    await newDeck.save();

    // Copy all flashcards from public deck
    const originalCards = await flashcards.find({ deck_id: publicDeck.deck_id });
    const newCards = originalCards.map(card => {
      const cardObj = card.toObject ? card.toObject() : { ...card };
      return {
        ...cardObj,
        _id: randomUUID(),
        user_id: req.user.id,
        deck_id: newDeckId,
        created_at: now,
        updated_at: now,
      };
    });

    if (newCards.length > 0) {
      await flashcards.insertMany(newCards);
    }

    res.status(201).json({
      deck_id: newDeckId,
      deck_name: newDeck.name,
      cards_imported: newCards.length,
    });
  } catch (error) {
    console.error('Deck import error:', error);
    res.status(500).json({ error: 'Erro ao importar deck' });
  }
});

// Add deck to favorites
router.post('/:id/favorite', async (req, res) => {
  try {
    const { publicDeckLibrary } = getDatabase();
    const { id } = req.params;
    const { add = true } = req.body;

    const increment = add ? 1 : -1;
    await publicDeckLibrary.updateOne({ _id: id }, { $inc: { favorites: increment } });

    res.json({ success: true, action: add ? 'favorited' : 'unfavorited' });
  } catch (error) {
    console.error('Favorite error:', error);
    res.status(500).json({ error: 'Erro ao atualizar favorito' });
  }
});

// Rate deck
router.post('/:id/rate', async (req, res) => {
  try {
    const { publicDeckLibrary } = getDatabase();
    const { id } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating deve estar entre 1 e 5' });
    }

    const deck = await publicDeckLibrary.findOne({ _id: id });
    if (!deck) return res.status(404).json({ error: 'Deck não encontrado' });

    // Simple rating average (in production, store individual ratings)
    const currentRatingSum = deck.rating * deck.rating_count;
    const newRatingCount = deck.rating_count + 1;
    const newRating = (currentRatingSum + rating) / newRatingCount;

    await publicDeckLibrary.updateOne(
      { _id: id },
      {
        $set: { rating: newRating },
        $inc: { rating_count: 1 },
      },
    );

    res.json({ success: true, new_rating: newRating.toFixed(1) });
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ error: 'Erro ao avaliar deck' });
  }
});

module.exports = router;
