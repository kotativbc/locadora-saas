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
  checklistItem: { marginBottom: 4, lineHeight: 1.3 },
  signatureBox: { marginTop: 14, padding: 12, border: '1pt solid #cccccc', borderRadius: 4 },
  signatureSigned: { color: '#2e7d4f', fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  signaturePending: { color: '#b3432e', fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  signatureLine: { marginTop: 24, borderTop: '1pt solid #333', paddingTop: 4, width: 260 },
  paymentRow: { flexDirection: 'row', marginBottom: 3 },
});

export interface ProtectedContractPdfData {
  contractId: string;
  company: {
    name: string;
    tradeName: string | null;
    cnpj: string | null;
    addressStreet: string | null;
    addressNumber: string | null;
    addressNeighborhood: string | null;
    addressCity: string | null;
    addressState: string | null;
  };
  customer: {
    name: string;
    document: string;
    documentType: string;
    identityNumber: string | null;
    driverLicenseNumber: string | null;
    address: string | null;
  };
  vehicle: {
    plate: string;
    brand: string;
    model: string;
    modelYear: number | null;
    manufactureYear: number | null;
    renavam: string | null;
    chassis: string | null;
    fipeValue: string | null;
  };
  contract: {
    startDate: Date;
    endDate: Date;
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
  cautionInstallments: { dueDate: Date; amount: string }[];
}

function formatDateTime(d: Date) {
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR');
}

function formatCurrency(v: string | null) {
  if (!v) return 'a combinar';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const FUEL_CHECK_ORDER: { key: string; label: string }[] = [
  { key: 'reserva', label: 'Reserva' },
  { key: '1/4', label: '1/4' },
  { key: '1/2', label: '1/2' },
  { key: '3/4', label: '3/4' },
  { key: 'cheio', label: '4/4 (Cheio)' },
];

function FuelRow({ selected }: { selected: string | null }) {
  return (
    <Text style={styles.checklistItem}>
      {FUEL_CHECK_ORDER.map((f) => `[${selected === f.key ? 'X' : ' '}] ${f.label}`).join('  ')}
    </Text>
  );
}

export function ProtectedContractPdfDocument({
  contractId,
  company,
  customer,
  vehicle,
  contract,
  signature,
  inspections,
  cautionInstallments,
}: ProtectedContractPdfData) {
  const companyLabel = company.tradeName ?? company.name;
  const shortId = contractId.slice(0, 8).toUpperCase();
  const cityForo = company.addressCity ?? '[cidade não cadastrada]';
  const stateForo = company.addressState ?? '';
  const companyAddress =
    company.addressStreet && company.addressCity
      ? `${company.addressStreet}${company.addressNumber ? `, NÚMERO ${company.addressNumber}` : ''}${
          company.addressNeighborhood ? `, BAIRRO ${company.addressNeighborhood}` : ''
        }, CIDADE ${company.addressCity}`
      : 'endereço não cadastrado';
  const vehicleYears =
    vehicle.manufactureYear || vehicle.modelYear
      ? ` ${vehicle.manufactureYear ?? '—'} / ${vehicle.modelYear ?? '—'}`
      : '';

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* ---------------- CONTRATO PRINCIPAL ---------------- */}
        <Text style={styles.title}>CONTRATO PRINCIPAL DE LOCAÇÃO DE VEÍCULOS</Text>
        <Text style={styles.subtitle}>Contrato nº {shortId}</Text>

        <Text style={styles.clause}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>LOCADOR (PROPRIETÁRIO/POSSUIDOR): </Text>
          {companyLabel}
          {company.cnpj ? `, CNPJ nº ${company.cnpj}` : ''}, com sede em {companyAddress}.
        </Text>
        <Text style={styles.clause}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>LOCATÁRIO (CLIENTE): </Text>
          {customer.name} {customer.documentType} {customer.document}
          {customer.identityNumber ? `, IDENTIDADE: ${customer.identityNumber}` : ''}
          {customer.driverLicenseNumber ? ` HABILITAÇÃO ${customer.driverLicenseNumber}` : ''}
          {customer.address ? `, ENDEREÇO ${customer.address}` : ''}
        </Text>
        <Text style={styles.clause}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>VEÍCULO LOCADO: </Text>
          {vehicle.brand}/{vehicle.model}
          {vehicleYears} {vehicle.renavam ? `, RENAVAM ${vehicle.renavam}` : ''}
          {vehicle.chassis ? `, CHASSI ${vehicle.chassis}` : ''}, PLACA {vehicle.plate}
        </Text>
        <Text style={styles.clause}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>PRAZO DA LOCAÇÃO: </Text>
          Início em {formatDateTime(contract.startDate)} e término previsto para{' '}
          {formatDateTime(contract.endDate)}.
        </Text>
        <Text style={[styles.clause, { marginTop: 6 }]}>
          Pelo presente instrumento, as Partes celebram o presente Contrato de Locação, que se regerá pelas
          seguintes cláusulas e condições:
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 1 — DO OBJETO E RESPONSABILIDADE CIVIL E CRIMINAL</Text>
        <Text style={styles.clause}>
          1.1. O LOCADOR cede ao LOCATÁRIO a posse precária do VEÍCULO LOCADO. O LOCATÁRIO assume a guarda e a
          responsabilidade integral, civil e criminal, pelo VEÍCULO e por todos os atos (comissivos e omissivos),
          fatos e danos (materiais, pessoais, morais, corporais e lucros cessantes) causados a terceiros, a si
          mesmo ou ao VEÍCULO, desde a retirada até a efetiva devolução.
        </Text>
        <Text style={styles.clause}>
          1.2. Não existe qualquer solidariedade, legal ou contratual, entre o LOCADOR e o LOCATÁRIO. O LOCATÁRIO
          isenta o LOCADOR de qualquer responsabilidade, aceitando, desde já, a sua denúncia à lide em caso de
          processos judiciais movidos por terceiros.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 2 — DA TELEMETRIA, MONITORAMENTO E BLOQUEIO REMOTO</Text>
        <Text style={styles.clause}>
          2.1. O LOCATÁRIO tem ciência expressa e concorda incondicionalmente que o VEÍCULO é equipado com sistema
          de telemetria e geolocalização (GPS), utilizado pelo LOCADOR para monitoramento, segurança, prevenção de
          fraudes e gestão de ativos.
        </Text>
        <Text style={styles.clause}>
          2.2. O LOCADOR está expressamente autorizado a realizar o bloqueio remoto do motor do VEÍCULO e adotar
          medidas imediatas de reintegração de posse, sem necessidade de notificação prévia judicial ou
          extrajudicial, nas seguintes hipóteses: a) inadimplência de qualquer valor devido superior a 24 horas; b)
          não devolução do VEÍCULO na data e hora acordadas (caracterizando apropriação indébita); c)
          descumprimento de qualquer cláusula de restrição de uso (ex: aproximação de fronteiras internacionais,
          entrada em áreas de risco não pavimentadas); d) desconexão, violação ou perda de sinal do equipamento de
          rastreamento.
        </Text>
        <Text style={styles.clause}>
          2.3. O limite de quilometragem estabelecido para este contrato é de{' '}
          {contract.monthlyKmLimit ?? '[não definido]'} km por mês. Caso este limite seja excedido, o LOCATÁRIO
          pagará ao LOCADOR o valor adicional de {formatCurrency(contract.extraKmRate)} por quilômetro excedente.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 3 — DO USO INDEVIDO E EXCLUSÃO TOTAL DE COBERTURA (PROTEÇÃO)</Text>
        <Text style={styles.clause}>
          3.1. A constatação de uso indevido anula imediatamente qualquer proteção, seguro ou limitação de
          responsabilidade contratada, tornando o LOCATÁRIO responsável pelo ressarcimento de 100% dos danos ao
          VEÍCULO, danos a terceiros e lucros cessantes do LOCADOR.
        </Text>
        <Text style={styles.clause}>
          3.2. Configura uso indevido, de forma taxativa e incontestável: a) conduzir o VEÍCULO sob efeito de
          álcool, drogas ou medicamentos que alterem a capacidade psicomotora, ou recusar-se a realizar o teste do
          bafômetro exigido por autoridades; b) ceder a direção a terceiros não autorizados ou não habilitados; c)
          trafegar em vias não pavimentadas, dunas, praias, trilhas, mangues, áreas alagadas ou estradas sem
          condições de tráfego seguro; d) utilizar o veículo para fins ilícitos (transporte de drogas, armas,
          contrabando) ou transporte remunerado (ex: Uber, 99) sem autorização específica prévia; e) participar de
          corridas, rachas, testes de velocidade ou rebocar outros veículos; f) continuar trafegando com luzes de
          alerta de óleo ou temperatura acesas no painel.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 4 — DAS INFRAÇÕES DE TRÂNSITO E SOLIDARIEDADE DE PAGAMENTO</Text>
        <Text style={styles.clause}>
          4.1. O LOCATÁRIO é o único e exclusivo responsável pelo pagamento de todas as multas de trânsito
          decorrentes de infrações cometidas durante a locação, bem como pela pontuação na CNH.
        </Text>
        <Text style={styles.clause}>
          4.2. O LOCATÁRIO autoriza, em caráter irrevogável e irretratável, que o LOCADOR debite automaticamente
          em seu cartão de crédito (ou utilize o valor da caução) o valor da multa de trânsito acrescido de 20% de
          taxa administrativa, imediatamente após a notificação do órgão de trânsito ao LOCADOR.
        </Text>
        <Text style={styles.clause}>
          4.3. A cobrança será realizada independentemente de o LOCATÁRIO desejar recorrer da infração. A
          interposição de recurso administrativo ou judicial é faculdade do LOCATÁRIO, às suas expensas, mas não
          suspende a obrigação de pagar ao LOCADOR de imediato.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 5 — SINISTROS, AVARIAS E MANUTENÇÃO</Text>
        <Text style={styles.clause}>
          5.1. Em caso de roubo, furto, incêndio ou colisão, o LOCATÁRIO é obrigado a: (i) acionar a Polícia (190)
          e o LOCADOR em até 1 hora; (ii) apresentar o Boletim de Ocorrência oficial em até 24 horas. A omissão
          anula qualquer proteção contratada.
        </Text>
        <Text style={styles.clause}>
          5.2. A "Coparticipação" (franquia) cobrada pelo LOCADOR não é seguro, mas uma limitação de
          responsabilidade. Caso os danos ao veículo ou a terceiros ultrapassem a proteção contratada, ou em caso
          de perda de proteção por mau uso, o LOCATÁRIO arcará com o valor integral do conserto ou com o valor da
          Tabela FIPE do veículo{vehicle.fipeValue ? ` (hoje ${formatCurrency(vehicle.fipeValue)})` : ''}.
        </Text>
        <Text style={styles.clause}>
          5.3. O LOCATÁRIO isenta o LOCADOR por desgastes naturais, mas responderá por danos por negligência (ex:
          motor fundido por falta de água/óleo, pneus rasgados em guias, danos na suspensão por buracos), sendo
          cobrado integralmente pela manutenção corretiva por mau uso. A condição do veículo na saída e retorno
          será atestada pelo Termo de Vistoria (Anexo I).
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 6 — INADIMPLÊNCIA E APROPRIAÇÃO INDÉBITA</Text>
        <Text style={styles.clause}>
          6.1. O atraso na devolução do veículo por prazo superior a 24 horas do estipulado no contrato, sem a
          devida prorrogação paga e autorizada, configura crime de apropriação indébita.
        </Text>
        <Text style={styles.clause}>
          6.2. Configurada a apropriação indébita, o LOCADOR registrará Boletim de Ocorrência Criminal, acionará a
          busca e apreensão extrajudicial/judicial e repassará todos os custos (advogados, guinchos, pátios) ao
          LOCATÁRIO, além de multa penal de 35% do saldo restante e diárias em dobro até a recuperação do bem.
        </Text>

        <Text style={styles.clauseTitle}>CLÁUSULA 7 — FORO DE ELEIÇÃO</Text>
        <Text style={styles.clause}>
          7.1. As partes elegem expressamente o Foro da Comarca de {cityForo}
          {stateForo ? `, ${stateForo}` : ''}, com exclusão expressa de qualquer outro, por mais privilegiado que
          seja, para dirimir quaisquer dúvidas ou litígios oriundos deste contrato.
        </Text>

        <Text style={[styles.clause, { marginTop: 10 }]}>
          E por estarem justos e contratados, assinam eletrônica ou fisicamente o presente.
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
          ANEXO I — TERMO DE VISTORIA DETALHADO
        </Text>
        <Text style={styles.subtitle}>
          Contrato nº {shortId} — Veículo/Placa: {vehicle.plate}
        </Text>

        <Text style={styles.sectionTitle}>REGISTRO DE SAÍDA</Text>
        {inspections.delivery ? (
          <>
            <Text style={styles.checklistItem}>
              Data/Hora: {formatDateTime(inspections.delivery.performedAt)} | Quilometragem (KM):{' '}
              {inspections.delivery.odometerKm.toLocaleString('pt-BR')}
            </Text>
            <FuelRow selected={inspections.delivery.fuelLevel} />
            {inspections.delivery.exteriorNotes && (
              <Text style={styles.checklistItem}>Observações: {inspections.delivery.exteriorNotes}</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.checklistItem}>Data/Hora: ___/___/______ às ___:___ | Quilometragem (KM): _________________</Text>
            <FuelRow selected={null} />
          </>
        )}

        <Text style={styles.sectionTitle}>REGISTRO DE RETORNO</Text>
        {inspections.return ? (
          <>
            <Text style={styles.checklistItem}>
              Data/Hora: {formatDateTime(inspections.return.performedAt)} | Quilometragem (KM):{' '}
              {inspections.return.odometerKm.toLocaleString('pt-BR')}
            </Text>
            <FuelRow selected={inspections.return.fuelLevel} />
            {inspections.return.exteriorNotes && (
              <Text style={styles.checklistItem}>Observações: {inspections.return.exteriorNotes}</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.checklistItem}>Data/Hora: ____ às ___:___ | Quilometragem (KM): _________________</Text>
            <FuelRow selected={null} />
          </>
        )}

        <Text style={styles.sectionTitle}>ITENS INSPECIONADOS (assinalar as condições no momento da retirada e da devolução)</Text>
        <Text style={styles.checklistItem}>[ ] Lataria, Pintura e Para-choques.</Text>
        <Text style={styles.checklistItem}>[ ] Vidros, Retrovisores, Faróis e Lanternas.</Text>
        <Text style={styles.checklistItem}>[ ] Pneus e Rodas (incluindo estado do estepe e calotas/rodas de liga).</Text>
        <Text style={styles.checklistItem}>[ ] Interior: estofamento, painel, odores (cigarro/animais) e higiene.</Text>
        <Text style={styles.checklistItem}>[ ] Ferramentas e documentos: macaco, chave de roda, triângulo e CRLV.</Text>

        <Text style={styles.sectionTitle}>DECLARAÇÃO DO LOCATÁRIO</Text>
        <Text style={styles.clause}>
          Declaro que recebi o veículo nas condições exatas assinaladas acima e fotografadas. Concordo que o
          retorno com sujeira excessiva gerará taxa de lavagem especial, e o retorno com nível de combustível
          inferior ao da saída gerará cobrança pelo litro faltante, acrescido de taxa de serviço. Caso o veículo
          seja devolvido com sujeira que impossibilite a vistoria visual imediata, concordo expressamente que a
          vistoria válida e definitiva será aquela realizada pelo Locador logo após a lavagem.
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
          <Text style={styles.signatureLine}>Assinatura do Locatário (SAÍDA)</Text>
          <Text style={styles.signatureLine}>Assinatura do Locatário (RETORNO)</Text>
        </View>

        {/* ---------------- ANEXO II — TERMO DE CAUÇÃO ---------------- */}
        <Text style={styles.docTitle} break>
          ANEXO II — TERMO DE CAUÇÃO (DEPÓSITO DE SEGURANÇA)
        </Text>
        <Text style={styles.subtitle}>
          Contrato nº {shortId} — Placa: {vehicle.plate}
        </Text>

        <Text style={styles.clause}>
          Pelo presente termo, eu, {customer.name}, qualificado(a) no Contrato Principal de Locação de Veículos,
          declaro ter realizado nesta data o pagamento/transferência da quantia exata de{' '}
          {formatCurrency(contract.cautionAmount)} em favor da {companyLabel}, a título de Depósito de Segurança
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
          a Locadora realizará o reembolso exclusivamente na conta bancária de minha titularidade.
        </Text>
        <Text style={styles.clause}>
          Reconheço que a liberação da caução ou de seu saldo remanescente poderá ficar retida por até 30 (trinta)
          dias úteis após a devolução do veículo, tempo necessário para a verificação e processamento de eventuais
          multas de trânsito nos sistemas dos órgãos autuadores municipais, estaduais e federais.
        </Text>

        <Text style={styles.clauseTitle}>4. DA COBRANÇA DO EXCEDENTE DA PROTEÇÃO/CAUÇÃO</Text>
        <Text style={styles.clause}>
          Tenho plena ciência de que a caução de {formatCurrency(contract.cautionAmount)} é apenas uma garantia
          inicial. Todo e qualquer valor de prejuízo, avaria, multa ou despesa que venha a superar este limite
          será de minha única, exclusiva, integral e ilimitada responsabilidade. Comprometo-me a quitar o saldo
          devedor excedente à vista, constituindo este termo e o Contrato Principal dívida líquida, certa e
          exigível (título executivo extrajudicial).
        </Text>

        {cautionInstallments.length > 0 && (
          <>
            <Text style={styles.clauseTitle}>PAGAMENTOS:</Text>
            {cautionInstallments.map((inst, i) => (
              <Text key={i} style={styles.paymentRow}>
                {formatDate(inst.dueDate)} – {formatCurrency(inst.amount)}
              </Text>
            ))}
          </>
        )}

        <Text style={[styles.clause, { marginTop: 10 }]}>
          {cityForo}, {formatDate(contract.createdAt)}.
        </Text>
        <Text style={styles.signatureLine}>
          {customer.name} {customer.documentType} {customer.document} (Locatário/Declarante)
        </Text>

        {/* ---------------- ANEXO III — PROCURAÇÃO / INFRAÇÕES ---------------- */}
        <Text style={styles.docTitle} break>
          ANEXO III — TERMO DE RESPONSABILIDADE POR INFRAÇÕES DE TRÂNSITO E INDICAÇÃO DE CONDUTOR
        </Text>
        <Text style={styles.subtitle}>Contrato nº {shortId}</Text>

        <Text style={styles.clause}>
          Pelo presente instrumento, eu, {customer.name} {customer.documentType} {customer.document}
          {customer.identityNumber ? `, IDENTIDADE: ${customer.identityNumber}` : ''}
          {customer.driverLicenseNumber ? ` HABILITAÇÃO ${customer.driverLicenseNumber}` : ''}
          {customer.address ? `, ENDEREÇO ${customer.address}` : ''}, qualificado no Contrato Principal, na
          condição de possuidor direto do veículo placa {vehicle.plate} no período de{' '}
          {formatDate(contract.startDate)} até a sua efetiva devolução, assumo integral e exclusiva
          responsabilidade por toda e qualquer infração de trânsito (esfera municipal, estadual ou federal)
          cometida com o referido veículo neste período.
        </Text>
        <Text style={styles.clause}>
          Neste ato, nomeio e constituo a {companyLabel}
          {company.cnpj ? `, CNPJ nº ${company.cnpj},` : ''} como minha bastante procuradora, com poderes
          específicos para me representar perante o DETRAN, DER, DNIT, Prefeituras e demais órgãos autuadores de
          trânsito.
        </Text>
        <Text style={styles.clause}>
          A outorgada (Locadora) fica autorizada a preencher, assinar e protocolar o Formulário de Identificação
          de Condutor Infrator (FICI) em meu nome, ou em nome do condutor adicional formalmente cadastrado no
          contrato, transferindo para minha CNH ({customer.driverLicenseNumber ?? 'não informada'}) a pontuação
          decorrente das infrações cometidas no período da locação.
        </Text>

        <Text style={[styles.clause, { marginTop: 20 }]}>Assinatura (idêntica à CNH ou GOV)</Text>
        <Text style={styles.clause}>Data: {formatDate(contract.createdAt)}</Text>
        <Text style={[styles.clause, { marginTop: 10 }]}>
          {companyLabel}
          {company.cnpj ? ` CNPJ: ${company.cnpj}` : ''} (Locador / Outorgada)
        </Text>
      </Page>
    </Document>
  );
}
