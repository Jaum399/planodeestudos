FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Volume persistente para salvar a sessao do WhatsApp (auth_info)
VOLUME ["/app/auth_info"]

EXPOSE 3333

CMD ["node", "index.js"]
