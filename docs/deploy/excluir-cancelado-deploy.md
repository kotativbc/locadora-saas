# Excluir contratos cancelados — Deploy

**Sem migration** — só regra de negócio no backend + botão no frontend.

## O que mudou

O botão "Excluir" agora também aparece pra contratos **cancelados**,
não só rascunhos. Mas com uma checagem de segurança por trás: só
funciona de verdade se esse contrato cancelado:

- **Nunca foi assinado** (foi cancelado ainda em rascunho), **e**
- **Não tem nenhum lançamento já pago** vinculado a ele

Se o contrato cancelado chegou a ser assinado antes do cancelamento,
ou já teve algum pagamento de verdade registrado, a exclusão é
bloqueada com uma mensagem explicando o motivo — nesses casos, ele
continua só cancelado (histórico preservado), do jeito que já
funcionava.

Isso segue o mesmo princípio de antes: nunca apagar de vez algo que
teve força jurídica ou movimentou dinheiro real.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-excluir-cancelado.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-excluir-cancelado.zip
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

## Passo 4 — Testar

1. Cria um contrato de teste, **cancela sem assinar** → clica em
   "Excluir" → confirme que funciona e some de vez
2. Cria outro contrato de teste, **assina de verdade**, depois cancela
   → clica em "Excluir" → confirme que aparece a mensagem explicando
   que não dá, porque já foi assinado

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: permitir excluir contrato cancelado, com checagem de assinatura e pagamento"
git push origin main
```
