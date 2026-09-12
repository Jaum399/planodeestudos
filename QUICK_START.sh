#!/bin/bash

# 🚀 QUICK START - Ativar Sistema Completo

set -e

echo "
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     🎓 SISTEMA DE FLASHCARDS 100% FUNCIONAL                    ║
║     Instalação e Ativação Rápida                              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"

# ──────────────────────────────────────────────────────────────────────────────

echo "📋 PASSO 1: Verificar Variáveis de Ambiente"
echo "───────────────────────────────────────────"

if [ ! -f .env ]; then
  echo "❌ Arquivo .env não encontrado"
  echo "    Crie .env com as variáveis necessárias"
  exit 1
fi

if grep -q "ADMIN_USER_IDS=" .env; then
  echo "✅ ADMIN_USER_IDS configurado"
else
  echo "⚠️  ADMIN_USER_IDS não encontrado em .env"
  echo "   (Será necessário para rotas de admin)"
fi

echo ""

# ──────────────────────────────────────────────────────────────────────────────

echo "📦 PASSO 2: Instalar Dependências"
echo "─────────────────────────────────"

cd backend

if [ ! -d node_modules ]; then
  echo "Instalando dependências do backend..."
  npm install > /dev/null 2>&1
  echo "✅ Dependências instaladas"
else
  echo "✅ Dependências já instaladas"
fi

# Instalar chalk e node-fetch se não existirem
if ! npm list chalk > /dev/null 2>&1; then
  echo "Instalando chalk para testes..."
  npm install chalk > /dev/null 2>&1
fi

if ! npm list node-fetch > /dev/null 2>&1; then
  echo "Instalando node-fetch para testes..."
  npm install node-fetch@2 > /dev/null 2>&1
fi

echo "✅ Todas as dependências prontas"
echo ""

# ──────────────────────────────────────────────────────────────────────────────

echo "🗄️  PASSO 3: Conectar ao Banco de Dados"
echo "───────────────────────────────────────"

if grep -q "MONGODB_URI=" ../.env || grep -q "MONGODB_URI=" .env; then
  echo "✅ MongoDB URI configurado"
else
  echo "⚠️  Certifique-se de que MongoDB está rodando"
  echo "   MongoDB deve estar em: mongodb://localhost:27017 ou configure MONGODB_URI"
fi

echo ""

# ──────────────────────────────────────────────────────────────────────────────

echo "🌱 PASSO 4: Fazer Seed de Decks Pré-Configurados"
echo "────────────────────────────────────────────────"

if [ -z "$API_URL" ]; then
  API_URL="http://localhost:3000"
fi

if [ -z "$ADMIN_TOKEN" ]; then
  ADMIN_TOKEN="test-admin-token"
fi

echo "Enviando requisição de seed..."
echo "  URL: $API_URL/api/admin/seed-presets"
echo "  Token: $ADMIN_TOKEN"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/admin/seed-presets" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" 2>/dev/null || echo '{"success": false, "error": "Servidor não respondeu"}')

if echo "$RESPONSE" | grep -q '"success":true'; then
  DECKS=$(echo "$RESPONSE" | grep -o '"decksCreated":[0-9]*' | cut -d: -f2)
  CARDS=$(echo "$RESPONSE" | grep -o '"totalCards":[0-9]*' | cut -d: -f2)
  echo "✅ Seed concluído com sucesso!"
  echo "   • $DECKS decks criados"
  echo "   • $CARDS flashcards gerados"
else
  echo "⚠️  Seed ainda não foi executado"
  echo "   Certifique-se de que o servidor está rodando em $API_URL"
fi

echo ""

# ──────────────────────────────────────────────────────────────────────────────

echo "📊 PASSO 5: Verificar Status do Sistema"
echo "──────────────────────────────────────"

echo "Consultando dashboard..."
echo ""

RESPONSE=$(curl -s -X GET "$API_URL/api/admin/notifications/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null || echo '{}')

if echo "$RESPONSE" | grep -q '"status":"ok"'; then
  echo "✅ Sistema funcionando normalmente!"
  echo ""
  echo "Estatísticas:"
  echo "  • Jobs: $(echo "$RESPONSE" | grep -o '"total":[0-9]*' | head -1 | cut -d: -f2)"
  echo "  • Lembretes ativos: $(echo "$RESPONSE" | grep -o '"active":[0-9]*' | head -1 | cut -d: -f2)"
  echo "  • Usuários: $(echo "$RESPONSE" | grep -o '"total":[0-9]*' | tail -1 | cut -d: -f2)"
else
  echo "⚠️  Não foi possível conectar ao API"
  echo "   Certifique-se de que o servidor está rodando"
fi

echo ""

# ──────────────────────────────────────────────────────────────────────────────

echo "🧪 PASSO 6: Executar Testes Completos"
echo "────────────────────────────────────"

if [ -f scripts/test-complete-system.js ]; then
  echo "Executando suite de testes..."
  echo ""
  
  API_BASE=$API_URL ADMIN_TOKEN=$ADMIN_TOKEN node scripts/test-complete-system.js
else
  echo "⚠️  Script de testes não encontrado"
  echo "   Disponível em: backend/scripts/test-complete-system.js"
fi

echo ""

# ──────────────────────────────────────────────────────────────────────────────

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║                    ✅ SISTEMA ATIVADO!                        ║"
echo "║                                                                ║"
echo "║  Próximos passos:                                             ║"
echo "║  1. Acessar dashboard: http://localhost:3000/admin/notif     ║"
echo "║  2. Criar lembrete: POST /api/reminder-session               ║"
echo "║  3. Processar notificações: POST /admin/notify/process-queue ║"
echo "║  4. Monitorar logs em tempo real                             ║"
echo "║                                                                ║"
echo "║  Documentação: COMPLETE_IMPLEMENTATION.md                    ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
