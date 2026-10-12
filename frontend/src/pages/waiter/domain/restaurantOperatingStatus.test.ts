import { describe, expect, it } from 'vitest';
import type { BusinessHour } from '../../admin/types';
import { getWaiterOperatingStatus } from './restaurantOperatingStatus';

const names = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;
const hours = (patch: Partial<BusinessHour> = {}) =>
  names.map((id) => ({
    id,
    label: id,
    enabled: false,
    openingTime: '18:00',
    closingTime: '23:00',
    ...(id === 'monday' ? patch : {}),
  })) as BusinessHour[];
const inSaoPaulo = (day: string, time: string) => new Date(`${day}T${time}:00-03:00`);

describe('horário de funcionamento do garçom', () => {
  it('mostra em andamento durante o expediente, inclusive no minuto anterior ao fechamento', () => {
    const schedule = hours({ enabled: true });
    expect(getWaiterOperatingStatus(schedule, true, inSaoPaulo('2026-10-12','18:00'))).toEqual({
      hoursLabel: 'Salão · 18h às 23h', label: 'Atendimento em andamento', tone: 'open',
    });
    expect(getWaiterOperatingStatus(schedule, true, inSaoPaulo('2026-10-12','22:59')).tone).toBe('open');
  });

  it('muda automaticamente para Encerrado no horário de fechamento', () => {
    const result = getWaiterOperatingStatus(hours({ enabled: true }), true, inSaoPaulo('2026-10-12','23:00'));
    expect(result).toMatchObject({ label: 'Encerrado', tone: 'closed' });
  });

  it('mantém turno noturno até o fechamento do dia seguinte', () => {
    const schedule = hours({ enabled: true, closingTime: '02:00' });
    expect(getWaiterOperatingStatus(schedule, true, inSaoPaulo('2026-10-13','01:59'))).toEqual({
      hoursLabel: 'Salão · 18h às 2h', label: 'Atendimento em andamento', tone: 'open',
    });
    expect(getWaiterOperatingStatus(schedule, true, inSaoPaulo('2026-10-13','02:00')).label)
      .toBe('Encerrado');
  });

  it('identifica pausa manual independentemente do horário', () => {
    expect(getWaiterOperatingStatus(hours({ enabled: true }), false, inSaoPaulo('2026-10-12','19:00')))
      .toMatchObject({ label: 'Pedidos pausados', tone: 'closed' });
  });

  it('não inventa horas nem finge encerramento quando o ADMIN não configurou a agenda', () => {
    expect(getWaiterOperatingStatus(undefined, true)).toMatchObject({
      hoursLabel: 'Horários não configurados', tone: 'unknown',
    });
  });
});
