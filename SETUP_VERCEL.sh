#!/bin/bash
# Setup automático de variáveis de ambiente no Vercel

echo "🚀 CONFIGURAÇÃO AUTOMÁTICA - VERCEL + GEMINI + PLANOS"
echo "====================================================="
echo ""

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado."
    echo "📦 Instale com: npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLI encontrado"
echo ""

# Coletar informações
echo "📋 INFORMAÇÕES NECESSÁRIAS:"
echo ""

read -p "📌 Cole sua GOOGLE_GEMINI_API_KEY: " GEMINI_KEY

if [ -z "$GEMINI_KEY" ]; then
    echo "❌ API Key do Gemini é obrigatória!"
    echo "   Obtenha em: https://ai.google.dev/aistudio"
    exit 1
fi

read -p "💰 Preço Plano BASIC (padrão 50.00): " BASIC_PRICE
BASIC_PRICE=${BASIC_PRICE:-50.00}

read -p "💰 Preço Plano PREMIUM (padrão 49.90): " PREMIUM_PRICE
PREMIUM_PRICE=${PREMIUM_PRICE:-49.90}

read -p "💰 Preço Plano PREMIUM+ MedHub (padrão 89.90): " MEDHUB_PRICE
MEDHUB_PRICE=${MEDHUB_PRICE:-89.90}

echo ""
echo "⚙️  CONFIGURANDO VARIÁVEIS DE AMBIENTE..."
echo ""

# Adicionar variáveis ao Vercel
echo "▶ Adicionando GOOGLE_GEMINI_API_KEY..."
vercel env add GOOGLE_GEMINI_API_KEY <<< "$GEMINI_KEY" > /dev/null 2>&1

echo "▶ Adicionando PREMIUM_STANDARD_MONTHLY_PRICE..."
vercel env add PREMIUM_STANDARD_MONTHLY_PRICE <<< "$BASIC_PRICE" > /dev/null 2>&1

echo "▶ Adicionando PREMIUM_MONTHLY_PRICE..."
vercel env add PREMIUM_MONTHLY_PRICE <<< "$PREMIUM_PRICE" > /dev/null 2>&1

echo "▶ Adicionando PREMIUM_MEDHUB_MONTHLY_PRICE..."
vercel env add PREMIUM_MEDHUB_MONTHLY_PRICE <<< "$MEDHUB_PRICE" > /dev/null 2>&1

# Adicionar ao .env.local também
echo ""
echo "▶ Atualizando .env.local..."
{
    echo "GOOGLE_GEMINI_API_KEY=\"$GEMINI_KEY\""
    echo "PREMIUM_STANDARD_MONTHLY_PRICE=\"$BASIC_PRICE\""
    echo "PREMIUM_MONTHLY_PRICE=\"$PREMIUM_PRICE\""
    echo "PREMIUM_MEDHUB_MONTHLY_PRICE=\"$MEDHUB_PRICE\""
} >> .env.local

echo ""
echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo ""
echo "📊 Resumo das configurações:"
echo "   - Gemini API: ✅ Configurada"
echo "   - Plano BASIC: R\$ $BASIC_PRICE"
echo "   - Plano PREMIUM: R\$ $PREMIUM_PRICE"
echo "   - Plano PREMIUM+ MedHub: R\$ $MEDHUB_PRICE"
echo ""
echo "🚀 Próximo passo: git push origin master"
echo "   Vercel fará deploy automático com as novas variáveis"
