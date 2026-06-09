#!/bin/bash

# Script de teste para a API de Pagamento
# Testa o fluxo completo de checkout

API_BASE_URL="${API_BASE_URL:-http://localhost:3001/api}"
JWT_TOKEN="${JWT_TOKEN:-}"

echo "🧪 Teste de API de Pagamento"
echo "=============================="
echo "Base URL: $API_BASE_URL"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Teste 1: Verificar Status de Pagamento
echo -e "${YELLOW}1️⃣  Teste: GET /api/payment/status${NC}"
if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}❌ Erro: JWT_TOKEN não configurado${NC}"
  echo "Use: export JWT_TOKEN=seu_token"
else
  RESPONSE=$(curl -s -X GET "$API_BASE_URL/payment/status" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json")

  echo "Resposta:"
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  echo ""
fi

# Teste 2: Criar Checkout
echo -e "${YELLOW}2️⃣  Teste: POST /api/payment/create-checkout${NC}"
if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}❌ Erro: JWT_TOKEN não configurado${NC}"
else
  echo "Enviando..."
  RESPONSE=$(curl -s -X POST "$API_BASE_URL/payment/create-checkout" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "planType": "premium"
    }')

  echo "Resposta:"
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

  # Extrair checkout_url se existir
  CHECKOUT_URL=$(echo "$RESPONSE" | jq -r '.checkout_url' 2>/dev/null)
  if [ "$CHECKOUT_URL" != "null" ] && [ -n "$CHECKOUT_URL" ]; then
    echo ""
    echo -e "${GREEN}✅ Checkout URL gerada:${NC}"
    echo "$CHECKOUT_URL"
  fi
  echo ""
fi

# Teste 3: Testar Webhook
echo -e "${YELLOW}3️⃣  Teste: POST /api/payment/webhook${NC}"
echo "Enviando evento de teste (PAYMENT_RECEIVED)..."
RESPONSE=$(curl -s -X POST "$API_BASE_URL/payment/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "test_payment_12345",
      "status": "RECEIVED",
      "value": 50.00,
      "customer": "cus_test",
      "externalReference": "test_user"
    }
  }')

echo "Resposta:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

echo -e "${GREEN}✅ Testes concluídos!${NC}"
echo ""
echo "📝 Próximos passos:"
echo "1. Verifique os logs do backend para erros"
echo "2. Confirme que ASAAS_API_KEY está configurada"
echo "3. Teste o fluxo completo no navegador:"
echo "   - Acesse http://localhost:5173/app/upgrade"
echo "   - Selecione um plano"
echo "   - Informe um CPF/CNPJ válido"
echo "   - Clique em 'Assinar'"
