# Super Admin 7 — Deploy no servidor (Relatórios de crescimento) — ÚLTIMO ITEM

**Item 7 dos 7 combinados.** Sem migration — só um endpoint novo lendo
dados que já existem.

O que mudou:
- `GET /reports/platform-growth` (só Super Admin) — totais da plataforma
  inteira (empresas, usuários, veículos, contratos), empresas cadastradas
  por mês (últimos 12 meses, com meses zerados preenchidos — sem isso o
  gráfico ficaria enganoso), distribuição por estado e por plano
- Nova página **Crescimento** (menu → Plataforma), com um gráfico de
  barras simples (CSS puro, sem biblioteca nova) e duas tabelas
- `docs/superadmin.md` — documento consolidado explicando o painel
  inteiro, por que a spec original enterprise foi recusada, e o que ficou
  de fora de propósito

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-superadmin7.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-superadmin7.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-superadmin7.zip apps/api/prisma/schema.prisma
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

## Passo 4 — Testar no navegador

Logado como Super Admin, vá em **Crescimento** (menu → Plataforma):

1. Confirme os 4 KPIs no topo (empresas, usuários, veículos, contratos)
2. Confirme o gráfico de barras dos últimos 12 meses — como você só tem
   poucas empresas cadastradas até agora, é normal ver a maioria das
   barras zeradas e só o(s) mês(es) reais preenchidos
3. Confirme a tabela "Empresas por estado" — deve bater com o que você já
   viu em Empresas
4. Confirme a tabela "Empresas por plano" — se atribuiu algum plano de
   teste antes, deve aparecer aqui

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "super admin: relatorios de crescimento da plataforma - fecha os 7 itens"
git push origin main
```

## Isso fecha os 7 itens combinados

Todo o painel Super Admin está completo: ciclo de vida de empresa, detalhe
com consumo, gestão de usuários de suporte, planos com limite, status de
backup, modo suporte somente leitura auditado, e relatórios de
crescimento. O `docs/superadmin.md` (já dentro do zip) resume tudo.
