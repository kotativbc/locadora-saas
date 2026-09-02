# Melhorias (Contrato/Financeiro/Dashboard) — Parte A — Deploy no servidor

**Parte A de várias.** Esse lote é grande (junta contrato, financeiro e um
recurso público novo), então vem dividido — essa parte é só schema +
o fix pontual do Renavam no formulário de veículo, que já estava pronto.

## O que mudou

- **Renavam** — campo que faltava no formulário de "Novo veículo" (o
  backend já aceitava, só a tela nunca teve o campo)
- **`RentInstallment`** — cronograma semanal de pagamento do aluguel (não
  confundir com a caução) — usado no Motorista de Aplicativo. Ainda **sem
  lógica nem tela** nesta parte, só a tabela existe
- **`MaintenanceReport`** + **`Contract.maintenanceReportToken`** —
  sinalização de problema no veículo pelo próprio cliente, via link
  público. Ainda **sem endpoints nem tela** nesta parte, só a estrutura

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-melhorias-parteA.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-melhorias-parteA.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-melhorias-parteA.zip apps/api/prisma/schema.prisma
```

## Passo 2 — Rebuildar a API

```bash
docker compose build api
```

## Passo 3 — Backup antes da migration

```bash
/srv/rental-app/scripts/backup.sh
```

## Passo 4 — Migration

```bash
docker compose run --rm api npx prisma migrate dev --name rent_installments_and_maintenance_reports --skip-generate --skip-seed
```

## Passo 5 — Rebuildar o frontend e subir

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
```

## Passo 6 — Testar

Só o Renavam tem algo pra testar nesta parte:

1. **Frota → Novo veículo** → confirme o campo **Renavam** ao lado do
   Chassi → cadastre um veículo com ele preenchido → confirme que salvou

## Passo 7 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "melhorias: schema rent_installments/maintenance_reports + fix renavam (parte A)"
git push origin main
```

Sigo direto pra Parte B — a lógica de verdade (geração de cobrança
respeitando o cronograma, endpoints públicos de sinalização, multa de
devolução antecipada, contrato/cliente opcional nos formulários
financeiros).
