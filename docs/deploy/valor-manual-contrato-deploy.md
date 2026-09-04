# Valor total do contrato — controle manual — Deploy

**Sem migration** — só backend (campo novo no DTO) + frontend.

## Contexto (do vídeo do cliente)

Identifiquei pelo vídeo que o contrato de Fernando Gustavo Barbosa
(Motorista de Aplicativo, 20/08 a 20/10/2026 — 2 meses) saiu com valor
total de R$ 3.000,00, que é só **1 mês** da tarifa (R$3.000/mês). Isso
gerou o aviso "não bate" quando ele tentou montar um cronograma de 5
parcelas semanais (R$3.750 no total).

Conversei com o Samuel sobre a causa raiz antes de mexer em qualquer
cálculo — a resposta dele foi que o cliente quer **controle manual**
sobre o valor, não necessariamente que o sistema calcule sozinho pra
períodos de vários meses. Fui por esse caminho.

## O que mudou

- **Valor total do contrato agora é um campo editável**, tanto ao criar
  quanto ao editar um contrato ainda não assinado. O sistema continua
  sugerindo um valor automático (a partir da tarifa e do período), mas
  a pessoa pode ajustar livremente antes de salvar.
- Na tela de **criar** contrato, o valor sugerido recalcula sozinho
  enquanto você não mexer nele; assim que você editar manualmente, para
  de recalcular sozinho (com um link "Voltar a calcular automaticamente"
  se quiser desfazer isso).
- Na tela de **editar rascunho**, o campo já vem preenchido com o valor
  atual do contrato, pronto pra corrigir.

**Não mudei** a lógica de cálculo automático em si (continua usando só
1 mês pra motorista de app, independente do período) — só passou a ser
sempre editável por cima disso. Se depois vocês decidirem que o cálculo
automático PRECISA mudar pra multiplicar por mês, me avisa que ajusto
isso também.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-valor-manual-contrato.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-valor-manual-contrato.zip
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

1. **Contratos → Novo contrato** → escolhe qualquer tipo/tarifa/datas →
   confirme que o campo "Valor total do contrato" aparece já preenchido
   com uma sugestão → edita esse valor → confirme que não volta a mudar
   sozinho depois disso
2. Abre o contrato do **Fernando Gustavo Barbosa** (ou o rascunho
   equivalente) → clica **Editar** → confirme que o campo de valor vem
   com R$3.000,00 → corrige pro valor certo (ex: R$6.000,00 se for
   mesmo os 2 meses) → salva → baixa o PDF e confere que saiu certo

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: valor total do contrato editavel manualmente, com sugestao automatica"
git push origin main
```

Ainda falta entender o terceiro ponto do vídeo (o aviso de veículo já
tem outro contrato) — você disse que ia me explicar por texto depois.
