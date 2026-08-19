# Manutenção 1 — UID/permissões, sessão/cookie, mobile

**Status: concluída e validada em produção.**

## O que foi corrigido

1. **Débito técnico de UID** — o container da API agora nasce com o mesmo
   UID/GID do usuário `deploy` do host (via build arg `DEPLOY_UID`/
   `DEPLOY_GID`, sem `useradd` — usa UID numérico direto no `USER` do
   Dockerfile pra não colidir com o usuário `node` de UID 1000 que já vem na
   imagem base). Resolve de vez o padrão de erro de permissão que já tinha
   aparecido 3x (migrations, schema.prisma, uploads).
2. **Sessão/cookie — dois bugs reais**:
   - Cookie exigia `Secure` via `NODE_ENV=production`, mas o site roda em
     HTTP puro (sem domínio ainda) — corrigido pra depender de
     `COOKIE_SECURE` (env, hoje `false`; trocar pra `true` quando o domínio
     com HTTPS estiver ativo)
   - Cookie tinha `path: /auth`, mas o frontend chama tudo com prefixo
     `/api` — corrigido pra `path: /api/auth`
3. **Mobile**:
   - Menu lateral vira gaveta com botão ☰ em telas ≤860px
   - Bug de CSS encontrado e corrigido: `table { display: block }` quebrava
     o alinhamento interno de `thead`/`tr`/`td` — trocado pela técnica
     correta (`.card { overflow-x: auto }` + `table { min-width }`)
   - Tela pública de assinatura (`/assinar/:token`) perdeu largura fixa que
     causava rolagem horizontal

## Validado pelo usuário em produção

- `docker compose run --rm api id` confirmando UID/GID correto
- Sessão sobrevive a F5, e a sair+entrar de novo
- Layout mobile correto após o fix de CSS das tabelas
- Redirecionamento indevido pro login não ocorre mais
