# E-mail — Deploy no servidor (esqueci minha senha)

Fecha o último pedaço pendente da Fase 6. Precisa de migration (tabela
nova) e de configurar as credenciais SMTP no `.env`.

## O que mudou

- **Arquitetura de e-mail** (mesmo padrão do rastreamento — adaptador
  trocável): se `SMTP_HOST` não estiver configurado no `.env`, o sistema
  usa um adaptador que só registra no log — nada quebra, mas nenhum
  e-mail sai de verdade. Assim que você preencher o SMTP, passa a enviar
  de verdade automaticamente, sem mudar nada no código
- **"Esqueci minha senha"** — link na tela de login → pede o e-mail →
  manda um link de redefinição (válido por 1h) → pessoa cria senha nova →
  todas as sessões antigas dela são encerradas por segurança
- Testei os dois adaptadores no sandbox antes de empacotar: o de log não
  lança erro, e o SMTP captura falha de envio internamente sem derrubar o
  fluxo (ex: se a senha do e-mail estiver errada, o pedido de redefinição
  não quebra pro usuário, só fica registrado no log do servidor pra você
  investigar)

## Passo 1 — Achar os dados de SMTP no DirectAdmin

1. Entra no DirectAdmin
2. **E-Mail Accounts** → clique na caixa `admin@kotati.com.br` (ou onde
   quer que apareça "detalhes"/"configurar cliente de e-mail")
3. Anote: **servidor SMTP** (geralmente `mail.kotati.com.br` ou parecido),
   **porta** (normalmente 587 com STARTTLS, às vezes 465 com SSL), e
   confirme que o **usuário** é o e-mail completo (`admin@kotati.com.br`)
   e a **senha** é a mesma da caixa de e-mail

## Passo 2 — Levar o código pro servidor

```bash
scp rental-saas-email.zip deploy@153.75.247.28:~/
```

No servidor:

```bash
cd /srv/rental-app
unzip -o ~/rental-saas-email.zip
```

Se der `Permission denied` no `schema.prisma`:

```bash
sudo chown -R deploy:deploy /srv/rental-app/apps/api/prisma
unzip -o ~/rental-saas-email.zip apps/api/prisma/schema.prisma
```

## Passo 3 — Configurar o `.env`

```bash
nano .env
```

Adicione (ou descomente, se já vieram como exemplo) essas linhas, com os
dados reais do Passo 1:

```env
SMTP_HOST=mail.kotati.com.br
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=admin@kotati.com.br
SMTP_PASS=a-senha-real-dessa-caixa
SMTP_FROM=admin@kotati.com.br
PUBLIC_APP_URL=https://rentovix.kotati.com.br
```

**Se você preferir testar primeiro sem configurar o SMTP** (só pra ver o
fluxo funcionando via log), pode pular esse passo agora e voltar nele
depois — o sistema não quebra sem isso, só não manda e-mail de verdade.

## Passo 4 — Rebuildar a API

```bash
docker compose build api
```

## Passo 5 — Backup antes da migration

```bash
/srv/rental-app/scripts/backup.sh
```

## Passo 6 — Gerar e aplicar a migration

Só tabela nova — não deve pedir confirmação especial.

```bash
docker compose run --rm api npx prisma migrate dev --name password_reset --skip-generate --skip-seed
```

## Passo 7 — Rebuildar o frontend e subir

```bash
docker run --rm -v /srv/rental-app/apps/web:/app -w /app node:22-bookworm-slim \
  sh -c "npm ci && npm run build"
docker compose up -d
```

## Passo 8 — Testar no navegador

1. Na tela de login, clique em **Esqueci minha senha** → informe seu
   e-mail → confirme a mensagem genérica de sucesso
2. **Se ainda não configurou o SMTP**: confira o log da API —
   ```bash
   docker compose logs api --tail 20
   ```
   Deve aparecer um aviso `SMTP não configurado` com o link de
   redefinição impresso no meio do texto — copia esse link e testa o
   Passo 4 abaixo manualmente colando no navegador
3. **Se já configurou o SMTP**: confira a caixa de entrada do e-mail que
   você usou → deve chegar um e-mail de verdade com o link
4. Clique no link (ou cole a URL) → confirme que abre a tela de nova
   senha → defina uma senha nova → confirme a mensagem de sucesso
5. Tente logar com a **senha antiga** → deve falhar
6. Logue com a **senha nova** → deve funcionar
7. Teste um link **expirado ou usado duas vezes** (peça um novo link, use
   um antigo se tiver salvo) → deve dar erro claro, não deixar redefinir

## Passo 9 — Commitar

```bash
cd /srv/rental-app
git add -A
git commit -m "email: smtp real + esqueci minha senha"
git push origin main
```

Isso fecha de vez a Fase 6. Me conta como foi, principalmente se o e-mail
chegou de verdade depois de configurar o SMTP (item 3 do Passo 8).
