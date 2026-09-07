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
    const { publicDeckLibrary, flashcardDecks, flashcards, deckImportHistory } = getDatabase();
    const { id } = req.params;

    const publicDeck = await publicDeckLibrary.findOne({ _id: id });
    if (!publicDeck) return res.status(404).json({ error: 'Deck não encontrado' });

    // Get original deck details
    const originalDeck = await flashcardDecks.findOne({ _id: publicDeck.deck_id });
    if (!originalDeck) return res.status(404).json({ error: 'Deck original não encontrado' });

    // Create new deck copy for user
    const newDeckId = randomUUID();
    const now = new Date().toISOString();
    const newDeck = {
      _id: newDeckId,
      user_id: req.user.id,
      name: `${publicDeck.title} (importado)`,
      description: publicDeck.description,
      subject: publicDeck.subject,
      category: publicDeck.category,
      color: originalDeck.color || '#7c3aed',
      difficulty_level: publicDeck.difficulty,
      is_public: false,
      card_count: 0,
      created_at: now,
      updated_at: now,
    };
    await flashcardDecks.insertOne(newDeck);

    // Copy all flashcards from public deck
    const originalCards = await flashcards.find({ deck_id: publicDeck.deck_id }).toArray();
    const newCards = originalCards.map(card => {
      const cardObj = card.toObject ? card.toObject() : card;
      return {
        _id: randomUUID(),
        user_id: req.user.id,
        deck_id: newDeckId,
        question: cardObj.question,
        answer: cardObj.answer,
        type: cardObj.type || 'basic',
        subject: cardObj.subject,
        difficulty: cardObj.difficulty,
        ease_factor: 2.5,
        interval_days: 0,
        next_review: now,
        review_count: 0,
        is_favorite: false,
        tags: cardObj.tags || [],
        created_at: now,
        updated_at: now,
      };
    });

    if (newCards.length > 0) {
      await flashcards.insertMany(newCards);
      await flashcardDecks.updateOne({ _id: newDeckId }, { $set: { card_count: newCards.length } });
    }

    // Update import count and record history
    await publicDeckLibrary.updateOne({ _id: id }, { $inc: { imports: 1 } });
    await deckImportHistory.insertOne({
      _id: randomUUID(),
      user_id: req.user.id,
      public_deck_id: id,
      imported_deck_id: newDeckId,
      imported_at: now,
    });

    res.status(201).json({
      deck_id: newDeckId,
      deck_name: newDeck.name,
      cards_imported: newCards.length,
      message: `✅ ${newCards.length} flashcards importados com sucesso!`,
    });
  } catch (error) {
    console.error('Deck import error:', error);
    res.status(500).json({ error: 'Erro ao importar deck' });
  }
});

// Add/Remove deck from user favorites
router.post('/:id/favorite', async (req, res) => {
  try {
    const { userFavoriteDecks, publicDeckLibrary } = getDatabase();
    const { id } = req.params;
    const { add = true } = req.body;

    const favId = `${req.user.id}_${id}`;
    const now = new Date().toISOString();

    if (add) {
      // Add to favorites
      const existing = await userFavoriteDecks.findOne({ _id: favId });
      if (!existing) {
        await userFavoriteDecks.insertOne({
          _id: favId,
          user_id: req.user.id,
          deck_id: id,
          favorited_at: now,
        });
        await publicDeckLibrary.updateOne({ _id: id }, { $inc: { favorites: 1 } });
      }
    } else {
      // Remove from favorites
      await userFavoriteDecks.deleteOne({ _id: favId });
      await publicDeckLibrary.updateOne({ _id: id }, { $inc: { favorites: -1 } });
    }

    res.json({ success: true, action: add ? 'favorited' : 'unfavorited' });
  } catch (error) {
    console.error('Favorite error:', error);
    res.status(500).json({ error: 'Erro ao atualizar favorito' });
  }
});

// Check if user favorited a deck
router.get('/:id/is-favorite', async (req, res) => {
  try {
    const { userFavoriteDecks } = getDatabase();
    const { id } = req.params;

    const fav = await userFavoriteDecks.findOne({ _id: `${req.user.id}_${id}` });
    res.json({ is_favorite: !!fav });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ error: 'Erro ao verificar favorito' });
  }
});

// Rate deck (per user)
router.post('/:id/rate', async (req, res) => {
  try {
    const { publicDeckLibrary, deckRatings } = getDatabase();
    const { id } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating deve estar entre 1 e 5' });
    }

    const deck = await publicDeckLibrary.findOne({ _id: id });
    if (!deck) return res.status(404).json({ error: 'Deck não encontrado' });

    const ratingId = `${req.user.id}_${id}`;
    const now = new Date().toISOString();

    // Check if user already rated
    const existing = await deckRatings.findOne({ _id: ratingId });

    if (existing) {
      // Update existing rating
      const oldRating = existing.rating;
      const newAvgRating = (deck.rating * deck.rating_count - oldRating + rating) / deck.rating_count;

      await deckRatings.updateOne(
        { _id: ratingId },
        { $set: { rating, review: review || '', updated_at: now } }
      );

      await publicDeckLibrary.updateOne(
        { _id: id },
        { $set: { rating: newAvgRating } }
      );

      res.json({ success: true, new_rating: newAvgRating.toFixed(1), action: 'updated' });
    } else {
      // Create new rating
      const currentRatingSum = deck.rating * deck.rating_count;
      const newRatingCount = deck.rating_count + 1;
      const newRating = (currentRatingSum + rating) / newRatingCount;

      await deckRatings.insertOne({
        _id: ratingId,
        user_id: req.user.id,
        deck_id: id,
        rating,
        review: review || '',
        created_at: now,
        updated_at: now,
      });

      await publicDeckLibrary.updateOne(
        { _id: id },
        { $set: { rating: newRating }, $inc: { rating_count: 1 } }
      );

      res.json({ success: true, new_rating: newRating.toFixed(1), action: 'created' });
    }
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ error: 'Erro ao avaliar deck' });
  }
});

// Get user's rating for a deck
router.get('/:id/my-rating', async (req, res) => {
  try {
    const { deckRatings } = getDatabase();
    const { id } = req.params;

    const rating = await deckRatings.findOne({ _id: `${req.user.id}_${id}` });
    res.json({ rating: rating ? rating.rating : 0, review: rating?.review || '' });
  } catch (error) {
    console.error('Get rating error:', error);
    res.status(500).json({ error: 'Erro ao buscar avaliação' });
  }
});

// Get all user favorites
router.get('/user/favorites/list', async (req, res) => {
  try {
    const { userFavoriteDecks, publicDeckLibrary } = getDatabase();

    const favorites = await userFavoriteDecks.find({ user_id: req.user.id }).toArray();
    const deckIds = favorites.map(f => f.deck_id);

    const decks = await publicDeckLibrary.find({ _id: { $in: deckIds } }).toArray();

    const items = decks.map(doc => {
      const obj = doc.toObject ? doc.toObject() : doc;
      return { ...obj, id: obj._id };
    });

    res.json({ items, total: items.length });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Erro ao buscar favoritos' });
  }
});

module.exports = router;
