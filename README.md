# Ordex — Clareza cognitiva estrutura de execução

Desenvolvido com base em ciência cognitiva e organização estratégica, o Ordex estrutura exatamente o que você precisa estudar — no momento certo. Sistema completo de estudos inteligentes com frontend React e backend Node.js.

## Estrutura

```
├── backend/     - API Node.js + Express + MongoDB
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
| POST /api/auth/forgot-password | Solicitar link de recuperação |
| POST /api/auth/reset-password | Redefinir senha com token |
| GET /api/auth/me | Dados do usuário |
| PUT /api/auth/me | Atualizar perfil |
| PUT /api/auth/password | Alterar senha |

## Recuperação de senha

Fluxo já configurado no backend e frontend:

- tela de solicitação: `/forgot-password`
- tela de redefinição: `/reset-password?token=...`
- endpoint de solicitação: `POST /api/auth/forgot-password`
- endpoint de troca: `POST /api/auth/reset-password`

Variáveis mínimas para envio real de e-mail (Resend recomendado):

```bash
FRONTEND_URL=https://app-planodeestudos.vercel.app
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM="AppMentoria <noreply@seu-dominio.com>"

# fallback SMTP (opcional)
EMAIL_USER=entcenologia@gmail.com
EMAIL_FROM_NAME=AppMentoria
# escolha uma:
EMAIL_PASS=sua_senha_de_app_google
# ou
GMAIL_APP_PASSWORD=sua_senha_de_app_google
```

Observações Resend:

- `RESEND_FROM` deve usar um domínio/remetente validado na Resend.
- Se `RESEND_API_KEY` não estiver definido (ou falhar), o backend tenta SMTP fallback.

Observações de segurança já ativas:

- token de reset expira em 1 hora
- token é salvo em hash no banco
- resposta da rota de solicitação não revela se o e-mail existe

## Integração de Pagamento (Asaas)

O checkout está integrado com Asaas em `backend/src/routes/payment.js`.
O plano premium só é ativado após confirmação do pagamento (webhook/evento de pagamento confirmado).

Variáveis de ambiente necessárias no backend:

```bash
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/?appName=appordex
PERSISTENCE_DRIVER=mongo
ENABLE_FILE_DB_FALLBACK=false
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

API automatica recomendada (Vercel):

- `POST /api/notifications/auto-alerts/daily` (gera digest diario + processa fila)
- `POST /api/notifications/auto-alerts/process` (processamento continuo da fila)
- protegida por `NOTIFICATION_CRON_SECRET`

Automacao ativa:

- Vercel Cron diario: `0 7 * * *` -> `/api/notifications/auto-alerts/daily`
- GitHub Actions a cada 10 minutos: `.github/workflows/process-reminders.yml` -> `/api/notifications/auto-alerts/process`

Com isso, alertas de provas, trabalhos e outros lembretes sao disparados automaticamente por WhatsApp (+34641296849) e Email.

Variaveis de ambiente recomendadas:

```bash
NOTIFICATION_CRON_SECRET=seu_segredo_forte
WHATSAPP_PUBLIC_ENABLED=true
WHATSAPP_PUBLIC_PROVIDER=infobip
WHATSAPP_PUBLIC_API_URL=https://seu-subdominio.api.infobip.com
WHATSAPP_PUBLIC_API_KEY=sua-api-key
WHATSAPP_SENDER_NUMBER=34641296849
EMAIL_USER=seu_email
EMAIL_PASS=sua_senha_de_app
```

### Cron externo (GitHub Actions)

No plano Hobby da Vercel, o cron nativo nao suporta alta frequencia. Para executar a fila a cada 10 minutos, foi adicionado:

- Workflow: `.github/workflows/process-reminders.yml`

Configure o secret no GitHub:

- `NOTIFICATION_CRON_SECRET` (mesmo valor do `NOTIFICATION_CRON_SECRET` na Vercel)

Depois disso, o workflow agenda a chamada automaticamente e tambem permite disparo manual em `workflow_dispatch`.

## Health-check diario do banco (MongoDB)

Para reduzir risco de indisponibilidade silenciosa, foi adicionado um health-check diario com round-trip real no banco:

- endpoint autenticado: `/api/notifications/db-health-check`
- teste executado: escrita + leitura + exclusao de documento temporario
- automacao: `.github/workflows/db-health-check.yml`

Configure estes secrets no GitHub repository:

