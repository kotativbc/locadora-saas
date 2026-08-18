# Plataforma de Locação de Veículos — SaaS self-hosted

Monólito modular rodando inteiramente em um único servidor Linux (Debian 13),
via Docker Compose, sem serviços pagos ou dependências externas obrigatórias.

## Estrutura

```
apps/
  api/    NestJS + Prisma + PostgreSQL — API, auth, RBAC, worker de jobs
  web/    React + Vite — frontend (build estático, servido pelo Caddy)
scripts/
  backup.sh / restore.sh
systemd/
  unidades de timer para backup diário e processamento da fila de jobs
docs/
  status/   relatório de cada fase (docs/status/fase-N.md)
  deploy/   runbooks operacionais
```

## Princípios de arquitetura

- **Postgres e API nunca publicam porta no host.** Só o Caddy expõe 80/443.
  Isso evita a armadilha clássica de Docker ignorar regras do UFW ao publicar
  uma porta (`ports:` insere regras de iptables que o UFW não enxerga).
- **Sem Redis.** Fila de jobs implementada como tabela no Postgres, processada
  por um worker que roda em lote via systemd timer (não é um daemon).
- **Storage privado fora da pasta pública**: tudo em `/srv/rental-data`,
  nunca servido estaticamente — sempre lido e transmitido pela API depois de
  checar autenticação/permissão.
- **RBAC**: papéis e permissões definidos em `apps/api/src/rbac/rbac.constants.ts`.
- **Multiempresa real**: todo dado sensível é escopado por `companyId`, nunca
  confiando em valor vindo do cliente — sempre derivado do usuário autenticado.

## Fases

Ver `docs/status/` para o que já foi implementado e testado em cada fase.
