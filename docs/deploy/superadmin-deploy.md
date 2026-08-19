# Super Admin — Deploy no servidor (Empresas, Auditoria)

O que mudou:
- Nenhum schema/migration novo — a tabela `audit_logs` já existe desde a
  Fase 1, só ganhou uma rota de leitura
- Backend: `GET /audit-logs`, e o `PATCH /companies/:id` agora também aceita
  o Super Admin (antes só o Admin da própria empresa conseguia)
- Frontend: Empresas ganhou KPIs + botão de suspender/reativar; Auditoria é
  tela nova; painel inicial do Super Admin ganhou atalhos de verdade

Como isso mexeu em backend (rota nova + guard), precisa rebuildar a API
desta vez — não é só frontend como nas últimas duas rodadas de design.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-superadmin.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-superadmin.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-superadmin.zip apps/api/prisma/schema.prisma
```

## Passo 2 — Rebuildar a API (sem migration — schema não mudou)

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

Logado como Super Admin (`admin@kotati.com.br`):

1. **Painel inicial**: confirme que aparecem os cards "Empresas na
   plataforma" / "Ativas", e os atalhos "Ver empresas" e "Ver auditoria"
2. **Empresas**: confirme os 3 KPIs no topo (total, ativas, suspensas) e o
   selo de status colorido por empresa
3. Clique em **Suspender** numa empresa de teste → confirme que o selo
   muda pra "Suspensa" (vermelho) → clique em **Reativar** → volta pra
   "Ativa" (verde)
4. **Auditoria**: confirme que aparece uma lista de eventos — deve incluir
   pelo menos os logins recentes e as ações que você acabou de fazer
   (suspender/reativar a empresa de teste)
5. Loga como um Admin de empresa comum (não Super Admin) → confirme que ele
   também vê **Auditoria** no menu (seção Administração), mas só os eventos
   da própria empresa — não deve aparecer coluna "Empresa" pra ele (só o
   Super Admin vê isso, já que só ele vê mais de uma empresa)

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "super admin: suspender empresa, auditoria"
git push origin main
```

Me cola o resultado dos 5 itens do Passo 4.
