# Super Admin 5 — Deploy no servidor (Status dos backups)

**Item 5 dos 7 combinados.** Sem migration, sem tabela nova — só lê a pasta
`/srv/rental-data/backups` que já existe desde a Fase 1.

O que mudou:
- Novo endpoint `GET /backups/status`, só Super Admin — lê os arquivos que
  o `scripts/backup.sh` já gera todo dia via systemd timer, agrupa por
  execução (dump do banco + arquivo de uploads) e calcula se está "em dia"
  (menos de 30h desde o último) ou "atrasado"
- Nova página **Backups** (menu → Plataforma) com o selo de status e o
  histórico das últimas 30 execuções, com tamanho de cada arquivo

## Passo 1 — Levar o código pro servidor

Do celular, numa aba/sessão **local** (não a que já está conectada via
SSH no servidor):

```bash
scp ~/storage/downloads/Saas/rental-saas-superadmin5.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-superadmin5.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-superadmin5.zip apps/api/prisma/schema.prisma
```

## Passo 2 — Rebuildar a API (sem migration)

```bash
docker compose build api
docker compose up -d
```

## Passo 3 — Rebuildar o frontend

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
```

## Passo 4 — Testar no navegador

Logado como Super Admin, vá em **Backups** (menu → Plataforma):

1. Confirme que aparece "Em dia" (verde) — você já rodou backup manual
   antes, então já deve ter pelo menos um registro na lista
2. Confirme que a tabela mostra data/hora e o tamanho de cada arquivo
   (banco de dados e uploads)
3. Se quiser gerar mais um registro pra ver a lista crescer:
   ```bash
   /srv/rental-app/scripts/backup.sh
   ```
   e recarregue a página

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "super admin: status dos backups"
git push origin main
```

Me avisa como ficou quando puder — sem pressa, sei que está no celular.
