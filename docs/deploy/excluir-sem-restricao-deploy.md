# Excluir contrato sem restrição — Deploy

**Sem migration** — mudança de regra de negócio no backend + frontend.
**Leia com atenção antes de aplicar** — essa é a versão sem nenhuma
trava, exatamente como pedido.

## O que mudou

O botão "Excluir" aparece agora em **qualquer contrato**, não importa
o status — rascunho, assinado, ativo, concluído, cancelado, tanto faz.
Todas as travas anteriores (que eu tinha colocado justamente pra
proteger contrato assinado e lançamento pago) foram removidas a seu
pedido.

Ao excluir um contrato:
- **Ele é apagado de vez**, sem volta
- **Qualquer lançamento (Charge) vinculado só a ele também é apagado**
  — incluindo lançamentos já marcados como pagos
- Multas, avarias e sinistros vinculados a esse contrato **não são
  apagados** — só perdem o vínculo com o contrato (continuam existindo
  como registro, já que representam fatos reais independentes do
  contrato)
- Vistorias, parcelas de caução/aluguel, sinalizações de manutenção e
  a assinatura em si são removidas junto (só existiam no contexto
  daquele contrato)

**Um lembrete, não um bloqueio**: lançamento já pago é dinheiro que
entrou de verdade — geralmente esse tipo de registro precisa ficar
guardado por alguns anos pra fins fiscais/contábeis no Brasil. Isso
não impede mais a exclusão (você pediu assim), só deixo registrado
aqui caso ajude na hora de decidir o que excluir.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-excluir-sem-restricao.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-excluir-sem-restricao.zip
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

1. Cria um contrato de teste, **assina de verdade**, gera um
   lançamento (aluguel) e marca como pago
2. Clica em **Excluir** → confirme o aviso → confirme que o contrato
   some e a mensagem avisa quantos lançamentos foram removidos junto
3. Confere em **Financeiro → Lançamentos** que aquele lançamento
   pago realmente sumiu

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: excluir contrato sem restricao de status, remove lancamentos vinculados"
git push origin main
```
