import { Document, Page, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#555', marginBottom: 4 },
  warning: {
    fontSize: 8.5,
    color: '#b3432e',
    backgroundColor: '#fbeae6',
    padding: 8,
    marginBottom: 16,
    marginTop: 10,
  },
  clauseTitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', marginTop: 14, marginBottom: 5 },
  clause: { marginBottom: 6, textAlign: 'justify', lineHeight: 1.4 },
  pending: { color: '#b3432e', fontFamily: 'Helvetica-Oblique' },
});

export interface PrivacyNoticePdfData {
  company: {
    name: string;
    cnpj: string | null;
    addressStreet: string | null;
    addressNumber: string | null;
    addressComplement: string | null;
    addressNeighborhood: string | null;
    addressCity: string | null;
    addressState: string | null;
    addressZipCode: string | null;
    contactEmail: string | null;
    privacyOfficerName: string | null;
  };
  generatedAt: Date;
}

function formatAddress(c: PrivacyNoticePdfData['company']) {
  const parts: string[] = [];
  if (c.addressStreet) parts.push(`${c.addressStreet}${c.addressNumber ? `, ${c.addressNumber}` : ''}`);
  if (c.addressComplement) parts.push(c.addressComplement);
  if (c.addressNeighborhood) parts.push(c.addressNeighborhood);
  if (c.addressCity) parts.push(`${c.addressCity}${c.addressState ? `/${c.addressState}` : ''}`);
  if (c.addressZipCode) parts.push(`CEP ${c.addressZipCode}`);
  return parts.length > 0 ? parts.join(', ') : null;
}

function Pending({ text }: { text: string }) {
  return <Text style={styles.pending}>[{text}]</Text>;
}

export function PrivacyNoticePdfDocument({ company, generatedAt }: PrivacyNoticePdfData) {
  const address = formatAddress(company);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>AVISO DE PRIVACIDADE</Text>
        <Text style={styles.subtitle}>{company.name}</Text>
        <Text style={styles.subtitle}>Gerado automaticamente em {generatedAt.toLocaleDateString('pt-BR')}</Text>

        <Text style={styles.warning}>
          Este documento foi gerado a partir do cadastro da empresa no Rentovix e de um modelo padrão. Antes de
          publicar, revise com um advogado — em especial os prazos de retenção (assinalados abaixo), que exigem
          decisão jurídica/contábil específica e não foram preenchidos automaticamente.
        </Text>

        <Text style={styles.clauseTitle}>1. Quem somos</Text>
        <Text style={styles.clause}>
          A {company.name}
          {company.cnpj ? `, CNPJ ${company.cnpj}` : (
            <>
              {', '}
              <Pending text="CNPJ não cadastrado" />
            </>
          )}
          {address ? `, com endereço em ${address}` : (
            <>
              {', '}
              <Pending text="endereço não cadastrado" />
            </>
          )}{' '}
          ("Locadora"), é a controladora dos dados pessoais tratados no contexto de cadastro, análise, contratação,
          execução e encerramento de locações de veículos.
        </Text>
        <Text style={styles.clause}>
          Canal de privacidade: {company.contactEmail ?? <Pending text="e-mail de contato não cadastrado" />}
        </Text>
        <Text style={styles.clause}>
          Encarregado ou canal equivalente: {company.privacyOfficerName ?? <Pending text="não cadastrado" />}
        </Text>

        <Text style={styles.clauseTitle}>2. Dados tratados e finalidades</Text>
        <Text style={styles.clause}>
          A Locadora poderá tratar nome, CPF, documento de identificação, CNH, endereço, telefone, e-mail, dados de
          pagamento fornecidos, dados do contrato, veículo, datas, quilometragem, avarias, multas, comunicações e
          registros necessários à segurança e ao atendimento.
        </Text>
        <Text style={styles.clause}>
          Esses dados são utilizados para identificar o contratante e condutores, elaborar e executar o contrato de
          locação, cobrar valores, administrar cauções e devoluções, cumprir obrigações legais e regulatórias,
          prevenir fraude, exercer direitos, responder autoridades, prestar suporte e melhorar controles internos.
        </Text>

        <Text style={styles.clauseTitle}>3. Bases legais</Text>
        <Text style={styles.clause}>
          A Locadora indica como base legal principal a execução de contrato ou procedimentos preliminares a ele
          (art. 7º, V, LGPD), e, quando aplicável, o cumprimento de obrigação legal ou regulatória.{' '}
          <Pending text="revisar se há tratamento adicional que exija outra base legal" />
        </Text>

        <Text style={styles.clauseTitle}>4. Compartilhamento</Text>
        <Text style={styles.clause}>
          Os dados poderão ser compartilhados, conforme necessidade e fundamento jurídico, com o Rentovix como
          operador de infraestrutura, provedores de hospedagem e suporte, instituições de pagamento, contabilidade,
          seguradoras, autoridades públicas, órgãos de trânsito, assessores profissionais e prestadores envolvidos
          na execução da locação.
        </Text>

        <Text style={styles.clauseTitle}>5. Rentovix</Text>
        <Text style={styles.clause}>
          Para a execução do sistema, o Rentovix trata os dados em nome da Locadora, conforme instruções e o
          Anexo de Tratamento de Dados (DPA) firmado entre as partes. A Locadora permanece responsável por definir
          finalidades, bases legais, transparência, prazos e atendimento aos titulares.
        </Text>

        <Text style={styles.clauseTitle}>6. Retenção</Text>
        <Text style={styles.clause}>
          Os dados serão mantidos pelo período necessário às finalidades informadas e pelos prazos exigidos por
          lei, obrigações fiscais, contábeis, regulatórias, contratuais, segurança e defesa em processos.
        </Text>
        <Text style={styles.clause}>
          <Pending text="Prazos concretos ainda não definidos — preencher com advogado/contador antes de publicar: dados cadastrais de cliente, contratos e documentos, dados de cobrança, logs de acesso" />
        </Text>

        <Text style={styles.clauseTitle}>7. Direitos do titular</Text>
        <Text style={styles.clause}>
          O titular poderá solicitar confirmação da existência de tratamento, acesso, correção, anonimização,
          bloqueio ou eliminação quando cabível, portabilidade conforme regulamentação, informação sobre
          compartilhamentos, revogação de consentimento, oposição quando aplicável e revisão de decisões
          automatizadas nos termos da lei. O pedido deve ser enviado ao canal indicado na seção 1.
        </Text>

        <Text style={styles.clauseTitle}>8. Segurança e incidentes</Text>
        <Text style={styles.clause}>
          A Locadora e seus operadores adotam medidas compatíveis com o risco, como controle de acesso, senhas,
          proteção de transmissão, registros, cópias de segurança e procedimentos de resposta, sem prometer
          segurança absoluta. Em caso de incidente relevante, a Locadora avaliará as comunicações legalmente
          exigidas.
        </Text>

        <Text style={styles.clauseTitle}>9. Atualizações</Text>
        <Text style={styles.clause}>
          Este Aviso poderá ser atualizado para refletir mudanças no tratamento, no sistema ou na lei.
        </Text>
      </Page>
    </Document>
  );
}
