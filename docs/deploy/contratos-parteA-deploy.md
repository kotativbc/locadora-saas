# Modelos de Contrato — Parte A — Deploy no servidor (campos nos cadastros)

**Parte A de 2.** Essa leva só prepara o terreno: adiciona os campos que os
5 documentos vão precisar, nos cadastros de Empresa, Cliente, Veículo e
Tarifa. **Ainda não gera os PDFs novos** — isso é a Parte B, que vem a
seguir.

## O que mudou

- **Empresa**: endereço completo (rua, número, complemento, bairro,
  cidade, estado, CEP) — nova seção editável em "Minha empresa"
- **Cliente**: endereço (já existia no banco, nunca aparecia no
  formulário — corrigido), categoria da CNH (mesma situação), e dados
  bancários/PIX pra devolução de saldo de caução — tudo opcional
- **Veículo**: chassi (mesma situação do endereço do cliente — já existia,
  não aparecia), valor da Tabela FIPE e intervalo de manutenção — opcionais
- **Tarifa**: limite de KM mensal, valor do KM excedente (esse já
  existia) e valor da caução — pra quando for uma tarifa de "motorista de
  aplicativo"
- **Contrato**: campo interno pra saber qual modelo de PDF gerar
  (`templateType`) e campos de snapshot pra modalidade mensal — ainda sem
  uso na Parte A, preparação pra Parte B

Nenhum campo é obrigatório — cadastros existentes continuam funcionando
exatamente como antes. `docs/contracts/mapeamento-modelos.md` (já no zip)
tem a análise completa de onde veio cada decisão.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-contratos-parteA.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-contratos-parteA.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-contratos-parteA.zip apps/api/prisma/schema.prisma
```

## Passo 2 — Rebuildar a API

```bash
docker compose build api
```

## Passo 3 — Backup antes da migration

```bash
/srv/rental-app/scripts/backup.sh
```

## Passo 4 — Gerar e aplicar a migration

Só campos novos opcionais (nenhuma coluna removida) — não deve pedir
nenhuma confirmação especial.

```bash
docker compose run --rm api npx prisma migrate dev --name contract_template_fields --skip-generate --skip-seed
```

## Passo 5 — Rebuildar o frontend e subir

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
```

## Passo 6 — Testar no navegador

1. **Minha empresa**: preencha o endereço e salve → recarregue a página →
   confirme que os valores continuam lá
2. **Clientes → Novo cliente**: confirme os 3 grupos (Dados pessoais,
   CNH, Dados bancários) e que o endereço agora tem campo próprio
3. **Frota → Novo veículo**: confirme o grupo "Pra contratos" com
   chassi/FIPE/intervalo de manutenção
4. **Tarifas → Nova tarifa**: confirme o grupo "Motorista de aplicativo"
   com KM mensal/KM excedente/caução
5. Confirme que **nada quebrou**: criar um contrato do jeito de sempre
   continua funcionando normalmente

## Passo 7 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "contratos: campos nos cadastros para modelos motorista de app (parte A)"
git push origin main
```

Depois de confirmar que essa parte está funcionando, sigo pra Parte B: os
5 PDFs de verdade, gerados automaticamente a partir desses dados.
