# Fase 1 — Núcleo: banco, auth, multiempresa, RBAC

**Status: implementada e validada no ambiente de desenvolvimento (sandbox);
aguardando validação final no servidor de produção.**

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
- Worker de jobs: processa lote e encerra (chamado por systemd timer),
  ainda sem handlers reais registrados (chegam na Fase 2+)
- Frontend: login, dashboard, gestão de empresas (Super Admin), dados da
  própria empresa + logo, gestão de usuários com papel

## Testes executados até agora

| Teste | Onde | Resultado |
|---|---|---|
| `npm install` (API) | sandbox | 0 vulnerabilidades |
| `npm install` (frontend) | sandbox | 0 vulnerabilidades |
| `npm run build` (frontend: tsc + vite build) | sandbox | build limpo, sem erros |
| `tsc --noEmit` (API) | sandbox | sem erros de lógica; únicos avisos restantes dependem do Prisma Client gerado (ver abaixo) |
| `prisma generate` | sandbox | **bloqueado** — rede do sandbox não alcança `binaries.prisma.sh`; precisa rodar no servidor |
| Migrations reais contra Postgres | — | pendente, depende do servidor |
| Login/refresh/RBAC ponta a ponta | — | pendente, depende do servidor |

## O que falta para fechar a fase

Rodar o runbook `docs/deploy/fase-1-deploy.md` no servidor e confirmar:
1. `docker compose build` sem erros
2. `prisma migrate deploy` aplica o schema sem erros
3. `npm run seed` cria permissões, papéis e o Super Admin inicial
4. Login do Super Admin funciona ponta a ponta (curl ou navegador)
5. Super Admin consegue criar uma empresa; o Admin dessa empresa consegue
   logar e criar um usuário Atendente
6. `docker compose ps` confirma que `db` e `api` não têm porta publicada no host

Assim que esses passos forem confirmados, este documento é atualizado para
"concluída" com a evidência real de produção.
