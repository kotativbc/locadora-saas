# Fase 5 — Financeiro Gerencial e Relatórios

**Status: concluída e validada em produção no servidor real.**

## Escopo implementado

- **Lançamentos** (`Charge`): nascem automaticamente quando um contrato é
  assinado (aluguel), ou quando uma avaria/multa é marcada "cobrar do
  cliente" (avaria exige custo estimado preenchido; multa sempre tem valor).
  Também aceita lançamento manual (sem vínculo, pra evitar conflito de
  permissão com o papel Financeiro, que não tem acesso a Clientes/Contratos)
- **Despesas** (`Expense`): registro manual por categoria (manutenção,
  combustível, seguro, outro), opcionalmente vinculada a um veículo
- **Relatórios**: dashboard com a receber / recebido / despesas / saldo,
  contagem de frota e contratos ativos, e detalhamento por tipo de lançamento
- Nenhuma permissão nova — reaproveita `finance.manage` e `reports.view`
  (Fase 1)

## Testes executados e evidência real (produção)

Todos os 7 itens do roteiro de teste confirmados: relatório inicial,
lançamento automático de aluguel na assinatura, marcar como pago e ver o
saldo atualizar, lançamento automático de avaria com custo, lançamento
automático de multa, despesa refletindo no saldo, lançamento manual.

## Bug encontrado e corrigido após o deploy

**Botão "Copiar" do link de assinatura não funcionava** — mesma causa raiz
de bugs anteriores (cookie `Secure`, rastreamento): `navigator.clipboard`
só existe em contexto seguro (HTTPS/localhost); em HTTP puro (modo IP atual)
a API nem existe no navegador. Corrigido com fallback via
`document.execCommand('copy')` (funciona em HTTP) + feedback visual de
sucesso/falha, e uma mensagem clara caso nem o fallback funcione.

## Próxima fase

Fase 6: domínio + HTTPS (soucore.com.br) e e-mail (usando o serviço do
provedor onde o domínio está hospedado, sem servidor de e-mail próprio).
