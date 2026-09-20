/**
 * Utilitários de data "pura" (sem hora) usados nas regras de vencimento/atraso.
 *
 * Campos como Charge.dueDate nascem de um <input type="date"> no frontend
 * (só "AAAA-MM-DD") e são salvos como meia-noite UTC daquele dia — ver
 * apps/web/src/dateUtils.ts (formatDateOnly) pra o mesmo raciocínio do lado
 * do cliente. Pra comparar "hoje" com esses campos sem cair no bug clássico
 * de fuso horário (Brasil é UTC-3: usar `new Date()` puro faria uma cobrança
 * vencendo hoje já aparecer como atrasada horas antes da meia-noite local),
 * `saoPauloTodayUTC` devolve a data de hoje **no calendário de São Paulo**,
 * representada da mesma forma (meia-noite UTC daquele dia).
 */
export function saoPauloTodayUTC(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now); // "AAAA-MM-DD"
  return new Date(`${parts}T00:00:00.000Z`);
}

/** Quantos dias completos se passaram desde `dueDate` até "hoje" (calendário de SP). Nunca negativo. */
export function daysOverdue(dueDate: Date, now: Date = new Date()): number {
  const today = saoPauloTodayUTC(now);
  const diffMs = today.getTime() - dueDate.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return days > 0 ? days : 0;
}
