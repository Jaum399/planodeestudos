const express = require('express');
const router = express.Router();
const questionService = require('../services/questionService');

// Criar questão
router.post('/', async (req, res) => {
  try {
    const questao = await questionService.criarQuestao(req.body);
    res.status(201).json(questao);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Listar questões
router.get('/', async (req, res) => {
  try {
    const filtro = req.query || {};
    const questoes = await questionService.listarQuestoes(filtro);
    res.json(questoes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar questão por ID
router.get('/:id', async (req, res) => {
  try {
    const questao = await questionService.buscarQuestaoPorId(req.params.id);
    if (!questao) return res.status(404).json({ error: 'Questão não encontrada' });
    res.json(questao);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar questão
router.put('/:id', async (req, res) => {
  try {
    const questao = await questionService.atualizarQuestao(req.params.id, req.body);
    if (!questao) return res.status(404).json({ error: 'Questão não encontrada' });
    res.json(questao);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Deletar questão
router.delete('/:id', async (req, res) => {
  try {
    const questao = await questionService.deletarQuestao(req.params.id);
    if (!questao) return res.status(404).json({ error: 'Questão não encontrada' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar resposta (estatística)
router.post('/:id/responder', async (req, res) => {
  try {
    const { correta } = req.body;
    const questao = await questionService.registrarResposta(req.params.id, correta);
    if (!questao) return res.status(404).json({ error: 'Questão não encontrada' });
    res.json(questao);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
