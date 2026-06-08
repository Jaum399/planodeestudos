# 🎯 Chaves Encontradas - Setup Automático

## ✅ Chaves Extraídas do Código

### 1. Asaas Payment API Key ✅
```
$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmJjMWEzMTAyLTRkZjEtNDM2Yi1iMDA2LTFmMDA1NzZmMGViNzo6JGFhY2hfMWE4ZjRkY2QtYzFiOC00ZTJlLWI4MzEtYzQ5MWRmNTc3ZWZm
```

### 2. Preços Padrão ✅
```
PREMIUM_STANDARD_MONTHLY_PRICE=50.00
PREMIUM_MONTHLY_PRICE=49.90
PREMIUM_MEDHUB_MONTHLY_PRICE=89.90
```

### 3. MongoDB URI ✅
```
mongodb+srv://Vercel-Admin-planodeestudos:NiBcgSTGeUXMpNq1@planodeestudos.vya09ut.mongodb.net/?retryWrites=true&w=majority&appName=planodeestudos
```

### 4. JWT Secret ✅
```
mentoria_secret_key_prod_2025_x9k2m8p4q
```

---

## ⚠️ Chaves Faltando

Para completar o setup, você precisa de:

### 1. Google Gemini API Key ❌
**Onde obter:** https://ai.google.dev/aistudio
**Como:** 
1. Acesse o site acima
2. Clique em "Get API Key"
3. Crie uma nova chave
4. Copie o valor que começa com `AIza`

### 2. Vercel Token ❌
**Onde obter:** https://vercel.com/account/tokens
**Como:**
1. Acesse o site acima
2. Clique em "Create Token"
3. Escolha "Scope: Full Account"
4. Copie o token gerado

### 3. Vercel Project ID ❌
**Onde obter:** https://vercel.com/dashboard
**Como:**
1. Clique no seu projeto
2. Vá para Settings → General
3. Copie o "Project ID"

---

## 🚀 Como Usar

### Opção 1: Setup Interativo (Recomendado)

Execute o helper interativo:
```bash
node setup-helper.js
```

Ele vai:
1. Detectar as chaves já encontradas
2. Pedir as chaves faltantes (Gemini, Vercel Token, Project ID)
3. Executar o setup automaticamente

### Opção 2: Setup Via Linha de Comando

Quando tiver as chaves faltantes, execute:

```bash
node setup-vercel-full.js \
  --gemini-key "AIza_sua_chave_aqui" \
  --asaas-key "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmJjMWEzMTAyLTRkZjEtNDM2Yi1iMDA2LTFmMDA1NzZmMGViNzo6JGFhY2hfMWE4ZjRkY2QtYzFiOC00ZTJlLWI4MzEtYzQ5MWRmNTc3ZWZm" \
  --token "seu_vercel_token" \
  --project-id "seu_project_id" \
  --basic-price "50.00" \
  --premium-price "49.90" \
  --medhub-price "89.90"
```

### Opção 3: Setup Via GitHub Actions

1. Defina os secrets do GitHub:
   - `GOOGLE_GEMINI_API_KEY=AIza_...`
   - `ASAAS_API_KEY=$aact_prod_...` (já tem!)
   - `VERCEL_TOKEN=...`
   - `VERCEL_PROJECT_ID=...`

2. Faça push:
   ```bash
   git push origin master
   ```

---

## 📋 Checklist

- [ ] Obter Google Gemini API Key: https://ai.google.dev/aistudio
- [ ] Obter Vercel Token: https://vercel.com/account/tokens
- [ ] Obter Vercel Project ID: https://vercel.com/dashboard
- [ ] Executar: `node setup-helper.js`
- [ ] Verificar no Vercel Dashboard
- [ ] Testar: `https://seu-app.vercel.app/api/admin/status`

---

## 📝 Próximos Passos

1. **Obtenha as 3 chaves faltantes** (Gemini, Token, Project ID)
2. **Execute o setup:**
   ```bash
   node setup-helper.js
   ```
3. **Confirme as variáveis no Vercel Dashboard**
4. **Teste a aplicação**

---

**Tempo estimado:** 5 minutos  
**Dificuldade:** Fácil ✅
