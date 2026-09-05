# Manutenção contando como despesa — Deploy

**Com migration** (campo novo ligando Manutenção↔Despesa) + **um script
de backfill** pra corrigir manutenções já cadastradas antes desta
correção.

## O que estava acontecendo

Manutenção e Despesa sempre foram duas tabelas separadas, sem conexão
nenhuma entre elas. O campo "Custo" na tela de Manutenção só ficava
guardado ali mesmo — nunca virava uma despesa de verdade. Por isso não
aparecia em Financeiro → Despesas nem entrava na conta dos relatórios
(nem no painel de Desempenho da Frota, que também lê só da tabela de
Despesas).

## O que mudou

- Registrar uma manutenção com custo agora **já cria a despesa
  automaticamente** (categoria "Manutenção", vinculada ao mesmo
  veículo) — some sozinha nos relatórios e no painel de Desempenho
- Editar uma manutenção (mudar o valor, a data, a descrição) **atualiza
  a despesa vinculada junto** — os dois ficam sempre em sincronia
- Se você registrar uma manutenção sem custo e adicionar o valor
  depois, editando, a despesa é criada nesse momento

## Manutenções que já existiam antes desta correção

Essas ficaram com custo cadastrado mas sem despesa nenhuma vinculada —
o script de backfill resolve isso de uma vez, criando a despesa
retroativa pra cada uma. É seguro rodar mais de uma vez (só processa o
que ainda não tem despesa vinculada, nunca duplica).

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-manutencao-despesa.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-manutencao-despesa.zip
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
docker compose run --rm api npx prisma migrate dev --name maintenance_linked_expense --skip-generate --skip-seed
```

## Passo 5 — Backfill das manutenções antigas

```bash
cd /srv/rental-app
source .env
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < scripts/backfill-maintenance-expenses.sql
```

A última linha do resultado mostra `sem_despesa_vinculada` — se der
`0`, deu tudo certo.

## Passo 6 — Rebuildar o frontend e subir

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
```

## Passo 7 — Testar

1. **Manutenção → Nova manutenção** → preenche com um custo (ex: R$
   350,00) → salva → vai em **Financeiro → Despesas** → confirme que
   apareceu uma despesa nova "Manutenção — [descrição]" com o valor
   certo
2. Volta em Manutenção → **Editar** essa mesma manutenção → muda o
   valor pra R$ 400,00 → salva → confere em Despesas que o valor da
   despesa também mudou pra R$ 400,00 (não duplicou)
3. Confere o **Dashboard** (tela inicial) → "Despesas" deve refletir
   esse valor agora
4. Se tiver manutenções antigas com custo, confere que elas também
   aparecem em Despesas depois do backfill

## Passo 8 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "fix: manutencao com custo agora gera despesa de verdade, conta nos relatorios"
git push origin main
```
