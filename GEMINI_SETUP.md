# 🚀 Google Gemini Integration - Setup Completo

## 📋 O que foi implementado

✅ **geminiService.js** - Serviço completo com:
- `generateFlashcardsWithAI()` - Cria flashcards de ALTA ESPECIFICIDADE
- `generateSummaryWithAI()` - Resumidor automático de conteúdo
- `generateJarvisResponse()` - Chat educacional com contexto
- `generateQuizWithAI()` - Gerador de quizzes multi-escolha
- `generateStudyPlanWithAI()` - Planejador de estudo personalizado

✅ **aiProvider.js** - Já estava configurado para suportar Gemini com fallback para OpenAI

✅ **Modelos utilizados**:
- `gemini-1.5-flash` - Rápido, ideal para free tier (60 req/min)

---

## 🔑 Passo 1: Obter API Key do Google Gemini

### Método A: Google AI Studio (RECOMENDADO - 100% Gratuito)

1. **Acesse:** https://aistudio.google.com/app/apikey
2. **Clique em:** "Create API Key" → "Create API key in new Google Cloud project"
3. **Copie a chave gerada** (começa com `AIza...`)
4. **Pronto!** Sem cartão de crédito, sem limites de projeto

### Limite Gratuito (Google AI Studio):
- ✅ **60 requisições por minuto** (suficiente para educação)
- ✅ **Sem limite mensal** (ilimitado)
- ✅ **Acesso a gemini-1.5-flash e gemini-pro**

---

## ⚙️ Passo 2: Configurar Variáveis de Ambiente

### Backend (.env):
```bash
# ===== AI Provider =====
AI_PROVIDER=gemini                    # 'gemini' ou 'openai'
GOOGLE_GEMINI_API_KEY=AIza...        # Copie sua chave aqui
AI_FALLBACK_ENABLED=true             # Fallback automático se Gemini falhar

# (Opcional) OpenAI para fallback
OPENAI_API_KEY=sk-...               # Se quiser fallback
```

### Exemplo completo de .env:
```bash
# ===== Server =====
NODE_ENV=development
PORT=3001
CORS_ORIGIN=*

# ===== Database =====
MONGO_URI=mongodb+srv://...
DATABASE_NAME=appmentoria

# ===== Auth =====
JWT_SECRET=seu-secret-aqui

# ===== AI =====
AI_PROVIDER=gemini
GOOGLE_GEMINI_API_KEY=AIza_SuaChaveAqui123456789
AI_FALLBACK_ENABLED=true

# (Opcional)
OPENAI_API_KEY=sk-...
```

---

## 🧪 Passo 3: Testar a Integração

### Teste 1: Flash Cards
```bash
curl -X POST http://localhost:3001/api/jarvis/flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu_jwt_token" \
  -d '{
    "theme": "Farmacocinética",
    "subject": "medicina",
    "quantity": 3
  }'
```

**Resposta esperada:**
```json
{
  "flashcards": [
    {
      "question": "Qual é a definição de biodisponibilidade?",
      "answer": "Porcentagem do fármaco que atinge a circulação sistêmica..."
    }
  ]
}
```

### Teste 2: Resumo
```bash
curl -X POST http://localhost:3001/api/jarvis/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu_jwt_token" \
  -d '{
    "content": "Seu texto longo aqui...",
    "length": "medium"
  }'
```

### Teste 3: Jarvis Chat
```bash
curl -X POST http://localhost:3001/api/jarvis/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu_jwt_token" \
  -d '{
    "userMessage": "Como memorizar as artérias do coração?"
  }'
```

---

## 📊 Comparação: Gemini vs OpenAI

| Feature | Gemini Free | OpenAI Free |
|---------|-------------|------------|
| **Preço** | ✅ Gratuito | ❌ Pago |
| **Requisições/min** | ✅ 60 | ✅ 60 (pago) |
| **Limite mensal** | ✅ Ilimitado | ❌ Conforme $ |
| **Qualidade** | ✅ Excelente | ✅ Melhor |
| **Setup** | ✅ 2 min | ❌ 5 min |
| **Modelo** | ✅ gemini-1.5-flash | ✅ gpt-4o-mini |
| **Latência** | ✅ 1-3s | ✅ 1-3s |

**Vencedor:** Gemini para educação (gratuito + rápido)

---

## 🎯 Features Funcionais Prontas

### 1. **Gerador de Flashcards**
- Cria perguntas ESPECÍFICAS (não genéricas)
- Insere números, nomes, critérios exatos
- Apropriado para prova de concurso

### 2. **Resumidor de Aulas**
- Transforma conteúdo longo em resumos educacionais
- Destaca conceitos-chave em **negrito**
- Tamanho customizável (short/medium/long)

### 3. **Jarvis (Chat IA)**
- Responde dúvidas com contexto
- Recomenda recursos (flashcards, simulados)
- Motivador e acessível
- Mantém histórico de conversa

### 4. **Gerador de Quizzes**
- Cria questões de múltipla escolha
- Dificuldade ajustável
- Com explicações detalhadas
- Formato JSON pronto para frontend

### 5. **Planejador de Estudo**
- Cria roadmap personalizado
- Progressivo (básico → avançado)
- Com marcos de progresso
- Dicas de motivação

---

## 🔄 Como Usar no Frontend

### Exemplo: Gerar Flashcards
```typescript
// frontend/src/services/api.ts
const generateFlashcards = async (theme: string, subject: string) => {
  const response = await fetch('/api/jarvis/flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      theme,
      subject,
      quantity: 5
    })
  });
  return response.json();
};

// Usar em componente
const [flashcards, setFlashcards] = useState([]);

useEffect(() => {
  generateFlashcards('Farmacocinética', 'medicina').then(data => {
    setFlashcards(data.flashcards);
  });
}, []);
```

---

## 📈 Métricas de Sucesso

- ✅ Gerando flashcards com especificidade alta
- ✅ Resumindo conteúdo de aulas automaticamente
- ✅ Chat Jarvis respondendo dúvidas em tempo real
- ✅ Quizzes com explicações detalhadas
- ✅ Planos de estudo personalizados

---

## 🐛 Troubleshooting

### Erro: "GEMINI_NOT_CONFIGURED"
- Verifique se `GOOGLE_GEMINI_API_KEY` está no `.env`
- Recrie a chave em https://aistudio.google.com/app/apikey

### Erro: "GEMINI_RATE_LIMIT"
- Aguarde 1 minuto (limite: 60 req/min)
- O fallback para OpenAI ativará se configurado

### Erro: "INVALID_JSON_RESPONSE"
- Gemini às vezes retorna markdown. É normal.
- O código trata isso automaticamente com regex

---

## 🚀 Próximos Passos

1. **Integrar em Frontend** - Adicionar UI para chamar endpoints
2. **Cache de Respostas** - Salvar flashcards/quizzes gerados
3. **Análise de Qualidade** - Logging de respostas para otimizar
4. **Upgrade para Pro** - Se usar muito, considere:
   - Google Cloud AI API (payg)
   - OpenAI com crédito inicial

---

## 📞 Suporte

Se a IA não funcionar:
1. Verifique a chave API em https://aistudio.google.com/app/apikey
2. Confirme que `/api/jarvis` endpoints estão registrados
3. Veja logs: `console.error()` em geminiService.js

**Pronto para usar! 🎉**
