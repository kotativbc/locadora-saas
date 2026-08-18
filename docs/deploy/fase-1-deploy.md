# Fase 1 — Deploy no servidor

Pré-requisito: Fase 0 concluída (Docker instalado, `/srv/rental-app` com o
repositório clonado, chave de deploy cadastrada no GitHub).

## Passo 1 — Corrigir o UFW

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw reload
sudo ufw status verbose
```

Confirme que aparece `Default: deny (incoming)`.

## Passo 2 — Levar o código para o servidor

No chat, baixe o arquivo `rental-saas.zip` para sua máquina local. Depois, na
sua máquina local (não no servidor):

```bash
scp rental-saas.zip deploy@153.75.247.28:~/
```

De volta no servidor:

```bash
ssh deploy@153.75.247.28
sudo apt install -y unzip
cd /srv/rental-app
unzip -o ~/rental-saas.zip
ls
```

Você deve ver `docker-compose.yml`, `Caddyfile`, `apps/`, `scripts/`,
`systemd/`, `docs/` dentro de `/srv/rental-app`.

## Passo 3 — Configurar segredos

```bash
cd /srv/rental-app
cp .env.example .env
```

Gere valores fortes e edite o `.env` (`nano .env`) substituindo:

```bash
openssl rand -base64 24   # use o resultado em POSTGRES_PASSWORD
openssl rand -base64 48   # use o resultado em JWT_SECRET
```

Defina também `SEED_SUPER_ADMIN_EMAIL` e `SEED_SUPER_ADMIN_PASSWORD` com o
e-mail e senha que você vai usar para o primeiro acesso (Super Admin da
plataforma).

**Confirme que `.env` está no `.gitignore`** (já está) — ele nunca deve ir
pro Git.

## Passo 4 — Buildar as imagens

```bash
docker compose build
```

Isso builda a API (roda `prisma generate` e `npm run build` dentro do
container — nesse ponto, diferente do meu sandbox, o servidor tem internet
completa, então o download do engine do Prisma deve funcionar normalmente).

Se algum passo do build falhar, me cole o erro antes de continuar.

## Passo 5 — Subir o banco e aplicar as migrations

```bash
docker compose up -d db
docker compose ps    # espere "db" ficar "healthy"

docker compose run --rm api npx prisma migrate deploy
```

## Passo 6 — Popular permissões, papéis e o Super Admin

```bash
docker compose run --rm api npm run seed
```

Deve terminar com `Seed concluído.` e ter criado o Super Admin com o e-mail
que você definiu no `.env`.

## Passo 7 — Buildar o frontend

Sem instalar Node no servidor — usamos um container efêmero só para o build:

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
```

Isso gera `apps/web/dist`, que o Caddy já está configurado para servir.

## Passo 8 — Subir tudo

```bash
docker compose up -d
docker compose ps
```

Confirme que **só o `caddy` tem porta publicada** (`0.0.0.0:80->80`,
`0.0.0.0:443->443`) — `db` e `api` não devem aparecer com nenhuma porta
mapeada na coluna `PORTS`.

## Passo 9 — Verificar

No servidor:

```bash
curl -s http://localhost/api/health
```

Deve responder `{"status":"ok",...}`.

No navegador, acesse `http://153.75.247.28/` — deve aparecer a tela de
login. Entre com o e-mail/senha do Super Admin definidos no `.env`, crie uma
empresa de teste e confirme que consegue logar como o admin dessa empresa
(usando a senha que você definiu no formulário) e criar um usuário Atendente.

## Passo 10 — Ativar backup e worker (systemd timers)

```bash
sudo cp /srv/rental-app/systemd/*.service /srv/rental-app/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rental-backup.timer
sudo systemctl enable --now rental-worker.timer
systemctl list-timers | grep rental
```

Teste o backup manualmente uma vez:

```bash
/srv/rental-app/scripts/backup.sh
ls -lh /srv/rental-data/backups
```

Deve aparecer um `db-*.dump` e um `uploads-*.tar.gz`.

## Passo 11 — Subir o código pro GitHub

```bash
cd /srv/rental-app
git add -A
git commit -m "Fase 1: nucleo (auth, multiempresa, RBAC)"
git push origin main
```

## Passo 12 — Me confirmar

Cole aqui o resultado de:

```bash
docker compose ps
curl -s http://localhost/api/health
sudo ufw status verbose
systemctl list-timers | grep rental
```

Com isso eu fecho o `docs/status/fase-1.md` como concluída e a gente parte
pra Fase 2 (frota, clientes, documentos, tarifas, contratos, PDF e
assinatura interna).
