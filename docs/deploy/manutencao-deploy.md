# Manutenção — Deploy no servidor (UID/permissões, sessão, mobile)

Três correções independentes, sem relação de dependência entre elas, mas
que exigem atenção redobrada porque mexem em infra sensível (permissão de
arquivo e sessão de login). Siga na ordem e valide cada uma antes de seguir.

## 1. UID/permissões — a correção estrutural

**O que mudou:** o container da API agora nasce com o **mesmo UID/GID** do
usuário `deploy` do host, em vez de um UID fixo (1001) escolhido por mim. Um
build arg (`DEPLOY_UID`/`DEPLOY_GID`) resolve isso automaticamente — não
precisa mais de `chown` manual toda vez que uma pasta nova aparecer em
`/srv/rental-data` ou `apps/api/prisma`.

### Passo 1.1 — Descobrir o UID/GID do `deploy`

```bash
id -u
id -g
```

Anote os dois números (no seu caso, muito provavelmente `1000` e `1000` —
mas confirme, não assuma).

### Passo 1.2 — Levar o código novo pro servidor

```bash
scp rental-saas-manutencao.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-manutencao.zip
```

Se der `Permission denied` no `schema.prisma` (causa de sempre), roda antes:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-manutencao.zip apps/api/prisma/schema.prisma
```

### Passo 1.3 — Atualizar o `.env`

```bash
cd /srv/rental-app
nano .env
```

Adicione (com os números do Passo 1.1):

```env
DEPLOY_UID=1000
DEPLOY_GID=1000
COOKIE_SECURE=false
```

`COOKIE_SECURE=false` é a correção da Parte 2 (sessão) — já aproveite pra
adicionar aqui.

### Passo 1.4 — Rebuildar a API com o UID novo

```bash
docker compose build api
```

### Passo 1.5 — Consolidar a posse dos arquivos

Agora que o container usa o mesmo UID do `deploy`, **tudo** pode voltar a
pertencer a `deploy:deploy` — inclusive a pasta `migrations/`, que antes
precisava do `chown 1001:1001` à parte:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
sudo chown -R deploy:deploy /srv/rental-data/uploads /srv/rental-data/backups /srv/rental-data/logs
```

**Importante:** não rode esse `chown` em `/srv/rental-data/postgres` nem em
`/srv/rental-data/caddy` — essas pastas pertencem aos containers do Postgres
e do Caddy, que usam usuários internos próprios (nada a ver com o `appuser`
da API). Mexer nelas pode quebrar o Postgres.

Se quiser, também pode apertar a permissão da pasta raiz de volta (o
`chmod o+x` de antes não é mais necessário com o UID batendo):

```bash
sudo chmod 750 /srv/rental-data
```

### Passo 1.6 — Verificar

```bash
docker compose run --rm api id
```

Deve mostrar `uid=1000 gid=1000` (ou os números que você anotou no Passo
1.1) — sem nome de usuário associado, e isso é esperado (o container usa o
UID numérico direto, sem criar um usuário nomeado, exatamente pra evitar
colisão com o usuário `node` de UID 1000 que já vem na imagem base).

## 2. Sessão/cookie — a correção do bug real

**Causa raiz** (dois bugs, os dois já corrigidos no código):
1. O cookie de sessão exigia `Secure`, mas o site roda em HTTP puro (modo
   IP, sem domínio ainda) — navegador nunca envia cookie `Secure` fora de
   HTTPS. Corrigido: agora depende da variável `COOKIE_SECURE` (que você já
   colocou como `false` no Passo 1.3), não mais de `NODE_ENV`.
2. O cookie tinha escopo `path: /auth`, mas o frontend chama tudo com
   prefixo `/api` (`/api/auth/refresh`) — o navegador nunca reenviava esse
   cookie. Corrigido pra `path: /api/auth`.

Sem passo extra de deploy aqui — já foi coberto pelo rebuild da API no
Passo 1.4 e pela variável adicionada no Passo 1.3.

### Como testar (importante, é o que prova que funcionou)

1. Depois de subir tudo (Passo 3 abaixo), faça login normalmente
2. **Aperte F5 (recarregar a página)** sem sair — antes desse fix, isso
   também derrubava a sessão; confirme que continua logado
3. Clique em **Sair**
4. Faça login de novo
5. Aperte F5 de novo — confirme que continua logado
6. Abra o DevTools do navegador (F12) → aba **Application/Storage** →
   **Cookies** → confirme que existe um cookie `refresh_token` com `Path:
   /api/auth`

## 3. Mobile — menu gaveta + tabelas roláveis

- Em telas estreitas (≤860px), o menu lateral vira uma gaveta acionada por
  um botão ☰ no topo, em vez de ficar fixo ocupando a tela
- Tabelas passam a rolar na horizontal em vez de espremer o layout
- Botões, campos e selects ficam com altura mínima confortável pro toque
- A tela pública de assinatura (`/assinar/:token`) — a mais importante no
  celular, já que é feita pra ser usada num tablet/celular no balcão —
  também deixou de ter uma largura fixa que causava rolagem horizontal

Sem passo de deploy separado — vem no mesmo rebuild do frontend do Passo 3.

### Como testar

No celular de verdade, ou no DevTools do navegador (F12 → ícone de
celular/tablet, ou `Ctrl+Shift+M` no Chrome):
1. Confirme que aparece o botão ☰ no topo em vez do menu fixo
2. Toque nele, confirme que a gaveta abre por cima do conteúdo
3. Toque num item do menu, confirme que navega **e** a gaveta fecha sozinha
4. Numa tela com tabela grande (ex: Contratos), confirme que ela rola pros
   lados em vez de cortar colunas
5. Abra a tela pública de assinatura (`/assinar/<token>` de um contrato em
   rascunho) no modo celular — confirme que o cartão de assinatura cabe na
   tela sem rolagem horizontal

## Passo final — rebuild do frontend, subir tudo, commitar

```bash
cd /srv/rental-app
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"

docker compose up -d
docker compose ps
curl -sS http://localhost/api/health
```

Depois de validar os 3 itens acima:

```bash
git add -A
git commit -m "manutencao: UID/permissoes, sessao/cookie, mobile"
git push origin main
```

Me cola: saída do `docker compose run --rm api id` (Passo 1.6), confirmação
dos 6 passos de teste de sessão, e confirmação dos 5 passos de teste mobile.
