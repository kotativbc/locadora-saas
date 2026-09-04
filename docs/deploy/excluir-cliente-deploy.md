# Excluir cliente — Deploy

**Sem migration** — só backend (1 endpoint novo) + frontend.

## O que mudou

Botão "Excluir" na tela de Clientes. Só funciona se o cliente **não
tiver nenhum contrato vinculado** — nem rascunho. Essa trava já existia
no banco de dados desde sempre (todo contrato exige um cliente, sem
exceção), só que antes isso apareceria como um erro técnico feio;
agora dá uma mensagem clara explicando o motivo.

Se o cliente tiver documentos anexados (CNH, comprovantes), eles são
apagados junto — banco de dados e os arquivos em disco.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-excluir-cliente.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-excluir-cliente.zip
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

1. Cadastre um cliente de teste **sem** criar contrato pra ele →
   Clientes → Excluir → confirme que sumiu
2. Tenta excluir um cliente que **já tem** contrato (mesmo rascunho) →
   confirme que aparece a mensagem explicando por que não dá, em vez
   de um erro técnico

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: excluir cliente sem contrato vinculado"
git push origin main
```
