# Empresas — Editar e Excluir — Deploy no servidor

Sem migration (só usa campos que já existiam no schema). Deploy simples.

## O que mudou

- **Editar dados**: botão novo na página de detalhe da empresa. Antes,
  só dava pra editar razão social/CNPJ/endereço/contato pela própria
  empresa (Minha Empresa) — o Super Admin não tinha essa tela pra
  nenhuma empresa, mesmo a API já aceitando (por isso você não conseguia)
- **Excluir permanentemente**: botão novo, mas **só aparece quando a
  empresa já está no estado "Arquivada"** — não dá pra pular direto de
  Ativa pra excluída. Exige digitar o nome exato da empresa como
  confirmação. Apaga tudo em cascata (usuários, veículos, clientes,
  contratos, financeiro, documentos) e limpa os arquivos no disco também
- O registro de que a exclusão aconteceu (quem, quando, nome da empresa
  apagada) fica guardado na Auditoria — só a empresa em si que some, o
  rastro da exclusão continua rastreável

## Por que a trava de "só a partir de Arquivada"

Isso segue o mesmo princípio do documento jurídico que você me passou:
"não permitir exclusão física imediata, usar arquivamento". Forçar a
empresa a passar pelo ciclo de vida antes (Ativa → Suspensa/Cancelada →
Arquivada → só aí excluir) evita que um clique errado apague uma empresa
com dado real de cliente ainda ativo.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-empresa-editar-excluir.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-empresa-editar-excluir.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-empresa-editar-excluir.zip apps/api/prisma/schema.prisma
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

1. Abra o detalhe de uma empresa qualquer → clique em **Editar dados** →
   confirme que dá pra mudar nome/CNPJ/endereço/contato → salve → confirme
   que persistiu
2. Na empresa "Gabriele Luana..." (a de teste que você mostrou) → se ela
   já estiver Arquivada, confirme que aparece o card vermelho **Zona de
   risco** no fim da página
3. Clique em **Excluir permanentemente** → digite o nome errado de
   propósito → confirme que o botão de confirmar fica desabilitado
4. Digite o nome exato → confirme → confirme que volta pra lista de
   Empresas e ela não aparece mais
5. Vá em **Auditoria** → confirme que aparece o registro da exclusão

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "empresas: editar dados e exclusao permanente controlada (so a partir de arquivada)"
git push origin main
```

Testa e me avisa — depois volto pra terminar a Parte B dos documentos
legais (as duas páginas públicas de Termos+DPA e Privacidade do Rentovix,
que ficaram pausadas quando você pediu isso).
