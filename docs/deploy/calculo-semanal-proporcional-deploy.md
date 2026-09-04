# Cálculo semanal + proporcional (Motorista de App) — Deploy

**Sem migration** — o campo `weeklyRate` já existia na tarifa desde
sempre, só nunca era usado no cálculo. Só backend + frontend.

## O que mudou

**Padrão e Padrão com Proteção Total** — quando o período fecha em
semana(s) exatas (7, 14, 21, 28 dias...) **e** a tarifa escolhida tem
um valor semanal cadastrado, o sistema usa esse valor semanal em vez de
diária × dias. Período que não fecha semana redonda (8 dias, 10 dias
etc.) continua usando diária × dias, normal.

**Motorista de Aplicativo** — deixou de cobrar sempre o mês cheio,
não importa o período. Agora é proporcional: (dias ÷ 30) × valor
mensal. Período de exatos 30 dias continua dando o mesmo valor de
antes (não muda nada pra quem já usa certinho mês a mês) — só passa a
ajustar pra períodos mais curtos ou mais longos.

Testei os números com valores reais antes de mandar (não só o
typecheck), incluindo o caso do Fernando (61 dias) — antes dava
R$3.000,00 fixo, agora dá R$6.100,00 (proporcional aos 61 dias reais).

**Continua existindo** o campo de valor manual que mandei semana
passada — se o proporcional não bater exatamente com o que foi
negociado, dá pra ajustar à mão do mesmo jeito.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-calculo-semanal-proporcional.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-calculo-semanal-proporcional.zip
```

## Passo 2 — Rebuildar a API (sem migration)

```bash
docker compose build api
docker compose up -d
```

## Passo 3 — Rebuildar o frontend

Só roda uma vez, espera terminar antes de tentar de novo:

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
```

## Passo 4 — Testar

1. **Tarifas** → confirme que uma tarifa tem valor semanal cadastrado
   (ou cadastre um valor de teste)
2. **Novo contrato** (Padrão ou Proteção Total) → escolhe essa tarifa
   → período de exatos 7 dias → confirme que o valor sugerido é o
   semanal, não diária × 7
3. Muda pra 8 dias → confirme que volta a usar diária × dias
4. **Novo contrato Motorista de Aplicativo** → período de 30 dias
   certinhos → confirme que o valor bate com o mensal cheio (igual
   sempre foi) → muda pra um período de 2 meses → confirme que o
   valor sugerido dobra proporcionalmente, não fica fixo

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "fix: usa valor semanal quando periodo fecha semana(s); motorista de app proporcional aos dias"
git push origin main
```
