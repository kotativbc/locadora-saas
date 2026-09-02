# Melhorias — Parte B — Deploy no servidor (backend)

**Parte B de várias.** Sem migration nova (o schema já está todo na Parte
A) — deploy mais simples, só rebuild.

## O que mudou

- **Cronograma de aluguel semanal** — se você definir um cronograma de
  parcelas ANTES de assinar o contrato de Motorista de App, a assinatura
  gera um lançamento por parcela em vez do único lançamento do valor
  total (mesma soma). Só pode alterar o cronograma antes da assinatura —
  depois, os lançamentos já nasceram
- **Sinalização de manutenção pelo cliente** — link público
  (`/public/maintenance-report/:token`, sem login) + aviso por e-mail pra
  empresa quando o cliente relata algo (usa o `contactEmail` que já
  existe no cadastro). Também dá pra equipe registrar manualmente
- **Multa de devolução antecipada** — ao registrar a devolução, se foi
  antes do vencimento, o sistema calcula 10% do valor proporcional aos
  dias não usados e **sugere** — não cobra sozinho. A confirmação recalcula
  do zero no servidor (não confia em valor vindo do navegador)
- **Contrato/cliente opcional em Multa e Avaria** — o banco já aceitava
  isso desde sempre; agora dá pra passar um cliente direto, sem precisar
  de contrato (o Lançamento manual já aceitava os dois, nenhuma mudança
  necessária lá)
- **PDFs atualizados**: cláusula nova de devolução antecipada no "Padrão
  com Proteção Total" (Cláusula 7, Foro virou Cláusula 8), e tabela de
  cronograma de pagamento no "Motorista de Aplicativo" (só aparece se
  houver parcelas cadastradas)

Testei tudo no sandbox antes de mandar: os dois PDFs renderizando (com e
sem cronograma/parcelas), a cláusula nova e a renumeração do Foro
conferidas com `pdftotext`.

## Ainda sem tela (Parte C, a seguir)

Tudo isso já funciona pela API, mas ainda não tem botão/formulário no
sistema — telas de gerenciar cronograma, painel de sinalizações + página
pública, seletores de contrato/cliente nos formulários, e o dashboard
reformado vêm na Parte C.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-melhorias-parteB.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-melhorias-parteB.zip
```

## Passo 2 — Rebuildar a API (sem migration)

```bash
docker compose build api
docker compose up -d
```

Não precisa rebuildar o frontend nesta parte — nada mudou lá ainda.

## Passo 3 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "melhorias: backend do cronograma, sinalizacao e multa antecipada (parte B)"
git push origin main
```

Sem teste manual necessário ainda (não tem tela) — sigo direto pra Parte
C.
