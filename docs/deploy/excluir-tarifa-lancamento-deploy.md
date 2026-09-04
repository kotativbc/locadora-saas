# Excluir tarifa/lançamento + ganho retroativo — Deploy

**Sem migration** — só backend (2 endpoints novos) + frontend.

## O que mudou

- **Excluir tarifa** — botão na tela de Tarifas. Seguro: contratos já
  feitos guardam o valor da tarifa "congelado" no momento da criação,
  então excluir não muda nada em contrato existente, só tira a tarifa
  da lista pra novos contratos.
- **Excluir lançamento** — botão em Financeiro → Lançamentos. Se o
  lançamento já estiver marcado como **Pago**, o aviso de confirmação
  destaca isso claramente antes de excluir (dinheiro que já entrou de
  verdade) — mas não bloqueia, já que é uma decisão sua.
- **Ganho retroativo agora entra direto em "Já recebido"** — no painel
  Desempenho da Frota, não aparece mais como card separado. Continua
  sem virar lançamento em Financeiro (não é uma cobrança de cliente de
  verdade), mas o número final de "Já recebido" já vem somado, com uma
  notinha embaixo explicando quanto daquele total é retroativo.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-excluir-tarifa-lancamento.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-excluir-tarifa-lancamento.zip
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

1. **Tarifas** → exclui uma tarifa de teste → confirma que sumiu, e
   que um contrato antigo que usava ela continua com o valor certo
2. **Financeiro → Lançamentos** → exclui um lançamento pendente →
   confirma que sumiu → tenta excluir um lançamento **pago** →
   confirma que o aviso menciona isso claramente
3. **Frota → Desempenho** de um veículo com ganho retroativo
   cadastrado → confirma que "Já recebido" já vem com o valor somado,
   e a notinha embaixo explica quanto é retroativo

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: excluir tarifa e lancamento; ganho retroativo somado ao recebido"
git push origin main
```
