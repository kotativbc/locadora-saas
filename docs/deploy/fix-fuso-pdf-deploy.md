# Correção de fuso horário na HORA dos PDFs — Deploy

**Sem migration** — só os templates de PDF. Testei de verdade desta
vez (não só revisão de código) — expliquei como no fim deste arquivo.

## A causa

O servidor roda em UTC (sem fuso configurado). Quando o PDF mostra uma
hora — "Aceito em [data/hora]" na assinatura do contrato, e "Data/Hora"
na vistoria de entrega/devolução — o código pegava a hora sem
converter pro fuso de Brasília, então ficava sempre **3 horas à
frente** do horário real (UTC é 3h à frente do horário de Brasília).

A data continuava certa (por isso você só notou a hora errada) — só a
hora do dia que vinha direto em UTC, sem conversão.

## Onde estava acontecendo (todos corrigidos)

- Hora do aceite do contrato ("Aceito em..."), nos **3 modelos** de
  contrato (Padrão, Padrão com Proteção Total, Motorista de
  Aplicativo)
- Hora da vistoria de entrega/devolução, nos 2 modelos que mostram
  esse anexo (Proteção Total e Motorista de Aplicativo)

## Como testei desta vez

Depois do que aconteceu na entrega anterior (typecheck não pegou o
erro porque eu não tinha atualizado o cliente do Prisma), fiz questão
de testar de forma mais direta agora: gerei os 3 PDFs de verdade com
uma data/hora conhecida (11:41:06 UTC, que deveria virar 08:41:06 em
Brasília), **rodando explicitamente com `TZ=UTC`** — a mesma condição
exata do seu servidor — e conferi o texto de dentro do PDF gerado.
Bateu certo nos 3.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-fix-fuso-pdf.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-fix-fuso-pdf.zip
```

## Passo 2 — Rebuildar a API

```bash
docker compose build api
docker compose up -d
```

## Passo 3 — Testar

1. Baixa de novo o PDF do contrato nº 12 (o mesmo que você usou pra
   reportar isso) → confirme que a hora da vistoria de entrega agora
   bate com a hora real de quando você assinou
2. Confere também a hora de "Aceito em" na assinatura do contrato

## Passo 4 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "fix: hora nos PDFs (assinatura e vistoria) agora usa fuso de Brasilia, nao UTC"
git push origin main
```
