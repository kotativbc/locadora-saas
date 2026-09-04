# Auditoria completa (Super Admin only) — Deploy

**Com migration** (4 campos novos no `AuditLog`). Área central pra você
se resguardar — testa com calma antes de considerar fechado.

## O que mudou

**Acesso restrito** — a partir de agora, só o Super Admin (você) vê a
tela de Auditoria. Empresas cadastradas perdem esse acesso — o item
"Auditoria" some sozinho do menu delas, sem precisar mudar mais nada.

**Muito mais dado capturado, sem precisar reescrever o sistema todo**
— criei um mecanismo que captura automaticamente IP e navegador de
*toda* requisição, então os 40+ lugares que já registravam eventos de
auditoria (login, criar contrato, editar cliente, etc.) passaram a
ganhar esse dado de graça, sem eu precisar editar um por um.

**Tentativas que falharam agora ficam registradas**:
- Login com senha errada ou e-mail inexistente
- Login numa empresa suspensa/bloqueada
- Tentativa de acessar algo sem ter permissão pra isso

Antes, só ações bem-sucedidas apareciam — isso é exatamente o tipo de
coisa que importa pra se resguardar (prova de tentativa de acesso
indevido, por exemplo).

**Filtros de verdade** na tela — por empresa, usuário (nome ou
e-mail), tipo de ação, tipo de registro, sucesso ou falha, IP, e
período de data. Cada linha tem um botão "Detalhes" que expande e
mostra a rota exata chamada, o navegador/dispositivo, e qualquer dado
extra específico daquela ação.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-auditoria-completa.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-auditoria-completa.zip
```

## Passo 2 — Rebuildar a API

```bash
docker compose build api
```

## Passo 3 — Backup antes da migration

```bash
/srv/rental-app/scripts/backup.sh
```

## Passo 4 — Migration

```bash
docker compose run --rm api npx prisma migrate dev --name audit_log_detailed_tracking --skip-generate --skip-seed
```

## Passo 5 — Rebuildar o frontend e subir

Só roda uma vez, espera terminar antes de tentar de novo:

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
```

## Passo 6 — Testar

1. Entra como **Super Admin** → Auditoria → confirme que a tela abre
   com os filtros e a lista de eventos
2. Entra como um **admin de empresa** → confirme que o item
   "Auditoria" **não aparece mais** no menu
3. Tenta fazer login com **senha errada** de propósito → volta como
   Super Admin → filtra por "Tentativa de login falhou" → confirme que
   apareceu, com o IP certo
4. Testa os filtros: por empresa, por período de data, por "Só
   falhas/negados"
5. Clica em "Detalhes" numa linha qualquer → confirme que mostra a
   rota, o navegador, e os dados extras

## Passo 7 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: auditoria completa e detalhada, restrita ao super admin"
git push origin main
```

## Uma coisa pra ficar de olho depois de um tempo em produção

O log de "acesso negado" só dispara quando alguém tenta de verdade uma
ação sem ter permissão — não deveria gerar volume alto no uso normal.
Mas se depois de um tempo você notar muitas entradas desse tipo geradas
por engano (ex: um botão que aparece na tela mas não deveria pra
aquele papel), me avisa que a gente ajusta o que aparece pra cada
papel, em vez de só depender do bloqueio no servidor.
