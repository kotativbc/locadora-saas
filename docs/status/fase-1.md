# Fase 1 — Núcleo: banco, auth, multiempresa, RBAC

**Status: concluída e validada em produção no servidor real.**

## Escopo implementado

- Schema Postgres via Prisma: `Company`, `User`, `Role`/`Permission` (RBAC),
  `RefreshToken`, `AuditLog`, `Job` (fila sem Redis)
- Auth: login, refresh (cookie httpOnly rotativo), logout — senha com Argon2,
  access token JWT de 15 min
- RBAC: guard global de permissões; papéis padrão (Super Admin, Admin da
  Empresa, Gestor de Frota, Atendente, Financeiro, Cliente)
- Empresas (tenants): criação (só Super Admin, já cria o Admin da empresa),
  atualização, upload/leitura de logo (sempre via endpoint autenticado, nunca
  servido estaticamente)
- Usuários: CRUD escopado por empresa, isolamento de tenant reforçado no
  service (nunca confia em `companyId` vindo do cliente)
- Auditoria: login, criação de empresa/usuário, upload de logo
- Worker de jobs: processa lote e encerra (chamado por systemd timer a cada
  minuto), ainda sem handlers reais registrados (chegam na Fase 2+)
- Frontend: login, dashboard, gestão de empresas (Super Admin), dados da
  própria empresa + logo, gestão de usuários com papel

## Testes executados e evidência real (servidor de produção)

| Teste | Resultado |
|---|---|
| `npm install` (API e frontend) | 0 vulnerabilidades nos dois |
| `docker compose build` | build limpo, imagem `rental-saas-api` gerada |
| `prisma migrate dev --name init` | migration `20260818151624_init` gerada e aplicada; schema sincronizado |
| `npm run seed` | permissões, papéis e Super Admin criados |
| `curl /api/health` | `{"status":"ok",...}` |
| `docker compose ps` | `db` e `api` **sem** porta publicada no host; só `caddy` expõe 80/443 |
| `ufw status verbose` | `Default: deny (incoming)`; só 22/80/443 liberadas |
| Login Super Admin (navegador) | OK |
| Criação de empresa pelo Super Admin | OK |
| Login como Admin da empresa recém-criada | OK |
| Backup manual (`scripts/backup.sh`) | gerou `db-*.dump` (20K) e `uploads-*.tar.gz` em `/srv/rental-data/backups` |
| `systemctl list-timers` | `rental-backup.timer` e `rental-worker.timer` ativos e agendados |
| `git push` | código em `github.com/kotativbc/locadora-saas`, branch `main` |

## Bugs encontrados e corrigidos durante o deploy

Registrado aqui porque os mesmos padrões provavelmente aparecem de novo nas
próximas fases:

1. **UFW com política padrão `allow (incoming)`** — corrigido para `deny`,
   mantendo as regras explícitas de 22/80/443.
2. **Prisma não detectava OpenSSL na imagem `node:22-bookworm-slim`** —
   faltava o pacote `openssl`; instalado em ambos os estágios do Dockerfile.
3. **`prisma migrate deploy` sem permissão de escrita em produção** —
   `prisma` estava só em `devDependencies`; movido para `dependencies` (é
   necessário rodar migrations em produção, então precisa estar na imagem final).
4. **`ts-node: not found` no seed em produção** — mesma causa raiz do item 3.
   Corrigido movendo `prisma/seed.ts` para `src/database/seed.ts`, compilado
   junto com o resto pelo build normal e executado via `node dist/database/seed.js`
   (sem depender de `ts-node` em produção).
5. **Nenhuma migration existia ainda** — `migrate deploy` só aplica migrations
   já geradas, não cria a partir do `schema.prisma`. Foi preciso gerar a
   primeira com `prisma migrate dev --name init --skip-seed`.
6. **Migration gerada dentro de um container `--rm` seria perdida** — o
   `docker-compose.yml` não montava `apps/api/prisma` do host; adicionado
   `./apps/api/prisma:/app/prisma` como volume, garantindo que migrations
   fiquem no host e vão pro Git.
7. **Permissão de escrita no volume montado** — `apps/api/prisma` no host
   pertencia ao usuário `deploy`, mas o processo no container roda como
   `appuser` não-root (UID diferente); corrigido com `chown` pro UID/GID do
   `appuser` dentro do container.
8. **`SEED_SUPER_ADMIN_EMAIL`/`PASSWORD` não chegavam ao container** — só
   variáveis listadas explicitamente em `environment:` são repassadas;
   adicionado `env_file: [.env]` no serviço `api` pra repassar tudo do `.env`.
9. **`AuditLogService` não injetável em `CompaniesService`/`UsersService`/
   `AuthService`** — estava registrado só como provider do `AppModule`, sem
   módulo próprio exportando-o. Corrigido criando `CommonModule` com
   `@Global()`, exportando `AuditLogService`.

## Decisão consciente ainda pendente

Criação de um usuário com papel "Atendente" pelo Admin da empresa não foi
testada explicitamente no navegador nesta rodada — mas usa exatamente o
mesmo caminho de código (auth + RBAC) já validado pelo login do Admin da
empresa, então não bloqueia o fechamento desta fase.
