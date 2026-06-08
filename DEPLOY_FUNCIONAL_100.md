# 🚀 DEPLOY FUNCIONAL 100% - Guia Passo a Passo

## 📋 Pré-Requisitos

Você precisa ter:
1. ✅ Conta no Vercel (https://vercel.com)
2. ✅ Projeto criado no Vercel
3. ✅ GitHub CLI instalado (https://cli.github.com)
4. ✅ Conta GitHub com acesso ao repo

## 🔑 Chaves que Você Precisa

| Chave | Onde Obter | Exemplo |
|---|---|---|
| **Gemini API Key** | https://ai.google.dev/aistudio | `AIzaSy...` |
| **Asaas Payment Key** | https://asaas.com/dashboard | `$aact_prod_...` |
| **Vercel Token** | https://vercel.com/account/tokens | `abcd1234...` |
| **Vercel Project ID** | Vercel Dashboard → Settings | `prj_abc123...` |

---

## ⚡ Opção 1: Setup Rápido via Bash (Recomendado)

### Passo 1: Logar no GitHub
```bash
gh auth login
```

### Passo 2: Configurar Secrets Automaticamente
```bash
bash configure-github-secrets.sh
```

Ele vai:
1. Pedir cada chave
2. Adicionar tudo no GitHub automaticamente
3. Pronto para deploy!

### Passo 3: Fazer Deploy
```bash
git add .
git commit -m "chore: setup environment"
git push origin master
```

GitHub Actions rodará automaticamente e configurará tudo no Vercel ✅

---

## ⚙️ Opção 2: Setup Manual via GitHub

### Passo 1: Abrir Secrets do GitHub
```
https://github.com/seu-usuario/seu-repo/settings/secrets/actions
```

### Passo 2: Adicionar Each Secret

**New repository secret** → Clicar + vez para cada:

```
Name: GOOGLE_GEMINI_API_KEY
Value: AIzaSy... (da https://ai.google.dev/aistudio)
```

```
Name: ASAAS_API_KEY
Value: $aact_prod_... (do Asaas)
```

```
Name: VERCEL_TOKEN
Value: ... (de https://vercel.com/account/tokens)
```

```
Name: VERCEL_PROJECT_ID
Value: prj_... (do Vercel Dashboard)
```

### Passo 3: Deploy
```bash
git add .
git commit -m "chore: configure secrets"
git push origin master
```

---

## 🔍 Verificar Se Funcionou

### 1. Ver Logs do GitHub Actions
```
https://github.com/seu-usuario/seu-repo/actions
```

Procure por "Auto Setup" e veja se passou ✅

### 2. Verificar Variáveis no Vercel
```
https://vercel.com/dashboard → seu-projeto → Settings → Environment Variables
```

Você deve ver:
- ✅ GOOGLE_GEMINI_API_KEY
- ✅ ASAAS_API_KEY
- ✅ PREMIUM_STANDARD_MONTHLY_PRICE
- ✅ PREMIUM_MONTHLY_PRICE
- ✅ PREMIUM_MEDHUB_MONTHLY_PRICE

### 3. Testar Admin API
```bash
curl https://seu-app.vercel.app/api/admin/status
```

Ou via navegador:
```
https://seu-app.vercel.app/api/admin/status
```

---

## 📱 Acessar Admin Dashboard

URL: `https://seu-app.vercel.app/app/admin/pricing`

Você pode:
- ✅ Ver preços atuais
- ✅ Editar preços dos planos
- ✅ Ver status de Gemini e Asaas
- ✅ Atualizar chaves via API

---

## 🚨 Se Algo Não Funcionar

### Erro: "GOOGLE_GEMINI_API_KEY não encontrada"
- Verifique se adicionou em Secrets do GitHub
- Verifique se o nome está EXATAMENTE assim: `GOOGLE_GEMINI_API_KEY`
- Aguarde 2-3 minutos após adicionar

### Erro: "Falha ao configurar variável"
- Verifique se VERCEL_TOKEN é válido
- Verifique se VERCEL_PROJECT_ID existe
- Regenere um novo token em https://vercel.com/account/tokens

### GitHub Actions não dispara
- Verifique se está fazendo push para `master`
- Verifique se o arquivo workflow existe: `.github/workflows/auto-setup.yml`
- Tente fazer push novamente

---

## ✅ Checklist de Deploy

- [ ] Coletei as 4 chaves necessárias
- [ ] Executei `bash configure-github-secrets.sh` OU adicionei manualmente
- [ ] Fiz git push para master
- [ ] Aguardei 2-3 minutos
- [ ] Verifiquei que os secrets foram adicionados (GitHub → Settings)
- [ ] Verifiquei que as variáveis estão no Vercel
- [ ] Testei `/api/admin/status`
- [ ] Acessei `/app/admin/pricing` com sucesso

---

## 📞 Suporte Rápido

**Setup com Bash:**
```bash
bash configure-github-secrets.sh
```

**Setup Manual via Node:**
```bash
node setup-helper.js
```

**Setup Completo:**
```bash
node setup-vercel-full.js --auto --ci
```

---

## 🎯 Resultado Final

Após todos os passos, você terá:

✅ Google Gemini AI configurado  
✅ Asaas Payment Gateway configurado  
✅ Preços dinâmicos (R$ 50.00, R$ 49.90, R$ 89.90)  
✅ Admin Dashboard funcional  
✅ APIs de admin para gerenciar tudo  
✅ Deploy automático via GitHub Actions  

---

**Tempo total:** ~5-10 minutos  
**Dificuldade:** Fácil ✅  
**Funcionalidade:** 100% ✅
