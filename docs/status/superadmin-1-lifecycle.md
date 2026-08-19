# Super Admin — Item 1: Ciclo de vida de empresa

**Status: concluído e validado em produção.**

## Escopo

- `Company.active` (boolean) substituído por `Company.status` — 8 estados
  (Pendente, Em teste, Ativa, Em atraso, Suspensa, Cancelada, Arquivada,
  Bloqueada por segurança) + `statusReason`
- Tabela `company_status_events` — histórico append-only de toda mudança
  de estado
- Transições validadas contra lista central (`company-status.constants.ts`)
  — não dá pra pular estados
- Motivo obrigatório pra Suspensa/Cancelada/Bloqueada por segurança
- **Login bloqueia de verdade** quando a empresa está num estado bloqueante
  — corrigiu um bug real: suspender uma empresa antes não impedia nada na
  prática

## Testes confirmados em produção pelo usuário

- Suspender sem motivo → bloqueado, pede motivo
- Suspender com motivo → selo fica vermelho, motivo aparece na lista
- Login do admin da empresa suspensa → barrado com mensagem clara
- Reativar → login volta a funcionar
- Histórico mostra as duas mudanças com data, de/pra e motivo

## Próximo item

Item 2 + 3: página de detalhe da empresa (consumo, histórico) com gestão
de usuários de qualquer empresa (ver/desativar/redefinir senha).
