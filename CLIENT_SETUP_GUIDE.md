# 🎯 Guia de Configuração Final - Para Cliente/Admin

## Status: Sistema Pronto para Produção ✅

O sistema de pagamento foi completamente configurado e testado. Faltam apenas **passos manuais no dashboard Asaas** para ativar os webhooks.

---

## ⚡ O Que Foi Implementado

### ✅ Backend
- API de pagamento com suporte a PIX, Boleto e Cartão
- Validação de CPF/CNPJ
- Sincronização automática de status
- Webhook para receber confirmações de pagamento

### ✅ Frontend
- Página de upgrade com 3 planos a R$ 50.00/mês cada
- Checkout integration com Asaas
- Página de sucesso com sincronização de status
- Erro handling completo

### ✅ Ambiente
- Variáveis de preço atualizadas em Vercel
- GitHub Actions configurado para auto-deploy
- Logs disponíveis via `vercel logs --tail`

---

## 🔧 APENAS 1 PASSO NECESSÁRIO

### Registrar Webhook no Asaas

#### Passo 1: Acessar Dashboard Asaas
1. Vá para: https://www.asaas.com/login
2. Faça login com suas credenciais

#### Passo 2: Ir para Webhooks
- Clique em: **Configurações** (ou Settings)
- Procure por: **Webhooks**, **Integrações** ou **API**
- Clique em: **Adicionar Webhook** ou **+ Novo**

#### Passo 3: Preencher Formulário

| Campo | Valor |
|-------|-------|
| **URL do Webhook** | `https://app-planodeestudos.vercel.app/api/payment/webhook` |
| **Descrição** | Sistema de Assinatura - App Mentoria |
| **Eventos** | Ver checklist abaixo |

#### Passo 4: Marcar Eventos

Marque ✅ para TODOS os eventos:
- [ ] PAYMENT_RECEIVED
- [ ] PAYMENT_CONFIRMED
- [ ] PAYMENT_CREATED
- [ ] PAYMENT_AWAITING_RISK_ANALYSIS
- [ ] PAYMENT_OVERDUE
- [ ] PAYMENT_DELETED
- [ ] PAYMENT_REFUNDED
- [ ] PAYMENT_REFUND_IN_PROGRESS
- [ ] PAYMENT_CHARGEBACK_REQUESTED
- [ ] PAYMENT_CHARGEBACK_DISPUTE
- [ ] PAYMENT_REPROVED_BY_RISK_ANALYSIS

#### Passo 5: Salvar e Testar

1. Clique em: **Salvar** ou **Criar**
2. Asaas enviará um teste automático
3. Você verá: ✅ **Entregue com Sucesso**

---

## 🧪 Verificar se Funcionou

### Teste Rápido (Sem Pagamento Real)

1. **Abra a página de upgrade**:
   ```
   https://app-planodeestudos.vercel.app/app/upgrade
   ```

2. **Crie uma conta de teste** (ou faça login)

3. **Selecione um plano** (R$ 50.00)

4. **Informe um CPF válido** (formato: 123.456.789-00)

5. **Clique em "Assinar"**
   - Você será redirecionado para checkout do Asaas
   - Em sandbox, você pode usar cartão de teste

### Verificar Logs

```bash
vercel logs --tail
```

Procure por:
- `[Asaas] create-checkout success`
- `[Asaas] webhook processing success`
- Qualquer erro com `[Asaas]`

---

## 📊 Informações de Referência

### Endpoints da API

```
GET  /api/payment/status        - Verifica plano do usuário
POST /api/payment/create-checkout - Cria checkout
POST /api/payment/webhook        - Recebe eventos Asaas
```

### Métodos de Pagamento Aceitos

Quando o cliente vai para checkout, pode escolher:
1. **PIX** - Pagamento instantâneo por QR code
2. **Boleto** - Código de barras para pagar em qualquer banco
3. **Cartão de Crédito** - Débito instantâneo

### Planos

Todos os planos agora custam **R$ 50.00/mês** com renovação automática:
- Básico
- Premium (destaque)
- Premium+

---

## ⚠️ Resolução de Problemas

### Webhook não está recebendo eventos

**Solução**:
1. Confirme a URL está exatamente como acima
2. No dashboard Asaas, clique no webhook criado
3. Procure por "Testar" ou "Test"
4. Clique para enviar um teste
5. Você deve ver: ✅ **Entregue**

### Checkout retorna erro

**Solução**:
1. Verifique se ASAAS_API_KEY está correto em Vercel
   - Vá para: Vercel Project > Settings > Environment Variables
   - Procure por: `ASAAS_API_KEY`
2. Se estiver vazio, copie a chave do seu dashboard Asaas

### Pagamento confirmado mas usuário não vira premium

**Solução**:
1. Webhook pode estar atrasado (até 5 minutos)
2. Usuário deve esperar na página ou recarregar
3. Você pode ver status manual em: `/api/payment/status`

---

## 📈 Monitoramento em Produção

### Dashboard Vercel
- URL: https://vercel.com/dashboard
- Veja deployments e logs em tempo real

### Asaas Dashboard
- URL: https://www.asaas.com
- Veja pagamentos recebidos
- Monitore webhooks

### Logs
```bash
# Ver logs em tempo real
vercel logs --tail

# Ver últimos 100 logs
vercel logs

# Ver logs de erro
vercel logs --tail | grep -i error
```

---

## 🚀 Checklist Final

Antes de colocar em produção, confirme:

- [ ] Webhook registrado no Asaas
- [ ] Webhook testado com sucesso (✅ Entregue)
- [ ] ASAAS_API_KEY configurado em Vercel
- [ ] Todos os 3 planos exibem R$ 50.00
- [ ] Página de upgrade está no ar: app-planodeestudos.vercel.app/app/upgrade
- [ ] Logs mostram atividade (verifique com `vercel logs --tail`)
- [ ] Suporte foi treinado sobre o novo sistema

---

## 📞 Dúvidas Frequentes

### P: Como adicionar mais um método de pagamento?
**R**: Não necessário - Asaas já oferece PIX, Boleto e Cartão. Se quiser adicionar outro (ex: Apple Pay), entre em contato com Asaas.

### P: Como permitir que clientes cancelem assinatura?
**R**: Implementação futura. Por enquanto, cancele manualmente no dashboard Asaas.

### P: Como rastrear pagamentos?
**R**: Ver no dashboard Asaas > Pagamentos. Cada pagamento tem ID único.

### P: Quanto tempo leva para confirmar pagamento?
**R**: 
- PIX: instantâneo (segundos)
- Boleto: 1-3 dias úteis
- Cartão: instantâneo

---

## 🎓 Referências Técnicas

- **Documentação Asaas**: https://docs.asaas.com
- **Webhook Events**: Veja `WEBHOOK_SETUP.md`
- **Arquitetura**: Veja `PAYMENT_SYSTEM_STATUS.md`
- **Testes**: Execute `bash test-payment-api.sh`

---

**Status**: ✅ **Pronto para Produção**  
**Data**: 2026-06-09  
**Versão**: 1.0.0

Qualquer dúvida, consulte os documentos de referência ou verifique os logs com `vercel logs --tail`.
