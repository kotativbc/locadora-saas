# Excluir Manutenção e Despesa — Deploy

**Sem migration** — só backend (2 endpoints novos) + frontend.

## O que mudou

- **Excluir manutenção** — se ela tiver uma despesa vinculada
  (gerada automaticamente por ter custo), essa despesa **também é
  excluída junto**, pra não sobrar uma despesa órfã sem manutenção
  nenhuma por trás
- **Excluir despesa** — se ela tiver vindo de uma manutenção, a
  manutenção **não é apagada**, só perde o vínculo com essa despesa
  (o custo continua registrado na manutenção; se você editar a
  manutenção depois, uma despesa nova é gerada de novo)

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-excluir-manutencao-despesa.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-excluir-manutencao-despesa.zip
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

## Passo 4 — Testar

1. **Manutenção** → registra uma manutenção **com custo** → confirme
   que apareceu em Despesas → volta e **exclui** a manutenção →
   confirme que ela sumiu de Manutenção **e** de Despesas
2. Registra outra manutenção com custo → dessa vez, vai em
   **Despesas** e exclui a despesa direto (não a manutenção) →
   confirme que a manutenção continua existindo em Manutenção, só sem
   custo contando mais nos relatórios

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: excluir manutencao (remove despesa vinculada) e excluir despesa"
git push origin main
```
