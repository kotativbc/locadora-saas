# Numeração sequencial de contrato — Deploy

**Com migration** + **script de backfill** pros contratos já existentes.

## O que mudou

Cada contrato agora tem um número sequencial de verdade (1, 2, 3...) —
**por empresa** (cada locadora tem sua própria contagem, começando do
1). Esse número aparece:

- Na lista de Contratos (coluna "Nº")
- No PDF de todos os 3 tipos de contrato ("Contrato nº X" em vez do
  código aleatório de antes)
- No número da fatura
- Nas descrições de lançamento gerado automaticamente

O número é atribuído de forma segura mesmo se dois contratos forem
criados ao mesmo tempo por pessoas diferentes — não tem risco de dois
contratos saírem com o mesmo número.

## Contratos que já existiam antes desta mudança

Esses não têm número ainda — o script de backfill resolve isso,
numerando cada um na ordem em que foi criado (o mais antigo vira o
Nº 1, e assim por diante, separado por empresa). Depois disso, o
próximo contrato criado continua a numeração de onde parou.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-numeracao-contrato.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-numeracao-contrato.zip
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
docker compose run --rm api npx prisma migrate dev --name contract_sequential_number --skip-generate --skip-seed
```

## Passo 5 — Backfill dos contratos antigos

```bash
cd /srv/rental-app
source .env
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < scripts/backfill-contract-numbers.sql
```

A última linha mostra `sem_numero` — se der `0`, todos os contratos
antigos já têm número.

## Passo 6 — Rebuildar o frontend e subir

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
```

## Passo 7 — Testar

1. **Contratos** → confirme que a coluna "Nº" aparece preenchida em
   todos os contratos já existentes (nenhum "—")
2. Cria um contrato novo → confirme que ele recebe o **próximo**
   número da sequência (não repete nenhum já usado)
3. Baixa o PDF desse contrato novo → confirme que mostra o número
   novo, não mais o código aleatório
4. Gera uma fatura desse contrato → confirme que o número da fatura
   também usa o número sequencial

## Passo 8 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: numeracao sequencial de contrato por empresa"
git push origin main
```
