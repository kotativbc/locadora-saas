/**
 * Formata uma data "pura" (vencimento, data de infração, data de manutenção
 * etc.) usando os componentes UTC, não o fuso horário do navegador.
 *
 * Esses campos nascem de um <input type="date"> (só "AAAA-MM-DD", sem hora)
 * e são salvos como meia-noite UTC. Se a gente usasse toLocaleDateString()
 * direto, o navegador converteria pro fuso local antes de extrair o dia —
 * num fuso atrás de UTC (como o Brasil, UTC-3), meia-noite UTC vira 21h do
 * dia ANTERIOR, e a data exibida "recua" um dia. Usando os componentes UTC
 * da própria data, a data exibida sempre bate com o que foi digitado.
 */
export function formatDateOnly(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
