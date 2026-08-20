# Modelos de Contrato — Parte B — Deploy no servidor (os 5 PDFs completos)

**Parte B de 2 — fecha o pedido.** Sem migration nova (schema já mudou na
Parte A). Só lógica de criação de contrato + o template PDF completo.

## O que mudou

- **Novo tipo de contrato**: ao criar um contrato, agora dá pra escolher
  "Motorista de aplicativo" — usa o valor mensal, limite de KM e caução da
  tarifa selecionada (em vez de diária × dias)
- **PDF completo da modalidade mensal**: um único PDF de 8 páginas com os
  5 documentos — contrato principal (8 cláusulas) + Anexo I (vistoria) +
  Anexo II (termo de caução) + Anexo III (procuração/infrações) + Anexo IV
  (ciência de manutenção preventiva) — tudo preenchido automaticamente a
  partir dos cadastros de empresa/cliente/veículo/tarifa
- O Anexo I (vistoria) puxa os dados reais de entrega/devolução quando já
  foram registrados no sistema; senão, mostra os campos em branco prontos
  pra preencher à mão, igual ao checklist físico original
- O Anexo IV calcula automaticamente 10% da Tabela FIPE (se o veículo
  tiver o valor cadastrado) pra mostrar o valor da multa em reais, não só
  o percentual
- Contratos do tipo "Padrão" (o que já existia) continuam funcionando
  exatamente como antes — nada mudou pra eles

Testei a renderização do PDF de verdade no sandbox antes de empacotar
(não só "compilou" — extraí o texto com `pdftotext` e conferi visualmente
os 8 páginas, os 4 pontos de quebra de página entre os documentos, e os
dois cenários: com e sem vistoria/assinatura já registradas).

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-contratos-parteB.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-contratos-parteB.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-contratos-parteB.zip apps/api/prisma/schema.prisma
```

## Passo 2 — Rebuildar a API (sem migration — schema não mudou nesta parte)

```bash
docker compose build api
docker compose up -d
```

## Passo 3 — Rebuildar o frontend

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
```

## Passo 4 — Preparar os dados de teste

Antes de testar, garanta que existe pelo menos:
1. Uma empresa com **endereço preenchido** (Minha empresa)
2. Um cliente com **CNH, endereço e dados bancários/PIX preenchidos**
3. Um veículo com **chassi e valor FIPE preenchidos**
4. Uma tarifa com **valor mensal, limite de KM mensal, KM excedente e
   caução preenchidos** (marcados como "Motorista de aplicativo" na
   Parte A)

## Passo 5 — Testar no navegador

1. **Contratos → Novo contrato** → escolha "Motorista de aplicativo" no
   tipo → confirme que só aparecem tarifas com valor mensal, e que o
   resumo (limite de KM/caução/KM excedente) aparece embaixo do seletor
2. Preencha cliente, veículo e período → crie o contrato
3. Clique em **PDF** na lista → confirme que abre um PDF de **8 páginas**
4. Confira cada página:
   - Página 1-3ish: contrato principal com as 8 cláusulas, dados da
     empresa/cliente/veículo preenchidos corretamente
   - Anexo I: vistoria (campos em branco, já que ainda não tem
     entrega/devolução registrada)
   - Anexo II: termo de caução, com os dados bancários do cliente
     aparecendo certos
   - Anexo III: procuração, com a CNH do cliente
   - Anexo IV: manutenção preventiva, com o valor calculado da multa (10%
     da FIPE) se você cadastrou o valor FIPE do veículo
5. Registre a **entrega** desse contrato (fluxo normal, como sempre) →
   baixe o PDF de novo → confirme que agora o Anexo I mostra os dados
   reais da vistoria de entrega (odômetro, combustível), não mais em
   branco
6. Gere o link de assinatura e assine (fluxo normal) → baixe o PDF de
   novo → confirme o bloco "ASSINADO ELETRONICAMENTE" aparecendo
7. Confirme que **contratos do tipo Padrão continuam iguais**: crie um
   contrato padrão do jeito de sempre, baixe o PDF, confirme que é o
   modelo antigo (não o de 5 documentos)

## Passo 6 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "contratos: 5 modelos completos para motorista de aplicativo (parte B)"
git push origin main
```

Isso fecha o pedido dos modelos de contrato. Me conta como ficou,
principalmente os itens 4 e 5 (checar se os dados vieram certos em cada
um dos 5 documentos, e se a vistoria real substituiu os campos em branco).
