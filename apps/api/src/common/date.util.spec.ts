import { saoPauloTodayUTC, daysOverdue } from './date.util';

/**
 * Estas datas existem por causa de um bug real: usar `new Date()` puro pra
 * decidir "isso já venceu?" prende meia-noite atrasada ou adiantada quando o
 * servidor roda em UTC e o cliente pensa em horário de São Paulo (UTC-3).
 * Cada caso aqui fixa um instante UTC específico e confere que o resultado
 * bate com o calendário de São Paulo, não com o calendário UTC.
 */
describe('saoPauloTodayUTC', () => {
  it('ainda é o dia anterior em SP quando já virou o dia seguinte em UTC (23h30 SP)', () => {
    // 2026-01-15T02:30:00Z = 2026-01-14T23:30:00 em São Paulo (UTC-3)
    const now = new Date('2026-01-15T02:30:00.000Z');
    expect(saoPauloTodayUTC(now)).toEqual(new Date('2026-01-14T00:00:00.000Z'));
  });

  it('já virou o dia em SP mesmo faltando horas pra virar em UTC', () => {
    // 2026-01-15T03:00:01Z = 2026-01-15T00:00:01 em São Paulo
    const now = new Date('2026-01-15T03:00:01.000Z');
    expect(saoPauloTodayUTC(now)).toEqual(new Date('2026-01-15T00:00:00.000Z'));
  });

  it('bate exatamente na virada da meia-noite em São Paulo', () => {
    // 2026-03-01T03:00:00Z = 2026-03-01T00:00:00 em São Paulo, na hora exata
    const now = new Date('2026-03-01T03:00:00.000Z');
    expect(saoPauloTodayUTC(now)).toEqual(new Date('2026-03-01T00:00:00.000Z'));
  });
});

describe('daysOverdue', () => {
  it('calcula dias completos de atraso usando o calendário de São Paulo', () => {
    const dueDate = new Date('2026-01-10T00:00:00.000Z');
    // "agora" é 2026-01-15T02:00Z → ainda 2026-01-14 em SP
    const now = new Date('2026-01-15T02:00:00.000Z');
    expect(daysOverdue(dueDate, now)).toBe(4);
  });

  it('não considera atrasado no próprio dia do vencimento', () => {
    const dueDate = new Date('2026-01-14T00:00:00.000Z');
    const now = new Date('2026-01-15T02:00:00.000Z'); // ainda 2026-01-14 em SP
    expect(daysOverdue(dueDate, now)).toBe(0);
  });

  it('nunca retorna negativo pra data que ainda não venceu', () => {
    const dueDate = new Date('2026-02-01T00:00:00.000Z');
    const now = new Date('2026-01-15T12:00:00.000Z');
    expect(daysOverdue(dueDate, now)).toBe(0);
  });

  it('o boundary de virada de dia não gera 1 dia de atraso indevido nem atrasa a contagem real', () => {
    const dueDate = new Date('2026-01-14T00:00:00.000Z');
    // 2026-01-15T02:59:59Z ainda é 2026-01-14T23:59:59 em SP — não venceu ainda
    const stillSameDay = new Date('2026-01-15T02:59:59.000Z');
    expect(daysOverdue(dueDate, stillSameDay)).toBe(0);

    // um segundo depois já é 2026-01-15T00:00:00 em SP — venceu ontem, 1 dia de atraso
    const nextDay = new Date('2026-01-15T03:00:00.000Z');
    expect(daysOverdue(dueDate, nextDay)).toBe(1);
  });
});
