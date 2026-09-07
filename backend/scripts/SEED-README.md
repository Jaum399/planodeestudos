# 🌱 Seed de Trilhas e Aulas - Guia de Uso

## 📋 O que é?

O seed popula seu banco MongoDB com dados iniciais de trilhas (cursos) e aulas (lições) com URLs reais de vídeo. Isso permite testar toda a funcionalidade de vídeos, progresso, feedback e desbloqueio progressivo.

## 📦 Arquivos

- **`seed-data.json`** - Dados em formato JSON (4 trilhas, 18 aulas com URLs de vídeo)
- **`import-seed-data.js`** - Script para importar dados no MongoDB
- **`seed-courses-lessons-v2.js`** - Script legacy (use `import-seed-data.js` em vez deste)

## 🚀 Como Usar

### Opção 1: MongoDB Local (Recomendado para Desenvolvimento)

Se você quiser testar localmente:

```bash
# 1. Instale MongoDB Community Edition
#    Windows: https://www.mongodb.com/try/download/community
#    macOS: brew install mongodb-community
#    Linux: https://docs.mongodb.com/manual/administration/install-on-linux/

# 2. Inicie o MongoDB local
mongod

# 3. Configure a URI no .env
echo "MONGO_URI_LOCAL=mongodb://localhost:27017/ordex" >> backend/.env

# 4. Execute o script de importação
cd backend
node scripts/import-seed-data.js
```

### Opção 2: MongoDB Atlas com IP Whitelist

Se você usa MongoDB Atlas:

```bash
# 1. Verifique se seu IP está na whitelist
#    MongoDB Atlas > Security > Network Access > Add Current IP

# 2. Verifique conectividade
npm run seed:courses

# Se falhar, tente:
node scripts/import-seed-data.js
```

### Opção 3: Importar Manualmente via MongoDB Compass

Se os scripts não funcionarem:

1. Abra MongoDB Compass
2. Conecte ao seu banco (local ou Atlas)
3. Crie collection: `courses` e `lessons`
4. Selecione "Add Data" > "Import JSON"
5. Use os dados de `seed-data.json` para cada collection

## 📊 Dados Criados

### Trilhas (Courses)
1. **Fundamentos de Alto Rendimento** (FREE - 4 aulas)
   - Introdução, Gestão de Tempo, Memorização, Foco
   
2. **Sprint de Questões e Simulados** (PREMIUM - 5 aulas)
   - Estratégia, Análise de Erros, Sprint, Simulado, Gabarito

3. **Revisão Estratégica Final** (PREMIUM - 4 aulas)
   - Roteiro, Conceitos, Questões Recorrentes, Mentoria

4. **Aprofundamento por Assunto** (PREMIUM - 4 aulas)
   - Tópico 1 & 2 com Conceitos e Práticas

### Total
- **4 trilhas**
- **17 aulas**
- Todas com URLs de vídeo funcionais (YouTube)
- Mix de aulas free e premium

## 🎬 URLs de Vídeo

As aulas usam URLs públicas do YouTube para testes:
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (12min)
- E outras URLs públicas de educação

Para adicionar URLs reais:
1. Edite `seed-data.json`
2. Mude o campo `videoUrl` de cada aula
3. Re-execute `import-seed-data.js`

## ✅ Verificação

Após importar, você pode verificar:

```bash
# Terminal 1 - Inicie o backend
cd backend
npm run dev

# Terminal 2 - Teste as APIs
curl http://localhost:3001/api/lessons
curl http://localhost:3001/api/lessons/courses/roadmap

# Frontend - Veja os dados visualmente
cd frontend
npm run dev
# Abra http://localhost:5173/app/lessons
```

## 🧪 Teste Completo

1. **Abra a página de Aulas**
   - Você deve ver 4 trilhas listadas
   - Trilhas premium mostram cadeado
   - Aulas free são acessíveis

2. **Selecione uma Aula Free**
   - Clique em "Fundamentos de Alto Rendimento" > "Introdução..."
   - O vídeo deve carregar (YouTube embed)
   - Você pode reproduzir e pausar

3. **Marque como Concluída**
   - Ao final do vídeo, clique "Marcar como Concluída"
   - A próxima aula deve ser desbloqueada

4. **Deixe Feedback**
   - Abaixo do vídeo, selecione uma avaliação (1-5 ⭐)
   - Deixe um comentário opcional
   - Clique "Enviar Feedback"

5. **Verifique Progresso**
   - Vá até "Cursos" e veja a % de conclusão

## 🐛 Troubleshooting

### Erro: `ECONNREFUSED`
- **Causa**: MongoDB não está acessível
- **Solução**: 
  - Se local: execute `mongod`
  - Se Atlas: verifique IP whitelist e conexão internet

### Erro: `Arquivo não encontrado: seed-data.json`
- **Causa**: Você não está no diretório `backend`
- **Solução**: `cd backend && node scripts/import-seed-data.js`

### Dados não aparecem no frontend
- **Causa**: Cache do browser ou API não respondendo
- **Solução**:
  - Hard refresh: Ctrl+Shift+R
  - Verifique console do navegador (F12)
  - Verifique se backend está rodando (npm run dev)

### Videos não carregam
- **Causa**: URL inválida ou internet offline
- **Solução**:
  - Use URLs públicas do YouTube
  - Verifique campo `videoUrl` em seed-data.json
  - Teste a URL diretamente no navegador

## 📝 Editar Dados do Seed

Para adicionar/modificar aulas:

1. Edite `backend/scripts/seed-data.json`:
```json
{
  "course_index": 0,
  "title": "Nova Aula",
  "description": "Descrição...",
  "videoUrl": "https://www.youtube.com/watch?v=...",
  "duration_seconds": 1200,
  "order": 5,
  "tags": ["tag1", "tag2"],
  "free": true,
  "published": true
}
```

2. Limpe os dados antigos (opcional):
```javascript
// No MongoDB Compass ou mongo shell:
db.courses.deleteMany({})
db.lessons.deleteMany({})
```

3. Re-execute o script:
```bash
node scripts/import-seed-data.js
```

## 🚀 Próximos Passos

Após seed com sucesso:

- [ ] Testar todos os vídeos no navegador
- [ ] Marcar algumas aulas como concluídas
- [ ] Deixar feedback/ratings
- [ ] Verificar desbloqueio progressivo das trilhas
- [ ] Fazer build do frontend (`npm run build`)
- [ ] Fazer deploy em produção

## 📚 Referências

- [MongoDB Compass](https://www.mongodb.com/try/download/compass)
- [MongoDB Local Quickstart](https://www.mongodb.com/docs/manual/installation/)
- [MongoDB Atlas Network Access](https://www.mongodb.com/docs/atlas/security-whitelist/)
- [YouTube Embed API](https://developers.google.com/youtube/iframe_api_reference)

---

**💡 Dúvidas?** Execute `node scripts/import-seed-data.js` com output detalhado:
```bash
node -e "console.log(JSON.stringify(require('./seed-data.json'), null, 2))"
```
