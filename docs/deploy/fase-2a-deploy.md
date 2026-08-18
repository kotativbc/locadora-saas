# Fase 2a — Deploy no servidor (Frota, Clientes, Documentos, Tarifas)

O que mudou desde a Fase 1:
- Schema novo: `Vehicle`, `Customer`, `Document`, `RatePlan`
- 3 permissões novas: `customers.manage`, `rates.manage` (e `fleet.manage` já
  existia, agora com endpoints de verdade)
- Papéis atualizados: Admin da Empresa ganha as novas permissões; Gestor de
  Frota ganha `rates.manage`; Atendente ganha `customers.manage`
- Frontend: páginas de Frota, Clientes e Tarifas

## Passo 1 — Levar o código novo pro servidor

Baixe `rental-saas-fase2a.zip` aqui do chat pra sua máquina local, depois:

```bash
scp rental-saas-fase2a.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
ssh deploy@153.75.247.28
cd /srv/rental-app
unzip -o ~/rental-saas-fase2a.zip
```

Esse zip **não contém** a pasta `apps/api/prisma/migrations/` de propósito —
não vai sobrescrever a migration que já existe no servidor.

## Passo 2 — Rebuildar a API

```bash
docker compose build api
```

## Passo 3 — Gerar e aplicar a nova migration

Mesmo fluxo da Fase 1 (o volume `apps/api/prisma` já está montado e a
permissão do `appuser` já está ajustada):

```bash
docker compose run --rm api npx prisma migrate dev --name fleet_customers_documents_rates --skip-generate --skip-seed
```

Se aparecer erro de permissão de novo (o dono da pasta pode voltar a ser o
usuário `deploy` dependendo de como os arquivos foram extraídos), rode:

```bash
sudo chown -R 1001:1001 /srv/rental-app/apps/api/prisma
docker compose run --rm api npx prisma migrate dev --name fleet_customers_documents_rates --skip-generate --skip-seed
```

## Passo 4 — Atualizar permissões/papéis no banco

O seed é idempotente — roda de novo e só adiciona o que for novo (as 2
permissões novas e os vínculos de papel atualizados):

```bash
docker compose run --rm api npm run seed
```

## Passo 5 — Rebuildar o frontend

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
```

## Passo 6 — Subir tudo

```bash
docker compose up -d
docker compose ps
curl -sS http://localhost/api/health
```

## Passo 7 — Testar no navegador

Acesse `http://153.75.247.28/`, logue como o Admin da empresa de teste que
você já criou na Fase 1, e confirme:

1. Aparecem os menus **Frota**, **Clientes** e **Tarifas** na barra lateral
2. Cadastrar um veículo (placa, marca, modelo, categoria)
3. Cadastrar um cliente (nome, CPF)
4. Cadastrar uma tarifa (vinculada à categoria do veículo que você criou, ou
   ao veículo específico) e ver o valor formatado em R$ na listagem

## Passo 8 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "Fase 2a: frota, clientes, documentos, tarifas"
git push origin main
```

Me cola: confirmação dos 3 cadastros de teste do Passo 7, e a saída dos
comandos do Passo 6.
