const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  videoUrl: { type: String, required: true }, // Suporta YouTube, Vimeo ou upload próprio
  duration: { type: String },
  duration_seconds: { type: Number, default: 0 },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  tags: [{ type: String }],
  free: { type: Boolean, default: false },
  published: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Lesson', LessonSchema);
