# Contrato "Padrão com Proteção Total" — Parte A — Deploy no servidor

**Parte A de 2.** Schema novo — precisa de migration. Ainda **sem** o PDF
completo nem os campos no frontend — isso é a Parte B.

## O que mudou

- **`Customer.identityNumber`** — campo novo (RG/Identidade), usado nos
  modelos de contrato mais completos
- **Terceiro tipo de contrato**: `templateType` agora aceita `protected`,
  além de `standard` e `monthly_app_driver`. Usa diária × dias (como o
  Padrão, qualquer duração), mas exige tarifa com caução + limite de KM +
  KM excedente cadastrados — são o motivo de escolher esse modelo
- **Parcelas de caução** (`CautionInstallment`) — tabela nova, cronograma
  manual (cada parcela pode ter valor diferente, não é dividido igualmente
  sozinho). Não gera lançamento financeiro — caução é depósito
  reembolsável, não receita, então fica separado do módulo Financeiro de
  propósito
- Rotas novas: `GET/POST /contracts/:id/caution-installments`,
  `PATCH/DELETE /contracts/:id/caution-installments/:installmentId`

## O que ainda NÃO está aqui (Parte B)

- O PDF completo da modalidade `protected` (as 7 cláusulas + 3 anexos que
  você mandou) — hoje, se alguém criar um contrato `protected`, o PDF gerado
  ainda usa o modelo "Padrão" simples (não quebra, só não tem o texto novo)
- Campo de RG no formulário de cliente
- Seletor "Padrão com Proteção Total" no formulário de novo contrato
- Tela de gerenciar parcelas de caução

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-contrato-protegido-parteA.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-contrato-protegido-parteA.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-contrato-protegido-parteA.zip apps/api/prisma/schema.prisma
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

Só campos/tabela novos — não deve pedir confirmação especial.

```bash
docker compose run --rm api npx prisma migrate dev --name protected_contract_and_caution_installments --skip-generate --skip-seed
```

## Passo 5 — Subir

```bash
docker compose up -d
```

Não precisa rebuildar o frontend nesta parte — nada mudou lá ainda.

## Passo 6 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "contratos: schema do terceiro tipo (protected) e parcelas de caucao (parte A)"
git push origin main
```

Sem teste manual necessário nesta parte (é só schema/API sem tela ainda) —
sigo direto pra Parte B: o PDF completo com o texto exato que você mandou,
mais as telas de RG do cliente, seletor do novo tipo de contrato e gestão
de parcelas.
