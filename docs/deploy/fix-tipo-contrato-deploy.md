# Correção urgente — Tipo de contrato sem valor padrão

Sem migration, sem mudança de backend — só o formulário. Deploy rápido.

## O que mudou

- O campo "Tipo de contrato" **não vem mais pré-selecionado em "Padrão"**.
  Agora abre vazio, com borda vermelha, obrigando a escolha explícita
- O botão "Criar contrato" fica **desabilitado** até escolher um tipo
- Depois de escolher, aparece uma confirmação visível: "✓ Tipo
  selecionado: [nome do tipo]"

Não achei bug na lógica que decide qual PDF gerar (conferi o código do
servidor via SSH, está correto e atualizado) — o problema real era o
formulário sempre reiniciar em "Padrão" sem confirmação, o que deixa
passar batido se alguém preencher rápido. Essa correção fecha essa
brecha especificamente.

Testei visualmente os dois estados (sem escolha / com escolha) antes de
mandar — não só compilou, conferi a aparência de verdade.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-fix-tipo-contrato.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-fix-tipo-contrato.zip
```

## Passo 2 — Rebuildar só o frontend (API não mudou)

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
```

## Passo 3 — Testar

1. Vá em **Contratos → Novo contrato**
2. Confirme que o campo "Tipo de contrato" aparece **vazio, com borda
   vermelha**, e o botão "Criar contrato" está **cinza/desabilitado**
3. Escolha "Padrão com Proteção Total" → confirme que aparece "✓ Tipo
   selecionado: Padrão com Proteção Total" e o botão fica laranja/ativo
4. Crie o contrato de teste → baixe o PDF → confirme que vem completo,
   com os anexos

## Passo 4 — Recriar os 2 contratos que saíram errados

Os rascunhos antigos (`05fae4fa...` e `8e522fb8...`) podem ficar
parados como estão — não têm assinatura nem cobrança, não afetam nada.
Cria os 2 de novo do zero, com atenção no tipo dessa vez.

## Passo 5 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "fix: tipo de contrato sem valor padrao, exige escolha explicita"
git push origin main
```

Depois que isso estiver no ar e você confirmar que o cliente recebeu o
contrato certo, seguimos com as outras 4 coisas que você trouxe (editar
veículo/odômetro, custo x rendimento, centavos, endereço estruturado).
