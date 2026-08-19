# Super Admin 2 — Deploy no servidor (Ciclo de vida de empresa)

**Item 1 dos 7 combinados.** O que mudou:
- `Company.active` (boolean) virou `Company.status` (8 estados: Pendente,
  Em teste, Ativa, Em atraso, Suspensa, Cancelada, Arquivada, Bloqueada por
  segurança) + `Company.statusReason`
- Nova tabela `company_status_events` — histórico append-only de toda
  mudança de estado (quem, quando, de onde pra onde, motivo)
- **O login agora bloqueia de verdade** quando a empresa está num estado
  bloqueante (suspensa/cancelada/arquivada/bloqueada por segurança) — antes
  suspender uma empresa não impedia nada na prática, só mudava o texto na
  tela
- Transições de estado só o Super Admin faz, e são validadas contra uma
  lista central de "de qual estado pode ir pra qual" — não dá pra pular
  direto de "Pendente" pra "Arquivada", por exemplo
- Frontend: tela de Empresas ganhou o fluxo de mudança de estado + histórico

## ⚠️ Atenção especial nesta migration

Essa é a primeira migration do projeto que **remove uma coluna** (`active`)
pra trocar por outra (`status`). O Prisma pode pedir uma confirmação
interativa por ser uma mudança "destrutiva" do ponto de vista dele — mesmo
não havendo dado real em risco (a única empresa que existe hoje já é
`active: true`, que vira `status: 'active'` automaticamente pelo valor
padrão da coluna nova).

**Se aparecer um prompt perguntando algo como "reset the database" ou pra
confirmar a remoção da coluna, não digite nada que resete o banco — eu não
testei esse prompt específico antes. Se aparecer, copia a mensagem exata e
me manda antes de responder qualquer coisa.**

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-superadmin2.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-superadmin2.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-superadmin2.zip apps/api/prisma/schema.prisma
```

## Passo 2 — Rebuildar a API

```bash
docker compose build api
```

## Passo 3 — Backup antes da migration (por segurança, já que essa remove coluna)

```bash
/srv/rental-app/scripts/backup.sh
ls -lh /srv/rental-data/backups | tail -2
```

## Passo 4 — Gerar e aplicar a migration

```bash
docker compose run --rm api npx prisma migrate dev --name company_lifecycle_status --skip-generate --skip-seed
```

Acompanhe a saída com atenção (ver aviso acima).

## Passo 5 — Confirmar que a empresa existente migrou certo

```bash
set -a; source .env; set +a
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT name, status, status_reason FROM companies;"
```

Toda empresa deve aparecer com `status = active` e `status_reason` vazio.

## Passo 6 — Rebuildar o frontend e subir

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
docker compose ps
curl -sSI https://rentovix.kotati.com.br/api/health
```

## Passo 7 — Testar no navegador

Logado como Super Admin:

1. **Empresas**: confirme que o status agora aparece como selo "Ativa"
   (verde) em vez do antigo "Ativa/Inativa"
2. Clique em **Mudar estado** numa empresa de teste → tente ir direto pra
   "Arquivada" sem passar por outros estados → deve dar erro claro
   explicando que a transição não é permitida
3. Tente mudar pra "Suspensa" **sem preencher o motivo** → deve pedir o
   motivo
4. Agora preencha o motivo e confirme → confirme que o selo fica vermelho
   "Suspensa" e o motivo aparece embaixo
5. Clique em **Histórico** dessa empresa → confirme que aparece a mudança
   registrada, com data, de/pra e motivo
6. **Importante**: peça pro admin dessa empresa de teste tentar logar (ou
   teste você mesmo com as credenciais dele) → deve ser **barrado** com uma
   mensagem clara, não deixar entrar
7. Volte em Empresas → **Mudar estado** de novo → "Ativa" → confirme que o
   admin dessa empresa consegue logar de novo normalmente
8. Crie uma empresa nova do zero → confirme que ela já nasce com status
   "Ativa" (igual sempre foi, só que agora de verdade)

## Passo 8 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "super admin: ciclo de vida de empresa com estados reais"
git push origin main
```

Me cola o resultado de cada item do Passo 7 — principalmente o 6, que é o
que prova que o bloqueio funciona de verdade agora.
