#!/bin/bash

# Script para configurar automaticamente os secrets do GitHub
# Uso: bash configure-github-secrets.sh

set -e

echo "🔐 Configurador de Secrets - GitHub Actions"
echo "=============================================="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se gh está instalado
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) não está instalado${NC}"
    echo "Instale em: https://cli.github.com"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI encontrado${NC}"
echo ""

# Verificar autenticação
if ! gh auth status > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Faça login no GitHub:${NC}"
    gh auth login
fi

echo ""
echo "📝 Configurar quais secrets?"
echo ""

# Perguntar quais secrets configurar
read -p "Configurar GOOGLE_GEMINI_API_KEY? (s/n): " setup_gemini
read -p "Configurar ASAAS_API_KEY? (s/n): " setup_asaas
read -p "Configurar VERCEL_TOKEN? (s/n): " setup_vercel_token
read -p "Configurar VERCEL_PROJECT_ID? (s/n): " setup_project_id

echo ""
echo "📌 Cole os valores (em ordem):"
echo ""

if [[ $setup_gemini == "s" || $setup_gemini == "sim" ]]; then
    echo -e "${YELLOW}Google Gemini API Key${NC}"
    echo "Obtenha em: https://ai.google.dev/aistudio"
    read -p "Valor: " gemini_key
fi

if [[ $setup_asaas == "s" || $setup_asaas == "sim" ]]; then
    echo ""
    echo -e "${YELLOW}Asaas Payment API Key${NC}"
    echo "Obtenha em: https://asaas.com/dashboard"
    read -p "Valor: " asaas_key
fi

if [[ $setup_vercel_token == "s" || $setup_vercel_token == "sim" ]]; then
    echo ""
    echo -e "${YELLOW}Vercel Token${NC}"
    echo "Gere em: https://vercel.com/account/tokens"
    read -p "Valor: " vercel_token
fi

if [[ $setup_project_id == "s" || $setup_project_id == "sim" ]]; then
    echo ""
    echo -e "${YELLOW}Vercel Project ID${NC}"
    echo "Encontre em: https://vercel.com/dashboard/[projeto]/settings"
    read -p "Valor: " project_id
fi

echo ""
echo "⚙️  Adicionando secrets ao GitHub..."
echo ""

# Detectar repositório
REPO=$(gh repo view --json nameWithOwner -q 2>/dev/null || echo "")

if [ -z "$REPO" ]; then
    echo -e "${RED}❌ Não foi possível detectar o repositório${NC}"
    read -p "Entre com o repositório (user/repo): " REPO
fi

# Adicionar secrets
if [[ $setup_gemini == "s" || $setup_gemini == "sim" ]] && [ -n "$gemini_key" ]; then
    gh secret set GOOGLE_GEMINI_API_KEY --body "$gemini_key" --repo "$REPO"
    echo -e "${GREEN}✅ GOOGLE_GEMINI_API_KEY adicionado${NC}"
fi

if [[ $setup_asaas == "s" || $setup_asaas == "sim" ]] && [ -n "$asaas_key" ]; then
    gh secret set ASAAS_API_KEY --body "$asaas_key" --repo "$REPO"
    echo -e "${GREEN}✅ ASAAS_API_KEY adicionado${NC}"
fi

if [[ $setup_vercel_token == "s" || $setup_vercel_token == "sim" ]] && [ -n "$vercel_token" ]; then
    gh secret set VERCEL_TOKEN --body "$vercel_token" --repo "$REPO"
    echo -e "${GREEN}✅ VERCEL_TOKEN adicionado${NC}"
fi

if [[ $setup_project_id == "s" || $setup_project_id == "sim" ]] && [ -n "$project_id" ]; then
    gh secret set VERCEL_PROJECT_ID --body "$project_id" --repo "$REPO"
    echo -e "${GREEN}✅ VERCEL_PROJECT_ID adicionado${NC}"
fi

echo ""
echo -e "${GREEN}✨ Secrets configurados com sucesso!${NC}"
echo ""
echo "Próximos passos:"
echo "1. git add ."
echo "2. git commit -m 'chore: setup environment'"
echo "3. git push origin master"
echo "4. GitHub Actions executará automaticamente"
echo ""
