# As 4 pendências — Deploy no servidor

**Com migration** (campos novos em Vehicle e Customer). Testei os 3
PDFs de contrato + a fatura nos cenários: cliente com endereço novo,
cliente antigo (só com o texto livre de antes), e cliente sem endereço
— os 3 renderizam certo, sem quebrar.

## O que mudou

**1. Centavos** — achei a causa: 16 campos de dinheiro em 9 telas
diferentes não tinham `inputMode="decimal"`. No celular, isso costuma
esconder o ponto decimal do teclado numérico. Corrigido em todos de
uma vez.

**2. Editar veículo + odômetro** — botão "Editar" na Frota, abre um
formulário com tudo pré-preenchido (marca, modelo, ano, chassi,
renavam, FIPE, intervalo de manutenção) — incluindo o **odômetro**, que
agora dá pra atualizar manualmente.

**3. Custo x rendimento do veículo** — campo novo "Quanto custou pra
você", separado da Tabela FIPE (que é valor de mercado, não o que você
pagou). Botão "Desempenho" na Frota mostra: quanto já recebeu, quanto
está pendente, quanto gastou em despesas, resultado líquido, e o
percentual de quanto o veículo já "se pagou" (se você informou o custo).

**4. Endereço do cliente estruturado e obrigatório** — rua, número,
complemento, bairro, cidade, estado e CEP como campos separados.
Rua/número/cidade/estado são obrigatórios agora; complemento/bairro/CEP
continuam opcionais. Clientes cadastrados antes desta mudança mantêm o
endereço antigo (texto livre) intacto — os contratos e a fatura usam o
endereço novo quando existir, e caem pro texto antigo automaticamente
se não.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-4-pendencias.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-4-pendencias.zip
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
docker compose run --rm api npx prisma migrate dev --name vehicle_acquisition_cost_and_customer_structured_address --skip-generate --skip-seed
```

## Passo 5 — Rebuildar o frontend e subir

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
```

## Passo 6 — Testar

1. **Frota** → clique em **"Editar"** num veículo → mude o odômetro e
   confirme que salva → clique em **"Desempenho"** → confirme que
   mostra os números (mesmo que zerados, se não tiver movimentação)
2. **Frota → Novo veículo** → confirme o campo "Quanto custou pra você"
   no grupo Financeiro, e digite um valor com centavos (ex: 45890,50)
   → confirme que salvou certo
3. **Clientes → Novo cliente** → confirme que o Endereço agora tem
   campos separados, e que Rua/Número/Cidade/Estado são obrigatórios
   (tenta enviar sem preencher e veja se trava)
4. Crie um contrato **Padrão com Proteção Total** pra esse cliente novo
   → baixe o PDF → confirme que o endereço aparece formatado certo
5. Abra um cliente **cadastrado antes desta atualização** → confirme
   que o PDF dele continua saindo com o endereço de antes, sem quebrar

## Passo 7 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "fix: centavos em campos de dinheiro; editar veiculo/odometro; custo x rendimento; endereco estruturado do cliente"
git push origin main
```

Testa especialmente o item 4 (endereço) com atenção — depois do que
aconteceu com o PDF do contrato, quero ter certeza redobrada antes de
seguir.
