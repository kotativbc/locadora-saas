# Modelos de Contrato — Motorista de Aplicativo

**Status: concluído, deployado e validado em produção.**

## Escopo

Modalidade nova de contrato ("Motorista de aplicativo") disponível pra
todas as empresas da plataforma, com geração automática de 5 documentos
legais num único PDF:

- Contrato principal (8 cláusulas — objeto, KM controlado, manutenção
  preventiva obrigatória, telemetria/bloqueio remoto, infrações de
  trânsito, proteções, inadimplência, foro)
- Anexo I — Termo de Vistoria (puxa dados reais de entrega/devolução
  quando já registrados; senão, campos em branco pra preencher à mão)
- Anexo II — Termo de Caução (com dados bancários/PIX do cliente)
- Anexo III — Procuração de infrações de trânsito
- Anexo IV — Ciência de manutenção preventiva (com cálculo automático de
  10% da Tabela FIPE)

## Campos novos nos cadastros

- Empresa: endereço completo
- Cliente: endereço (já existia, não aparecia no formulário — corrigido),
  categoria da CNH (mesma situação), dados bancários/PIX (novo)
- Veículo: chassi (já existia, corrigido), valor FIPE e intervalo de
  manutenção (novos)
- Tarifa: limite de KM mensal e valor da caução (novos — o valor mensal e
  KM excedente já existiam)

Tudo opcional — cadastros existentes continuam funcionando normalmente.

## Como usar

Ao criar um contrato, escolher "Motorista de aplicativo" no tipo — só
aparecem tarifas com valor mensal cadastrado. O PDF de 8 páginas é gerado
ao clicar em "PDF" na lista de contratos, igual ao modelo padrão.

## Documentação

`docs/contracts/mapeamento-modelos.md` — mapeamento completo de qual
campo do contrato vem de qual campo do cadastro (feito antes de
implementar, conforme pedido).
