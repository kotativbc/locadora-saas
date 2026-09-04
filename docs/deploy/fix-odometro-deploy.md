# Correção dos campos de KM — Deploy

**Sem migration** — só frontend.

## O que mudou

O campo de odômetro (e outros campos parecidos: intervalo de
manutenção, limite de KM mensal na tarifa) usava `type="number"` do
HTML, que **nunca aceita ponto como separador de milhar** — só como
casa decimal. Quando alguém digitava "44.468" pra dizer 44 mil e 468
km, o navegador entendia "44 vírgula 468" e recusava, pedindo um
número inteiro.

Troquei esses campos por um tipo de texto que só aceita dígito — pode
digitar com ponto, sem ponto, como preferir, que o sistema limpa
sozinho e usa só os números.

**Campos corrigidos**: odômetro (vistoria de entrega/devolução,
editar veículo), intervalo de manutenção (novo/editar veículo), limite
de KM mensal (tarifas).

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-fix-odometro.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-fix-odometro.zip
```

## Passo 2 — Rebuildar o frontend (só isso, API não mudou)

Só roda uma vez, espera terminar antes de tentar de novo:

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
```

## Passo 3 — Testar

1. **Manutenção → Nova manutenção** → digita "44.468" no odômetro →
   confirme que aceita e salva como 44468
2. **Frota → Editar veículo** → mesma coisa no campo de odômetro
3. **Contratos → Registrar entrega/devolução** → mesma coisa
4. **Tarifas → Nova tarifa** → digita "5.000" no limite de KM mensal →
   confirme que aceita

## Passo 4 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "fix: campos de km aceitam digitacao com ponto (nao dependem mais de type=number)"
git push origin main
```
