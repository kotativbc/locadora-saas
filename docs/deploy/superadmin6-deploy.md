# Super Admin 6 — Deploy no servidor (Suporte "entrar como", somente leitura)

**Item 6 dos 7 combinados — o mais sensível.** Sem migration (nenhum schema
novo, só lógica de token e um guard novo).

## O que mudou

- **`POST /companies/:id/impersonate`** (só Super Admin) — gera um token de
  acesso de 10 minutos, com o `companyId` da empresa escolhida, mas com uma
  marca `impersonation: true` embutida no token
- **`ImpersonationReadOnlyGuard`** — guard novo, roda em toda requisição:
  se o token tem a marca `impersonation`, qualquer método que não seja
  leitura (GET/HEAD/OPTIONS) é rejeitado ali mesmo, antes até de checar
  permissão. **Isso é garantido no servidor, não é botão escondido na
  tela** — mesmo que alguém tente chamar a API direto, sem passar pela
  interface, a escrita continua bloqueada
- Token de suporte **não tem refresh próprio** — se expirar, é só clicar de
  novo em "Entrar como"; e naturalmente, se você atualizar a página (F5)
  durante uma sessão de suporte, ela não sobrevive — volta pra sua
  identidade real de Super Admin (comportamento de propósito, mais seguro)
- Banner amarelo fixo aparece em toda tela durante a sessão de suporte,
  com o nome da empresa, o horário de expiração, e um botão "Sair do modo
  suporte"
- Início da sessão de suporte é registrado na Auditoria
  (`company.impersonation_started`) com quem entrou, em qual empresa e
  quando

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-superadmin6.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-superadmin6.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-superadmin6.zip apps/api/prisma/schema.prisma
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

## Passo 4 — Testar no navegador (roteiro mais longo de propósito)

Logado como Super Admin:

1. Vá no detalhe da "LH Veículos" → clique em **Entrar como (somente
   leitura)** → confirme que aparece o banner amarelo no topo com o nome
   da empresa e o horário de expiração
2. Navegue pra **Frota**, **Contratos**, **Clientes** → confirme que os
   dados **daquela empresa** aparecem normalmente (como se fosse o admin
   dela navegando)
3. **Tente criar algo** — por exemplo, "+ Novo veículo" em Frota, preencha
   e envie → deve aparecer um erro claro dizendo que o modo suporte é
   somente leitura, e **nada deve ser criado de verdade** (confirme
   recarregando a lista)
4. **Tente editar algo** — por exemplo, mudar o status de um veículo no
   seletor → mesma coisa, deve ser bloqueado com mensagem clara
5. Repare que o menu lateral muda — durante o suporte, você vê o menu
   como a empresa vê (sem a seção "Plataforma"), não como Super Admin
6. Clique em **Sair do modo suporte** no banner → confirme que volta pro
   painel do Super Admin (banner some, menu volta ao normal)
7. Vá em **Auditoria** → confirme que aparece "Modo suporte iniciado" com
   seu nome e a empresa que você visualizou
8. **Teste de segurança extra, se quiser**: enquanto uma sessão de suporte
   estiver ativa, tente atualizar a página (F5) → confirme que a sessão de
   suporte **não volta** — você é levado de volta pra sua conta normal de
   Super Admin, precisa clicar em "Entrar como" de novo se quiser continuar

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "super admin: modo suporte somente leitura (entrar como)"
git push origin main
```

Este é o item mais sensível dos 7 — não tenha pressa nos testes, principalmente
os itens 3 e 4, que são a prova de que "somente leitura" é garantido de
verdade e não só uma promessa da interface.
