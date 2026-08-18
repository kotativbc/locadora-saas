# Fase 3 — Deploy no servidor (Vistorias, Entrega, Devolução, Avarias, Manutenção)

O que mudou desde a Fase 2b:
- Schema novo: `Inspection`, `Damage`, `Maintenance`; `Contract` ganhou
  `deliveredAt`/`returnedAt`; `Document` ganhou um terceiro tipo de dono
  (`INSPECTION`, pra fotos de vistoria)
- Rotas novas: `/inspections`, `/damages`, `/maintenance` (todas autenticadas,
  reaproveitando as permissões `contracts.manage` e `fleet.manage` que já
  existiam — nenhuma permissão nova)
- Frontend: botões de "Registrar entrega"/"Registrar devolução" na tela de
  Contratos, + páginas novas de Manutenção e Avarias

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-fase3.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-fase3.zip
```

Se der `Permission denied` tentando sobrescrever `schema.prisma` (mesma
causa de sempre), roda antes:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
sudo chown -R 1001:1001 /srv/rental-app/apps/api/prisma/migrations
unzip -o ~/rental-saas-fase3.zip apps/api/prisma/schema.prisma
```

Confirme:

```bash
grep -c "model Inspection " apps/api/prisma/schema.prisma
```

Deve responder `1`.

## Passo 2 — Rebuildar a API

```bash
docker compose build api
```

## Passo 3 — Gerar e aplicar a migration

```bash
docker compose run --rm api npx prisma migrate dev --name inspections_damages_maintenance --skip-generate --skip-seed
```

## Passo 4 — Seed (idempotente)

```bash
docker compose run --rm api npm run seed
```

## Passo 5 — Rebuildar o frontend

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
```

## Passo 6 — Subir tudo

```bash
docker compose up -d
docker compose ps
curl -sS http://localhost/api/health
```

## Passo 7 — Testar no navegador

Usando um contrato que já esteja **"Ativo"** (assinado) — se não tiver
nenhum, crie e assine um novo primeiro (fluxo da Fase 2b):

1. Em **Contratos**, no contrato ativo, clique em **Registrar entrega**
   → informe odômetro e nível de combustível → confirme
2. Confira que a coluna "Entrega/Devolução" mostra "Entregue em ..." e que
   o botão virou **Registrar devolução**
3. Clique em **Registrar devolução** → informe odômetro (igual ou maior que
   o da entrega) e combustível → confirme
4. Confira que o status do contrato virou **Concluído**
5. Vá em **Avarias** → **+ Nova avaria** → cadastre uma avaria pro veículo
   usado no contrato → confirme que aparece na lista com status "Em aberto"
   → clique em **Marcar resolvida** → confirme que o status muda
6. Vá em **Manutenção** → **+ Nova manutenção** → registre uma manutenção
   pro mesmo veículo → confirme que aparece na lista
7. Teste o caso de erro: tente **Registrar devolução** de novo no mesmo
   contrato (já devolvido) — deve dar erro claro, não "Internal Server Error"
8. Teste outro caso de erro: crie um novo contrato pro mesmo veículo com
   datas livres e tente **Registrar entrega** com odômetro **menor** que o
   atual do veículo — deve ser rejeitado com mensagem clara

## Passo 8 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "Fase 3: vistorias, entrega, devolucao, avarias, manutencao"
git push origin main
```

Me cola o resultado de cada item do Passo 7.
