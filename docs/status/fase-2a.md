# Fase 2a — Frota, Clientes, Documentos, Tarifas

**Status: concluída e validada em produção no servidor real.**

## Escopo implementado

- **Frota**: cadastro de veículos (placa única por empresa, marca, modelo,
  categoria, status, odômetro), escopado por empresa
- **Clientes**: cadastro de locatários (CPF/CNPJ único por empresa, CNH,
  contato), escopado por empresa
- **Documentos**: módulo genérico e privado para anexar arquivos a clientes
  ou veículos (CNH, CRLV, RG etc.) — nunca servidos estaticamente, sempre
  via endpoint autenticado com checagem de tenant
- **Tarifas**: planos de preço por categoria de veículo ou por veículo
  específico (diária/semanal/mensal)
- RBAC: 2 permissões novas (`customers.manage`, `rates.manage`); Admin da
  Empresa ganha as duas, Gestor de Frota ganha tarifas, Atendente ganha
  clientes
- Frontend: páginas de Frota, Clientes e Tarifas; menu lateral atualizado
  por permissão

## Testes executados e evidência real (servidor de produção)

| Teste | Resultado |
|---|---|
| `docker compose build api` | build limpo após corrigir schema.prisma desatualizado (ver bug abaixo) |
| `prisma migrate dev --name fleet_customers_documents_rates` | migration gerada e aplicada |
| `npm run seed` | permissões/papéis novos aplicados (idempotente) |
| `docker compose ps` | `api` e `db` sem porta publicada; só `caddy` exposto |
| Menus Frota/Clientes/Tarifas visíveis no navegador | OK |
| Cadastro de veículo (placa, marca, modelo, categoria) | OK |
| Cadastro de cliente (nome, CPF) | OK |
| Cadastro de tarifa vinculada a categoria/veículo, valor em R$ | OK |

## Bug encontrado e corrigido durante o deploy

**`chown` da Fase 1 bloqueou a atualização do `schema.prisma`.** Na Fase 1,
`chown -R 1001:1001 apps/api/prisma` mudou o dono de toda a pasta pro UID do
container — isso incluiu o `schema.prisma`, que só precisa ser *lido* pelo
container, não escrito. Quando o `unzip` da Fase 2a tentou sobrescrevê-lo, o
usuário `deploy` não tinha mais permissão, e o arquivo antigo (sem os
modelos novos) ficou para trás silenciosamente — só os erros de tipo no
`npm run build` expuseram o problema.

Correção: `schema.prisma` volta a pertencer ao `deploy` (só leitura pelo
container); só a subpasta `migrations/` continua com dono `1001:1001` (onde
o container realmente precisa escrever).

## Próxima fase

Fase 2b: contratos, geração de PDF do contrato e assinatura interna
configurável (aceite por clique com hash/IP/timestamp).
