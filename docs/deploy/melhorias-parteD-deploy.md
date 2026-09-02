# Melhorias — Parte D — Deploy no servidor (fatura em PDF)

**Última parte do lote grande.** Sem migration. Depois desta, o pedido
inteiro está fechado.

## O que mudou

- **Fatura em PDF** com visual profissional (estilo invoice de sistema
  grande — cabeçalho escuro, "Cobrado de"/"Referente a", tabela
  itemizada com status colorido, totais destacados, aviso de pendência
  quando há valor em aberto) — reúne todos os lançamentos (Charge)
  daquele contrato: aluguel, avarias, multas, tudo
- **Botão "Fatura"** na lista de contratos (ativos/finalizados) — abre o
  PDF direto no navegador
- **Botão "Enviar fatura por e-mail"** — manda a fatura em anexo pro
  e-mail do cliente cadastrado. Se o cliente não tiver e-mail, avisa
  claramente em vez de falhar silenciosamente
- Ajuste técnico interno: o sistema de e-mail agora sabe dizer se um
  envio realmente funcionou (antes, o "esqueci senha" e a sinalização de
  manutenção não precisavam saber — mas enviar fatura precisa, porque se
  falhar silenciosamente você acha que o cliente recebeu e não recebeu)

Testei a renderização da fatura no sandbox com dados baseados no exemplo
real da Camila — conferi o texto extraído e também a imagem renderizada
(pra confirmar visual mesmo, já que era um pedido especificamente sobre
aparência) — e também o cenário de contrato sem nenhuma cobrança ainda,
pra garantir que não quebra num contrato recém-criado.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-melhorias-parteD.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-melhorias-parteD.zip
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

1. Em qualquer contrato ativo com lançamentos (aluguel, multa, avaria),
   clique em **"Fatura"** → confirme que abre um PDF bonito, com os
   lançamentos certos e o total batendo
2. Clique em **"Enviar fatura por e-mail"** → confirme a mensagem de
   sucesso com o e-mail certo → confira a caixa de entrada do cliente
   (se o SMTP estiver configurado) ou o log da API (se não estiver)
3. Teste com um cliente **sem e-mail cadastrado** → confirme que aparece
   um erro claro, não uma falha silenciosa

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "melhorias: fatura em PDF com envio por email (parte D)"
git push origin main
```

Isso fecha o lote inteiro que você pediu — multa de devolução antecipada,
cronograma semanal, sinalização de manutenção, vínculo opcional
contrato/cliente, dashboard reformado, e agora a fatura em PDF.
