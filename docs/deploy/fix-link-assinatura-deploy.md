# Correção urgente — regenerar link de assinatura — Deploy

**Sem migration** — só regra de negócio + botão no frontend.

## A causa real do problema do LH Veículos

O botão "Gerar link" só aparecia (e só funcionava no backend) enquanto
o contrato estava em rascunho. No momento em que o link é gerado com
sucesso pela primeira vez, o status do contrato já muda pra "aguardando
assinatura" — e a partir daí, gerar de novo era bloqueado, e o botão
nem aparecia mais na tela.

Ou seja: se a pessoa gerou o link, fechou a tela sem copiar/enviar, ou
simplesmente perdeu — não tinha mais nenhum jeito de recuperar. É
exatamente isso que aconteceu com o contrato do seu cliente.

## O que corrigi

Agora dá pra gerar o link de novo, quantas vezes precisar, enquanto o
contrato não tiver sido efetivamente assinado (rascunho ou aguardando
assinatura). Uma vez assinado de verdade, aí sim não dá mais — isso é
intencional, protege a validade jurídica do que foi assinado.

**Atenção**: gerar um link novo invalida o anterior — se o cliente
ainda tiver o link antigo salvo em algum lugar, ele vai parar de
funcionar assim que um novo for gerado. É preciso mandar o link novo
pra ele.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-fix-link-assinatura.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-fix-link-assinatura.zip
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

## Passo 4 — Resolver o contrato do LH Veículos agora

1. Acha o contrato específico que está "aguardando assinatura" sem
   link
2. Clica em "Gerar link de novo" (o botão que antes não aparecia,
   agora aparece pra esse status)
3. Copia o link e reenvia pro cliente final assinar

## Passo 5 — Testar de forma geral

1. Cria um contrato de teste → gera o link → confirma que funciona
2. Sem assinar ainda, clica em "Gerar link de novo" → confirma que
   funciona (esse é o comportamento que estava quebrado)
3. Assina o contrato de teste → confirma que o botão de gerar link
   desaparece de vez (comportamento esperado, contrato já assinado não
   pode gerar link novo)

## Passo 6 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "fix: permitir gerar link de assinatura novamente antes do contrato ser assinado"
git push origin main
```
