# Melhorias — Parte C.2 — Deploy no servidor (seletores + dashboard)

**Parte C.2 — fecha as telas.** Sem migration nesta parte. Depois desta,
só falta a Parte D (fatura em PDF).

## O que mudou

- **Multa, Avaria e Lançamento manual** ganharam o seletor "Atrelar a":
  Nada / Um contrato vigente / Um cliente direto — igual nos três, sem
  ser obrigatório
- **Dashboard reformado**: além de "A receber" e "Recebido", agora mostra
  **Despesas** e **Saldo** (recebido − despesas), um resumo de
  **Lançamentos por tipo** (aluguel/avaria/multa/outro, com contagem e
  total de cada), e uma tabela de **Atividade financeira recente**
  juntando os últimos lançamentos e despesas numa única linha do tempo —
  cada linha mostra a descrição, categoria, origem (cliente ou veículo) e
  o valor, com seta verde (entrada) ou vermelha (saída)

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-melhorias-parteC2.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-melhorias-parteC2.zip
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

1. **Multas → Nova multa** → escolha "Um contrato vigente" no vínculo →
   confirme que só aparecem contratos ativos do veículo selecionado →
   crie a multa marcando "cobrar do cliente" → confirme em Financeiro que
   o lançamento saiu com o cliente certo
2. Repita rapidamente pra **Avarias** e pro **Lançamento manual** (esse
   último em Financeiro → Lançamentos → Novo lançamento manual)
3. Abra a tela inicial (**Dashboard**) → confirme os cards novos
   (Despesas, Saldo) e a tabela de Atividade financeira recente mostrando
   os itens que você acabou de criar

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "melhorias: seletores financeiros e dashboard reformado (parte C.2)"
git push origin main
```

Isso fecha a Parte C. Só falta a Parte D — a fatura em PDF pro cliente,
que vem na sequência.
