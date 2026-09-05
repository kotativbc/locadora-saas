# Correção de fuso horário nas datas — Deploy

**Sem migration** — só frontend. Corrige o bug que você reportou no
cronograma de pagamento, e o mesmo bug em mais 6 lugares que tinham
exatamente o mesmo problema.

## A causa

Todo campo de data "pura" (vencimento, data de infração, data de
manutenção etc.) vem de um campo do tipo `<input type="date">` — só a
data, sem hora. O servidor salva isso como meia-noite UTC. Na hora de
mostrar de volta, o navegador convertia pro fuso horário local (Brasil,
UTC-3) antes de extrair o dia — e meia-noite UTC vira 21h do dia
**anterior** no horário de Brasília. Resultado: a data exibida sempre
recuava um dia.

Testei o cenário exato que você reportou (12/09 virando 11/09) e
confirmei que reproduz e que a correção resolve. Também testei casos
de virada de mês/ano — nesses casos o bug era ainda mais grave (ex:
01/01/2026 aparecia como 31/12/2025, trocando até o ano).

## Onde estava acontecendo (todos corrigidos)

- Cronograma de pagamento e parcelas de caução (o que você reportou)
- Sinistros — data do ocorrido
- Despesas — data
- Lançamentos — vencimento
- Multas — data da infração
- Manutenção — data
- Dashboard — data das despesas na lista de atividade recente

**O que NÃO tinha esse problema** (conferido, não precisou mexer):
datas de contrato (usam data E hora, tipo diferente de campo), e
qualquer data/hora que o servidor registra sozinho no momento exato da
ação (devolução, pagamento, etc.) — essas já vêm certas porque
carregam a hora real, não são "datas puras".

Também conferi os PDFs gerados no servidor — esses **não tinham** esse
bug (o servidor roda em UTC, sem fuso configurado, então não sofre essa
conversão) — não precisou mexer neles.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-fix-fuso-horario.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-fix-fuso-horario.zip
```

## Passo 2 — Rebuildar o frontend (API não mudou)

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
```

## Passo 3 — Testar

1. **Contratos → Cronograma de pagamento** → adiciona uma parcela com
   vencimento **12/09/2026** → confirme que aparece **12/09/2026** na
   lista, não 11/09
2. Testa o mesmo em **Multas** (data da infração), **Despesas**,
   **Manutenção** e **Sinistros**

## Passo 4 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "fix: datas puras (vencimento, infracao, manutencao) nao recuam mais um dia por fuso horario"
git push origin main
```