- `API_BASE_URL` (ex.: `https://app-ordex.vercel.app`)
- `NOTIFICATION_CRON_SECRET` (mesmo segredo ja usado em `/api/notifications/process-reminders`)

Tambem e possivel rodar manualmente o workflow no GitHub Actions via `workflow_dispatch`.

## Banco de dados

O backend usa MongoDB com Mongoose.

Defina `MONGODB_URI` no ambiente local e na Vercel para permitir a conexão com o cluster.
O backend usa a base lógica `ordex` ao inicializar a conexão.

Para garantir persistencia real (mesmo com a maquina local desligada), configure tambem:

- `PERSISTENCE_DRIVER=mongo`
- `ENABLE_FILE_DB_FALLBACK=false`

Com isso, o backend nao grava em banco local de arquivo quando houver falha de conexao com o Atlas.

Se a conexao falhar com erro de allowlist, libere o IP publico do servidor que hospeda o backend em Atlas Network Access.

## Producao recomendada

Se o MongoDB Atlas nao puder usar allowlist ampla de IP, nao publique o backend em Vercel Serverless.
Nesse caso, o caminho estavel e:

- frontend na Vercel
- backend em VPS com IP fixo
- Atlas liberando somente o IP da VPS

O frontend ja suporta API externa via `VITE_API_BASE_URL` em [frontend/src/services/api.ts](frontend/src/services/api.ts).

### Backend em VPS com Docker

Arquivos prontos para deploy:

- [backend/Dockerfile](backend/Dockerfile)
- [backend/docker-compose.vps.yml](backend/docker-compose.vps.yml)
- [backend/.env.vps.example](backend/.env.vps.example)

Passos na VPS:

```bash
cd backend
cp .env.vps.example .env
# edite .env com as credenciais reais
docker compose -f docker-compose.vps.yml up -d --build
```

Depois disso, publique a API atras de um dominio como `https://api.seu-dominio.com` e libere esse IP fixo no Atlas Network Access.

### Nginx reverso com HTTPS

Use o Nginx na propria VPS para expor a API e manter o container do backend acessivel apenas localmente em `127.0.0.1:3001`.

Template pronto:

- [backend/nginx/api.seu-dominio.com.conf.example](backend/nginx/api.seu-dominio.com.conf.example)

Passos no Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo mkdir -p /var/www/certbot
sudo cp backend/nginx/api.seu-dominio.com.conf.example /etc/nginx/sites-available/api.seu-dominio.com.conf
```

Edite o arquivo em `/etc/nginx/sites-available/api.seu-dominio.com.conf` e troque `api.seu-dominio.com` pelo dominio real.

Ative o site e valide a configuracao:

```bash
sudo ln -s /etc/nginx/sites-available/api.seu-dominio.com.conf /etc/nginx/sites-enabled/api.seu-dominio.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

Com o DNS `A` do dominio apontando para a VPS, emita o certificado:

```bash
sudo certbot --nginx -d api.seu-dominio.com
```

Teste final:

```bash
curl https://api.seu-dominio.com/api/health
```

Se o backend estiver respondendo corretamente, configure o frontend na Vercel para usar esse dominio.

## Cutover final para persistencia online duravel

Quando a VPS estiver pronta e conectada no Atlas com IP fixo, execute:

1. Na VPS (como root), com o repositorio em `/opt/appordex`:

```bash
export API_DOMAIN=api.seu-dominio.com
export LETSENCRYPT_EMAIL=voce@seu-dominio.com
export FRONTEND_URL=https://app-ordex.vercel.app
export MONGODB_URI='mongodb+srv://usuario:senha@cluster.mongodb.net/?retryWrites=true&w=majority'
export JWT_SECRET='troque-por-um-segredo-forte'

bash /opt/appordex/backend/scripts/deploy-vps.sh
```

2. No seu computador local, para apontar a Vercel para a API da VPS:

```powershell
./scripts/cutover-vercel-to-vps.ps1 -ApiBaseUrl https://api.seu-dominio.com/api
```

3. Validacao:

```bash
curl -i https://api.seu-dominio.com/api/health
```

E no frontend em producao, o login deve responder 200/401 (nunca 503 de banco indisponivel).

### Frontend na Vercel apontando para a VPS

Defina no projeto do frontend:

```bash
VITE_API_BASE_URL=https://api.seu-dominio.com/api
```

Com isso, o frontend deixa de usar as funcoes serverless da Vercel para autenticacao e dados, e passa a consumir o backend dedicado.
