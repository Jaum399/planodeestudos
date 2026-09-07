// Utilitários para CRUD de questões
const Question = require('../models/Question');

// Criar questão
async function criarQuestao(data) {
  const questao = new Question(data);
  return await questao.save();
}

// Listar questões (com filtros opcionais)
async function listarQuestoes(filtro = {}, limit = 50, skip = 0) {
  return await Question.find(filtro).limit(limit).skip(skip);
}

// Buscar questão por ID
async function buscarQuestaoPorId(id) {
  return await Question.findById(id);
}

// Atualizar questão
async function atualizarQuestao(id, data) {
  return await Question.findByIdAndUpdate(id, data, { new: true });
}

// Deletar questão
async function deletarQuestao(id) {
  return await Question.findByIdAndDelete(id);
}

// Estatísticas de acerto
async function registrarResposta(id, correta) {
  const questao = await Question.findById(id);
  if (!questao) return null;
  questao.estatisticas.respondidas += 1;
  if (correta) questao.estatisticas.corretas += 1;
  await questao.save();
  return questao;
}

module.exports = {
  criarQuestao,
  listarQuestoes,
  buscarQuestaoPorId,
  atualizarQuestao,
  deletarQuestao,
  registrarResposta,
};
