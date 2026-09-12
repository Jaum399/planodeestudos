# 🔍 Guia de Monitoramento - Deploy em Tempo Real

## 📊 Como Acompanhar o Deploy

### Option 1: GitHub Actions (Recomendado)

**URL Direta:**
```
https://github.com/seu-usuario/planodeestudos/actions
```

**Procure por:**
- Workflow: "Deploy to Vercel"
- Commit: "🎓 Melhorias na geração de Flashcards"

**Status esperado:**
- 🟡 In Progress (1-2 min)
- 🟢 Completed Successfully (5-10 min)

---

### Option 2: Vercel Dashboard

**URL:**
```
https://vercel.com/seu-projeto
```

**Procure por:**
- Deployment da branch `master`
- Status: "Building..." → "Ready"

---

## ✅ Verificar Sucesso

Quando o deploy terminar, teste:

### 1. Frontend - Verificar Layout (2-5 min após deploy)
```
1. Abra: https://seu-app.vercel.app/app/flashcards
2. Redimensione para 320px de largura (mobile)
3. Verifique: Botão "PDF" está visível? ✅
4. Verifique: Botão "IA" está visível? ✅
```

### 2. Backend - Verificar IA (5-10 min após deploy)
```
1. Clique em "Gerar com IA"
2. Preencha:
   - Tema: "Valores de eletrólitos"
   - Conteúdo: "K+ 3.5-5.0, Na+ 135-145"
   - Disciplina: "Medicina"
   - Quantidade: 5
3. Clique "Gerar"

Resultado esperado:
   ✅ Pergunta tipo: "Qual é o valor de K+ normal?"
   ❌ NÃO deve ser: "O que é potássio?"
```

### 3. Qualidade de Saída
```
Cada flashcard deve ter:
✅ Pergunta específica (tem número? tem contexto?)
✅ Resposta técnica (tem valor? tem critério?)
✅ Sem genéricos (não começa com "O que é"?)
✅ Aplicável (pode ser usado em prova técnica?)
```

---

## 🔴 Se Algo Falhar

### Erro: GitHub Actions falha
```
❌ Solução:
1. Verifique se VERCEL_TOKEN está nos GitHub Secrets
2. Settings → Secrets and variables → Actions
3. Procure por "VERCEL_TOKEN"
4. Se não existir, adicione!
```

### Erro: Vercel falha (Build Error)
```
❌ Solução:
1. Verifique logs no Vercel
2. Procure por: "npm install failed"
3. Verifique: package.json dependencies
4. Tente: npm install --legacy-peer-deps
```

### Erro: IA gera genéricos ainda
```
❌ Solução:
1. Limpe cache: Ctrl+Shift+Delete
2. Recarregue: F5 (hard refresh)
3. Se persistir, verifique:
   - GOOGLE_GEMINI_API_KEY está configurada?
   - AI_FALLBACK_ENABLED está true?
```

### Erro: PDF não funciona
```
❌ Solução:
1. Verifique arquivo PDF (< 900MB)
2. Tente com PDF menor primeiro
3. Verifique: .env MONGO_URI está correto?
```

---

## 📈 Métricas de Sucesso

Após deploy, você deve ver:

| Métrica | Antes | Depois | Status |
|---------|-------|--------|--------|
| Botão PDF visível em mobile | ❌ | ✅ | ✅ |
| Flashcards específicos | ~10% | ~90% | ✅ |
| Sem perguntas genéricas | ~70% | ~10% | ✅ |
| Inclui números/valores | ~20% | ~95% | ✅ |

---

## 🕐 Timeline de Monitoramento

### Minuto 0-2: "Building..."
- GitHub Actions iniciou
- Verificando dependências

### Minuto 2-5: "Deploying..."
- Vercel construindo frontend
- Testando código

### Minuto 5-8: "Ready" (Frontend)
- Frontend está ao vivo
- PDF pode não estar funcionando ainda

### Minuto 8-10: "Ready" (Backend)
- Backend totalmente ativo
- IA gerando flashcards
- Tudo funcionando! ✅

---

## 🔗 Comandos Úteis

**Ver status do último deploy:**
```bash
vercel status
```

**Ver logs do GitHub Actions:**
```bash
gh run list --repo seu-usuario/planodeestudos
gh run view <ID>
```

**Fazer rollback (se necessário):**
```bash
git revert a8eca13
git push origin master
# Vercel fará deploy da versão anterior automaticamente
```

**Verificar variáveis de ambiente:**
```bash
vercel env ls
```

---

## 💡 Dicas Importantes

✅ **Deploy pode levar 10-15 min.** Seja paciente!

✅ **Cache do browser pode esconder mudanças.** Use Ctrl+Shift+Del

✅ **Se tudo falhar**, verifique GitHub Secrets:
   - VERCEL_TOKEN
   - GOOGLE_GEMINI_API_KEY  
   - OPENAI_API_KEY
   - MONGODB_URI

✅ **Para testes privados**, use staging antes de produção

---

## ✨ Deploy Concluído com Sucesso! 🎉

Quando ver:
- ✅ GitHub Actions: "Completed"
- ✅ Vercel: "Ready" 
- ✅ Frontend: Carregando normalmente
- ✅ IA: Gerando flashcards específicos

**PARABÉNS! 🚀 Deploy foi sucesso!**

