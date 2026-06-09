# 🚀 Guia Completo de Deploy - Sistema de Pagamento

## 📋 Checklist de Deploy

- [ ] Preços atualizados para R$ 50.00
- [ ] APIs de pagamento funcionando
- [ ] Webhook configurado no Asaas
- [ ] Testes passando
- [ ] Deploy em produção
- [ ] Monitoramento ativo

---

## 1️⃣ Pré-Deploy: Verificar Tudo Localmente

### Backend
```bash
cd backend
npm install
npm start

# Deve retornar:
# ✅ Database initialized
# ✅ Server running on port 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev

# Deve retornar:
# ✅ VITE ready in XXXms
# ✅ Local: http://localhost:5174
```

### Testar Localmente
```bash
# Em outro terminal
bash test-payment-api.sh

# Deve mostrar:
# ✅ Status de pagamento
# ✅ Checkout criável
# ✅ Webhook recebendo
```

---

## 2️⃣ Deploy: Enviar para Produção

### Step 1: Commit e Push
```bash
git add .
git commit -m "chore: Payment system ready for production"
git push origin master

# GitHub Actions dispara automaticamente
# Vercel deploy em ~2-3 minutos
```

### Step 2: Verificar Deploy
```bash
# Veja status em tempo real
vercel logs --tail

# Procure por:
# ✅ Deployed
# ✅ Production ready
```

### Step 3: Testar URL em Produção
```
https://app-planodeestudos.vercel.app/app/upgrade
```

---

## 3️⃣ Webhook: Configurar Automaticamente

### Option A: GitHub Secrets (Recomendado)

1. Vá para: GitHub > Seu repo > Settings > Secrets and variables > Actions
2. Clique: **New repository secret**
3. Preencha:
   - Name: `ASAAS_API_KEY`
   - Value: Sua chave do Asaas (começa com `$aact_`)
4. Clique: **Add secret**
5. Push qualquer mudança:
   ```bash
   git push origin master
   ```
6. GitHub Actions configura webhook automaticamente

### Option B: Manual via Script

```bash
# Obter chave do Asaas Dashboard
export ASAAS_API_KEY="sua_chave_aqui"

# Executar script
node configure-webhook.js

# Ou em Bash
bash configure-webhook.sh
```

### Option C: Manual no Asaas Dashboard

Se preferir fazer manualmente:

1. Abra: https://www.asaas.com
2. Vá para: Configurações > Webhooks
3. Clique: Adicionar Webhook
4. Preencha:
   - URL: `https://app-planodeestudos.vercel.app/api/payment/webhook`
   - Eventos: Marque todos os 11 eventos
5. Clique: Salvar
6. Teste: Clique em "Testar" (deve retornar ✅)

---

## 4️⃣ Testes: Validar Tudo Funciona

### Teste Local (Sem Pagamento Real)
```bash
bash test-webhook.sh

# Saída esperada:
# ✅ Backend respondendo
# ✅ Webhook endpoint ok
# ✅ Evento processado
```

### Teste em Produção (Com Pagamento)

1. **Criar Conta de Teste**
   ```
   https://app-planodeestudos.vercel.app
   Registre-se com email de teste
   ```

2. **Tentar Pagamento**
   ```
   1. Vá para: /app/upgrade
   2. Selecione plano (R$ 50.00)
   3. Informe CPF válido
   4. Clique: Assinar
   5. Use cartão de teste Asaas (se disponível)
   ```

3. **Verificar Resultado**
   ```bash
   # Veja logs em tempo real
   vercel logs --tail

   # Procure por:
   # ✅ [Asaas] webhook processing success
   # ✅ plan: updated to premium
   ```

---

## 5️⃣ Monitoramento: Acompanhar em Produção

### Logs em Tempo Real
```bash
vercel logs --tail

# Filtrar por erro
vercel logs --tail | grep -i "error\|fail"
```

### Dashboard Vercel
```
https://vercel.com/dashboard
- Veja deployments
- Confira health status
- Monitore usage
```

### Dashboard Asaas
```
https://www.asaas.com
- Veja pagamentos recebidos
- Monitore webhooks
- Consulte histórico
```

---

## 6️⃣ Troubleshooting: Resolver Problemas

### Problema: Pagamento criado mas não confirma
**Solução:**
1. Webhook pode estar atrasado (até 5 minutos)
2. Verifique logs: `vercel logs --tail`
3. Confirme webhook em Asaas Dashboard

### Problema: Erro 401 ao criar webhook
**Solução:**
1. Chave de API expirada
2. Copie novamente do Asaas Dashboard
3. Teste com: `curl -H "Authorization: Bearer $KEY" https://api.asaas.com/v3/customers`

### Problema: Webhook retorna 404
**Solução:**
1. URL está correta?
2. Deploy completou?
3. Verifique: `vercel deployments`

### Problema: Nenhum evento recebido
**Solução:**
1. Webhook configurado corretamente? (veja Asaas Dashboard)
2. URL é acessível? (teste com curl)
3. Todos os 11 eventos estão marcados?

---

## 📊 Estrutura de Diretórios

```
appmentoria-thiago/
├── backend/
│   ├── src/
│   │   └── routes/
│   │       └── payment.js          # APIs de pagamento
│   └── .env                        # Variáveis de ambiente
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── app/
│   │   │   │   ├── Upgrade.tsx     # Página de upgrade
│   │   │   │   └── PaymentSuccess.tsx
│   │   └── services/
│   │       └── api.ts              # Chamadas de API
├── configure-webhook.js            # Script de configuração
├── test-webhook.sh                 # Script de testes
├── CLIENT_SETUP_GUIDE.md           # Guia para cliente
├── PAYMENT_SYSTEM_STATUS.md        # Status técnico
└── WEBHOOK_AUTO_CONFIG.md          # Auto-config docs
```

---

## 🎯 Fluxo Completo

```
┌─────────────────────────────────────┐
│ 1. UPGRADE PAGE                     │
│    - R$ 50.00 / plano              │
│    - Validação CPF/CNPJ            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 2. CREATE CHECKOUT (Backend)        │
│    - POST /api/payment/create-checkout
│    - Retorna checkout_url          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 3. ASAAS CHECKOUT                   │
│    - Cliente escolhe: PIX/Boleto/Cartão
│    - Realiza pagamento             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 4. PAYMENT SUCCESS PAGE             │
│    - Sincroniza status             │
│    - Aguarda confirmação           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 5. ASAAS WEBHOOK                    │
│    - POST /api/payment/webhook     │
│    - Processa evento               │
│    - Atualiza plano do usuário    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 6. DASHBOARD                        │
│    - Premium liberado              │
│    - Funcionalidades ativas        │
└─────────────────────────────────────┘
```

---

## ✅ Status Final

**Sistema pronto para produção:**
- ✅ Código compilado e testado
- ✅ APIs funcionando
- ✅ Preços corretos (R$ 50.00)
- ✅ Métodos de pagamento (PIX, Boleto, Cartão)
- ✅ Webhook pronto para configuração
- ✅ Monitoramento disponível

**Próximo passo:** Configurar webhook no Asaas (5 minutos)

---

## 📞 Suporte

Para dúvidas:
- Documentação técnica: `PAYMENT_SYSTEM_STATUS.md`
- Guia cliente: `CLIENT_SETUP_GUIDE.md`
- Quick setup: `QUICK_WEBHOOK_SETUP.md`
- Auto config: `WEBHOOK_AUTO_CONFIG.md`

---

**Versão**: 1.0.0  
**Data**: 2026-06-09  
**Status**: ✅ Pronto para Produção
