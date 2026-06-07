const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  enunciado: { type: String, required: true },
  alternativas: [
    {
      texto: { type: String, required: true },
      correta: { type: Boolean, default: false },
    },
  ],
  explicacao: { type: String },
  categoria: { type: String },
  subcategoria: { type: String },
  nivel: { type: String, enum: ['fácil', 'médio', 'difícil'], default: 'médio' },
  tags: [String],
  estatisticas: {
    respondidas: { type: Number, default: 0 },
    corretas: { type: Number, default: 0 },
  },
  criadaPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  criadaEm: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Question', QuestionSchema);