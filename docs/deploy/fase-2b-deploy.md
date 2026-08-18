# Fase 2b — Deploy no servidor (Contratos, PDF, Assinatura interna)

O que mudou desde a Fase 2a:
- Schema novo: `Contract`, `ContractSignature`
- Nova dependência de produção: `@react-pdf/renderer` (gera o PDF do contrato
  em Node, sem headless browser — leve o suficiente pro seu servidor)
- Rota **pública** nova (sem login): `/api/public/contracts/:token` — é o
  link de assinatura que o cliente usa. Todo o resto continua autenticado.
- Frontend: página de Contratos + página pública `/assinar/:token`
- **Correção de um bug da Fase 1**: a logo da empresa usava `<img src=".../logo">`,
  que não consegue mandar o header de autenticação — corrigido pra buscar o
  arquivo via JS (com o token) e criar uma URL local. Se você chegou a subir
  uma logo antes, teste de novo depois do deploy pra confirmar que aparece.

## Passo 1 — Levar o código novo pro servidor

```bash
scp rental-saas-fase2b.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-fase2b.zip
```

Se aparecer `Permission denied` tentando sobrescrever `schema.prisma` (mesma
causa da vez passada), rode antes:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
sudo chown -R 1001:1001 /srv/rental-app/apps/api/prisma/migrations
unzip -o ~/rental-saas-fase2b.zip apps/api/prisma/schema.prisma
```

Confirme que pegou o schema certo:

```bash
grep -c "model Contract " apps/api/prisma/schema.prisma
```

Deve responder `1`.

## Passo 2 — Rebuildar a API

```bash
docker compose build api
```

Esse build deve demorar um pouco mais — é a primeira vez instalando
`@react-pdf/renderer`/`react` na imagem.

## Passo 3 — Gerar e aplicar a migration

```bash
docker compose run --rm api npx prisma migrate dev --name contracts_and_signatures --skip-generate --skip-seed
```

## Passo 4 — Seed (idempotente, não deve mudar nada nesta fase)

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

## Passo 7 — Testar no navegador (fluxo completo)

Logado como Admin (ou Atendente) da empresa de teste:

1. Vá em **Contratos** → **+ Novo contrato**, escolha o cliente e o veículo
   que você já cadastrou, uma tarifa (ou diária avulsa), datas de retirada e
   devolução → crie o contrato (fica como "Rascunho")
2. Clique em **PDF** na listagem — deve abrir um PDF com os dados do
   contrato e "DOCUMENTO PENDENTE DE ASSINATURA" no rodapé
3. Clique em **Gerar link** — deve aparecer uma URL tipo
   `http://153.75.247.28/assinar/<token longo>`
4. **Abra essa URL numa aba anônima** (simulando o cliente, sem estar
   logado) — deve mostrar os dados do contrato, um botão pra ler o PDF
   completo, e a caixinha de aceite
5. Marque "Li e concordo" e clique em **Assinar contrato**
6. Volte pra aba logada, atualize a lista de **Contratos** — o status deve
   virar "Ativo"
7. Vá em **Frota** — o veículo usado no contrato deve aparecer com status
   "Locado"
8. Clique em **PDF** de novo nesse contrato — agora deve mostrar "ASSINADO
   ELETRONICAMENTE" com data/hora, IP e o hash de verificação
9. Confirme que a logo da empresa aparece em **Minha empresa** (o bug
   corrigido nesta fase)

## Passo 8 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "Fase 2b: contratos, PDF e assinatura interna"
git push origin main
```

Me cola: confirmação de cada item do Passo 7 (principalmente o 4 a 8, que
são o fluxo novo), e a saída do Passo 6.
