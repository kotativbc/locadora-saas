# Identidade visual Rentovix — Parte 1

## Referência do domínio
Painel de instrumentos de veículo: leituras claras, fundo calmo, cor só
onde precisa dizer algo. Nada de decoração gratuita.

## Paleta (com racional ergonômico, não achismo)

| Token | Hex | Uso | Por quê |
|---|---|---|---|
| `--rtv-canvas` | `#F5F7FA` | fundo da página | branco puro cansa mais a vista em uso prolongado (ergonomia de tela) |
| `--rtv-surface` | `#FFFFFF` | cards | reservado só pra superfícies elevadas, cria profundidade sutil |
| `--rtv-ink-900` | `#171B24` | texto | quase-preto, não preto puro — menos contraste agressivo |
| `--rtv-navy-900` | `#16213E` | marca primária | menu, cabeçalhos, botão primário |
| `--rtv-amber-500` | `#E08A3C` | acento assinatura | só em CTA e destaques — usado com escassez de propósito |
| `--rtv-teal-500` | `#0E7C86` | acento secundário | links, equilíbrio quente/frio |
| `--rtv-success` | `#1F8A5F` | status positivo | pago, ativo, disponível, resolvida |
| `--rtv-warning` | `#C9821B` | status de atenção | pendente, aguardando |
| `--rtv-danger` | `#C13B2E` | status negativo | cancelado, erro |

Todos os status usam fundo suave (`*-bg`) + texto colorido, nunca cor
pura numa área grande — reduz fadiga visual em uso de horas.

## Tipografia
Fonte de sistema (mesma decisão desde a Fase 1 — zero dependência
externa, coerente com o resto do projeto self-hosted). Escala e peso mais
deliberados nesta rodada; números monetários e placas usam
`font-variant-numeric: tabular-nums` — leitura de instrumento, os dígitos
alinham verticalmente nas tabelas.

## Elemento de assinatura: "waypoint"
Um ponto ligado a outro por uma linha tracejada — rota até um destino.
Aparece em três lugares: o glifo da marca (`BrandMark.tsx`), o indicador
de item ativo no menu (pontinho âmbar + linha), e o "risquinho" sob os
títulos de página. Não é decoração: o produto rastreia frota, faz sentido
literal com o assunto.

## O que mudou nesta rodada (Parte 1)

- CSS inteiro (`styles.css`) — todas as classes existentes preservadas,
  só tokens/visual mudaram, nenhuma estrutura quebrada
- Menu lateral: agrupado por domínio (Operação / Pós-locação / Financeiro
  / Administração — reflete os grupos de permissão que já existiam),
  ícones (`lucide-react`, dependência de build, não serviço externo)
- Dashboard (Home) — antes um texto estático, agora mostra KPIs (reusando
  `/reports/financial-summary`, já existente) e atalhos por permissão
- Login e tela pública de assinatura — marca Rentovix aplicada
- Badge de status colorido (`StatusBadge.tsx`) aplicado em Contratos e
  Avarias — só onde o status é só exibido, não editável via `<select>`

## O que ficou pra Parte 2 (se quiser seguir)

- Padronizar os `<select>` de status editável (Frota, Sinistros, Multas,
  Lançamentos) com a mesma linguagem visual dos badges, sem perder a
  interatividade
- Estados vazios ilustrados (`.empty-state` já existe no CSS, ainda não
  aplicado em nenhuma tela)
- Refino página a página (formulários mais longos, ex: Novo Contrato,
  poderiam ganhar agrupamento em etapas)
- Considerar modo escuro — os tokens já são variáveis CSS, então é
  tecnicamente simples adicionar depois sem retrabalho
