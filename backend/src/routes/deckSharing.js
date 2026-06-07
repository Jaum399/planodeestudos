const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAccess);

// POST /api/deck-sharing/:deckId/share - Share deck with specific users or make public
router.post('/:deckId/share', async (req, res) => {
  try {
    const { deckId } = req.params;
    const { is_public = false, shared_with = [], public_url } = req.body;

    const { flashcardDecks, deckSharing, users } = getDatabase();

    // Verify deck ownership
    const deck = await flashcardDecks.findOne({ _id: deckId, user_id: req.user.id });
    if (!deck) {
      return res.status(404).json({ error: 'Deck não encontrado' });
    }

    // Validate shared_with users exist
    if (shared_with.length > 0) {
      const userIds = shared_with.map(u => u.user_id);
      const foundUsers = await users.find({ _id: { $in: userIds } }).toArray();
      if (foundUsers.length !== userIds.length) {
        return res.status(400).json({ error: 'Um ou mais usuários não foram encontrados' });
      }
    }

    // Upsert deck sharing record
    const sharingRecord = {
      _id: randomUUID(),
      deck_id: deckId,
      owner_id: req.user.id,
      is_public,
      public_url: is_public ? (public_url || `deck-${deckId.substring(0, 8)}-public`) : null,
      shared_with: shared_with.map(u => ({
        user_id: u.user_id,
        permission: u.permission || 'view',
        shared_at: new Date().toISOString(),
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const existing = await deckSharing.findOne({ deck_id: deckId });
    if (existing) {
      await deckSharing.updateOne(
        { deck_id: deckId },
        { $set: sharingRecord }
      );
    } else {
      await deckSharing.insertOne(sharingRecord);
    }

    res.json({
      success: true,
      sharing: {
        deck_id: deckId,
        is_public,
        public_url: is_public ? sharingRecord.public_url : null,
        shared_with,
      },
    });
  } catch (error) {
    console.error('Deck sharing error:', error);
    res.status(500).json({ error: 'Erro ao compartilhar deck' });
  }
});

// GET /api/deck-sharing/shared-with-me - List decks shared with current user
router.get('/shared-with-me', async (req, res) => {
  try {
    const { deckSharing, flashcardDecks, users } = getDatabase();

    // Find all sharing records where current user is in shared_with
    const sharingRecords = await deckSharing
      .find({ 'shared_with.user_id': req.user.id })
      .toArray();

    if (sharingRecords.length === 0) {
      return res.json({ items: [] });
    }

    // Get deck details for each sharing record
    const deckIds = sharingRecords.map(r => r.deck_id);
    const decks = await flashcardDecks
      .find({ _id: { $in: deckIds } })
      .toArray();

    // Get owner details
    const ownerIds = decks.map(d => d.user_id);
    const owners = await users.find({ _id: { $in: ownerIds } }).toArray();
    const ownerMap = new Map(owners.map(o => [o._id, o.name]));

    const items = decks.map(deck => {
      const sharing = sharingRecords.find(r => r.deck_id === deck._id);
      const userPermission = sharing.shared_with.find(s => s.user_id === req.user.id);

      return {
        id: deck._id,
        user_id: deck.user_id,
        owner_name: ownerMap.get(deck.user_id) || 'Unknown',
        name: deck.name,
        description: deck.description,
        subject: deck.subject,
        category: deck.category || '',
        color: deck.color,
        difficulty_level: deck.difficulty_level,
        card_count: deck.card_count || 0,
        permission: userPermission?.permission || 'view',
        shared_at: userPermission?.shared_at,
        created_at: deck.created_at,
        updated_at: deck.updated_at,
      };
    });

    res.json({ items });
  } catch (error) {
    console.error('Get shared decks error:', error);
    res.status(500).json({ error: 'Erro ao buscar decks compartilhados' });
  }
});

// PUT /api/deck-sharing/:deckId/permissions - Update sharing permissions
router.put('/:deckId/permissions', async (req, res) => {
  try {
    const { deckId } = req.params;
    const { shared_with } = req.body;

    const { flashcardDecks, deckSharing } = getDatabase();

    // Verify deck ownership
    const deck = await flashcardDecks.findOne({ _id: deckId, user_id: req.user.id });
    if (!deck) {
      return res.status(404).json({ error: 'Deck não encontrado' });
    }

    // Update sharing permissions
    const newSharedWith = shared_with.map(u => ({
      user_id: u.user_id,
      permission: u.permission || 'view',
      shared_at: new Date().toISOString(),
    }));

    await deckSharing.updateOne(
      { deck_id: deckId },
      {
        $set: {
          shared_with: newSharedWith,
          updated_at: new Date().toISOString(),
        },
      }
    );

    res.json({ success: true, shared_with });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ error: 'Erro ao atualizar permissões' });
  }
});

// POST /api/deck-sharing/:deckId/unshare - Remove sharing
router.post('/:deckId/unshare', async (req, res) => {
  try {
    const { deckId } = req.params;
    const { user_id = null } = req.body; // If null, remove all sharing

    const { flashcardDecks, deckSharing } = getDatabase();

    // Verify deck ownership
    const deck = await flashcardDecks.findOne({ _id: deckId, user_id: req.user.id });
    if (!deck) {
      return res.status(404).json({ error: 'Deck não encontrado' });
    }

    if (user_id) {
      // Remove specific user from sharing
      await deckSharing.updateOne(
        { deck_id: deckId },
        { $pull: { shared_with: { user_id } } }
      );
    } else {
      // Remove all sharing
      await deckSharing.deleteOne({ deck_id: deckId });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Unshare error:', error);
    res.status(500).json({ error: 'Erro ao remover compartilhamento' });
  }
});

// GET /api/deck-sharing/:deckId - Get deck sharing details
router.get('/:deckId', async (req, res) => {
  try {
    const { deckId } = req.params;
    const { flashcardDecks, deckSharing } = getDatabase();

    // Verify access (owner or shared user)
    const deck = await flashcardDecks.findOne({ _id: deckId });
    if (!deck) {
      return res.status(404).json({ error: 'Deck não encontrado' });
    }

    // Check if user is owner or has access
    const isOwner = deck.user_id === req.user.id;
    const sharing = await deckSharing.findOne({ deck_id: deckId });

    if (!isOwner && sharing) {
      const hasAccess = sharing.shared_with.some(u => u.user_id === req.user.id);
      if (!hasAccess && !sharing.is_public) {
        return res.status(403).json({ error: 'Sem acesso a este deck' });
      }
    }

    if (!isOwner && !sharing) {
      return res.status(403).json({ error: 'Sem acesso a este deck' });
    }

    const details = {
      id: deck._id,
      name: deck.name,
      is_owner: isOwner,
      is_public: sharing?.is_public || false,
      public_url: sharing?.public_url || null,
      shared_with: sharing?.shared_with || [],
    };

    res.json(details);
  } catch (error) {
    console.error('Get sharing details error:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes de compartilhamento' });
  }
});

module.exports = router;
