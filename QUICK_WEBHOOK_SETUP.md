# 🎯 Configuração Rápida de Webhook (5 minutos)

## ⚡ Passo 1: Obter sua Chave de API Asaas

1. Acesse: https://www.asaas.com/login
2. Faça login
3. Vá para: **Configurações > API > Chaves de API** (ou similar)
4. Copie a chave que começa com `$aact_`
5. **Importante**: Use a chave de PRODUÇÃO se já estiver em produção

## ⚡ Passo 2: Executar Script de Configuração

### Option A: Node.js (Recomendado)

```bash
cd /path/to/appmentoria-thiago

# Windows (PowerShell)
$env:ASAAS_API_KEY = "sua_chave_aqui"
node configure-webhook.js

# Mac/Linux (Bash)
ASAAS_API_KEY="sua_chave_aqui" node configure-webhook.js
```

### Option B: Bash Script

```bash
# Mac/Linux
ASAAS_API_KEY="sua_chave_aqui" bash configure-webhook.sh

# Windows (Git Bash)
ASAAS_API_KEY="sua_chave_aqui" bash configure-webhook.sh
```

### Option C: GitHub Actions (Automático)

1. Vá para: GitHub > Seu repositório > Settings > Secrets and variables > Actions
2. Adicione secret: `ASAAS_API_KEY` com seu token
3. Push para master
4. GitHub Actions configura automaticamente

## ✅ Verificar Sucesso

Após executar, você verá:

```
✅ Webhook criado com sucesso!
✅ Teste do webhook bem-sucedido!
```

## 🔍 Verificar no Dashboard

1. Abra: https://www.asaas.com
2. Vá para: Configurações > Webhooks
3. Você deve ver:
   - URL: `https://app-planodeestudos.vercel.app/api/payment/webhook`
   - Status: ✅ Ativo

## 🧪 Testar Tudo Funcionando

1. Acesse: https://app-planodeestudos.vercel.app/app/upgrade
2. Clique em "Assinar"
3. Complete o checkout
4. Veja os logs: `vercel logs --tail`

## ❌ Se Não Funcionar

### Erro: "401 Unauthorized"
- Chave de API inválida ou expirada
- Copie novamente da Asaas Dashboard

### Erro: "Webhook already exists"
- Webhook já foi criado
- Pode deletar e recriar

### Webhook não recebe eventos
- Teste manualmente no Asaas Dashboard
- Veja logs: `vercel logs --tail`

## 🚀 Próximos Passos Após Setup

1. Webhook configurado ✅
2. Testar com pagamento de teste
3. Colocar em produção
4. Monitorar logs

---

**Tempo estimado**: 5 minutos  
**Dificuldade**: Fácil
