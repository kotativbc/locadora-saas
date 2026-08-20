# Correções da Auditoria — Deploy no servidor

Sem migration (schema não mudou). Cobre os dois itens "antes do lançamento"
da auditoria + a correção urgente do Caddyfile (essa você já aplicou na
hora, mas confira de novo no Passo 0 por garantia).

## O que mudou

- **Rate limiting** (`@nestjs/throttler`): 100 req/min/IP por padrão em
  toda a API; login e "esqueci minha senha" com limite mais apertado
  (5/min/IP); redefinir senha com 10/min/IP
- **`trust proxy` configurado** no Express (`main.ts`) — sem isso, o rate
  limit por IP não funcionaria certo (todo mundo apareceria como o mesmo
  IP, já que o tráfego passa pelo Caddy antes de chegar na API) — e o IP
  registrado na Auditoria desde a Fase 1 também estava errado por causa
  disso; a partir de agora fica correto
- **Limite de upload corrigido de verdade**: a checagem de tamanho já
  existia (`documents.service.ts`), mas rodava só depois do arquivo
  inteiro já estar na memória — corrigido pra limitar no nível do Multer
  (`FileInterceptor`), que para de ler o arquivo assim que estoura o
  limite, sem nunca carregar tudo na RAM

## Passo 0 — Confirme o Caddyfile (se ainda não aplicou)

```bash
cat /srv/rental-app/Caddyfile
```

Deve mostrar `rentovix.kotati.com.br {` no topo, não `:80 {`. Se ainda
estiver errado, aplica o conteúdo que te passei antes e reinicia o Caddy.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-auditoria-fix.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-auditoria-fix.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-auditoria-fix.zip apps/api/prisma/schema.prisma
```

## Passo 2 — Rebuildar a API (sem migration)

```bash
docker compose build api
docker compose up -d
```

## Passo 3 — Testar no navegador/terminal

1. **Rate limit de login**: erra a senha de propósito 6 vezes seguidas em
   menos de 1 minuto → a 6ª tentativa deve responder `429 Too Many
   Requests` em vez da mensagem normal de "e-mail ou senha inválidos"
2. **IP correto na Auditoria**: faça um novo login → vá em Auditoria →
   confirme que o IP registrado é o seu IP real (não algo tipo
   `172.x.x.x`, que seria o IP interno do Docker)
3. **Limite de upload**: tenta anexar um arquivo grande (se não tiver um
   de propósito, um vídeo curto de celular costuma passar de 10MB) num
   documento de cliente ou veículo → deve ser rejeitado com erro, não
   travar nem demorar muito pra responder
4. Confirme que o uso normal continua funcionando: várias telas abertas
   em sequência não devem disparar o limite de 100/min (esse é bem
   folgado pra uso normal)

## Passo 4 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "seguranca: rate limiting, trust proxy, limite de upload no multer"
git push origin main
```

Me conta como foi, principalmente o item 1 (rate limit de verdade
bloqueando) e o item 2 (IP correto na auditoria) — são os que prova que a
correção funciona de ponta a ponta, não só no código.
