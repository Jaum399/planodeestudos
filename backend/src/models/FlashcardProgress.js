const mongoose = require('mongoose');

const flashcardProgressSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // `${user_id}_${deck_id}`
  user_id: { type: String, required: true },
  deck_id: { type: String, required: true },
  last_reviewed_at: { type: String, required: true },
  reviewed_count: { type: Number, default: 0 },
  correct_count: { type: Number, default: 0 },
  wrong_count: { type: Number, default: 0 },
  last_card_id: { type: String, default: null },
  last_card_at: { type: String, default: null },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
});

flashcardProgressSchema.index({ user_id: 1, deck_id: 1 }, { unique: true });

module.exports = mongoose.model('FlashcardProgress', flashcardProgressSchema);
