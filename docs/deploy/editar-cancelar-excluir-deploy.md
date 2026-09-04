# Editar/cancelar/excluir contrato + ganho retroativo — Deploy

**Com migration** (campo `notes` em Contract, `priorEarnings` em Vehicle).
Área sensível — testa com calma antes de considerar fechado.

## O que mudou

**Ganho retroativo** — campo novo no veículo, separado de tudo mais.
Editável pelo botão "Editar" na Frota, aparece no painel "Desempenho"
como um valor à parte (nunca some em Financeiro → Lançamentos, porque
não é uma cobrança real de cliente).

**Editar contrato — dois modos, dependendo se já foi assinado:**
- **Ainda não assinado** (rascunho ou aguardando assinatura): edição
  completa — dá pra mudar cliente, veículo, tipo, tarifa, datas, tudo.
- **Já assinado** (ativo ou concluído): só data de devolução e
  observações. Tentar mudar cliente/veículo/valores é bloqueado com
  mensagem clara — pra isso, cancela e cria de novo.

**Cancelar** — disponível pra qualquer contrato não cancelado. Muda o
status, mas preserva tudo (lançamentos, vistorias, histórico) — não é
igual excluir.

**Excluir definitivamente** — só aparece pra contratos que nunca foram
assinados. Confirmei que o banco está configurado certo: apaga em
cascata o que só existe no contexto daquele contrato (parcelas,
vistorias, sinalizações), mas preserva multas/avarias/lançamentos que
porventura já estejam vinculados a ele (só desvincula, não apaga esses
registros).

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-editar-cancelar-excluir.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-editar-cancelar-excluir.zip
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
docker compose run --rm api npx prisma migrate dev --name contract_notes_and_vehicle_prior_earnings --skip-generate --skip-seed
```

## Passo 5 — Rebuildar o frontend e subir

**Importante**: só roda esse comando uma vez, e espera terminar antes
de tentar de novo se parecer lento — dois rodando ao mesmo tempo
corrompem o `node_modules` (foi o que travou da última vez).

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
```

## Passo 6 — Testar com calma

1. **Ganho retroativo**: Frota → Editar um veículo → preenche "Ganho
   retroativo" com um valor → salva → clica em "Desempenho" → confirma
   que aparece separado de "Já recebido"

2. **Editar rascunho**: pega um dos 2 contratos rascunho que sobraram
   (ou cria um novo) → clica "Editar" → muda o tipo, a tarifa, as datas
   → salva → confirma que atualizou certo → baixa o PDF e confere que
   saiu com os dados novos

3. **Editar contrato assinado**: pega um contrato ativo → clica
   "Editar" → confirma que só aparece data de devolução e observações
   (nada de cliente/veículo/valores) → muda a data → salva

4. **Cancelar**: cancela um contrato de teste → confirma que ele some
   das listas de "ativo" mas ainda aparece no histórico, sem apagar
   nada

5. **Excluir**: exclui um dos 2 rascunhos que sobraram do incidente
   anterior → confirma que sumiu de vez → confirma que os OUTROS
   contratos (que não foram tocados) continuam intactos

6. Tenta excluir um contrato **já assinado** → confirma que o botão
   "Excluir" nem aparece pra ele (só "Cancelar")

## Passo 7 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: editar/cancelar/excluir contrato conforme status, ganho retroativo do veiculo"
git push origin main
```

Teste esses fluxos com atenção redobrada, principalmente o item 6 — é
a trava que existe justamente pra proteger contrato já assinado.
