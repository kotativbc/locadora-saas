import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 10.5, fontFamily: 'Helvetica', color: '#1a1a1a' },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#555', marginBottom: 18 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 14, marginBottom: 6 },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 130, color: '#555' },
  value: { flex: 1 },
  clause: { marginBottom: 6, textAlign: 'justify', lineHeight: 1.4 },
  divider: { borderBottom: '1pt dashed #cccccc', marginVertical: 14 },
  signatureBox: {
    marginTop: 10,
    padding: 12,
    border: '1pt solid #cccccc',
    borderRadius: 4,
  },
  signatureSigned: { color: '#2e7d4f', fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  signaturePending: { color: '#b3432e', fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  small: { fontSize: 8.5, color: '#666' },
});

export interface ContractPdfData {
  company: { name: string; tradeName: string | null; cnpj: string | null };
  customer: {
    name: string;
    document: string;
    documentType: string;
    driverLicenseNumber: string | null;
  };
  vehicle: {
    plate: string;
    brand: string;
    model: string;
    modelYear: number | null;
    category: string;
  };
  contract: {
    startDate: Date;
    endDate: Date;
    days: number;
    dailyRateSnapshot: string;
    totalValue: string;
    status: string;
  };
  signature?: {
    signedAt: Date;
    signerIp: string | null;
    termsHash: string | null;
  } | null;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR');
}

function formatCurrency(v: string) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const GENERIC_CLAUSES = [
  '1. O LOCATÁRIO declara ter recebido o veículo em boas condições de uso e conservação, comprometendo-se a devolvê-lo no mesmo estado, ressalvado o desgaste natural pelo uso regular.',
  '2. O LOCATÁRIO é responsável por todas as multas de trânsito, pedágios e infrações cometidas durante o período de locação, ainda que notificadas após a devolução do veículo.',
  '3. O combustível consumido durante a locação é de responsabilidade do LOCATÁRIO, que deve devolver o veículo com o mesmo nível de combustível registrado na entrega, salvo acordo em contrário.',
  '4. Qualquer avaria, sinistro ou dano causado ao veículo durante o período de locação deve ser comunicado imediatamente à LOCADORA, e será apurado conforme vistoria de devolução.',
  '5. O atraso na devolução do veículo além da data e hora previstas neste contrato sujeita o LOCATÁRIO à cobrança de diária adicional proporcional, salvo prorrogação previamente combinada.',
  '6. Este contrato não inclui cobertura de seguro além do exigido por lei, salvo se expressamente contratado à parte.',
  '7. Este documento foi gerado eletronicamente pela plataforma e constitui o instrumento particular de locação entre as partes acima identificadas.',
];

export function ContractPdfDocument({ company, customer, vehicle, contract, signature }: ContractPdfData) {
  const companyLabel = company.tradeName ?? company.name;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CONTRATO DE LOCAÇÃO DE VEÍCULO</Text>
        <Text style={styles.subtitle}>
          {companyLabel}
          {company.cnpj ? ` — CNPJ ${company.cnpj}` : ''}
        </Text>

        <Text style={styles.sectionTitle}>LOCATÁRIO</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nome</Text>
          <Text style={styles.value}>{customer.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{customer.documentType}</Text>
          <Text style={styles.value}>{customer.document}</Text>
        </View>
        {customer.driverLicenseNumber && (
          <View style={styles.row}>
            <Text style={styles.label}>CNH</Text>
            <Text style={styles.value}>{customer.driverLicenseNumber}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>VEÍCULO</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Veículo</Text>
          <Text style={styles.value}>
            {vehicle.brand} {vehicle.model}
            {vehicle.modelYear ? ` (${vehicle.modelYear})` : ''}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Placa</Text>
          <Text style={styles.value}>{vehicle.plate}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Categoria</Text>
          <Text style={styles.value}>{vehicle.category}</Text>
        </View>

        <Text style={styles.sectionTitle}>PERÍODO E VALORES</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Período</Text>
          <Text style={styles.value}>
            {formatDate(contract.startDate)} a {formatDate(contract.endDate)} ({contract.days}{' '}
            {contract.days === 1 ? 'dia' : 'dias'})
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Valor da diária</Text>
          <Text style={styles.value}>{formatCurrency(contract.dailyRateSnapshot)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Valor total</Text>
          <Text style={styles.value}>{formatCurrency(contract.totalValue)}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>CLÁUSULAS GERAIS</Text>
        {GENERIC_CLAUSES.map((clause, i) => (
          <Text key={i} style={styles.clause}>
            {clause}
          </Text>
        ))}

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
      </Page>
    </Document>
  );
}
