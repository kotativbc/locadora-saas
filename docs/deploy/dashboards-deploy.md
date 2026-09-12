# Dashboards e ganho retroativo nos relatórios — Deploy

**Sem migration** — só backend (2 endpoints novos + 1 ajustado) e
frontend.

## Parte 1 — Ganho retroativo agora conta nos relatórios

Antes só aparecia somado no painel de Desempenho de cada veículo
individualmente. Agora também soma no "Recebido" de **Relatórios** e
do **Dashboard** — com uma notinha discreta avisando quanto daquele
total é retroativo, pra não confundir com a soma dos lançamentos.

## Parte 2 — Dashboard da Frota

Painel novo no topo da tela de **Frota**:
- Veículos por status (disponível/locado/manutenção/inativo)
- Já gasto e já recebido (frota toda)
- Resultado líquido
- Custo total de aquisição e valor total pela Tabela FIPE
- % de quanto a frota inteira já se pagou

## Parte 3 — Dashboard geral da operação

O Dashboard (tela inicial) ganhou:
- **Gráfico de barra** (frota por status, contratos por status) —
  visual, sem precisar instalar biblioteca nova
- **Pendências que merecem atenção**: pagamentos atrasados (quantos e
  quanto), e lembretes de manutenção preventiva próxima do vencimento
  (baseado no km rodado desde a última revisão)
- **Próximos pagamentos** (14 dias), com cliente/veículo e valor

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-dashboards.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-dashboards.zip
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

1. **Relatórios** → confirme que "Recebido" já reflete o ganho
   retroativo (se algum veículo tiver isso cadastrado), com a nota
   explicando
2. **Frota** → confirme que o painel novo aparece no topo, com os
   números certos
3. **Dashboard** (tela inicial) → confirme os gráficos de barra, e
   que "Pendências" só aparece se houver algo atrasado ou manutenção
   próxima (se não tiver nada pendente, essa seção não aparece —
   comportamento esperado)

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: ganho retroativo nos relatorios, dashboard da frota, dashboard operacional geral"
git push origin main
```
