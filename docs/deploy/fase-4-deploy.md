# Fase 4 — Deploy no servidor (Sinistros, Multas, Rastreamento)

O que mudou desde a Fase 3:
- Schema novo: `Claim` (sinistros), `Fine` (multas), `VehiclePosition`
  (rastreamento); `Document` ganhou um quarto tipo de dono (`CLAIM`)
- Rastreamento implementado como **adapter**: existe uma interface
  `TrackingAdapter` e uma implementação `ManualTrackingAdapter` (a única que
  existe hoje). Se um dia vocês contratarem um rastreador de verdade, dá pra
  plugar a integração criando uma nova classe que implemente essa interface,
  sem mexer no resto do sistema.
- Nenhuma permissão nova no RBAC — sinistros e multas usam `contracts.manage`,
  rastreamento usa `fleet.manage`

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-fase4.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-fase4.zip
```

Se der `Permission denied` no `schema.prisma` (causa de sempre — UID do
container vs UID do host), roda antes:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
sudo chown -R 1001:1001 /srv/rental-app/apps/api/prisma/migrations
unzip -o ~/rental-saas-fase4.zip apps/api/prisma/schema.prisma
```

Confirme:

```bash
grep -c "model Claim " apps/api/prisma/schema.prisma
```

Deve responder `1`.

## Passo 2 — Rebuildar a API

```bash
docker compose build api
```

## Passo 3 — Gerar e aplicar a migration

```bash
docker compose run --rm api npx prisma migrate dev --name claims_fines_tracking --skip-generate --skip-seed
```

## Passo 4 — Seed (idempotente)

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

1. Vá em **Sinistros** → **+ Novo sinistro** → cadastre um sinistro pra um
   veículo já existente → confirme que aparece na lista → mude o status no
   dropdown (ex: "Aberto" → "Em andamento") → confirme que salva
2. Vá em **Multas** → **+ Nova multa** → cadastre uma multa → confirme que
   aparece na lista com o valor formatado em R$ → mude o status pra "Paga"
   → confirme
3. Vá em **Rastreamento**:
   - Confirme que todos os veículos aparecem, a maioria "Sem registro"
   - Clique em **Registrar posição** de um veículo → escolha "Descrição do
     local" → digite algo (ex: "Pátio da matriz") → confirme
   - Confirme que a listagem principal atualizou com essa posição e o
     horário
   - Clique em **Registrar posição** de novo, agora escolha "Coordenadas" →
     informe latitude/longitude → confirme
   - Clique em **Histórico** desse veículo → confirme que aparecem os 2
     registros, mais recente primeiro

## Passo 8 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "Fase 4: sinistros, multas, rastreamento"
git push origin main
```

Me cola o resultado de cada item do Passo 7.
