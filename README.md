# Mentoris — App de Mentoria e Estudos

Sistema completo de mentoria e auxílio aos estudos com frontend React e backend Node.js.

## Estrutura

```
├── backend/     - API Node.js + Express + SQLite
└── frontend/    - React + Vite + TypeScript + Tailwind CSS
```

## Como rodar

### Backend
```bash
cd backend
npm install
npm run dev
# Roda na porta 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Roda na porta 5173
```

Abra http://localhost:5173 no navegador.

## APIs

| Rota | Descrição |
|------|-----------|
| POST /api/auth/register | Cadastrar usuário |
| POST /api/auth/login | Login |
| GET /api/auth/me | Dados do usuário |
| PUT /api/auth/me | Atualizar perfil |
| PUT /api/auth/password | Alterar senha |
| GET /api/planner | Itens do planner |
| POST /api/planner | Criar item |
| PUT /api/planner/:id | Atualizar item |
| DELETE /api/planner/:id | Remover item |
| GET /api/flashcards | Todos os flashcards |
| GET /api/flashcards/review | Flashcards para revisar hoje |
| POST /api/flashcards | Criar flashcard |
| PUT /api/flashcards/:id/review | Avaliar flashcard (SM-2) |
| GET /api/schedule | Cronograma semanal |
| POST /api/schedule | Adicionar ao cronograma |
| GET /api/analytics | Resumo de análises |
| POST /api/analytics/session | Registrar sessão de estudo |
| GET /api/payment/plans | Listar planos |
| POST /api/payment/subscribe | Assinar (placeholder) |
| GET /api/public | Catálogo de APIs públicas |
| GET /api/public/app | Informações públicas do app |
| GET /api/public/downloads | Links públicos de download/instalação |
| GET /api/public/plans | Planos públicos para exibição |

## Integração de Pagamento (Asaas)

O checkout está integrado com Asaas em `backend/src/routes/payment.js`.
O plano premium só é ativado após confirmação do pagamento (webhook/evento de pagamento confirmado).

Variáveis de ambiente necessárias no backend:

```bash
ASAAS_API_KEY=seu_token_do_asaas
ASAAS_ENV=sandbox # ou production
PREMIUM_MONTHLY_PRICE=49.90
PREMIUM_MEDHUB_MONTHLY_PRICE=89.90
FRONTEND_URL=https://seu-dominio.com
```

Webhook esperado:

- URL: `/api/payment/webhook`
- Eventos principais: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`

## Fila de Notificacoes (WhatsApp + Email)

Lembretes importantes (prova, trabalho, entrega) sao enfileirados e processados com:

- tentativa prioritaria por WhatsApp
- fallback para Email
- retry com backoff
- trilha de auditoria por tentativa

Endpoint de processamento da fila:

- `POST /api/notifications/process-reminders`
- protegido por segredo (`x-cron-secret` ou `Authorization: Bearer ...`)

Variaveis de ambiente recomendadas:

```bash
NOTIFICATION_CRON_SECRET=seu_segredo_forte
WHATSAPP_PUBLIC_ENABLED=true
WHATSAPP_PUBLIC_PROVIDER=infobip
WHATSAPP_PUBLIC_API_URL=https://seu-subdominio.api.infobip.com
WHATSAPP_PUBLIC_API_KEY=sua-api-key
WHATSAPP_SENDER_NUMBER=31971481340
EMAIL_USER=seu_email
EMAIL_PASS=sua_senha_de_app
```

### Cron externo (GitHub Actions)

No plano Hobby da Vercel, o cron nativo nao suporta alta frequencia. Para executar a fila a cada 10 minutos, foi adicionado:

- Workflow: `.github/workflows/process-reminders.yml`

Configure o secret no GitHub:

- `NOTIFICATION_CRON_SECRET` (mesmo valor do `NOTIFICATION_CRON_SECRET` na Vercel)

Depois disso, o workflow agenda a chamada automaticamente e tambem permite disparo manual em `workflow_dispatch`.

## Banco de dados

SQLite local — cada usuário tem seus dados separados com `user_id` em todas as tabelas.
O arquivo `database.sqlite` é criado automaticamente ao iniciar o backend.
