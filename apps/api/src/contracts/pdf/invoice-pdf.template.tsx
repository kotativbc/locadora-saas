import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const ACCENT = '#1a2b4a';
const ACCENT_LIGHT = '#eef1f6';
const MUTED = '#6b7280';
const BORDER = '#e2e5ea';
const SUCCESS = '#1a7f4b';
const WARNING = '#b3432e';

const styles = StyleSheet.create({
  page: { padding: 0, fontSize: 9.5, fontFamily: 'Helvetica', color: '#1a1a1a' },
  header: {
    backgroundColor: ACCENT,
    color: '#ffffff',
    padding: '32px 44px',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyName: { fontSize: 15, fontFamily: 'Helvetica-Bold' },
  companySub: { fontSize: 8.5, color: '#c9d2e3', marginTop: 3 },
  invoiceTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  invoiceMeta: { fontSize: 8.5, color: '#c9d2e3', textAlign: 'right', marginTop: 4 },
  body: { padding: '28px 44px' },
  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  partyBlock: { width: '47%' },
  partyLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, marginBottom: 5, letterSpacing: 0.5 },
  partyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  partyLine: { fontSize: 9, color: '#333', marginBottom: 1.5 },
  table: { marginBottom: 20 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: ACCENT_LIGHT,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  tableHeaderCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 0.3 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottom: `0.5pt solid ${BORDER}`,
  },
  colDate: { width: '14%' },
  colDesc: { width: '42%' },
  colType: { width: '18%' },
  colStatus: { width: '13%' },
  colAmount: { width: '13%', textAlign: 'right' },
  statusPaid: { color: SUCCESS, fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  statusPending: { color: WARNING, fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  statusCancelled: { color: MUTED, fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  totalsBox: { alignItems: 'flex-end', marginBottom: 28 },
  totalsRow: { flexDirection: 'row', width: 220, justifyContent: 'space-between', paddingVertical: 3 },
  totalsLabel: { fontSize: 9.5, color: MUTED },
  totalsValue: { fontSize: 9.5 },
  grandTotalRow: {
    flexDirection: 'row',
    width: 220,
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 4,
    borderTop: `1pt solid ${ACCENT}`,
  },
  grandTotalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  grandTotalValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: ACCENT },
  noteBox: {
    backgroundColor: ACCENT_LIGHT,
    borderRadius: 3,
    padding: 14,
    marginBottom: 20,
  },
  noteTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  noteText: { fontSize: 9, color: '#333', lineHeight: 1.4 },
  footer: {
    borderTop: `0.5pt solid ${BORDER}`,
    paddingTop: 14,
    fontSize: 8,
    color: MUTED,
    textAlign: 'center',
  },
});

export interface InvoicePdfData {
  contractId: string;
  invoiceNumber: string;
  issuedAt: Date;
  company: {
    name: string;
    tradeName: string | null;
    cnpj: string | null;
    addressCity: string | null;
    addressState: string | null;
    contactEmail: string | null;
  };
  customer: {
    name: string;
    document: string;
    documentType: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  vehicle: {
    plate: string;
    brand: string;
    model: string;
  };
  period: { startDate: Date; endDate: Date };
  charges: {
    createdAt: Date;
    description: string;
    type: string;
    status: string;
    amount: string;
  }[];
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR');
}

function formatCurrency(v: string | number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TYPE_LABELS: Record<string, string> = {
  rental: 'Aluguel',
  damage: 'Avaria',
  fine: 'Multa',
  other: 'Outro',
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  cancelled: 'Cancelado',
};

export function InvoicePdfDocument({
  invoiceNumber,
  issuedAt,
  company,
  customer,
  vehicle,
  period,
  charges,
}: InvoicePdfData) {
  const companyLabel = company.tradeName ?? company.name;
  const totalPaid = charges.filter((c) => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPending = charges
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const totalCancelled = charges
    .filter((c) => c.status === 'cancelled')
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const grandTotal = totalPaid + totalPending;

  const statusStyle = (status: string) =>
    status === 'paid' ? styles.statusPaid : status === 'cancelled' ? styles.statusCancelled : styles.statusPending;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{companyLabel}</Text>
            <Text style={styles.companySub}>
              {company.cnpj ? `CNPJ ${company.cnpj}` : ''}
              {company.addressCity ? `  •  ${company.addressCity}${company.addressState ? `/${company.addressState}` : ''}` : ''}
            </Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>FATURA</Text>
            <Text style={styles.invoiceMeta}>Nº {invoiceNumber}</Text>
            <Text style={styles.invoiceMeta}>Emitida em {formatDate(issuedAt)}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.partiesRow}>
            <View style={styles.partyBlock}>
              <Text style={styles.partyLabel}>COBRADO DE</Text>
              <Text style={styles.partyName}>{customer.name}</Text>
              <Text style={styles.partyLine}>
                {customer.documentType} {customer.document}
              </Text>
              {customer.address && <Text style={styles.partyLine}>{customer.address}</Text>}
              {customer.email && <Text style={styles.partyLine}>{customer.email}</Text>}
              {customer.phone && <Text style={styles.partyLine}>{customer.phone}</Text>}
            </View>
            <View style={styles.partyBlock}>
              <Text style={styles.partyLabel}>REFERENTE A</Text>
              <Text style={styles.partyName}>
                {vehicle.brand} {vehicle.model} — {vehicle.plate}
              </Text>
              <Text style={styles.partyLine}>
                Período: {formatDate(period.startDate)} a {formatDate(period.endDate)}
              </Text>
              <Text style={styles.partyLine}>Contrato {invoiceNumber}</Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDate]}>DATA</Text>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>DESCRIÇÃO</Text>
              <Text style={[styles.tableHeaderCell, styles.colType]}>CATEGORIA</Text>
              <Text style={[styles.tableHeaderCell, styles.colStatus]}>STATUS</Text>
              <Text style={[styles.tableHeaderCell, styles.colAmount]}>VALOR</Text>
            </View>
            {charges.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={{ fontSize: 9, color: MUTED }}>Nenhum lançamento registrado para este contrato.</Text>
              </View>
            ) : (
              charges.map((c, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.colDate}>{formatDate(c.createdAt)}</Text>
                  <Text style={styles.colDesc}>{c.description}</Text>
                  <Text style={styles.colType}>{TYPE_LABELS[c.type] ?? c.type}</Text>
                  <Text style={[styles.colStatus, statusStyle(c.status)]}>{STATUS_LABELS[c.status] ?? c.status}</Text>
                  <Text style={styles.colAmount}>{formatCurrency(c.amount)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total pago</Text>
              <Text style={styles.totalsValue}>{formatCurrency(totalPaid)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total pendente</Text>
              <Text style={styles.totalsValue}>{formatCurrency(totalPending)}</Text>
            </View>
            {totalCancelled > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Cancelado (não cobrado)</Text>
                <Text style={styles.totalsValue}>{formatCurrency(totalCancelled)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total geral</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
            </View>
          </View>

          {totalPending > 0 && (
            <View style={styles.noteBox}>
              <Text style={styles.noteTitle}>Pagamento pendente</Text>
              <Text style={styles.noteText}>
                Há {formatCurrency(totalPending)} em aberto referente a este contrato. Entre em contato pelo canal
                abaixo para regularizar.
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text>
              {companyLabel}
              {company.contactEmail ? `  •  ${company.contactEmail}` : ''}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
