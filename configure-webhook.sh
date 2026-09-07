#!/bin/bash

# Script para configurar webhook automaticamente no Asaas
# Configuração automática de webhook para receber eventos de pagamento

set -e

echo "🚀 Configuração Automática de Webhook - Asaas"
echo "=============================================="
echo ""

# Verificar variáveis de ambiente
if [ -z "$ASAAS_API_KEY" ]; then
    echo "❌ Erro: ASAAS_API_KEY não configurado"
    echo "Configure com: export ASAAS_API_KEY=sua_chave"
    exit 1
fi

if [ -z "$ASAAS_ENV" ]; then
    ASAAS_ENV="production"
fi

# Determinar URL base
if [ "$ASAAS_ENV" = "production" ]; then
    API_BASE="https://api.asaas.com/v3"
    WEBHOOK_URL="https://app-planodeestudos.vercel.app/api/payment/webhook"
else
    API_BASE="https://api-sandbox.asaas.com/v3"
    WEBHOOK_URL="https://sandbox-app-planodeestudos.vercel.app/api/payment/webhook"
fi

echo "🔧 Configurações:"
echo "  API Base: $API_BASE"
echo "  Webhook URL: $WEBHOOK_URL"
echo "  Ambiente: $ASAAS_ENV"
echo ""

# Listar webhooks existentes
echo "📋 Verificando webhooks existentes..."
EXISTING_WEBHOOKS=$(curl -s -X GET "$API_BASE/webhooks" \
    -H "Authorization: Bearer $ASAAS_API_KEY" \
    -H "Content-Type: application/json")

echo "Resposta:"
echo "$EXISTING_WEBHOOKS" | grep -o '"url":"[^"]*"' || echo "Nenhum webhook encontrado"
echo ""

# Criar novo webhook
echo "➕ Criando novo webhook..."
echo ""

WEBHOOK_PAYLOAD='{
  "url": "'$WEBHOOK_URL'",
  "events": [
    "PAYMENT_RECEIVED",
    "PAYMENT_CONFIRMED",
    "PAYMENT_CREATED",
    "PAYMENT_AWAITING_RISK_ANALYSIS",
    "PAYMENT_OVERDUE",
    "PAYMENT_DELETED",
    "PAYMENT_REFUNDED",
    "PAYMENT_REFUND_IN_PROGRESS",
    "PAYMENT_CHARGEBACK_REQUESTED",
    "PAYMENT_CHARGEBACK_DISPUTE",
    "PAYMENT_REPROVED_BY_RISK_ANALYSIS"
  ]
}'

RESPONSE=$(curl -s -X POST "$API_BASE/webhooks" \
    -H "Authorization: Bearer $ASAAS_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$WEBHOOK_PAYLOAD")

echo "Resposta:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Verificar se foi bem-sucedido
if echo "$RESPONSE" | grep -q '"id"'; then
    WEBHOOK_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "✅ Webhook criado com sucesso!"
    echo "   ID: $WEBHOOK_ID"
    echo ""

    # Testar webhook
    echo "🧪 Testando webhook..."
    TEST_RESPONSE=$(curl -s -X POST "$API_BASE/webhooks/$WEBHOOK_ID/test" \
        -H "Authorization: Bearer $ASAAS_API_KEY" \
        -H "Content-Type: application/json")

    echo "Resposta do teste:"
    echo "$TEST_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$TEST_RESPONSE"
    echo ""

    if echo "$TEST_RESPONSE" | grep -q '"success":true\|"received":true'; then
        echo "✅ Teste do webhook bem-sucedido!"
        echo "   O webhook está recebendo eventos corretamente"
    else
        echo "⚠️  Webhook criado, mas teste pode ter tido problemas"
        echo "   Verifique os logs: vercel logs --tail"
    fi
else
    echo "❌ Erro ao criar webhook:"
    echo "$RESPONSE"

    if echo "$RESPONSE" | grep -q "INVALID_BEARER_TOKEN\|Unauthorized"; then
        echo ""
        echo "📌 Dica: Verifique se ASAAS_API_KEY está correto"
    fi
    exit 1
fi

echo ""
echo "✅ Configuração completa!"
echo ""
echo "📝 Próximos passos:"
echo "1. Verifique em: https://www.asaas.com (Dashboard > Webhooks)"
echo "2. Você deve ver o webhook listado"
echo "3. Para verificar eventos: vercel logs --tail"
echo "4. Teste a página de upgrade: https://app-planodeestudos.vercel.app/app/upgrade"
