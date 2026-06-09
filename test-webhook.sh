#!/bin/bash

# Script de teste para verificar se webhook está funcionando
# Testa a integração completa Asaas + Backend

echo "🧪 Teste de Webhook - Asaas Integration"
echo "======================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

WEBHOOK_URL="https://app-planodeestudos.vercel.app/api/payment/webhook"
API_BASE="https://app-planodeestudos.vercel.app/api"

echo "🔍 Verificando componentes..."
echo ""

# Test 1: Backend está rodando
echo "1️⃣  Testando conexão com backend..."
BACKEND_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/payment/status" \
  -H "Authorization: Bearer test_token")

if [ "$BACKEND_TEST" = "401" ]; then
  echo -e "${GREEN}✅ Backend respondendo (401 é esperado sem autenticação)${NC}"
elif [ "$BACKEND_TEST" = "200" ]; then
  echo -e "${GREEN}✅ Backend respondendo normalmente${NC}"
else
  echo -e "${RED}❌ Backend não respondeu (código: $BACKEND_TEST)${NC}"
  echo "   Verifique: vercel logs --tail"
  exit 1
fi
echo ""

# Test 2: Webhook endpoint existe
echo "2️⃣  Testando endpoint webhook..."
WEBHOOK_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"event": "TEST", "payment": {"id": "test"}}')

if [ "$WEBHOOK_TEST" = "200" ] || [ "$WEBHOOK_TEST" = "400" ]; then
  echo -e "${GREEN}✅ Webhook endpoint respondendo${NC}"
elif [ "$WEBHOOK_TEST" = "404" ]; then
  echo -e "${RED}❌ Webhook endpoint não encontrado${NC}"
  exit 1
else
  echo -e "${YELLOW}⚠️  Webhook retornou código $WEBHOOK_TEST${NC}"
fi
echo ""

# Test 3: Testar webhook com evento válido
echo "3️⃣  Enviando evento de teste para webhook..."
RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_test_12345",
      "status": "RECEIVED",
      "value": 50.00,
      "externalReference": "test_user"
    }
  }')

echo "Resposta: $RESPONSE"

if echo "$RESPONSE" | grep -q "received\|success\|ignored"; then
  echo -e "${GREEN}✅ Webhook processou evento${NC}"
else
  echo -e "${YELLOW}⚠️  Webhook respondeu de forma inesperada${NC}"
fi
echo ""

# Test 4: Verificar URL em Asaas Dashboard
echo "4️⃣  Verificação manual necessária..."
echo "   Abra: https://www.asaas.com"
echo "   Vá para: Configurações > Webhooks"
echo "   Procure pela URL: $WEBHOOK_URL"
echo ""

echo "5️⃣  Testar fluxo completo..."
echo "   1. Acesse: https://app-planodeestudos.vercel.app/app/upgrade"
echo "   2. Crie conta e selecione um plano"
echo "   3. Complete pagamento"
echo "   4. Verifique logs: vercel logs --tail"
echo ""

echo -e "${GREEN}✅ Testes básicos concluídos!${NC}"
echo ""
echo "📝 Se tudo passou, webhook está configurado corretamente."
echo "   Se houver problemas, execute:"
echo "   $ vercel logs --tail"
