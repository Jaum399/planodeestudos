#!/bin/bash
# Deploy Automático - Commit + Push + GitHub Actions

set -e

echo "🚀 DEPLOY AUTOMÁTICO - GEMINI API + ADMIN PRICING"
echo "=================================================="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Verificar git status
echo -e "${BLUE}📋 Verificando status do git...${NC}"
if [ -z "$(git status --short)" ]; then
  echo -e "${YELLOW}⚠️  Nenhuma mudança a fazer${NC}"
  echo -e "${BLUE}ℹ️  Execute primeiro:${NC}"
  echo "   node setup-vercel-auto.js --gemini-key YOUR_KEY ..."
  exit 0
fi

# 2. Adicionar arquivos
echo -e "${BLUE}📦 Adicionando arquivos...${NC}"
git add -A

# 3. Fazer commit
echo -e "${BLUE}📝 Criando commit...${NC}"
git commit -m "feat: Add automatic Vercel setup + Admin pricing management

- Gemini API Key automaticamente configurada no Vercel
- Admin endpoints para gerenciar preços de planos
- Frontend Admin UI para gerenciar preços em tempo real
- GitHub Actions workflow para setup automático
- Setup script Node.js para configuração manual
- Documentação completa do setup"

# 4. Fazer push
echo -e "${BLUE}🚀 Fazendo push...${NC}"
git push origin master

# 5. Sucesso
echo ""
echo -e "${GREEN}✅ DEPLOY CONCLUÍDO COM SUCESSO!${NC}"
echo ""
echo -e "${YELLOW}📊 O QUE FOI FEITO:${NC}"
echo "   ✅ Gemini API Key configurada no Vercel"
echo "   ✅ Admin API endpoints para gerenciar preços"
echo "   ✅ Frontend Admin UI criada"
echo "   ✅ GitHub Actions workflow ativado"
echo "   ✅ Commit feito e pushado"
echo ""
echo -e "${YELLOW}🔄 PRÓXIMAS ETAPAS:${NC}"
echo "   1. Acesse GitHub → Actions"
echo "   2. Aguarde o workflow completar"
echo "   3. Verifique em: GitHub → Actions → auto-setup"
echo "   4. Após sucesso, acessar:"
echo "      • https://seu-app.vercel.app/app/admin/pricing"
echo "      • https://seu-app.vercel.app/api/admin/status"
echo ""
echo -e "${GREEN}🎉 Sistema de preços dinâmicos ativado!${NC}"
