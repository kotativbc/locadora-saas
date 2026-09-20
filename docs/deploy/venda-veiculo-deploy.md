# Excluir/Vender veículo + Vendas de Veículos — Deploy

**Com migration** (campos novos no veículo: `soldAt`, `salePrice`).

## O que mudou

**Excluir veículo** — igual funciona pra Cliente: só permite excluir
se o veículo nunca teve nenhum contrato (o banco já protegia isso).
Se já rodou de verdade, a mensagem sugere usar "Marcar como vendido"
em vez de excluir.

**Marcar como vendido** — pede o valor da venda, e o veículo:
- Some imediatamente da Frota ativa (não aparece mais nas listas
  normais, não pode mais ser usado em contrato novo)
- Continua existindo no sistema, com todo o histórico intacto
- Deixa de contar nos números da Frota (Dashboard da Frota, "Já
  gasto"/"Já recebido" da frota, etc. — um carro vendido não é mais
  "da frota")

**Nova aba "Vendas de Veículos"** — lista todo veículo vendido, com o
comparativo completo:
- Quanto custou pra adquirir
- Quanto rendeu enquanto estava locado (recebido + ganho retroativo,
  já descontando despesas)
- Por quanto foi vendido
- Resultado final do ciclo de vida inteiro daquele veículo

**Relatórios gerais e Dashboard** — o valor de venda também soma no
"Recebido" geral da empresa agora, com uma notinha explicando quanto
daquele total veio de venda de veículo (mesmo tratamento que já dei
pro ganho retroativo).

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-venda-veiculo.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-venda-veiculo.zip
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
docker compose run --rm api npx prisma migrate dev --name vehicle_sold_status --skip-generate --skip-seed
```

## Passo 5 — Rebuildar o frontend e subir

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
```

## Passo 6 — Testar

1. Cadastra um veículo de teste sem contrato nenhum → Excluir →
   confirme que funciona
2. Pega um veículo de teste com contrato/histórico → tenta Excluir →
   confirme que bloqueia com a mensagem sugerindo vender
3. No mesmo veículo → Marcar como vendido → informa um valor →
   confirme que ele some da lista normal da Frota
4. Vai em Vendas de Veículos (novo item do menu) → confirme que
   aparece o comparativo completo desse veículo
5. Confere Relatórios → confirme que o valor de venda aparece somado
   no "Recebido", com a notinha explicando

## Passo 7 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: excluir/vender veiculo, tela de vendas com comparativo, venda refletindo nos relatorios"
git push origin main
```
