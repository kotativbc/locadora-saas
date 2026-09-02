# Melhorias — Parte C.1 — Deploy no servidor (telas: cronograma, sinalização, multa)

**Parte C.1 — primeiro pedaço das telas.** Ainda faltam os seletores de
contrato/cliente nos formulários financeiros e o dashboard reformado
(Parte C.2), e a fatura em PDF (Parte D). Sem migration nesta parte.

## O que mudou

- **Botão "Cronograma de pagamento"** na lista de contratos, só pra
  Motorista de Aplicativo ainda não assinado — telas de adicionar/remover
  parcela, com aviso visual se o total não bater com o valor do contrato
- **Botão "Sinalizações"** na lista de contratos (ativos e finalizados) —
  gera o link público, lista o que já foi sinalizado (cliente ou equipe),
  deixa mudar o status (Aberta/Vista/Resolvida), e tem um campo pra
  registrar manualmente
- **Página pública** `/sinalizar/:token` — o cliente acessa sem login,
  vê qual veículo/empresa, escreve o que está acontecendo, envia
- **Multa de devolução antecipada na tela**: ao registrar devolução antes
  do vencimento, aparece uma tela mostrando o valor sugerido, com botão
  "Cobrar esta multa" ou "Não cobrar" — nada é cobrado sem essa confirmação
- Corrigi de passagem **2 vulnerabilidades** que apareceram numa
  dependência transitiva (`fast-uri`, `qs`) — resolvidas com `npm audit
  fix` sem quebrar nada, o lockfile atualizado já está no zip

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-melhorias-parteC1.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-melhorias-parteC1.zip
```

## Passo 2 — Rebuildar a API (pega o lockfile corrigido, sem migration)

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

1. Crie um contrato de **Motorista de Aplicativo** (ainda em rascunho) →
   clique em **"Cronograma de pagamento"** → adicione 3-4 parcelas →
   confirme o aviso se o total não bater com o valor do contrato → assine
   o contrato → vá em Financeiro e confirme que apareceram os lançamentos
   separados, não um único
2. Em qualquer contrato ativo, clique em **"Sinalizações"** → **"Gerar
   link público"** → copia o link → abre em uma aba anônima (simulando o
   cliente) → envia uma mensagem de teste → volta pra aba normal → confirme
   que a sinalização apareceu na lista
3. Registre uma **devolução antecipada** de um contrato "Padrão com
   Proteção Total" (data de devolução antes do vencimento) → confirme que
   aparece a tela com o valor sugerido de multa → clique em "Cobrar esta
   multa" → confirme no Financeiro que o lançamento apareceu

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "melhorias: telas de cronograma, sinalizacao e multa antecipada (parte C.1)"
git push origin main
```

Sigo pra Parte C.2 (seletores de contrato/cliente nos formulários
financeiros + dashboard reformado) na sequência.
