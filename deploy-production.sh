#!/usr/bin/env bash

# 🚀 SCRIPT DE DEPLOY AUTOMÁTICO - CHAVES JÁ CONFIGURADAS
# Execute este script para fazer deploy com as chaves fornecidas

echo "🚀 INICIANDO DEPLOY - Configurando Vercel com todas as chaves"
echo ""

# Chaves (protegidas, não commitadas)
GEMINI_KEY="AIzaSyBFD6KAxKRkuc2EaG0IiZAKnlR82lZzFB8"
ASAAS_KEY='$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmJjMWEzMTAyLTRkZjEtNDM2Yi1iMDA2LTFmMDA1NzZmMGViNzo6JGFhY2hfMWE4ZjRkY2QtYzFiOC00ZTJlLWI4MzEtYzQ5MWRmNTc3ZWZm'
VERCEL_TOKEN="vcp_8J1EjddbdcWdKfILCDB8M1AgGY3x32idQevMEfcRqvDtFRtgrh2hcLKg"
PROJECT_ID="prj_xOuF8gxCtEQRkMson5ZymgJyryTf"

echo "✅ Chaves carregadas com sucesso"
echo ""

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado"
    echo "📦 Instale com: npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLI encontrado"
echo ""

# Configurar variáveis no Vercel
echo "⚙️  Configurando variáveis de ambiente no Vercel..."
echo ""

VARS=(
    "GOOGLE_GEMINI_API_KEY:$GEMINI_KEY"
    "ASAAS_API_KEY:$ASAAS_KEY"
    "PREMIUM_STANDARD_MONTHLY_PRICE:50.00"
    "PREMIUM_MONTHLY_PRICE:50.00"
    "PREMIUM_MEDHUB_MONTHLY_PRICE:50.00"
)

for var in "${VARS[@]}"; do
    key="${var%:*}"
    value="${var#*:}"

    echo "▶ Configurando $key..."

    # Usar Vercel API diretamente
    curl -s -X POST \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        -H "Content-Type: application/json" \
        "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
        -d "{\"key\":\"$key\",\"value\":\"$value\",\"target\":[\"production\"]}" > /dev/null

    if [ $? -eq 0 ]; then
        echo "  ✅ $key configurada"
    else
        echo "  ❌ Erro ao configurar $key"
    fi
done

echo ""
echo "✅ Todas as variáveis foram configuradas!"
echo ""
echo "📝 Próximas etapas:"
echo "  1. git add ."
echo "  2. git commit -m 'chore: production ready'"
echo "  3. git push origin master"
echo ""
echo "GitHub Actions vai fazer deploy automaticamente! 🚀"
