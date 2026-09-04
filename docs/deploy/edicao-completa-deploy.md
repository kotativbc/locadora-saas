# Edição completa em todos os módulos — Deploy

**Sem migration** — só backend (DTOs expandidos + 2 módulos novos de
edição) e frontend (9 telas novas de "Editar"). Sistema em produção,
então segue o checklist de teste com calma antes de considerar
fechado.

## O que mudou — resumo por módulo

| Módulo | Antes | Agora |
|---|---|---|
| Frota | Já tinha (feito antes) | — |
| Contratos | Já tinha (feito antes) | — |
| **Clientes** | Nada editável | Tudo — dados pessoais, endereço, CNH, dados bancários, ativo/inativo |
| **Tarifas** | Nada editável | Tudo — valores, KM, caução, ativa/inativa |
| **Manutenção** | **Não existia edição nenhuma** | Construído do zero — tipo, descrição, data, odômetro, custo, oficina, próxima manutenção |
| **Avarias** | Só status | Descrição, gravidade, custo, cobrar do cliente, status |
| **Sinistros** | Só status/nº seguro/custo | Tipo, data, local, descrição, B.O., terceiros envolvidos, tudo |
| **Multas** | Só status | Data da infração, vencimento, valor, descrição, nº do documento, status |
| **Lançamentos** | Só status | Tipo, descrição, valor, vencimento, status |
| **Despesas** | **Não existia edição nenhuma** | Construído do zero — veículo, categoria, descrição, valor, data |
| **Usuários** | Só nome/ativo | Nome, e-mail, **e o papel** (com trava: ninguém consegue se autodesativar ou se auto-rebaixar de administrador) |

**Rastreamento** ficou de fora de propósito — são posições de GPS
registradas automaticamente, editar isso manualmente não faz sentido.

## Achado durante o processo

Ao expandir a edição de Multas, encontrei um bug real: o código não
convertia as datas certo antes de salvar (ia texto puro pro banco em
vez de data). Corrigido nessa mesma leva.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-edicao-completa.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-edicao-completa.zip
```

## Passo 2 — Rebuildar a API (sem migration)

```bash
docker compose build api
docker compose up -d
```

## Passo 3 — Rebuildar o frontend

Só roda uma vez, espera terminar antes de tentar de novo:

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
```

## Passo 4 — Testar (com calma, sistema em produção)

Pra cada módulo abaixo: clica em "Editar" num registro existente,
muda um campo qualquer, salva, confirma que a lista atualizou certo.

1. Clientes
2. Tarifas
3. Manutenção
4. Avarias
5. Sinistros
6. Multas
7. Lançamentos
8. Despesas
9. Usuários — **teste especial**: tenta editar seu PRÓPRIO usuário →
   confirme que os campos "Papel" e "Usuário ativo" aparecem
   **desabilitados**, com o aviso explicando por quê. Depois edita um
   OUTRO usuário → confirme que aí sim dá pra mudar o papel dele

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: edicao completa em todos os modulos (clientes, tarifas, manutencao, avarias, sinistros, multas, lancamentos, despesas, usuarios)"
git push origin main
```

Esse foi o maior lote de telas desta leva — qualquer coisa que parecer
estranha em algum módulo específico, me avisa qual exatamente que eu
reviso com prioridade.
