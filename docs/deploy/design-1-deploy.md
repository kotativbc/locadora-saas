# Rentovix Design — Parte 1 — Deploy no servidor

Só o **frontend** mudou nesta rodada — nenhuma mudança de banco, schema ou
API. Deploy mais simples e rápido que o normal.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-design1.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-design1.zip
```

Se der `Permission denied` no `schema.prisma` (mesma causa de sempre, não
tem relação com esta mudança):

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-design1.zip apps/api/prisma/schema.prisma
```

## Passo 2 — Rebuildar só o frontend

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
```

Não precisa rebuildar a API, gerar migration, nem reiniciar containers —
o Caddy já serve os arquivos novos direto de `apps/web/dist`.

## Passo 3 — Testar no navegador

1. **Login**: confirme a marca Rentovix aparecendo (ponto + linha
   tracejada até um segundo ponto âmbar, ao lado do nome)
2. **Menu lateral**: confirme os grupos (Operação, Pós-locação,
   Financeiro, Administração conforme seu papel) e os ícones
3. **Painel inicial** (tela após o login): confirme que aparecem os
   cards de resumo (a receber, recebido, contratos ativos, frota) e os
   atalhos de acesso rápido
4. **Contratos**: confirme que a coluna Status agora é um selo colorido
   (rascunho cinza, aguardando assinatura âmbar, ativo verde, concluído
   azul, cancelado vermelho)
5. **Avarias**: confirme o selo "Em aberto" (âmbar) / "Resolvida" (verde)
6. Redimensione a janela pra largura de celular (ou abra no celular) —
   confirme que o menu continua funcionando como gaveta e que, numa tela
   baixa, dá pra rolar o menu até o botão Sair sem nada cortado
7. Confirme que **nenhum fluxo parou de funcionar**: criar contrato,
   gerar link, assinar, registrar entrega/devolução, lançamentos
   financeiros — tudo deve continuar exatamente como antes, só com a cara
   nova

## Passo 4 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "design: identidade visual Rentovix - parte 1"
git push origin main
```

Me conta como ficou (se possível, um print da tela de login e do menu
ajuda bastante) e se quer seguir pra Parte 2 (selects de status
editável, estados vazios ilustrados, refino de formulários).
