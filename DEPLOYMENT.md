# 🚀 Deployment Vercel - Guia Completo

## Status Atual
- ✅ Código commitado no GitHub: `Jaum399/planodeestudos`
- ✅ 2 novas features prontas para deploy:
  1. Phase 1: Cursos estruturados (aulas, capítulos, certificados)
  2. Gemini AI Integration (flashcards, resumos, chat, quizzes)

---

## 🔐 Passo 1: Adicionar Variáveis de Ambiente no Vercel

### Acesse o Painel do Vercel
1. https://vercel.com/dashboard
2. Clique no projeto `planodeestudos`
3. Vá em **Settings** → **Environment Variables**

### Variáveis Necessárias

#### AI (Gemini) - NOVA
```
GOOGLE_GEMINI_API_KEY=AIza_SuaChaveAqui...
AI_PROVIDER=gemini
AI_FALLBACK_ENABLED=true
```

#### Database (Já deve existir)
```
MONGO_URI=mongodb+srv://...
DATABASE_NAME=appmentoria
```

#### Auth (Já deve existir)
```
JWT_SECRET=seu_secret_aqui
```

#### Opcional (OpenAI Fallback)
```
OPENAI_API_KEY=sk-...
```

---

## 🧪 Passo 2: Validar Antes do Deploy

### Verificar Build Localmente
```bash
cd frontend
npm install
npm run build

# Verificar se não há erros
```

### Testar Backend Localmente
```bash
npm run dev:backend

# Confirmar que endpoints respondem:
# GET /api/health
# POST /api/jarvis/flashcards (requer auth)
```

---

## 🚀 Passo 3: Deploy Automático (RECOMENDADO)

### Opção A: Deploy via Git Push (Automático)
```bash
# Código já foi pushed para main
# Vercel detectará automaticamente e fará deploy

# Monitore em: https://vercel.com/dashboard/planodeestudos/deployments
```

### Opção B: Deploy Manual (Se necessário)
```bash
# Instale Vercel CLI
npm i -g vercel

# Faça login
vercel login

# Deploy
cd /caminho/para/appmentoria
vercel --prod

# Siga as prompts
```

---

## ✅ Passo 4: Validar Deployment

### Testar Endpoints em Produção

#### 1. Health Check
```bash
curl https://seu-dominio.vercel.app/api/health
# Resposta: { "status": "ok", "timestamp": "2026-06-07T..." }
```

#### 2. Gerar Flashcards (com token JWT)
```bash
curl -X POST https://seu-dominio.vercel.app/api/jarvis/flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{
    "theme": "Farmacocinética",
    "subject": "medicina",
    "quantity": 3
  }'
```

#### 3. Jarvis Chat
```bash
curl -X POST https://seu-dominio.vercel.app/api/jarvis/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{
    "userMessage": "Como estudar melhor?"
  }'
```

---

## 📊 Monitoramento Pós-Deploy

### Logs em Tempo Real
1. Vercel Dashboard → Deployments
2. Clique no deployment mais recente
3. Abra **Functions** → **Runtime Logs**

### Principais Erros a Monitorar
```
❌ GEMINI_NOT_CONFIGURED
  → Verificar GOOGLE_GEMINI_API_KEY no Vercel

❌ DATABASE_UNAVAILABLE
  → Verificar MONGO_URI e conexão

❌ GEMINI_RATE_LIMIT
  → Aguardar 1 minuto (limite: 60 req/min)

❌ INVALID_JWT
  → Tokens expirados ou inválidos
```

---

## 🔄 Features Deployadas

### Phase 1: Cursos Estruturados ✅
| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/courses` | GET | Listar cursos |
| `/api/courses/:id` | GET | Detalhes do curso |
| `/api/courses/:id/enroll` | POST | Inscrever em curso |
| `/api/courses/:id/progress` | GET | Progresso do usuário |
| `/api/lessons/:id/progress` | POST | Marcar aula completa |
| `/api/certificates` | GET | Listar certificados |
| `/api/certificates/:id/verify` | GET | Verificar autenticidade |

### Phase 2: Gemini AI ✅
| Endpoint | Função |
|----------|--------|
| `/api/jarvis/flashcards` | Gera flashcards especializados |
| `/api/jarvis/summarize` | Resume conteúdo |
| `/api/jarvis/chat` | Chat educacional |
| `/api/jarvis/quiz` | Gera quizzes |
| `/api/jarvis/study-plan` | Cria plano de estudo |

---

## 🎯 Performance Esperada

```
GET /api/courses           ~200ms
POST /api/jarvis/flashcards ~3-5s (IA processando)
POST /api/jarvis/chat      ~2-4s (IA respondendo)
POST /api/certificates     ~100ms
```

---

## 🐛 Troubleshooting

### Erro: "AI not configured"
```
✅ Solução:
1. Verify GOOGLE_GEMINI_API_KEY in Vercel Settings
2. Redeploy: vercel --prod
3. Aguarde 30s para propagação
```

### Erro: "Database connection failed"
```
✅ Solução:
1. Verify MONGO_URI with whitelist IP
2. Ensure MongoDB Atlas allows Vercel IPs
3. Test connection: mongo shell conectando
```

### Erro: "Rate limited"
```
✅ Solução:
1. Aguarde 1 minuto (limite Gemini: 60 req/min)
2. Considere cache de respostas
3. Upgrade Gemini API se necessário
```

---

## 📈 Próximas Melhorias Pós-Deploy

1. **Implementar Cache**
   - Redis para flashcards/quizzes gerados
   - Evitar regerar conteúdo idêntico

2. **Analytics**
   - Rastrear qualidade das respostas IA
   - Identificar prompts que precisam refino

3. **Upgrade Gemini**
   - Se usar muito: considere Google Cloud AI API (payg)
   - Atualmente: 60 req/min, ilimitado mensal

4. **Frontend Integration**
   - Adicionar UI para chamar endpoints
   - Implementar loading states
   - Tratamento de erros

---

## 📞 Verificação Rápida de Saúde

Acesse uma dessas URLs após deploy:

```
Frontend: https://seu-dominio.vercel.app
API Health: https://seu-dominio.vercel.app/api/health
Status: https://vercel.com/dashboard/planodeestudos
Logs: https://vercel.com/dashboard/planodeestudos/deployments
```

---

## ✨ Deploy Completo!

Se tudo funcionou:
- ✅ Frontend está online
- ✅ API respondendo
- ✅ Gemini IA funcional
- ✅ Cursos estruturados funcionando
- ✅ Certificados gerando automaticamente

🎉 **AppMentoria está 100% deployada com IA!**
