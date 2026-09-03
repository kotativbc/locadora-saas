import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  docTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 10 },
  subtitle: { fontSize: 9, color: '#555', marginBottom: 16 },
  sectionTitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 6 },
  clauseTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 130, color: '#555' },
  value: { flex: 1 },
  clause: { marginBottom: 6, textAlign: 'justify', lineHeight: 1.4 },
  small: { fontSize: 8.5, color: '#666' },
  divider: { borderBottom: '1pt dashed #cccccc', marginVertical: 14 },
  checklistItem: { marginBottom: 4, lineHeight: 1.3 },
  paymentRow: { flexDirection: 'row', marginBottom: 3 },
  blank: { borderBottom: '0.5pt solid #999', minWidth: 60 },
  signatureBox: {
    marginTop: 14,
    padding: 12,
    border: '1pt solid #cccccc',
    borderRadius: 4,
  },
  signatureSigned: { color: '#2e7d4f', fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  signaturePending: { color: '#b3432e', fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  signatureLine: { marginTop: 24, borderTop: '1pt solid #333', paddingTop: 4, width: 260 },
});

export interface MonthlyDriverContractPdfData {
  contractId: string;
  company: {
    name: string;
    tradeName: string | null;
    cnpj: string | null;
    addressStreet: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    addressNeighborhood: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressZipCode: string | null;
  };
  customer: {
    name: string;
    document: string;
    documentType: string;
    driverLicenseNumber: string | null;
    driverLicenseCategory: string | null;
    address: string | null; // legado — só usado se os campos estruturados abaixo estiverem vazios
    addressStreet: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    addressNeighborhood: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressZipCode: string | null;
    email: string | null;
    phone: string | null;
    bankName: string | null;
    bankAgency: string | null;
    bankAccount: string | null;
    pixKey: string | null;
  };
  vehicle: {
    plate: string;
    brand: string;
    model: string;
    chassis: string | null;
    fipeValue: string | null;
    maintenanceIntervalKm: number | null;
  };
  contract: {
    startDate: Date;
    endDate: Date;
    monthlyRate: string;
    monthlyKmLimit: number | null;
    extraKmRate: string | null;
    cautionAmount: string | null;
    createdAt: Date;
  };
  signature?: { signedAt: Date; signerIp: string | null; termsHash: string | null } | null;
  inspections: {
    delivery: { performedAt: Date; odometerKm: number; fuelLevel: string; exteriorNotes: string | null } | null;
    return: { performedAt: Date; odometerKm: number; fuelLevel: string; exteriorNotes: string | null } | null;
  };
  rentInstallments: { dueDate: Date; amount: string }[];
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR');
}

