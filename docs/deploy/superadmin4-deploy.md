# Super Admin 4 — Deploy no servidor (Planos com limite)

**Item 4 dos 7 combinados.** Schema novo — precisa de migration.

O que mudou:
- Tabela `plans` (código, nome, limite de veículos, limite de usuários,
  ativo) + `Company.planId`
- Regra de limite **centralizada** num único serviço (`PlanLimitsService`)
  — Frota e Usuários chamam ele antes de criar, nenhum dos dois reimplementa
  a contagem por conta própria
- Sem plano atribuído = sem limite (comportamento de hoje continua igual)
- Nova página **Planos** (menu → Plataforma) — criar planos, ativar/desativar
- Empresa ganha seletor de plano na criação e "Mudar plano" na página de
  detalhe, que agora também mostra consumo vs. limite (ex: "8 / 10")

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-superadmin4.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-superadmin4.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-superadmin4.zip apps/api/prisma/schema.prisma
```

## Passo 2 — Rebuildar a API

```bash
docker compose build api
```

## Passo 3 — Backup antes da migration (rotina de sempre)

```bash
/srv/rental-app/scripts/backup.sh
```

## Passo 4 — Gerar e aplicar a migration

Essa é só aditiva (tabela nova + coluna nova opcional) — não deve pedir
nenhuma confirmação especial, ao contrário da do item 1.

```bash
docker compose run --rm api npx prisma migrate dev --name plans_and_limits --skip-generate --skip-seed
```

## Passo 5 — Rebuildar o frontend e subir

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
docker compose ps
curl -sSI https://rentovix.kotati.com.br/api/health
```

## Passo 6 — Testar no navegador

Logado como Super Admin:

1. **Planos** (menu → Plataforma) → **+ Novo plano** → crie um plano de
   teste com limite de veículos = 1 (número baixo de propósito, pra testar
   fácil)
2. Vá em **Empresas** → detalhe da "LH Veículos" → **Mudar plano** →
   selecione o plano de teste → confirme
3. Confirme que o card "Veículos" agora mostra "X / 1" (com a cor mudando
   pra vermelho se já estiver no limite ou acima)
4. Vá em **Frota**, logado como admin dessa empresa (ou peça pro admin
   testar) → tente cadastrar um veículo além do limite → deve ser
   **bloqueado** com mensagem clara mencionando o nome do plano e o limite
5. Volte como Super Admin → **Mudar plano** de novo → "Sem plano (sem
   limite)" → confirme que agora dá pra cadastrar veículo sem restrição

## Passo 7 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "super admin: planos com limite de veiculos e usuarios"
git push origin main
```

Me cola o resultado — principalmente o item 4, que prova que o limite
bloqueia de verdade, não só aparece na tela.
