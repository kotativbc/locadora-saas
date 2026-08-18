# Fase 4 — Sinistros, Multas, Rastreamento

**Status: concluída e validada em produção no servidor real.**

## Escopo implementado

- **Sinistros** (`Claim`): tipo (acidente/roubo-furto/incêndio/outro), data,
  local, descrição, nº do B.O., terceiros envolvidos, custo estimado,
  fluxo de status (aberto → em andamento → resolvido → fechado)
- **Multas** (`Fine`): cadastro manual, sem integração com nenhum órgão
  oficial — data da infração, vencimento, valor, nº do AIT, se cobra do
  cliente, status (pendente/paga/contestada)
- **Rastreamento**: implementado como adapter — interface `TrackingAdapter`
  (`getLatestPosition`, `getHistory`) com uma única implementação hoje,
  `ManualTrackingAdapter`, conectada via token de injeção (`TRACKING_ADAPTER`).
  Um rastreador real no futuro só precisa de uma nova classe implementando a
  mesma interface, trocando um provider — nada mais no sistema muda.
  Suporta posição por coordenadas ou por descrição livre do local.
- `Document` ganhou um quarto tipo de dono (`CLAIM`, fotos de sinistro)
- Nenhuma permissão nova no RBAC — sinistros/multas usam `contracts.manage`,
  rastreamento usa `fleet.manage`

## Testes executados e evidência real (produção)

| Teste | Resultado |
|---|---|
| Cadastrar sinistro e mudar status | OK |
| Cadastrar multa, valor formatado em R$, mudar status pra "Paga" | OK |
| Rastreamento: veículos aparecem, maioria "Sem registro" | OK |
| Registrar posição por descrição de local | OK |
| Registrar posição por coordenadas | OK |
| Histórico mostra os registros, mais recente primeiro | OK |

## Próxima fase

Fase 5: financeiro gerencial e relatórios (é onde os campos "cobrar do
cliente" de avarias/multas finalmente viram lançamento de verdade).
