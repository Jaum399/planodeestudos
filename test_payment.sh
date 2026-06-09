#!/bin/bash

# Test Payment API Endpoints
echo "🧪 Teste de Endpoints de Pagamento"
echo "===================================="
echo ""

# Test 1: Create a test account or login
echo "1️⃣ Criando/obtendo token de teste..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty' 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Usuário não existe, criando..."
  REGISTER_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test User",
      "email": "test@example.com",
      "password": "password123",
      "billingDocument": "12345678901"
    }')
  
  TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token // empty' 2>/dev/null)
  echo "Token obtido: ${TOKEN:0:20}..."
else
  echo "✅ Login bem-sucedido"
  echo "Token: ${TOKEN:0:20}..."
fi

if [ -z "$TOKEN" ]; then
  echo "❌ Erro: Não foi possível obter token"
  exit 1
fi

echo ""

# Test 2: Check payment status
echo "2️⃣ Verificando status de pagamento..."
curl -s -X GET "http://localhost:3001/api/payment/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq . 2>/dev/null || echo "Erro na requisição"

echo ""

# Test 3: Create a checkout (will fail if ASAAS_API_KEY not set)
echo "3️⃣ Criando checkout de pagamento..."
curl -s -X POST "http://localhost:3001/api/payment/create-checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "premium"
  }' | jq . 2>/dev/null || echo "Erro na requisição"

echo ""
echo "✅ Teste concluído!"
