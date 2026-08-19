# Rentovix Design — Parte 2 — Deploy no servidor

De novo, só **frontend** — nenhuma mudança de banco, schema ou API.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-design2.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-design2.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-design2.zip apps/api/prisma/schema.prisma
```

## Passo 2 — Rebuildar só o frontend

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
```

## Passo 3 — Testar no navegador

1. **Frota**: confirme que o status agora é uma pílula colorida clicável
   (não some a interação — ainda dá pra trocar disponível/locado/manutenção/
   inativo direto ali)
2. **Sinistros**, **Multas** e **Financeiro → Lançamentos**: mesma
   conferência — pílula colorida, ainda editável
3. Esvazie uma lista pra testar o estado vazio: por exemplo, numa empresa
   de teste sem nenhuma despesa cadastrada, veja se aparece uma mensagem
   explicando o que fazer (não só uma tabela em branco)
4. **Contratos → Novo contrato**: confirme que o formulário aparece
   dividido em 3 blocos com um traço tracejado fino entre eles (Cliente e
   veículo / Tarifa / Período)
5. Confirme mais uma vez que **nada parou de funcionar**: trocar status de
   um veículo, marcar uma multa como paga, criar um contrato novo

## Passo 4 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "design: identidade visual Rentovix - parte 2"
git push origin main
```

Isso fecha as duas partes planejadas do redesenho. Sobrou só modo escuro,
ilustração nos estados vazios e um possível tour guiado como ideias pra
uma Parte 3 futura, sem urgência.
