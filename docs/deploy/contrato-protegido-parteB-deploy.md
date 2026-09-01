# Contrato "Padrão com Proteção Total" — Parte B — Deploy no servidor

**Parte B de 2 — fecha o pedido.** Este pacote já inclui tudo da Parte A
também (schema completo), então funciona mesmo que você ainda não tenha
rodado a migration da Parte A — o passo de migration abaixo cobre os dois
casos.

## O que mudou

- **PDF completo do terceiro tipo** — o texto exato das 4 peças que você
  mandou (Contrato Principal com as 7 cláusulas, Anexo I Vistoria, Anexo II
  Caução, Anexo III Procuração), com os dados de empresa/cliente/veículo
  preenchidos automaticamente. Testado no sandbox com dados baseados no
  exemplo real (Camila) — conferi o texto extraído com `pdftotext`, as 7
  páginas, e as cláusulas mais sensíveis (restrição de Uber/99, multa penal
  de 35%, foro) batendo exatamente com o original
- **Tabela de PAGAMENTOS no Anexo II** aparece automaticamente quando você
  cadastra parcelas de caução pro contrato; sem nenhuma parcela cadastrada,
  o PDF mostra a caução como pagamento único (testei os dois cenários)
- **RG/Identidade** — campo novo no formulário de cliente
- **Seletor "Padrão com Proteção Total"** no formulário de novo contrato —
  só mostra tarifas com caução + limite de KM + KM excedente cadastrados
- **Gerenciar parcelas da caução** — botão "Parcelas da caução" aparece na
  lista de contratos pra qualquer contrato desse tipo. Adicionar, marcar
  como paga, remover — tudo direto na tela
- **Datas de contrato agora incluem hora** (não só o dia) — o contrato real
  mostra "às 13:00", então isso importa de verdade pra cláusula de atraso
  (conta em horas). Contratos antigos continuam funcionando normalmente,
  só ficam com hora 00:00 registrada retroativamente (nunca foi capturado
  antes, não tem como recuperar isso)

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-contrato-protegido-parteB.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-contrato-protegido-parteB.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-contrato-protegido-parteB.zip apps/api/prisma/schema.prisma
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

Se você **já rodou** a migration da Parte A antes, esse comando não vai
encontrar nada novo pra aplicar (schema já está em dia) — só confirma. Se
**não rodou ainda**, aplica tudo de uma vez agora:

```bash
docker compose run --rm api npx prisma migrate dev --name protected_contract_full --skip-generate --skip-seed
```

## Passo 5 — Rebuildar o frontend e subir

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
```

## Passo 6 — Preparar dados de teste

1. Cadastre (ou edite) um **cliente** com **RG/Identidade** preenchido
2. Cadastre (ou edite) uma **tarifa** com diária + caução + limite de KM
   mensal + KM excedente todos preenchidos
3. O **veículo** precisa ter RENAVAM e chassi cadastrados (fase de
   contratos anterior já cobre isso)

## Passo 7 — Testar no navegador

1. **Contratos → Novo contrato** → escolha "Padrão com Proteção Total" →
   confirme que só aparecem tarifas com os 3 campos preenchidos, e que o
   resumo (KM/caução) aparece embaixo
2. Confirme que agora dá pra escolher **data e hora** de retirada/devolução,
   não só a data
3. Crie o contrato → baixe o **PDF** → confirme as 7 páginas: contrato
   principal + Anexo I + Anexo II + Anexo III, com hora aparecendo em
   "PRAZO DA LOCAÇÃO"
4. Na lista de contratos, clique em **"Parcelas da caução"** → adicione 2 ou
   3 parcelas com valores diferentes → baixe o PDF de novo → confirme que
   a tabela PAGAMENTOS aparece no Anexo II com os valores certos
5. Marque uma parcela como paga → confirme que o status muda
6. Remova uma parcela → baixe o PDF de novo → confirme que ela sumiu da
   tabela
7. Confirme que os **outros dois tipos de contrato continuam iguais**
   (Padrão simples e Motorista de aplicativo)

## Passo 8 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "contratos: PDF completo do tipo protected + parcelas de caucao + RG + datas com hora"
git push origin main
```

Isso fecha o terceiro modelo de contrato. Me conta como ficou, principalmente
o item 3 (o PDF de 7 páginas) e o item 4 (a tabela de pagamentos aparecendo
certo).
