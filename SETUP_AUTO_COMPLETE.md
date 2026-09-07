# 🚀 Guia de Setup Automático - Vercel + Gemini + Asaas

## Visão Geral

Este guia descreve como configurar automaticamente as chaves de API (Gemini, Asaas) e os preços dos planos no Vercel.

## 🔑 Chaves Necessárias

### 1. Google Gemini API Key
- **Onde obter**: https://ai.google.dev/aistudio
- **Formato**: Começa com `AIza` ou tem ~40 caracteres alfanuméricos
- **Uso**: IA para funcionalidades inteligentes

### 2. Asaas Payment API Key (Opcional)
- **Onde obter**: https://asaas.com/dashboard (Settings > API)
- **Formato**: Começa com `$aas` ou tem ~30 caracteres
- **Uso**: Gateway de pagamento

### 3. Vercel Token
- **Onde obter**: https://vercel.com/account/tokens
- **Escopo necessário**: `read`, `write` em environment variables
- **Formato**: Token alfanumérico

### 4. Vercel Project ID
- **Onde obter**: https://vercel.com/dashboard/[seu-projeto]/settings
- **Localização**: Settings > General > Project ID
- **Formato**: Alfanumérico único

## 📦 Método 1: Setup Automático Local

### Opção A: Com Detecção Automática

Se suas chaves estão em variáveis de ambiente do sistema:

```bash
node setup-vercel-full.js --auto
```

O script detectará automaticamente:
- `GOOGLE_GEMINI_API_KEY`
- `ASAAS_API_KEY`
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`

### Opção B: Com Argumentos Explícitos

```bash
node setup-vercel-full.js \
  --gemini-key "AIza_seu_gemini_key" \
  --asaas-key "$aas_seu_asaas_key" \
  --token "seu_vercel_token" \
  --project-id "seu_project_id" \
  --basic-price "50.00" \
  --premium-price "49.90" \
  --medhub-price "89.90"
```

### Opção C: Modo Interativo

```bash
node setup-vercel-full.js --interactive
```

## 🤖 Método 2: Setup Automático via GitHub Actions

### 1. Configurar Repository Secrets

Acesse: `Settings > Secrets and variables > Actions > New repository secret`

Crie os seguintes secrets:

| Secret Name | Valor |
|---|---|
| `GOOGLE_GEMINI_API_KEY` | Sua Google Gemini API Key |
| `ASAAS_API_KEY` | Sua Asaas Payment API Key (opcional) |
| `VERCEL_TOKEN` | Seu Vercel Token |
| `VERCEL_PROJECT_ID` | Seu Vercel Project ID |
| `PREMIUM_STANDARD_MONTHLY_PRICE` | Ex: 50.00 (opcional) |
| `PREMIUM_MONTHLY_PRICE` | Ex: 49.90 (opcional) |
| `PREMIUM_MEDHUB_MONTHLY_PRICE` | Ex: 89.90 (opcional) |

### 2. O workflow fará:

```yaml
Quando: git push para master
Faz:
  1. Detecta todas as chaves automaticamente
  2. Configura Gemini API no Vercel
  3. Configura Asaas Payment no Vercel
  4. Define os preços dos planos
  5. Verifica a configuração
  6. Notifica sucesso/erro
```

## 🔐 Variáveis de Ambiente Configuradas

Após o setup, estas variáveis estarão disponíveis em produção:

```
GOOGLE_GEMINI_API_KEY=AIza_xxx
ASAAS_API_KEY=$aas_xxx
PREMIUM_STANDARD_MONTHLY_PRICE=50.00
PREMIUM_MONTHLY_PRICE=49.90
PREMIUM_MEDHUB_MONTHLY_PRICE=89.90
```

## ✅ API de Admin para Gerenciar

### GET /api/admin/plans
Obter configuração atual dos planos:
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://seu-app.vercel.app/api/admin/plans
```

### GET /api/admin/status
Status completo do sistema (Gemini, Asaas, Preços):
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://seu-app.vercel.app/api/admin/status
```

### PUT /api/admin/plans/:planType/price
Atualizar preço de um plano:
```bash
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price": 59.90}' \
  https://seu-app.vercel.app/api/admin/plans/basic/price
```

### PUT /api/admin/keys/:keyType
Atualizar chaves de API:
```bash
# Atualizar Gemini
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "AIza_nova_chave"}' \
  https://seu-app.vercel.app/api/admin/keys/gemini

# Atualizar Asaas
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "$aas_nova_chave"}' \
  https://seu-app.vercel.app/api/admin/keys/asaas
```

## 🎨 Dashboard de Admin

Interface de gerenciamento em: `/app/admin/pricing`

Permite:
- ✅ Visualizar preços atuais
- ✅ Editar preços dos planos em tempo real
- ✅ Ver status de Gemini e Asaas
- ✅ Atualizar chaves de API

## 🚨 Troubleshooting

### "Chave Gemini tem formato inválido"
- Verifique se começa com `AIza`
- Comprimento deve ser ~40+ caracteres
- Copie exatamente da console do Google

### "Falha ao configurar variável"
- Verifique se `VERCEL_TOKEN` é válido
- Confirme se `VERCEL_PROJECT_ID` existe
- Tente novamente em alguns segundos

### "GitHub Actions falha"
- Revise os secrets em Settings
- Verifique se as chaves estão corretas
- Rode manualmente: `workflow_dispatch` no GitHub

## 📝 Arquivo .env.local

O setup criará um `.env.local` local com as variáveis.

**IMPORTANTE**: Não commite `.env.local` se contiver chaves reais!

```bash
# .env.local (LOCAL ONLY - não commitar!)
GOOGLE_GEMINI_API_KEY="AIza_xxx"
ASAAS_API_KEY="$aas_xxx"
PREMIUM_STANDARD_MONTHLY_PRICE="50.00"
```

## 🔄 Atualizar Chaves Depois

### Via Local
```bash
node setup-vercel-full.js \
  --gemini-key "AIza_nova_chave" \
  --token "seu_token" \
  --project-id "seu_id"
```

### Via Dashboard Admin
Acesse `/app/admin` e use as APIs de gerenciamento

### Via GitHub Actions
- Atualize o secret em `Settings > Secrets`
- Faça um push para triggerar o workflow

## 📊 Preços Padrão

| Plano | Preço | Variável |
|---|---|---|
| BASIC | R$ 50.00 | `PREMIUM_STANDARD_MONTHLY_PRICE` |
| PREMIUM | R$ 49.90 | `PREMIUM_MONTHLY_PRICE` |
| PREMIUM+ MedHub | R$ 89.90 | `PREMIUM_MEDHUB_MONTHLY_PRICE` |

Altere via:
- `setup-vercel-full.js --basic-price "45.00"`
- Dashboard Admin
- Editar secrets do GitHub

## ✨ Próximos Passos

1. **Coletar as chaves** (Gemini, Asaas, Vercel)
2. **Escolher método**: Local ou GitHub Actions
3. **Executar setup**: `node setup-vercel-full.js --auto`
4. **Verificar**: Acesse Vercel Dashboard
5. **Deploy**: Git push para master (CI/CD automático)
6. **Testar**: Acesse `/app/admin/pricing`

---

**Dúvidas?**
- Setup local: `node setup-vercel-full.js --auto`
- GitHub Actions: Verifique os logs em Actions
- Admin API: Documentação em `/api/admin/status`
