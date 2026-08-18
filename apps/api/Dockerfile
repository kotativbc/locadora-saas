FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Usuário não-root dentro do container — UID/GID recebido como build arg,
# igual ao do usuário "deploy" no host (ver docker-compose.yml). Isso resolve
# de vez o problema de permissão em pastas de /srv/rental-data e
# apps/api/prisma criadas pelo host: dono bate, sem chown manual.
# Usa UID/GID numérico direto (sem useradd) de propósito: a imagem base já
# vem com um usuário "node" no UID/GID 1000, que colidiria com o "deploy"
# do host na maioria dos servidores Debian — o Docker aceita USER numérico
# sem precisar de entrada em /etc/passwd.
ARG APP_UID=1000
ARG APP_GID=1000
RUN mkdir -p /home/appuser && chown ${APP_UID}:${APP_GID} /home/appuser
ENV HOME=/home/appuser
USER ${APP_UID}:${APP_GID}

EXPOSE 3000
CMD ["node", "dist/main.js"]
