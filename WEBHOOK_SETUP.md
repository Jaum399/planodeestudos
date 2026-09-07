# Configuração de Webhook - Asaas

## URLs de Webhook

### Produção
```
https://app-planodeestudos.vercel.app/api/payment/webhook
```

### Sandbox (Testes)
```
https://<seu-dominio-sandbox>.vercel.app/api/payment/webhook
```

## Passos para Configurar no Asaas

### 1. Acessar Dashboard Asaas
- Vá para: https://www.asaas.com/login
- Faça login com as credenciais de produção ou sandbox
- Navegue para: **Configurações > Webhooks** (ou Similar)

### 2. Registrar Webhook
- Clique em "Adicionar Webhook" ou "Nova Integração"
- URL do Webhook: Cole a URL acima (produção)
- Eventos a Receber:
  - ✅ `PAYMENT_RECEIVED` - Pagamento recebido
  - ✅ `PAYMENT_CONFIRMED` - Pagamento confirmado
  - ✅ `PAYMENT_CREATED` - Pagamento criado
  - ✅ `PAYMENT_AWAITING_RISK_ANALYSIS` - Aguardando análise de risco
  - ✅ `PAYMENT_OVERDUE` - Pagamento vencido
  - ✅ `PAYMENT_DELETED` - Pagamento deletado
  - ✅ `PAYMENT_REFUNDED` - Pagamento reembolsado
  - ✅ `PAYMENT_CHARGEBACK_REQUESTED` - Chargeback solicitado

### 3. Teste de Entrega
Após salvar, o Asaas enviará um teste. Você verá em logs:
```
[Asaas] webhook processing success
```

## Verificar Configuração

### Logs em Tempo Real
```bash
# Em produção (Vercel)
vercel logs <project-id> --tail

# Localmente (durante desenvolvimento)
npm run dev:backend
# Veja os logs de webhook no console
```

### Payload de Exemplo
```json
{
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_xxx",
    "status": "RECEIVED",
    "value": 50.00,
    "customer": "cus_xxx",
    "externalReference": "user_id_xxx"
  }
}
```

## Fluxo de Pagamento Completo

1. **Frontend**: Usuário clica em "Assinar"
2. **Backend POST /api/payment/create-checkout**:
   - Valida CPF/CNPJ
   - Cria customer no Asaas (se necessário)
   - Cria pagamento com `billingType: 'UNDEFINED'` (cliente escolhe: PIX, boleto ou cartão)
   - Retorna `checkout_url`
3. **Asaas Checkout**: Usuário escolhe método de pagamento
4. **Asaas Webhook**: Envia evento quando pagamento é confirmado
5. **Backend Webhook Handler**:
   - Valida o pagamento com Asaas
   - Atualiza `user.plan` para o plano selecionado
   - Envia email de confirmação
6. **Frontend**: PaymentSuccess.tsx verifica status
   - Sincroniza com `/api/payment/status`
   - Redireciona para dashboard quando confirmado

## Variáveis de Ambiente Necessárias

```env
# Asaas
ASAAS_API_KEY=<sua-chave-api>
ASAAS_ENV=production  # ou 'sandbox' para testes

# Planos (R$ 50.00 cada)
PREMIUM_STANDARD_MONTHLY_PRICE=50.00
PREMIUM_MONTHLY_PRICE=50.00
PREMIUM_MEDHUB_MONTHLY_PRICE=50.00

# Métodos de Pagamento (configurado no backend)
# billingType: UNDEFINED = PIX, Boleto, Cartão
```

## Testes Locais

### 1. Iniciar Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Iniciar Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Testar Página de Upgrade
- Acesse: http://localhost:5173/app/upgrade
- Selecione um plano (R$ 50.00)
- Informe CPF/CNPJ válido
- Clique em "Assinar"
- Você será redirecionado para o checkout do Asaas

### 4. Simular Pagamento (Sandbox)
- Use cartão de teste: `4111111111111111`
- Qualquer data futura
- Qualquer CVV

## Troubleshooting

### Erro: "Asaas não retornou URL de checkout"
- Verifique ASAAS_API_KEY
- Confirme que o customer foi criado
- Veja logs: `await asaasRequest('POST', '/payments', payload)`

### Webhook não dispara
- Confirme URL na configuração do Asaas
- Teste manualmente: Asaas Dashboard > Webhooks > "Testar"
- Verifique firewall/CORS

### Pagamento confirmado mas status não atualiza no frontend
- Webhook pode estar atrasado (até 5 minutos)
- Frontend tenta 6 vezes a cada 2 segundos (12 segundos total)
- Usuário pode clicar "Voltar para Dashboard" manualmente

## Endpoints de Referência

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/payment/status` | GET | Verifica status do plano |
| `/api/payment/create-checkout` | POST | Cria checkout no Asaas |
| `/api/payment/portal` | GET | Portal de gerenciamento (não implementado) |
| `/api/payment/webhook` | POST | Recebe eventos do Asaas |