function formatCurrency(v: string | null) {
  if (!v) return 'a combinar';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Monta o endereço do cliente a partir dos campos estruturados; cai pro texto livre legado se não tiver nenhum estruturado. */
function formatCustomerAddress(c: MonthlyDriverContractPdfData['customer']): string | null {
  if (c.addressStreet && c.addressCity) {
    const parts = [`${c.addressStreet}${c.addressNumber ? `, ${c.addressNumber}` : ''}`];
    if (c.addressComplement) parts.push(c.addressComplement);
    if (c.addressNeighborhood) parts.push(c.addressNeighborhood);
    parts.push(`${c.addressCity}${c.addressState ? `/${c.addressState}` : ''}`);
    if (c.addressZipCode) parts.push(`CEP ${c.addressZipCode}`);
    return parts.join(', ');
  }
  return c.address; // legado
}

function formatAddress(c: MonthlyDriverContractPdfData['company']) {
  const parts: string[] = [];
  if (c.addressStreet) parts.push(`${c.addressStreet}${c.addressNumber ? `, ${c.addressNumber}` : ''}`);
  if (c.addressComplement) parts.push(c.addressComplement);
  if (c.addressNeighborhood) parts.push(c.addressNeighborhood);
  if (c.addressCity) parts.push(`${c.addressCity}${c.addressState ? `/${c.addressState}` : ''}`);
  if (c.addressZipCode) parts.push(`CEP ${c.addressZipCode}`);
  return parts.length > 0 ? parts.join(', ') : 'não informado no cadastro da empresa';
}

const FUEL_LABELS: Record<string, string> = {
  cheio: '4/4', '3/4': '3/4', '1/2': '2/4', '1/4': '1/4', reserva: 'reserva',
};

export function MonthlyDriverContractPdfDocument({
  contractId,
  company,
  customer,
  vehicle,
  contract,
  signature,
  inspections,
  rentInstallments,
}: MonthlyDriverContractPdfData) {
  const companyLabel = company.tradeName ?? company.name;
  const cityForo = company.addressCity ?? '[cidade não cadastrada]';
  const stateForo = company.addressState ?? '';
  const shortId = contractId.slice(0, 8).toUpperCase();
  const cnhLabel = [customer.driverLicenseNumber, customer.driverLicenseCategory]
    .filter(Boolean)
    .join(' — categoria ');
  const fipeAmount = vehicle.fipeValue ? Number(vehicle.fipeValue) : null;
  const finePenalty10 = fipeAmount ? formatCurrency((fipeAmount * 0.1).toFixed(2)) : null;
  const maintenanceInterval = vehicle.maintenanceIntervalKm ?? 10000;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* ---------------- CONTRATO PRINCIPAL ---------------- */}
        <Text style={styles.title}>CONTRATO DE LOCAÇÃO MENSAL — MODALIDADE MOTORISTA DE APLICATIVO</Text>
        <Text style={styles.subtitle}>Contrato nº {shortId} — Gerado eletronicamente pela plataforma</Text>

        <Text style={styles.clause}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>LOCADOR: </Text>
          {companyLabel}, {company.cnpj ? `CNPJ nº ${company.cnpj}, ` : ''}
          com sede em {formatAddress(company)}.
        </Text>
        <Text style={styles.clause}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>LOCATÁRIO (MOTORISTA): </Text>
          {customer.name}, {customer.documentType} nº {customer.document}
          {cnhLabel ? `, CNH nº ${cnhLabel}` : ''}
          {formatCustomerAddress(customer) ? `, residente em ${formatCustomerAddress(customer)}` : ''}
          {customer.email ? `, e-mail ${customer.email}` : ''}
          {customer.phone ? `, telefone ${customer.phone}` : ''}.
        </Text>
        <Text style={styles.clause}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>VEÍCULO LOCADO: </Text>
          {vehicle.brand} {vehicle.model}, placa {vehicle.plate}
          {vehicle.chassis ? `, chassi ${vehicle.chassis}` : ''}.
        </Text>
        <Text style={styles.clause}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>DADOS DA LOCAÇÃO: </Text>
          Período mínimo: 30 (trinta) dias, com renovação automática salvo manifestação de encerramento por
          qualquer das partes. Início: {formatDate(contract.startDate)}. Franquia mensal de KM:{' '}
          {contract.monthlyKmLimit ?? '[não definida na tarifa]'} km/mês. Valor do aluguel mensal:{' '}
          {formatCurrency(contract.monthlyRate)}. Valor do KM excedente:{' '}
          {formatCurrency(contract.extraKmRate)}.
        </Text>

        {rentInstallments.length > 0 && (
          <>
            <Text style={styles.clauseTitle}>CRONOGRAMA DE PAGAMENTO</Text>
            <Text style={[styles.clause, { marginTop: -2 }]}>
              O valor do aluguel mensal acima será pago nas seguintes datas:
            </Text>
            {rentInstallments.map((inst, i) => (
              <Text key={i} style={styles.paymentRow}>
                {formatDate(inst.dueDate)} – {formatCurrency(inst.amount)}
              </Text>
            ))}
          </>
        )}

        <Text style={styles.clauseTitle}>CLÁUSULA 1 — DO OBJETO E DA AUTORIZAÇÃO ESPECÍFICA DE USO</Text>
        <Text style={styles.clause}>
          1.1. O presente contrato tem por objeto a locação do veículo acima identificado em regime mensal, com
          renovação automática, caso não haja manifestação de encerramento por qualquer das partes.
        </Text>
        <Text style={styles.clause}>
          1.2. O LOCADOR concede ao LOCATÁRIO autorização expressa e específica para utilizar o veículo na
          prestação de serviços de transporte remunerado privado individual de passageiros intermediado por
          aplicativos (ex: Uber, 99).
        </Text>
        <Text style={styles.clause}>
          1.3. O LOCATÁRIO obriga-se a atender a todas as exigências legais, fiscais e regulatórias dos órgãos
          competentes para o exercício da atividade, assumindo integral responsabilidade por eventuais autuações,
          apreensões ou prejuízos gerados ao LOCADOR por irregularidades em seu cadastro como motorista.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 2 — DA QUILOMETRAGEM CONTROLADA E USO SEVERO</Text>
        <Text style={styles.clause}>
          2.1. A presente locação enquadra-se na modalidade de Quilometragem Controlada. O LOCATÁRIO tem direito a
          rodar o limite de {contract.monthlyKmLimit ?? '[não definido]'} km a cada ciclo de 30 dias.
        </Text>
        <Text style={styles.clause}>
          2.2. A quilometragem será aferida sistemicamente via telemetria ou presencialmente. Os quilômetros que
          excederem o limite contratado serão cobrados no fechamento do ciclo mensal, multiplicando-se a
          quantidade excedida pelo valor do KM excedente fixado no preâmbulo ({formatCurrency(contract.extraKmRate)}).
        </Text>
        <Text style={styles.clause}>
          2.3. O LOCATÁRIO reconhece que a atividade de motorista de aplicativo configura Uso Severo do veículo
          (tráfego intenso, motor em marcha lenta por longos períodos), o que resulta em desgaste prematuro de
          peças e exige atenção redobrada do condutor.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 3 — DA MANUTENÇÃO PREVENTIVA OBRIGATÓRIA (CLÁUSULA DE RISCO ZERO)</Text>
        <Text style={styles.clause}>
          3.1. É obrigação exclusiva e indelegável do LOCATÁRIO monitorar a quilometragem do veículo e solicitar
          ao LOCADOR o agendamento da manutenção preventiva sempre que faltarem 1.000 km (um mil quilômetros) para
          atingir o limite estipulado no manual do fabricante (a cada {maintenanceInterval.toLocaleString('pt-BR')}{' '}
          km rodados).
        </Text>
        <Text style={styles.clause}>
          3.2. PENALIDADE GRAVE: caso o LOCATÁRIO ultrapasse a quilometragem de revisão sem levar o veículo à
          oficina indicada, causando a perda da garantia de fábrica ou danos ao motor, incorrerá em multa não
          compensatória de 10% (dez por cento) do valor do veículo (Tabela FIPE)
          {finePenalty10 ? ` — hoje equivalente a ${finePenalty10}` : ''}, além de arcar integralmente com os
          custos da manutenção extraordinária e perda imediata de qualquer proteção contratada.
        </Text>
        <Text style={styles.clause}>
          3.3. É terminantemente proibido continuar rodando com o veículo se luzes de advertência (óleo,
          temperatura, injeção eletrônica) acenderem no painel. A inobservância desta regra configura Mau Uso
          incontestável, sujeitando o LOCATÁRIO ao pagamento integral por danos ao motor apurados por laudo
          técnico.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 4 — TELEMETRIA, MONITORAMENTO E BLOQUEIO REMOTO</Text>
        <Text style={styles.clause}>
          4.1. O veículo é equipado com dispositivos de telemetria/geolocalização (GPS) para aferição de
          quilometragem, monitoramento de velocidade, segurança e gestão da frota.
        </Text>
        <Text style={styles.clause}>
          4.2. O LOCADOR está expressamente autorizado a bloquear o veículo remotamente, imobilizando o motor para
          retomada de posse, nas seguintes hipóteses: a) atraso no pagamento de faturas mensais, quilometragem
          excedente ou multas; b) suspeita de fraude, sublocação (compartilhamento de conta de aplicativo com
          terceiros não autorizados no contrato) ou uso para fins ilícitos; c) desconexão intencional ou violação
          do equipamento de rastreamento; d) descumprimento do chamado para manutenção preventiva obrigatória.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 5 — INFRAÇÕES DE TRÂNSITO E GESTÃO DE MULTAS</Text>
        <Text style={styles.clause}>
          5.1. O LOCATÁRIO é responsável por todas as infrações cometidas no período da locação. O LOCATÁRIO
          nomeia o LOCADOR como seu procurador exclusivo para indicá-lo aos órgãos de trânsito como o condutor
          infrator (ver Anexo III).
        </Text>
        <Text style={styles.clause}>
          5.2. O valor original da multa será acrescido de 20% (vinte por cento) a título de taxa de custo
          administrativo. O LOCADOR debitará este valor imediata e automaticamente do LOCATÁRIO, independente do
          desejo do mesmo de recorrer da infração perante os órgãos públicos.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 6 — PROTEÇÕES E EXCLUSÃO POR MAU USO</Text>
        <Text style={styles.clause}>
          6.1. O LOCATÁRIO contratou a Proteção Básica limitadora de responsabilidade, sujeita ao pagamento de
          coparticipação (franquia) em caso de sinistro (roubo, furto, colisão).
        </Text>
        <Text style={styles.clause}>
          6.2. A proteção será sumária e totalmente cancelada, obrigando o LOCATÁRIO a indenizar 100% dos danos
          causados ao veículo, a terceiros e lucros cessantes, se constatado: a) sublocação ou condução do veículo
          por terceiro não cadastrado neste contrato; b) omissão na comunicação imediata à Polícia (190) e ao
          LOCADOR em caso de sinistro/roubo, ou falta de apresentação do Boletim de Ocorrência em até 24 horas; c)
          embriaguez, uso de entorpecentes ou evasão do local do acidente.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 7 — INADIMPLÊNCIA E APROPRIAÇÃO INDÉBITA</Text>
        <Text style={styles.clause}>
          7.1. O atraso no pagamento do aluguel mensal ou despesas extras sujeitará o LOCATÁRIO a juros de mora de
          1% ao mês, correção monetária pelo IGPM e multa moratória de 10% (dez por cento) sobre o saldo devedor.
        </Text>
        <Text style={styles.clause}>
          7.2. A não devolução do veículo após o término do prazo contratual ou após a notificação de rescisão por
          inadimplência configura apropriação indébita. O LOCADOR adotará as medidas policiais cabíveis e cobrará
          do LOCATÁRIO todas as despesas de busca, apreensão e honorários, além de diárias em dobro pelo período
          de retenção ilegal.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 8 — DO FORO</Text>
        <Text style={styles.clause}>
          8.1. Fica eleito o Foro da Comarca de {cityForo}
          {stateForo ? `/${stateForo}` : ''} para dirimir quaisquer litígios oriundos deste contrato, com exclusão
          de qualquer outro.
        </Text>

        <Text style={[styles.clause, { marginTop: 10 }]}>
          E, por estarem de acordo, assinam de forma física ou eletrônica.
        </Text>
        <Text style={styles.clause}>
          {cityForo}, {formatDate(contract.createdAt)}.
        </Text>

        <View style={styles.signatureBox}>
          {signature?.signedAt ? (
            <>
              <Text style={styles.signatureSigned}>ASSINADO ELETRONICAMENTE</Text>
              <Text style={styles.small}>
                Aceito em {signature.signedAt.toLocaleString('pt-BR')}
                {signature.signerIp ? ` a partir do IP ${signature.signerIp}` : ''}.
              </Text>
              {signature.termsHash && (
                <Text style={styles.small}>Hash de verificação dos termos: {signature.termsHash}</Text>
              )}
            </>
          ) : (
            <Text style={styles.signaturePending}>DOCUMENTO PENDENTE DE ASSINATURA</Text>
          )}
        </View>

        {/* ---------------- ANEXO I — VISTORIA ---------------- */}
        <Text style={styles.docTitle} break>
          ANEXO I — TERMO DE VISTORIA (CHECKLIST DE ENTREGA E DEVOLUÇÃO)
        </Text>
        <Text style={styles.subtitle}>
          Contrato nº {shortId} — Placa {vehicle.plate}
        </Text>

        <Text style={styles.sectionTitle}>ENTREGA</Text>
        {inspections.delivery ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Data/hora</Text>
              <Text style={styles.value}>{inspections.delivery.performedAt.toLocaleString('pt-BR')}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Odômetro</Text>
              <Text style={styles.value}>{inspections.delivery.odometerKm.toLocaleString('pt-BR')} km</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Combustível</Text>
              <Text style={styles.value}>{FUEL_LABELS[inspections.delivery.fuelLevel] ?? inspections.delivery.fuelLevel}</Text>
            </View>
            {inspections.delivery.exteriorNotes && (
              <View style={styles.row}>
                <Text style={styles.label}>Observações</Text>
                <Text style={styles.value}>{inspections.delivery.exteriorNotes}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.checklistItem}>
            Data/hora: ___/___/______ às ___:___ | KM: ______________ | Combustível: [ ] 1/4 [ ] 2/4 [ ] 3/4 [ ] 4/4
            {'\n'}(vistoria de entrega ainda não registrada no sistema — preencher manualmente)
          </Text>
        )}

        <Text style={styles.sectionTitle}>DEVOLUÇÃO</Text>
        {inspections.return ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Data/hora</Text>
              <Text style={styles.value}>{inspections.return.performedAt.toLocaleString('pt-BR')}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Odômetro</Text>
              <Text style={styles.value}>{inspections.return.odometerKm.toLocaleString('pt-BR')} km</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Combustível</Text>
              <Text style={styles.value}>{FUEL_LABELS[inspections.return.fuelLevel] ?? inspections.return.fuelLevel}</Text>
            </View>
            {inspections.return.exteriorNotes && (
              <View style={styles.row}>
                <Text style={styles.label}>Observações</Text>
                <Text style={styles.value}>{inspections.return.exteriorNotes}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.checklistItem}>
            Data/hora: ___/___/______ às ___:___ | KM: ______________ | Combustível: [ ] 1/4 [ ] 2/4 [ ] 3/4 [ ] 4/4
            {'\n'}(vistoria de devolução ainda não registrada no sistema — preencher manualmente)
          </Text>
        )}

        <Text style={styles.sectionTitle}>ITENS INSPECIONADOS (marcar OK ou AVARIADO na entrega e na devolução)</Text>
        <Text style={styles.checklistItem}>[ ] Lataria, pintura e para-choques (anexar fotos 360º ao sistema)</Text>
        <Text style={styles.checklistItem}>[ ] Vidros, retrovisores, faróis e lanternas</Text>
        <Text style={styles.checklistItem}>[ ] Pneus (incluindo estepe), calotas/rodas de liga</Text>
        <Text style={styles.checklistItem}>[ ] Interior: estofamento, painel, odores e higiene</Text>
        <Text style={styles.checklistItem}>[ ] Ferramentas (macaco, chave de roda, triângulo) e documentos (CRLV)</Text>

        <Text style={[styles.clause, { marginTop: 10 }]}>
          Declaro que recebi o veículo nas condições exatas assinaladas acima e fotografadas. Concordo que o
          retorno com sujeira excessiva gerará taxa de lavagem especial, e o retorno com nível de combustível
          inferior gerará cobrança pelo litro faltante mais taxa de serviço. Caso o veículo seja devolvido sujo
          impossibilitando a vistoria imediata, concordo que a vistoria válida será a realizada pelo Locador após
          a lavagem.
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
          <Text style={styles.signatureLine}>Assinatura — Entrega</Text>
          <Text style={styles.signatureLine}>Assinatura — Devolução</Text>
        </View>

        {/* ---------------- ANEXO II — TERMO DE CAUÇÃO ---------------- */}
        <Text style={styles.docTitle} break>
          ANEXO II — TERMO DE CAUÇÃO (DEPÓSITO DE SEGURANÇA)
        </Text>
        <Text style={styles.subtitle}>
          Contrato nº {shortId} — Placa {vehicle.plate}
        </Text>

        <Text style={styles.clause}>
          Pelo presente termo, eu, {customer.name}, qualificado(a) no Contrato Principal de Locação de Veículos,
          declaro ter realizado nesta data o pagamento/transferência da quantia exata de{' '}
          {formatCurrency(contract.cautionAmount)} em favor de {companyLabel}, a título de Depósito de Segurança
          (Caução).
        </Text>
        <Text style={styles.clause}>Declaro estar ciente e concordo irrevogavelmente com as seguintes condições:</Text>

        <Text style={styles.clauseTitle}>1. DA RETENÇÃO E COMPENSAÇÃO DE VALORES</Text>
        <Text style={styles.clause}>
          Autorizo de forma expressa, irretratável e incondicional que a Locadora utilize o valor integral ou
          parcial deste Depósito de Segurança para reter, compensar e quitar eventuais débitos em aberto apurados
          durante a vigência ou após o encerramento da locação.
        </Text>

        <Text style={styles.clauseTitle}>2. DAS DESPESAS AUTORIZADAS PARA ABATIMENTO IMEDIATO</Text>
        <Text style={styles.clause}>
          A Locadora fica plenamente autorizada a deduzir da caução, sem necessidade de notificação prévia ou
          interpelação judicial, os valores correspondentes a: a) multas por infrações de trânsito cometidas
          durante o período da minha posse do veículo, acrescidas de 20% a título de taxa de custo administrativo;
          b) valor da coparticipação (franquia) em caso de sinistros, ou valores integrais de conserto e reposição
          de peças em caso de avarias identificadas no checklist de devolução; c) indenizações integrais por
          constatação de uso indevido, mau uso ou negligência que anulem a proteção do veículo; d) diárias
          adicionais, horas extras, multas por devolução antecipada ou em local não autorizado; e) reposição de
          combustível faltante e cobrança de taxas de lavagem (simples ou especial/completa) caso o veículo seja
          devolvido fora dos padrões; f) custos com despachantes, guinchos, pátios ou advogados em caso de
          apreensão do veículo pelas autoridades.
        </Text>

        <Text style={styles.clauseTitle}>3. DO REEMBOLSO DO SALDO REMANESCENTE</Text>
        <Text style={styles.clause}>
          Se após a devolução do veículo e a devida apuração de despesas restar algum saldo da caução a meu favor,
          a Locadora realizará o reembolso exclusivamente na conta bancária de minha titularidade:
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Banco</Text>
          <Text style={styles.value}>{customer.bankName ?? 'não informado no cadastro'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Agência</Text>
          <Text style={styles.value}>{customer.bankAgency ?? 'não informado no cadastro'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Conta</Text>
          <Text style={styles.value}>{customer.bankAccount ?? 'não informado no cadastro'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Chave PIX</Text>
          <Text style={styles.value}>{customer.pixKey ?? 'não informado no cadastro'}</Text>
        </View>
        <Text style={styles.clause}>
          Reconheço que a liberação da caução ou de seu saldo remanescente poderá ficar retida por até 45
          (quarenta e cinco) dias após a devolução do veículo, tempo necessário para a verificação e processamento
          de eventuais multas de trânsito nos sistemas dos órgãos autuadores municipais, estaduais e federais.
        </Text>

        <Text style={styles.clauseTitle}>4. DA COBRANÇA DO EXCEDENTE DA PROTEÇÃO/CAUÇÃO</Text>
        <Text style={styles.clause}>
          Tenho plena ciência de que a caução de {formatCurrency(contract.cautionAmount)} é apenas uma garantia
          inicial. Todo e qualquer valor de prejuízo, avaria, multa ou despesa que venha a superar este limite
          será de minha única, exclusiva, integral e ilimitada responsabilidade. Comprometo-me a quitar o saldo
          devedor excedente à vista, constituindo este termo e o Contrato Principal dívida líquida, certa e
          exigível (título executivo extrajudicial).
        </Text>

        <Text style={styles.clause}>
          {cityForo}, {formatDate(contract.createdAt)}.
        </Text>
        <Text style={styles.signatureLine}>
          {customer.name} (Locatário/Declarante) — {customer.documentType} {customer.document}
        </Text>

        {/* ---------------- ANEXO III — PROCURAÇÃO / INFRAÇÕES ---------------- */}
        <Text style={styles.docTitle} break>
          ANEXO III — TERMO DE RESPONSABILIDADE POR INFRAÇÕES DE TRÂNSITO E INDICAÇÃO DE CONDUTOR
        </Text>
        <Text style={styles.subtitle}>(Procuração para o DETRAN) — Contrato nº {shortId}</Text>

        <Text style={styles.clause}>
          Pelo presente instrumento, eu, {customer.name}, qualificado no Contrato Principal, na condição de
          possuidor direto do veículo placa {vehicle.plate} no período de {formatDate(contract.startDate)} até a
          sua efetiva devolução, assumo integral e exclusiva responsabilidade por toda e qualquer infração de
          trânsito (esfera municipal, estadual ou federal) cometida com o referido veículo neste período.
        </Text>
        <Text style={styles.clause}>
          Neste ato, nomeio e constituo {companyLabel} como minha bastante procuradora, com poderes específicos
          para me representar perante o DETRAN, DER, DNIT, Prefeituras e demais órgãos autuadores de trânsito.
        </Text>
        <Text style={styles.clause}>
          A outorgada (Locadora) fica autorizada a preencher, assinar e protocolar o Formulário de Identificação
          de Condutor Infrator (FICI) em meu nome, ou em nome do condutor adicional formalmente cadastrado no
          contrato, transferindo para minha CNH ({cnhLabel || 'nº não informado no cadastro'}) a pontuação
          decorrente das infrações cometidas no período da locação.
        </Text>

        <Text style={[styles.clause, { marginTop: 20 }]}>Assinatura (igual à CNH): _____________________________</Text>
        <Text style={styles.clause}>Data: {formatDate(contract.createdAt)}</Text>

        {/* ---------------- ANEXO IV — MANUTENÇÃO PREVENTIVA ---------------- */}
        <Text style={styles.docTitle} break>
          ANEXO IV — TERMO DE CIÊNCIA DE MANUTENÇÃO PREVENTIVA
        </Text>
        <Text style={styles.subtitle}>Contrato nº {shortId} — Placa {vehicle.plate}</Text>

        <Text style={styles.clause}>
          Eu, {customer.name}, declaro estar plenamente ciente de que, por utilizar o veículo em regime de
          transporte de aplicativo (Uso Severo), sou o único responsável por acompanhar diariamente o hodômetro do
          veículo placa {vehicle.plate}. Comprometo-me a contatar a Locadora sempre que o veículo atingir
          quilometragem múltipla de {maintenanceInterval.toLocaleString('pt-BR')} km (ex:{' '}
          {maintenanceInterval.toLocaleString('pt-BR')}, {(maintenanceInterval * 2).toLocaleString('pt-BR')},{' '}
          {(maintenanceInterval * 3).toLocaleString('pt-BR')}).
        </Text>
        <Text style={styles.clause}>
          Estou ciente de que passar da quilometragem exata causará a perda da garantia de fábrica do motor, o que
          me sujeitará a uma multa indenizatória de 10% do valor da Tabela FIPE do veículo
          {finePenalty10 ? ` (hoje equivalente a ${finePenalty10})` : ''}, debitada imediatamente, além da cobrança
          do conserto integral caso o motor venha a fundir ou apresentar desgaste por falta de troca de óleo no
          prazo.
        </Text>

        <Text style={[styles.clause, { marginTop: 20 }]}>Assinatura: _____________________________</Text>
        <Text style={styles.clause}>Data: {formatDate(contract.createdAt)}</Text>
      </Page>
    </Document>
  );
}
