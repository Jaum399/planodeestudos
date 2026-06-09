# 🔗 Configuração Automática de Webhook

Scripts para configurar automaticamente o webhook do Asaas.

## 🚀 Opções de Configuração

### 1. Node.js Script (Recomendado)

```bash
ASAAS_API_KEY=sua_chave node configure-webhook.js
```

**Vantagens:**
- ✅ Funciona em qualquer SO (Windows, Mac, Linux)
- ✅ Melhor tratamento de erros
- ✅ Logs detalhados
- ✅ Teste automático do webhook

**Exemplo:**
```bash
ASAAS_API_KEY=your_api_key_here node configure-webhook.js

# Saída esperada:
# ✅ Webhook criado com sucesso!
# ✅ Teste do webhook bem-sucedido!
```

### 2. Bash Script

```bash
ASAAS_API_KEY=sua_chave bash configure-webhook.sh
```

**Requisitos:**
- Bash shell
- curl
- python3 (para formatar JSON)

### 3. GitHub Actions (Automático)

Webhook é configurado automaticamente após cada deploy:

```bash
git push origin master
# GitHub Actions executa configure-webhook.js automaticamente
```

## 📋 Como Obter sua ASAAS_API_KEY

1. Acesse: https://www.asaas.com/login
2. Vá para: **Configurações** > **Chaves de API** (ou similar)
3. Copie sua **Chave de Acesso** (API Key)
4. Use no comando acima

## 🔄 Workflow Automático

Se configurar em GitHub Actions, o webhook será:
1. ✅ Criado automaticamente após cada deploy
2. ✅ Testado para validar entrega
3. ✅ Monitorado via logs

## ⚙️ Configurações Automáticas

O script configura automaticamente:

- **URL**: `https://app-planodeestudos.vercel.app/api/payment/webhook`
- **Eventos** (11 ao total):
  - `PAYMENT_RECEIVED` - Pagamento recebido
  - `PAYMENT_CONFIRMED` - Pagamento confirmado
  - `PAYMENT_CREATED` - Pagamento criado
  - `PAYMENT_AWAITING_RISK_ANALYSIS` - Análise de risco pendente
  - `PAYMENT_OVERDUE` - Pagamento vencido
  - `PAYMENT_DELETED` - Pagamento deletado
  - `PAYMENT_REFUNDED` - Pagamento reembolsado
  - `PAYMENT_REFUND_IN_PROGRESS` - Reembolso em progresso
  - `PAYMENT_CHARGEBACK_REQUESTED` - Chargeback solicitado
  - `PAYMENT_CHARGEBACK_DISPUTE` - Disputa de chargeback
  - `PAYMENT_REPROVED_BY_RISK_ANALYSIS` - Recusado por análise

## 🧪 Verificar Webhook Configurado

Após executar, verifique:

```bash
# Logs em tempo real
vercel logs --tail

# Procure por:
# ✅ [Asaas] webhook processing success
```

## 🐛 Troubleshooting

### Erro: "INVALID_BEARER_TOKEN"
- Verifique se `ASAAS_API_KEY` está correto
- Copie exatamente da Asaas Dashboard

### Erro: "Webhook already exists"
- Webhook já foi configurado
- Você pode deletá-lo na Asaas Dashboard se necessário

### Webhook não recebe eventos
- Verifique se URL está correta
- Confirme que todos os 11 eventos estão marcados
- Teste manualmente no Asaas Dashboard

## 📊 Verificação Manual

Se preferir verificar via Asaas Dashboard:

1. Acesse: https://www.asaas.com
2. Vá para: **Configurações** > **Webhooks** (ou similar)
3. Você deve ver:
   - URL: `https://app-planodeestudos.vercel.app/api/payment/webhook`
   - Status: ✅ Ativo
   - Eventos: 11 configurados

## 🔐 Segurança

O script:
- ✅ Usa HTTPS para todas as requisições
- ✅ Não armazena credenciais
- ✅ Valida respostas da API
- ✅ Requer `ASAAS_API_KEY` válido

## 📝 Desenvolvimento

Para fazer alterações nos scripts:

```bash
# Node.js version
node configure-webhook.js

# Bash version
bash configure-webhook.sh
```

## 🚀 Próximos Passos

Após executar:

1. ✅ Webhook estará configurado
2. ✅ Teste será executado automaticamente
3. ✅ Você verá confirmação de sucesso
4. ✅ Monitorar logs: `vercel logs --tail`
5. ✅ Testar fluxo completo em: `https://app-planodeestudos.vercel.app/app/upgrade`

---

**Criado em**: 2026-06-09  
**Versão**: 1.0.0
