# Super Admin 3 — Deploy no servidor (Detalhe da empresa + usuários de suporte)

**Itens 2 e 3 dos 7 combinados.** Sem migration nova — só rotas novas na API
e a página de detalhe no frontend.

O que mudou:
- Nova página `/empresas/:id` — clique no nome ou em "Ver detalhes" na
  lista de Empresas
- Mostra consumo (usuários, veículos, clientes, contratos), histórico de
  estado, e a lista de usuários **daquela empresa específica**
- Duas ações novas de suporte, só pro Super Admin:
  - **Desativar/Reativar usuário** de qualquer empresa (revoga a sessão
    dele na hora, se desativar)
  - **Redefinir senha** de qualquer usuário — gera uma senha temporária,
    mostra em texto puro **uma única vez** na tela (o sistema nunca guarda
    nem loga a senha em si, só o fato de que foi redefinida)

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-superadmin3.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-superadmin3.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-superadmin3.zip apps/api/prisma/schema.prisma
```

## Passo 2 — Rebuildar a API (sem migration — schema não mudou)

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

Logado como Super Admin:

1. Em **Empresas**, clique no nome da "LH Veículos" (ou em "Ver detalhes")
   → confirme que abre a página de detalhe com os 4 cards de consumo
2. Confirme que o histórico de estado aparece igual ao que já víamos na
   tela anterior
3. Na tabela de **Usuários**, confirme que aparece o admin daquela empresa
4. Clique em **Redefinir senha** dele → confirme o aviso de confirmação →
   confirme que aparece a senha temporária na tela
5. Tente logar com esse usuário usando a senha antiga → deve **falhar**
   (a antiga parou de funcionar)
6. Logue com a senha temporária mostrada → deve funcionar normalmente
7. Volte como Super Admin → clique em **Desativar** nesse mesmo usuário →
   confirme o selo mudar pra "Inativo"
8. Tente logar com esse usuário de novo → deve ser barrado
9. **Reative** o usuário → confirme que o login volta a funcionar

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "super admin: pagina de detalhe da empresa e usuarios de suporte"
git push origin main
```

Me cola o resultado — principalmente os itens 5, 6, 8 e 9, que provam que
as ações de suporte realmente afetam o acesso do usuário, não só a tela.
