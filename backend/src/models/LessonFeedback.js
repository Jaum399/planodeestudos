const mongoose = require('mongoose');

const LessonFeedbackSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  lesson_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, maxlength: 800 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

LessonFeedbackSchema.index({ user_id: 1, lesson_id: 1 }, { unique: true });

module.exports = mongoose.model('LessonFeedback', LessonFeedbackSchema);
