# Painel Super Admin — Rentovix

## Contexto

Isso nasceu de um pedido por uma spec de painel Super Admin genérica de
SaaS enterprise (MFA, tickets/SLA, webhooks, gateway de pagamento,
integração WhatsApp/SMS/fiscal, feature flags, config versionada,
quarentena de arquivo, modo de emergência, suíte de testes completa,
6 documentos). Essa spec foi conscientemente recusada: descreve o painel
de controle de uma plataforma com dezenas/centenas de clientes pagantes e
uma equipe cuidando disso — não bate com a realidade de "um operador, um
servidor de 1 vCPU, deploy manual por zip". Boa parte do que a spec pedia
também contradizia decisões explícitas tomadas lá no início do projeto
(sem gateway de pagamento, sem WhatsApp/SMS, sem API fiscal).

No lugar, foi combinada uma versão real e proporcional: 7 itens, todos
implementados, testados em produção e comitados.

## O que existe

### 1. Ciclo de vida de empresa
`Company.status` — 8 estados (Pendente, Em teste, Ativa, Em atraso,
Suspensa, Cancelada, Arquivada, Bloqueada por segurança), com transições
validadas contra uma lista central (`company-status.constants.ts`), motivo
obrigatório pros estados sensíveis, e histórico append-only
(`company_status_events`). **O login bloqueia de verdade** quando a
empresa está num estado bloqueante — checado tanto no login quanto em
todo refresh de sessão.

### 2. Página de detalhe da empresa
`/empresas/:id` — consumo (usuários, veículos, clientes, contratos),
histórico de estado, plano atual, e a lista de usuários daquela empresa.

### 3. Usuários de qualquer empresa (suporte)
Desativar/reativar usuário de qualquer empresa (revoga sessão na hora) e
redefinir senha (gera senha temporária, mostrada em texto puro uma única
vez — nunca fica guardada nem logada).

### 4. Planos com limite
`Plan` — limite de veículos e usuários por plano, checagem **centralizada**
num único serviço (`PlanLimitsService`), chamado por Frota e Usuários
antes de criar. Sem plano atribuído = sem limite.

### 5. Status dos backups
Lê a pasta `/srv/rental-data/backups` (já gerada pelo `backup.sh` +
systemd timer desde a Fase 1) e mostra se está em dia ou atrasado, com
histórico das últimas execuções.

### 6. Suporte "entrar como" (somente leitura)
Sessão de 10 minutos, sem refresh próprio, que dá ao Super Admin acesso de
visualização a qualquer empresa sem precisar da senha de ninguém. O
"somente leitura" é garantido por um guard no servidor
(`ImpersonationReadOnlyGuard`) que bloqueia qualquer método que não seja
GET/HEAD/OPTIONS quando a sessão tem a marca de suporte — não é uma
restrição só da interface. Banner visível em toda tela durante a sessão,
início registrado na auditoria.

### 7. Relatórios de crescimento da plataforma
`/crescimento` — total de empresas/usuários/veículos/contratos na
plataforma inteira, empresas cadastradas por mês (últimos 12 meses),
distribuição por estado e por plano.

## Auditoria

Existe desde a Fase 1 (`AuditLogService`), ganhou tela de visualização
junto com este painel. Super Admin vê o log de toda a plataforma; qualquer
outro usuário só vê o da própria empresa.

## O que ficou de fora, de propósito

MFA, tickets/SLA, webhooks, integrações de pagamento/WhatsApp/SMS/fiscal,
feature flags, configuração global versionada com rollback, quarentena de
arquivo, modo de emergência, dashboard de saúde de infraestrutura, suíte
de testes automatizados completa. Nenhum desses itens está descartado pra
sempre — se o negócio crescer a ponto de fazerem sentido, é uma conversa
nova, com escopo pensado pro tamanho que a plataforma tiver naquele
momento.
