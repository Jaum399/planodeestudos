#!/usr/bin/env bash

# 🚀 INICIE AQUI - Deploy 100% Funcional
# Este arquivo contém instruções para começar o deploy

echo "
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  🚀 DEPLOY 100% FUNCIONAL - INSTRUÇÕES INICIAIS              ║
║                                                                ║
║  Seu app está pronto! Siga os passos abaixo para fazer deploy ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"

echo "
📋 PASSO 1: COLETAR 4 CHAVES NECESSÁRIAS
═════════════════════════════════════════════════════════════════

Você precisa coletar 4 chaves (leva ~5 minutos):

1️⃣  GOOGLE_GEMINI_API_KEY
    Obtenha em: https://ai.google.dev/aistudio
    • Clique em 'Get API Key'
    • Crie uma nova chave
    • Copie o valor (começa com 'AIza')

2️⃣  ASAAS_API_KEY
    Obtenha em: https://asaas.com/dashboard
    • Vá para Settings
    • Copie sua API Key
    • Começa com '\$aact_' ou '\$aas'

3️⃣  VERCEL_TOKEN
    Obtenha em: https://vercel.com/account/tokens
    • Clique em 'Create Token'
    • Escolha 'Full Account'
    • Copie o token gerado

4️⃣  VERCEL_PROJECT_ID
    Obtenha em: https://vercel.com/dashboard
    • Clique no seu projeto
    • Vá para Settings → General
    • Copie o 'Project ID'
"

echo "
⚡ PASSO 2: ESCOLHA SEU MÉTODO DE SETUP
═════════════════════════════════════════════════════════════════
"

echo "
OPÇÃO A: Setup Automático (Recomendado - 2 minutos)
────────────────────────────────────────────────────
Use este comando com as 4 chaves:

    node setup-vercel-full.js \\
      --gemini-key \"AIza_sua_chave_aqui\" \\
      --asaas-key \"\$aact_sua_chave_aqui\" \\
      --token \"seu_vercel_token\" \\
      --project-id \"seu_project_id\"

Depois:
    git add .
    git commit -m \"chore: setup environment\"
    git push origin master


OPÇÃO B: Setup Interativo (Melhor para primeira vez)
─────────────────────────────────────────────────────
Execute este comando e siga as instruções:

    node setup-helper.js

Ele vai pedir cada chave e executar automaticamente.


OPÇÃO C: Setup via GitHub Secrets (Mais seguro)
────────────────────────────────────────────────
Execute este comando:

    bash configure-github-secrets.sh

Ele vai:
1. Pedir as 4 chaves
2. Adicionar no GitHub automaticamente
3. Dizer para fazer git push

Depois:
    git add .
    git commit -m \"chore: configure secrets\"
    git push origin master
"

echo "
✅ PASSO 3: FAZER DEPLOY
═════════════════════════════════════════════════════════════════

Após escolher um método acima:

1. Faça o commit:
    git add .
    git commit -m \"chore: setup environment\"

2. Faça o push (GitHub Actions rodará automaticamente):
    git push origin master

3. Aguarde 5 minutos para o deploy completar

GitHub Actions vai:
✅ Detectar as chaves dos secrets
✅ Configurar tudo no Vercel
✅ Fazer deploy automático
✅ Seu app ficará 100% funcional
"

echo "
🔍 PASSO 4: VERIFICAR SE FUNCIONOU
═════════════════════════════════════════════════════════════════

Opção A: Ver Logs do GitHub
────────────────────────────
https://github.com/seu-usuario/seu-repo/actions

Procure por 'Auto Setup' e veja se passou ✅


Opção B: Verificar Variáveis no Vercel
───────────────────────────────────────
https://vercel.com/dashboard → seu-projeto → Settings → Environment Variables

Você deve ver:
✅ GOOGLE_GEMINI_API_KEY
✅ ASAAS_API_KEY
✅ PREMIUM_STANDARD_MONTHLY_PRICE
✅ PREMIUM_MONTHLY_PRICE
✅ PREMIUM_MEDHUB_MONTHLY_PRICE


Opção C: Testar API
───────────────────
https://seu-app.vercel.app/api/admin/status

Deve retornar:
{
  \"status\": \"operational\",
  \"services\": {
    \"gemini\": { \"available\": true },
    \"payment\": { \"available\": true }
  }
}


Opção D: Acessar Admin Dashboard
────────────────────────────────
https://seu-app.vercel.app/app/admin/pricing

Você pode ver e editar os preços dos planos em tempo real!
"

echo "
📖 DOCUMENTAÇÃO DISPONÍVEL
═════════════════════════════════════════════════════════════════

Leia estes arquivos para mais detalhes:

1. RESUMO_DEPLOY_100.md
   → Resumo completo do que foi feito

2. DEPLOY_FUNCIONAL_100.md
   → Guia passo a passo detalhado

3. QUICK_START.md
   → Referência rápida

4. CHAVES_ENCONTRADAS.md
   → Chaves que já temos no código
"

echo "
🎯 PRÓXIMO PASSO
═════════════════════════════════════════════════════════════════

Escolha uma opção acima e comece! ⬆️

Recomendação: Se é primeira vez, use:

    node setup-helper.js

Ele vai guiar você passo a passo! 🚀
"

echo "
═════════════════════════════════════════════════════════════════
Qualquer dúvida, leia o arquivo: DEPLOY_FUNCIONAL_100.md
═════════════════════════════════════════════════════════════════
"
