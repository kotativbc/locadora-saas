# Fase 5 — Deploy no servidor (Financeiro Gerencial e Relatórios)

O que mudou desde a Manutenção 1:
- Schema novo: `Charge` (lançamento/conta a receber), `Expense` (despesa)
- Os campos "cobrar do cliente" de Avarias e Multas, e a assinatura de
  contrato, agora **geram lançamento financeiro de verdade** automaticamente
- Rotas novas: `/charges`, `/expenses`, `/reports/financial-summary`
- Nenhuma permissão nova — reaproveita `finance.manage` e `reports.view`,
  que já existiam desde a Fase 1 (Admin da Empresa e papel Financeiro já
  têm as duas)

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-fase5.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-fase5.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-fase5.zip apps/api/prisma/schema.prisma
```

Confirme:

```bash
grep -c "model Charge " apps/api/prisma/schema.prisma
```

Deve responder `1`.

## Passo 2 — Rebuildar a API

```bash
docker compose build api
```

## Passo 3 — Gerar e aplicar a migration

```bash
docker compose run --rm api npx prisma migrate dev --name finance --skip-generate --skip-seed
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

1. Vá em **Relatórios** — confirme que aparecem os cards (a receber,
   recebido, despesas, saldo) todos zerados ou com valores de contratos já
   existentes, se houver algum contrato "Ativo" criado **depois** deste
   deploy (contratos assinados antes não geram lançamento retroativo — só
   os daqui pra frente)
2. Crie um contrato novo, gere o link, assine (fluxo de sempre) → volte em
   **Financeiro** → confirme que apareceu um lançamento tipo "Aluguel" com
   o valor do contrato
3. Marque o lançamento como "Pago" no dropdown → volte em **Relatórios** →
   confirme que "Recebido" aumentou e "A receber" diminuiu
4. Vá em **Avarias** → cadastre uma avaria marcando "Cobrar do cliente" e
   com custo estimado preenchido → volte em **Financeiro** → confirme que
   apareceu um lançamento tipo "Avaria"
5. Vá em **Multas** → cadastre uma multa marcando "Cobrar do cliente" →
   confirme que apareceu um lançamento tipo "Multa"
6. Vá em **Despesas** → cadastre uma despesa (ex: manutenção, com valor) →
   volte em **Relatórios** → confirme que "Despesas" e o "Saldo" mudaram
7. Crie um **lançamento manual** direto em Financeiro (sem vínculo com
   contrato/cliente) → confirme que aparece na lista

## Passo 8 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "Fase 5: financeiro gerencial e relatorios"
git push origin main
```

Me cola o resultado de cada item do Passo 7.
