# Fase 2b — Contratos, PDF, Assinatura interna

**Status: concluída e validada em produção no servidor real, fluxo completo.**

## Escopo implementado

- **Contratos**: criação (cliente + veículo + tarifa cadastrada ou diária
  avulsa + datas), cálculo automático do valor total
- **Disponibilidade por agenda, não por status fixo**: criar um contrato não
  depende mais do veículo estar "disponível" — depende de não haver outro
  contrato (rascunho/aguardando assinatura/ativo) do mesmo veículo com datas
  sobrepostas. Status do veículo (`available`/`maintenance`/`inactive`) agora
  só controla se ele está em circulação de forma geral
- **PDF do contrato**: gerado em Node com `@react-pdf/renderer` (sem headless
  browser), com cláusulas gerais e bloco de assinatura dinâmico
- **Assinatura interna**: link público de uso único (token de 32 bytes,
  expira em 48h) — o cliente não tem login, então assina por esse link
  (ex: tablet do balcão). Ao aceitar: grava hash SHA-256 dos termos + IP +
  timestamp, contrato vira "Ativo", numa transação
- Frota ganhou edição de status manual (não existia antes, e ficou necessária
  com a mudança acima)

## Testes executados e evidência real (fluxo completo em produção)

| Teste | Resultado |
|---|---|
| Criar contrato (cliente + veículo + tarifa + datas) | OK |
| Ver PDF em rascunho ("pendente de assinatura") | OK |
| Gerar link de assinatura | OK (após corrigir bug, ver abaixo) |
| Abrir link em aba anônima (simulando o cliente) | OK |
| Aceitar assinatura | OK |
| Contrato muda para "Ativo" | OK |
| PDF pós-assinatura mostra hash/IP/timestamp | OK |
| Criar 2º contrato pro mesmo veículo em datas livres (antes do 1º) | OK |
| Criar 2º contrato com datas sobrepostas ao 1º | bloqueado com mensagem clara, como esperado |
| Upload de logo da empresa | OK (após corrigir bug, ver abaixo) |

## Bugs encontrados e corrigidos durante o uso real

1. **Migration da Fase 2b nunca tinha sido aplicada** — operacional, não de
   código: os passos 2–6 do runbook foram pulados antes do primeiro teste.
2. **Link de assinatura vinha sem o token** — o frontend buscava o token
   fazendo uma segunda chamada (`GET /contracts/:id`) que não inclui os dados
   de assinatura; corrigido pra usar o token que a própria resposta do
   `POST .../signature-link` já devolve.
3. **Modelo de disponibilidade errado** (o mais importante): o veículo virava
   "Locado" no instante da assinatura, não na data de início do contrato —
   um contrato assinado hoje pra retirada só daqui a uma semana já travava o
   veículo pra qualquer coisa, inclusive datas anteriores. Corrigido
   trocando a checagem por status fixo por checagem de conflito de datas
   contra outros contratos do mesmo veículo.
4. **`EACCES: permission denied` ao subir logo/documentos** — mesma causa
   raiz das duas vezes anteriores (migrations, schema.prisma): UID do
   `appuser` do container (1001) sem permissão em pastas novas criadas pelo
   `deploy` no host. Dessa vez em `/srv/rental-data/uploads`. Corrigido com
   `chmod o+x` na pasta pai (só permissão de atravessar) e `chown -R 1001:1001`
   na pasta de uploads especificamente.

## Débito técnico anotado (não bloqueia, mas vale resolver numa pausa)

O problema de permissão do item 4 já apareceu **três vezes** (migrations na
Fase 1, schema.prisma na Fase 2a, uploads agora) com a mesma causa: UID do
`deploy` no host não bate com o UID do `appuser` dentro do container. Toda
vez que uma pasta nova em `/srv/rental-data` precisa ser escrita pelo
container, esse mesmo problema pode se repetir. Vale, numa fase de
manutenção, padronizar isso de vez (ex: rodar o container com o mesmo UID do
`deploy`, ou usar um grupo compartilhado com `setgid`) em vez de corrigir
pasta por pasta conforme aparece.

## Próxima fase

Fase 3: vistorias, entrega, devolução, avarias, manutenção.
