# Termos/DPA/Privacidade — Parte A — Deploy no servidor

**Parte A de 2.** Precisa de migration (2 tabelas/campos novos).

## O que mudou

- **`TermsAcceptance`** — tabela nova, append-only, registra quem aceitou
  os Termos+DPA, quando, de qual IP e qual versão. Ainda não tem tela
  obrigando o aceite (isso é a Parte B) — por enquanto só a infraestrutura
  de registro está pronta, testável via API
- **`Company.contactEmail` e `Company.privacyOfficerName`** — campos novos,
  usados no Aviso de Privacidade da empresa
- **Aviso de Privacidade (Parte C do documento que você me passou)** — PDF
  gerado automaticamente com os dados de cada empresa (nome, CNPJ,
  endereço, contato). Testei os dois cenários no sandbox antes de mandar:
  com todos os dados preenchidos, e com dados faltando (confirma que
  aparece `[CNPJ não cadastrado]` etc. em vez de inventar algo)
- Nova seção "Privacidade (LGPD)" em **Minha empresa** — cadastra o
  contato/encarregado e baixa o PDF

## O que ainda não está aqui (Parte B)

- Página pública dos **Termos de Uso + DPA** (Partes A+B do seu documento)
- Página pública da **Política de Privacidade do Rentovix** (Parte D)
- Banner/tela pedindo o aceite explícito (usa o endpoint que já está
  pronto nesta Parte A)

Sobre a qualificação do Fornecedor (razão social/CPF do Rentovix): você
disse que ainda vai decidir isso com contador — as páginas da Parte B vão
nascer com esse ponto marcado como pendente, não vou inventar.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-legal-parteA.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-legal-parteA.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-legal-parteA.zip apps/api/prisma/schema.prisma
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

Só campos/tabela novos (nada removido) — não deve pedir confirmação
especial.

```bash
docker compose run --rm api npx prisma migrate dev --name legal_terms_and_privacy --skip-generate --skip-seed
```

## Passo 5 — Rebuildar o frontend e subir

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
```

## Passo 6 — Testar no navegador

1. **Minha empresa** → preencha o e-mail de contato e o encarregado na
   nova seção "Privacidade (LGPD)" → salve → recarregue a página →
   confirme que os valores continuam lá
2. Clique em **"Baixar Aviso de Privacidade (rascunho)"** → confirme que
   abre um PDF com os dados da sua empresa preenchidos, e o aviso em
   vermelho no topo pedindo revisão jurídica
3. Se quiser testar o cenário "faltando dado": crie uma empresa de teste
   sem preencher endereço/contato, gere o aviso dela, confirme que
   aparecem os `[não cadastrado]` em vez de campo em branco silencioso

## Passo 7 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "legal: registro de aceite (infra) + aviso de privacidade auto-preenchido (parte A)"
git push origin main
```

Testa essa parte e me avisa — sigo pra Parte B (as duas páginas públicas
grandes + o banner de aceite) na sequência.
