# Botão de Dashboard no menu — Deploy

**Sem migration** — só frontend.

## O que mudou

- Item **"Dashboard"** fixo no topo do menu lateral, acima de todas as
  seções — leva direto pra tela inicial, visível pra qualquer usuário
- A logo "Rentovix" no topo também virou um atalho pra tela inicial

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-menu-dashboard.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-menu-dashboard.zip
```

## Passo 2 — Rebuildar o frontend (API não mudou)

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
```

## Passo 3 — Testar

1. Entra em qualquer tela (ex: Multas) → confirme que "Dashboard"
   aparece no topo do menu, destacado quando você está nele
2. Clica → confirme que volta pra tela inicial

## Passo 4 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: botao de dashboard fixo no topo do menu"
git push origin main
```
