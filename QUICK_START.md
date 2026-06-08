# 🚀 Quick Start - Setup Automático

## ⚡ Forma Mais Rápida (3 passos)

### Passo 1: Preparar Chaves

```bash
# Defina as variáveis de ambiente:
export GOOGLE_GEMINI_API_KEY="AIza_sua_chave_aqui"
export ASAAS_API_KEY="$aas_sua_chave_aqui"
export VERCEL_TOKEN="sua_vercel_token"
export VERCEL_PROJECT_ID="seu_project_id"
```

### Passo 2: Executar Setup

```bash
node setup-vercel-full.js --auto
```

### Passo 3: Confirmar

Acesse https://vercel.com/dashboard e veja as variáveis configuradas ✅

---

## 🎯 Opções

### Modo Interativo (Recomendado para Primeira Vez)

```bash
node setup-helper.js
```

Ele vai:
1. Perguntar qual método deseja
2. Detectar chaves automaticamente
3. Pedir dados faltantes
4. Mostrar resumo
5. Executar setup

### Modo Manual Completo

```bash
node setup-vercel-full.js \
  --gemini-key "AIza_..." \
  --asaas-key "$aas_..." \
  --token "vercel_token" \
  --project-id "project_id" \
  --basic-price "50.00" \
  --premium-price "49.90" \
  --medhub-price "89.90"
```

### GitHub Actions Automático

1. Ir para: `Settings > Secrets and variables > Actions`
2. Adicionar:
   - `GOOGLE_GEMINI_API_KEY` = sua chave
   - `ASAAS_API_KEY` = sua chave (opcional)
   - `VERCEL_TOKEN` = seu token
   - `VERCEL_PROJECT_ID` = seu project id
3. Fazer push: `git push origin master`
4. Workflow executa automaticamente ✅

---

## 📋 Onde Obter as Chaves

| Chave | Obter em | Formato |
|---|---|---|
| **Gemini** | https://ai.google.dev/aistudio | Começa com `AIza` |
| **Asaas** | https://asaas.com/dashboard | Começa com `$aas` |
| **Vercel Token** | https://vercel.com/account/tokens | 30+ caracteres |
| **Project ID** | Vercel > Settings > General | ID alfanumérico |

---

## ✅ Verificar Se Funcionou

### Via Terminal
```bash
# Status do sistema
curl -H "Authorization: Bearer TOKEN" \
  https://seu-app.vercel.app/api/admin/status
```

### Via Dashboard
- Acesse: `https://seu-app.vercel.app/app/admin/pricing`
- Veja os preços atuais
- Teste editar um preço

### Via Vercel
- https://vercel.com/dashboard
- Clique no projeto
- Settings > Environment Variables
- Veja `GOOGLE_GEMINI_API_KEY` e `ASAAS_API_KEY` ✅

---

## 🔧 Atualizar Depois

### Via Admin Dashboard
```
https://seu-app.vercel.app/app/admin
```
Use a interface para mudar preços/chaves

### Via Terminal
```bash
node setup-vercel-full.js --auto
```

### Via GitHub
Atualize os secrets e faça `git push`

---

## ❓ Dúvidas Comuns

**P: Erro "Chave Gemini tem formato inválido"**
- Verifique se começa com `AIza`
- Copie exatamente do Google AI Studio
- Sem espaços no início/fim

**P: GitHub Actions falha**
- Verifique secrets em Settings
- Confirme nomes exatos: `GOOGLE_GEMINI_API_KEY` (não `GEMINI_KEY`)
- Teste manualmente: `node setup-vercel-full.js --auto`

**P: Variáveis não aparecem no Vercel**
- Aguarde 30 segundos após setup
- Recarregue a página
- Verifique o token Vercel tem permissão correta

**P: Admin não funciona**
- Veja `/api/admin/status` para erro
- Confirme que é admin (deve estar na env var)
- Chaves devem estar no Vercel, não só no .env.local

---

## 📚 Documentação Completa

Leia: `SETUP_AUTO_COMPLETE.md`

---

**Pronto? Execute:** `node setup-helper.js` 🚀
