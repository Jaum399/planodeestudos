# 🚀 GUIA COMPLETO - Setup Automático Vercel + Gemini + Planos

## 📋 O que foi configurado

✅ **API Key Gemini** - Integração automática com Google Gemini AI  
✅ **Preços Dinâmicos** - Gerenciar valores dos planos em tempo real  
✅ **Endpoint Admin** - API `/api/admin` para configurar preços  
✅ **UI Admin** - Página `/app/admin/pricing` para gerenciar preços  
✅ **GitHub Actions** - Workflow automático de setup  

---

## 🎯 OPÇÃO 1: Setup Automático via GitHub Actions (RECOMENDADO)

### Passo 1: Configurar Secrets no GitHub

Vá para seu repositório → **Settings** → **Secrets and variables** → **Actions**

Adicione os seguintes secrets:

```
GOOGLE_GEMINI_API_KEY      (Obtenha em: https://ai.google.dev/aistudio)
VERCEL_TOKEN               (Gere em: https://vercel.com/account/tokens)
VERCEL_PROJECT_ID          (Encontre no dashboard Vercel)
```

Opcionais:
```
PREMIUM_STANDARD_MONTHLY_PRICE    (Padrão: 50.00)
PREMIUM_MONTHLY_PRICE             (Padrão: 49.90)
PREMIUM_MEDHUB_MONTHLY_PRICE      (Padrão: 89.90)
```

### Passo 2: Fazer Push

```bash
git push origin master
```

**O GitHub Actions executará automaticamente e configurará tudo no Vercel!**

---

## 🎯 OPÇÃO 2: Setup Manual via Script Node.js

### Passo 1: Obter Informações Necessárias

1. **Google Gemini API Key**
   - Acesse: https://ai.google.dev/aistudio
   - Clique em "Get API Key"
   - Crie uma chave nova ou use existente

2. **Vercel Token**
   - Acesse: https://vercel.com/account/tokens
   - Clique em "Create Token"
   - Guarde o token (aparece apenas uma vez)

3. **Vercel Project ID**
   - Acesse: https://vercel.com/dashboard
   - Clique no seu projeto
   - Vá para Settings → General
   - Project ID está lá

### Passo 2: Executar Setup

```bash
# Instalação de dependências (já deve estar feito)
npm install

# Executar setup automático
node setup-vercel-auto.js \
  --gemini-key YOUR_GEMINI_KEY \
  --token YOUR_VERCEL_TOKEN \
  --project-id YOUR_PROJECT_ID \
  --basic-price 50.00 \
  --premium-price 49.90 \
  --medhub-price 89.90
```

**Exemplo prático:**
```bash
node setup-vercel-auto.js \
  --gemini-key "AIzaSyDxxxxxxxxxxxxxxxxxxx" \
  --token "3ckv3xxxxxxxxxxxxxx" \
  --project-id "prj_xxxxxxxxxxxxxx"
```

### Passo 3: Fazer Push

```bash
git push origin master
```

---

## ✅ Verificar Setup

### 1. Verificar no Vercel

```bash
vercel env list
```

Você deve ver:
- ✅ GOOGLE_GEMINI_API_KEY
- ✅ PREMIUM_STANDARD_MONTHLY_PRICE
- ✅ PREMIUM_MONTHLY_PRICE
- ✅ PREMIUM_MEDHUB_MONTHLY_PRICE

### 2. Verificar em Produção

Acesse: `https://seu-app.vercel.app/api/admin/status`

Deve retornar:
```json
{
  "status": "operational",
  "services": {
    "gemini": {
      "available": true,
      "model": "gemini-1.5-flash"
    },
    "payment": {
      "available": true,
      "provider": "Asaas"
    }
  },
  "prices": {
    "basic": 50.00,
    "premium": 49.90,
    "medhub": 89.90
  }
}
```

---

## 🎮 Como Usar Admin Pricing

### Acesso

URL: `https://seu-app.vercel.app/app/admin/pricing`

**Nota:** Apenas usuários admin podem acessar. Configure admin users em `.env.local`:

```bash
ADMIN_USER_IDS=user_id_1,user_id_2
```

### Gerenciar Preços

1. Acesse `/app/admin/pricing`
2. Digite o novo preço para cada plano
3. Clique em "Salvar"
4. Alterações entram em vigor imediatamente ✅

---

## 🔄 Fluxo de Funcionamento

```
GitHub Push
    ↓
GitHub Actions dispara
    ↓
setup-vercel-auto.js executa
    ↓
Variáveis adicionadas ao Vercel
    ↓
Vercel faz deploy automático
    ↓
App em produção com Gemini + Preços dinâmicos ✅
```

---

## 📱 APIs Disponíveis

### GET `/api/admin/plans`
Obter configuração atual dos planos

**Autenticação:** Required (authenticate middleware)

**Resposta:**
```json
{
  "plans": {
    "basic": { "name": "Plano Básico", "price": 50.00 },
    "premium": { "name": "Plano Premium", "price": 49.90 },
    "premium_medhub": { "name": "Plano Premium+ MedHub", "price": 89.90 }
  }
}
```

### PUT `/api/admin/plans/:planType/price`
Atualizar preço de um plano

**Autenticação:** Required (admin only)

**Body:**
```json
{
  "price": 59.90
}
```

**Tipos válidos:**
- `basic`, `standard`
- `premium`
- `medhub`, `premium_medhub`

### GET `/api/admin/status`
Status do sistema (Gemini, Payment, DB, etc)

**Autenticação:** Required (admin only)

---

## 🔐 Segurança

✅ **Admin Middleware** - Apenas usuários authorized podem gerenciar preços  
✅ **Gemini API** - Chave armazenada como secret no Vercel  
✅ **Rate Limiting** - Implementado em endpoints de pagamento  
✅ **JWT Auth** - Todos endpoints requerem autenticação  

---

## 🚨 Troubleshooting

### ❌ "VERCEL_TOKEN inválido"
- Gere um novo token em https://vercel.com/account/tokens
- Certifique-se de copiar corretamente (sem espaços)

### ❌ "PROJECT_ID não encontrado"
- Abra seu projeto no Vercel
- Vá para Settings → General
- Copie o "Project ID" exato

### ❌ "GEMINI_KEY não funciona"
- Obtenha em: https://ai.google.dev/aistudio
- Certifique-se de estar com a conta Google autenticada
- Chave deve começar com "AIzaS..."

### ❌ Admin pricing retorna 403
- Adicione seu user_id à variável ADMIN_USER_IDS
- Ou configure no Vercel: Settings → Environment Variables

---

## 📊 Próximos Passos

1. ✅ Configure os secrets no GitHub
2. ✅ Faça um push para disparar GitHub Actions
3. ✅ Verifique status do workflow em GitHub → Actions
4. ✅ Teste endpoints em produção
5. ✅ Acesse `/app/admin/pricing` para gerenciar preços

---

## 📞 Suporte

Se algo não funcionar:

1. Verifique os logs do GitHub Actions
2. Acesse `https://seu-app.vercel.app/api/admin/status`
3. Verifique variáveis de ambiente no Vercel Dashboard
4. Execute novamente: `node setup-vercel-auto.js ...`

---

**Status:** ✅ Pronto para Produção  
**Data:** 2026-06-08
