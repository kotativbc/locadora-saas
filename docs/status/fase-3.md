# Fase 3 — Vistorias, Entrega, Devolução, Avarias, Manutenção

**Status: concluída e validada em produção no servidor real, fluxo completo.**

## Escopo implementado

- **Vistorias** (`Inspection`): registro único reusado pra entrega e
  devolução (campo `type`), com odômetro, nível de combustível e observações
- **Entrega**: só permitida em contrato "Ativo" ainda não entregue; grava
  `contract.deliveredAt`
- **Devolução**: só permitida após entrega registrada e ainda não devolvido;
  grava `contract.returnedAt` e muda o contrato pra "Concluído" — que já
  libera o veículo pra outras datas automaticamente (reaproveitando a lógica
  de conflito de agenda da Fase 2b, sem precisar de mais nenhuma mudança)
- **Validação de odômetro**: nunca aceita um valor menor que o já registrado
  no veículo
- **Avarias** (`Damage`): cadastro avulso por veículo, com gravidade, custo
  estimado e se é cobrada do cliente; fluxo de abrir/resolver
- **Manutenção** (`Maintenance`): registro por veículo, independente de
  contrato, com tipo (preventiva/corretiva), custo e fornecedor
- Nenhuma permissão nova no RBAC — reaproveitou `contracts.manage` (vistorias)
  e `fleet.manage` (avarias/manutenção)

## Testes executados e evidência real (fluxo completo em produção)

Todos os itens do roteiro de teste do runbook confirmados pelo usuário:

| Teste | Resultado |
|---|---|
| Registrar entrega de contrato ativo | OK |
| Coluna "Entrega/Devolução" atualiza, botão vira "Registrar devolução" | OK |
| Registrar devolução | OK |
| Contrato muda pra "Concluído" | OK |
| Cadastrar avaria, marcar como resolvida | OK |
| Cadastrar manutenção | OK |
| Tentar devolver contrato já devolvido → erro claro (não 500) | OK |
| Tentar entrega com odômetro menor que o atual → rejeitado com mensagem clara | OK |

## Nota sobre "Reservas" (item original do plano de fases)

O plano original desta fase incluía "reservas" como item separado. Na
prática, um contrato em "Rascunho" ou "Aguardando assinatura" já cumpre essa
função — ele bloqueia a agenda do veículo pra aquele período (checagem de
conflito de datas da Fase 2b) sem precisar virar uma entidade own. Não foi
criada uma entidade `Reservation` separada por ser redundante com o que
`Contract` já faz.

## Próxima fase

Fase 4: sinistros, multas (cadastro manual) e rastreamento (manual/mock),
conforme já combinado.
