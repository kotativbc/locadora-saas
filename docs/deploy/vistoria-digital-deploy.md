# Vistoria digital — checklist + assinatura — Deploy

**Com migration.** Essa é a reconstrução da vistoria que discutimos —
lê o resumo abaixo com calma antes de aplicar, é a entrega mais nova e
mais sensível desta leva.

## O que mudou

**O caminho antigo continua existindo** — "Registrar entrega" e
"Registrar devolução" (preenchimento direto pela equipe, sem
assinatura do cliente) não foram tocados. Isso é só uma opção nova ao
lado.

**Caminho novo — "Link de vistoria"**:
1. Na tela de Contratos, aparece um botão "Link de vistoria (entrega)"
   quando o contrato está ativo e ainda não foi entregue (e o
   equivalente pra devolução depois da entrega)
2. Clicar gera um link válido por 6 horas — pensado pra abrir na hora,
   presencialmente, no celular ou tablet
3. A página que abre já vem com os dados carregados sozinhos (empresa,
   veículo, placa, cliente, número do contrato) — não precisa digitar
   nada disso de novo
4. Checklist por categoria (Exterior, Interior, Documentos e
   equipamentos obrigatórios) — desmarcado mostra um campo pra
   descrever o que foi observado
5. Odômetro e combustível no momento
6. Ao final, quem está devolvendo/recebendo o carro **assina
   desenhando na tela** (dedo ou mouse) — isso é novo, não existia
   antes no sistema. Depois de enviado, o link não funciona mais (uso
   único)

Uma vistoria de entrega e uma de devolução são dois eventos
separados — cada uma com seu próprio link e sua própria assinatura,
exatamente como você pediu.

**O que não mudou por baixo**: toda a regra de negócio que já existia
(não deixar entregar sem estar ativo, não deixar devolver sem ter
entregue antes, atualização do odômetro do veículo, cálculo da multa
sugerida de devolução antecipada) continua exatamente igual — só
passou a ser compartilhada entre os dois caminhos (direto e digital),
em vez de duplicada.

## Passo 1 — Levar o código pro servidor

```bash
scp rental-saas-vistoria-digital.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-vistoria-digital.zip
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
docker compose run --rm api npx prisma migrate dev --name inspection_digital_checklist_signature --skip-generate --skip-seed
```

## Passo 5 — Rebuildar o frontend e subir

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
```

## Passo 6 — Testar com calma

1. Pega um contrato **ativo, ainda não entregue** → clica em "Link de
   vistoria (entrega)" → copia o link (ou clica "Abrir agora")
2. Na página que abrir: confirme que os dados do contrato/cliente/
   veículo aparecem certos sozinhos
3. Marca alguns itens do checklist, deixa outro desmarcado e escreve
   uma observação nele
4. Assina no campo de assinatura (desenhando) → confirme que aparece
   "✓ Assinatura capturada"
5. Envia → confirme a tela de "Vistoria registrada"
6. Volta pro sistema → confirme que o contrato agora mostra como
   entregue, e que aparece o botão de vistoria de **devolução**
7. Tenta abrir o **mesmo link de novo** → confirme que dá erro de link
   inválido (uso único funcionando)
8. Confirma que o caminho antigo ("Registrar entrega" direto) continua
   funcionando normalmente num outro contrato de teste

## Passo 7 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "feat: vistoria digital com checklist e assinatura desenhada via link presencial"
git push origin main
```

## Uma ideia pra depois, não construída ainda

Comentei na proposta a possibilidade de gerar um PDF da vistoria
assinada (igual já existe pro contrato e pra fatura), pra você poder
baixar/enviar um comprovante formal por e-mail. Não construí isso
ainda — se fizer sentido, é a próxima adição natural em cima disso.
