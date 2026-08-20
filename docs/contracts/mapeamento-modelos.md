# Mapeamento — Modelos de contrato "Motorista de Aplicativo"

Análise feita antes de implementar, conforme pedido. Documentos de origem:
Contrato de Locação Mensal (Motorista de App), Anexo I (Vistoria), Anexo II
(Termo de Caução), Anexo III (Procuração/Infrações), Anexo IV (Ciência de
Manutenção Preventiva).

## Empresa → dados necessários

| Campo no contrato | Campo no cadastro | Situação (antes desta rodada) |
|---|---|---|
| Razão social, CNPJ | `name`, `cnpj` | já existia |
| Endereço completo | `addressStreet/Number/Complement/Neighborhood/City/State/ZipCode` | **novo** |
| Foro (cidade/estado) | mesmo endereço acima (`addressCity`/`addressState`) | **novo** |

## Cliente → dados necessários

| Campo no contrato | Campo no cadastro | Situação |
|---|---|---|
| Nome, CPF, e-mail, telefone | `name`, `document`, `email`, `phone` | já existia |
| Endereço | `address` | já existia no schema, **mas não aparecia no formulário** — corrigido |
| CNH (número + categoria) | `driverLicenseNumber`, `driverLicenseCategory` | já existia no schema, categoria **não aparecia no formulário** — corrigido |
| Dados bancários/PIX (reembolso de caução) | `bankName`, `bankAgency`, `bankAccount`, `pixKey` | **novo** |

## Veículo → dados necessários

| Campo no contrato | Campo no cadastro | Situação |
|---|---|---|
| Placa, marca, modelo | `plate`, `brand`, `model` | já existia |
| Chassi | `chassis` | já existia no schema, **não aparecia no formulário** — corrigido |
| Valor Tabela FIPE (base da multa de 10%) | `fipeValue` | **novo** |
| Intervalo de manutenção preventiva | `maintenanceIntervalKm` | **novo** (padrão sugerido: 10.000km) |

## Tarifa → dados necessários

| Campo no contrato | Campo no cadastro | Situação |
|---|---|---|
| Valor do aluguel mensal | `monthlyRate` | já existia |
| Limite de KM mensal | `kmAllowancePerMonth` | **novo** (já existia `kmAllowancePerDay`, que é diário — não serve pra essa modalidade) |
| Valor do KM excedente | `extraKmRate` | já existia |
| Valor da caução | `cautionAmount` | **novo** |

## Contrato → campos automáticos

| Campo | Origem | Situação |
|---|---|---|
| Qual modelo de PDF gerar | `Contract.templateType` (`standard` \| `monthly_app_driver`) | **novo** |
| Snapshot do limite de KM, KM excedente e caução no momento da assinatura | `monthlyKmLimitSnapshot`, `extraKmRateSnapshot`, `cautionAmountSnapshot` | **novo** (mesmo padrão já usado em `dailyRateSnapshot`) |

## Anexo I (Vistoria) — zero campos novos

Inteiramente coberto pelo módulo de Vistorias que já existe desde a Fase 3
(`Inspection`: odômetro, combustível, observações; `Damage`: avarias
encontradas; `Document`: fotos). Não precisa de nenhum dado novo — só
formatar em PDF o que já é coletado na entrega/devolução.

## Parte B — concluída

Os 5 documentos completos, implementados em
`monthly-driver-contract-pdf.template.tsx`, gerados num único PDF (8
páginas): contrato principal (8 cláusulas) + Anexo I (vistoria, puxa dados
reais de entrega/devolução quando já registrados, senão mostra campos em
branco pra preencher à mão) + Anexo II (caução, com os dados bancários do
cliente) + Anexo III (procuração) + Anexo IV (manutenção preventiva, com o
cálculo automático de 10% da FIPE quando o veículo tem valor cadastrado).

Testado no sandbox com `pdftotext`/`pdfinfo` antes de empacotar — não só
"compilou", conferi o texto extraído de verdade, os 4 `\f` (quebra de
página) entre os documentos, e os dois cenários (com e sem vistoria/
assinatura preenchidas).

Formulário de Novo Contrato ganhou o seletor "Tipo de contrato" — ao
escolher "Motorista de aplicativo", só mostra tarifas com valor mensal
cadastrado, e exibe o resumo do limite de KM/caução/KM excedente que vai
valer nesse contrato específico.
