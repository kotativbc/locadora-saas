# Correção do erro de build (vistoria digital) — Deploy

Substitui o pacote anterior (`rental-saas-vistoria-digital.zip`) — usa
este no lugar. Mesma migration de antes, só o código corrigido.

## O que quebrou e por quê

Quando tornei `odometerKm`/`fuelLevel` opcionais na Vistoria (pra dar
espaço a um link gerado mas ainda não preenchido), esqueci que o PDF
do contrato busca a última vistoria de entrega/devolução pra mostrar
no documento — e essa busca não distinguia entre uma vistoria de
verdade e um link pendente, nunca preenchido. O TypeScript recusou
compilar por causa disso, o que é bom — pegou o problema antes de ir
pro ar.

**Sendo direto sobre uma limitação minha**: minha instância aqui não
consegue baixar o binário do Prisma (rede restrita), então não
consegui rodar o build completo pra confirmar 100% localmente depois
da correção — revisei a lógica com cuidado manualmente, mas o teste
de verdade só vai acontecer quando você rodar o build no servidor.
Se der erro de novo, me manda a saída de novo.

## O que corrigi

A busca da última vistoria agora só considera vistorias **realmente
concluídas** (com odômetro preenchido) — um link gerado mas ainda não
assinado pelo cliente não conta como "vistoria feita" pro PDF, do
mesmo jeito que não deveria.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-fix-build-vistoria.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-fix-build-vistoria.zip
```

## Passo 2 — Rebuildar a API

```bash
docker compose build api
```

**Confirme que termina sem erro desta vez** antes de seguir pro
próximo passo.

## Passo 3 — Backup antes da migration

```bash
/srv/rental-app/scripts/backup.sh
```

## Passo 4 — Migration (só se ainda não tiver aplicado essa)

```bash
docker compose run --rm api npx prisma migrate dev --name inspection_digital_checklist_signature --skip-generate --skip-seed
```

Se você já rodou essa migration numa tentativa anterior, o Prisma
avisa que já está em dia e não faz nada — sem problema rodar de novo.

## Passo 5 — Rebuildar o frontend e subir

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
```

## Passo 6 — Confirmar que a rota existe agora

```bash
docker compose exec api grep -c "inspection.link_created" dist/inspections/inspections.service.js
```

Deve vir maior que `0` agora.

## Passo 7 — Testar (checklist completo do runbook anterior)

1. Contrato ativo, ainda não entregue → "Link de vistoria (entrega)"
2. Preenche o checklist, assina desenhando, envia
3. Confirma que virou entregue no sistema
4. Baixa o PDF do contrato → confirme que ele **não quebra** e mostra
   a vistoria certa (esse é o ponto que corrigimos agora)
5. Tenta abrir o mesmo link de novo → erro de link inválido (esperado)

## Passo 8 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "fix: pdf de contrato so considera vistoria realmente concluida"
git push origin main
```
