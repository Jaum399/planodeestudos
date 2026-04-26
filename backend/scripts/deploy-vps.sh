#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo bash backend/scripts/deploy-vps.sh"
  exit 1
fi

if [[ -z "${API_DOMAIN:-}" || -z "${LETSENCRYPT_EMAIL:-}" || -z "${FRONTEND_URL:-}" || -z "${MONGODB_URI:-}" || -z "${JWT_SECRET:-}" ]]; then
  echo "Variaveis obrigatorias ausentes. Defina no shell antes de rodar:"
  echo "API_DOMAIN, LETSENCRYPT_EMAIL, FRONTEND_URL, MONGODB_URI, JWT_SECRET"
  exit 1
fi

APP_DIR="/opt/appmentoria"
BACKEND_DIR="$APP_DIR/backend"

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Diretorio nao encontrado: $BACKEND_DIR"
  echo "Clone o repositorio em /opt/appmentoria antes de rodar."
  exit 1
fi

apt update
apt install -y ca-certificates curl gnupg lsb-release git ufw nginx certbot python3-certbot-nginx

if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo ${VERSION_CODENAME}) stable" > /etc/apt/sources.list.d/docker.list
  apt update
  apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

ufw allow OpenSSH || true
ufw allow 80 || true
ufw allow 443 || true
ufw --force enable || true

cd "$BACKEND_DIR"

cp -f .env.vps.example .env

set_env() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" .env; then
    sed -i "s#^${key}=.*#${key}=${value}#" .env
  else
    echo "${key}=${value}" >> .env
  fi
}

set_env "NODE_ENV" "production"
set_env "PERSISTENCE_DRIVER" "mongo"
set_env "ENABLE_FILE_DB_FALLBACK" "false"
set_env "API_DOMAIN" "$API_DOMAIN"
set_env "LETSENCRYPT_EMAIL" "$LETSENCRYPT_EMAIL"
set_env "FRONTEND_URL" "$FRONTEND_URL"
set_env "CORS_ORIGIN" "$FRONTEND_URL"
set_env "PUBLIC_APP_URL" "https://${API_DOMAIN}"
set_env "MONGODB_URI" "$MONGODB_URI"
set_env "JWT_SECRET" "$JWT_SECRET"

docker compose -f docker-compose.vps.yml up -d --build

mkdir -p /var/www/certbot
cp -f nginx/api.seu-dominio.com.conf.example /etc/nginx/sites-available/${API_DOMAIN}.conf
sed -i "s/api\.seu-dominio\.com/${API_DOMAIN}/g" /etc/nginx/sites-available/${API_DOMAIN}.conf

ln -sf /etc/nginx/sites-available/${API_DOMAIN}.conf /etc/nginx/sites-enabled/${API_DOMAIN}.conf
nginx -t
systemctl reload nginx

certbot --nginx -d "$API_DOMAIN" --agree-tos -m "$LETSENCRYPT_EMAIL" --non-interactive

echo "OK: backend em producao na VPS. Teste:"
echo "curl -i https://${API_DOMAIN}/api/health"
