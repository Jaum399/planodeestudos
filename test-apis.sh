#!/bin/bash

echo "🧪 TESTE DE APIs"
echo "================"
echo ""

# Test 1: Backend Health
echo "1️⃣  Testando backend health..."
HEALTH=$(curl -s http://localhost:3001/api/health)
if echo "$HEALTH" | grep -q "ok"; then
  echo "   ✅ Backend respondendo"
else
  echo "   ❌ Backend NÃO respondendo"
fi
echo ""

# Test 2: Frontend
echo "2️⃣  Testando frontend..."
FE=$(curl -s -I http://localhost:5173 | grep -i "200\|301\|302")
if [ ! -z "$FE" ]; then
  echo "   ✅ Frontend acessível"
else
  echo "   ⚠️  Frontend pode não estar respondendo"
fi
echo ""

# Test 3: Gemini Service
echo "3️⃣  Verificando Gemini API Key..."
if grep -q "GEMINI_API_KEY=AIzaSy" "/c/Users/Eliot_alderson/Desktop/appmentoria thiago/backend/.env"; then
  echo "   ✅ Gemini API Key configurada"
else
  echo "   ❌ Gemini API Key NÃO encontrada"
fi
echo ""

# Test 4: Preços
echo "4️⃣  Verificando preços..."
PRICES=$(grep "PREMIUM_.*_PRICE" "/c/Users/Eliot_alderson/Desktop/appmentoria thiago/backend/.env")
echo "$PRICES" | while read line; do
  echo "   $line"
done
echo ""

# Test 5: Database
echo "5️⃣  Verificando banco de dados..."
if [ -f "/c/Users/Eliot_alderson/Desktop/appmentoria thiago/backend/users.db" ]; then
  SIZE=$(ls -lh "/c/Users/Eliot_alderson/Desktop/appmentoria thiago/backend/users.db" | awk '{print $5}')
  echo "   ✅ Banco de dados: $SIZE"
else
  echo "   ⚠️  Banco de dados não encontrado"
fi
echo ""

echo "✅ TESTES CONCLUÍDOS"
