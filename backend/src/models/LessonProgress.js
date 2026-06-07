const mongoose = require('mongoose');

const LessonProgressSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  lesson_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
  watched_seconds: { type: Number, default: 0 },
  duration_seconds: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  last_position_seconds: { type: Number, default: 0 },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

LessonProgressSchema.index({ user_id: 1, lesson_id: 1 }, { unique: true });

module.exports = mongoose.model('LessonProgress', LessonProgressSchema);
