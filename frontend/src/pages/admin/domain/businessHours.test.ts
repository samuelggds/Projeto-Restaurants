import { describe, expect, it } from 'vitest';
import { defaultBusinessHours } from '../data';
import type { BusinessHour } from '../types';
import {
  DEFAULT_RESTAURANT_TIME_ZONE,
  getRestaurantBusinessDayId,
  getRestaurantAvailability,
  getTodayBusinessHours,
  isBusinessHoursScheduleConfigured,
  isRestaurantOpenForOrders,
  isRestaurantOpenNow,
  normalizeBusinessHours,
  validateBusinessHours,
} from './businessHours';

const atSaoPaulo = (date: string, time: string) => new Date(`${date}T${time}:00-03:00`);

const day = (
  id: string,
  label: string,
  openingTime: string,
  closingTime: string,
  enabled = true,
): BusinessHour => ({ id, label, openingTime, closingTime, enabled });

function weeklySchedule(overrides: Partial<Record<string, Partial<BusinessHour>>> = {}) {
  return defaultBusinessHours.map((item) => ({
    ...item,
    enabled: false,
    ...overrides[item.id],
  }));
}

describe('businessHours', () => {
  it('mantém o restaurante aberto por padrão e respeita o fechamento manual', () => {
    expect(isRestaurantOpenForOrders(undefined)).toBe(true);
    expect(isRestaurantOpenForOrders(true)).toBe(true);
    expect(isRestaurantOpenForOrders(false)).toBe(false);
  });

  it('normaliza a agenda persistida e rejeita horários fora do relógio', () => {
    expect(
      normalizeBusinessHours(
        [{ id: 'monday', enabled: true, openingTime: '09:00', closingTime: '20:00' }],
        defaultBusinessHours,
      )[0],
    ).toMatchObject({ openingTime: '09:00', closingTime: '20:00' });
    expect(
      normalizeBusinessHours(
        [{ id: 'monday', enabled: true, openingTime: '29:00', closingTime: '20:99' }],
        defaultBusinessHours,
      )[0],
    ).toMatchObject({ openingTime: '11:00', closingTime: '23:00' });
  });

  it('aceita expediente que atravessa a meia-noite e rejeita horários iguais', () => {
    expect(
      validateBusinessHours([
        { ...defaultBusinessHours[0], openingTime: '18:00', closingTime: '02:00' },
      ]),
    ).toEqual({});
    expect(
      validateBusinessHours([
        { ...defaultBusinessHours[0], openingTime: '18:00', closingTime: '18:00' },
      ]),
    ).toHaveProperty('monday');
  });

  it('gera o horário de hoje', () =>
    expect(getTodayBusinessHours(defaultBusinessHours, atSaoPaulo('2026-08-10', '12:00'))).toBe(
      'Hoje: 11:00 às 23:00',
    ));

  it('calcula abertura normal com início inclusivo e fechamento exclusivo', () => {
    expect(isRestaurantOpenNow(defaultBusinessHours, atSaoPaulo('2026-08-10', '11:00'))).toBe(true);
    expect(isRestaurantOpenNow(defaultBusinessHours, atSaoPaulo('2026-08-10', '22:59'))).toBe(true);
    expect(isRestaurantOpenNow(defaultBusinessHours, atSaoPaulo('2026-08-10', '23:00'))).toBe(
      false,
    );
    expect(isRestaurantOpenNow(defaultBusinessHours, atSaoPaulo('2026-08-09', '12:00'))).toBe(
      false,
    );
  });

  it('mantém aberto depois da meia-noite pelo expediente do dia anterior', () => {
    const schedule = weeklySchedule({
      monday: day('monday', 'Segunda-feira', '18:00', '02:00'),
    });
    expect(isRestaurantOpenNow(schedule, atSaoPaulo('2026-08-10', '23:30'))).toBe(true);
    expect(isRestaurantOpenNow(schedule, atSaoPaulo('2026-08-11', '01:59'))).toBe(true);
    expect(isRestaurantOpenNow(schedule, atSaoPaulo('2026-08-11', '02:00'))).toBe(false);
  });

  it('combina pausa manual e agenda em um único estado sem contradição', () => {
    const schedule = weeklySchedule({
      monday: day('monday', 'Segunda-feira', '11:00', '23:00'),
    });

    expect(
      getRestaurantAvailability(schedule, false, atSaoPaulo('2026-08-10', '12:00')),
    ).toMatchObject({
      isOpen: false,
      tone: 'closed',
      label: 'Fechado temporariamente',
      reason: 'MANUALLY_CLOSED',
    });
    expect(getRestaurantAvailability(schedule, true, atSaoPaulo('2026-08-10', '12:00'))).toEqual({
      isOpen: true,
      tone: 'open',
      label: 'Aberto agora',
      detail: 'Fecha às 23:00',
      reason: 'OPEN',
    });
  });

  it('informa a próxima abertura quando está fora do expediente', () => {
    const schedule = weeklySchedule({
      monday: day('monday', 'Segunda-feira', '18:00', '23:00'),
      tuesday: day('tuesday', 'Terça-feira', '11:00', '23:00'),
    });

    expect(
      getRestaurantAvailability(schedule, true, atSaoPaulo('2026-08-10', '14:00')),
    ).toMatchObject({
      isOpen: false,
      label: 'Fechado agora',
      detail: 'Abre hoje às 18:00',
    });
    expect(
      getRestaurantAvailability(schedule, true, atSaoPaulo('2026-08-10', '23:30')),
    ).toMatchObject({
      isOpen: false,
      detail: 'Abre amanhã às 11:00',
    });
  });

  it('preserva compatibilidade quando nenhuma agenda válida foi persistida', () => {
    expect(isBusinessHoursScheduleConfigured(null)).toBe(false);
    expect(isBusinessHoursScheduleConfigured([])).toBe(false);
    expect(
      isBusinessHoursScheduleConfigured([day('monday', 'Segunda-feira', '11:00', '23:00')]),
    ).toBe(false);
    expect(getRestaurantAvailability(undefined, true, atSaoPaulo('2026-08-09', '12:00'))).toEqual({
      isOpen: true,
      tone: 'open',
      label: 'Aberto para pedidos',
      detail: 'Horário de funcionamento não informado',
      reason: 'SCHEDULE_NOT_CONFIGURED',
    });
  });

  it('usa o fuso do restaurante sem depender do relógio local do navegador', () => {
    const schedule = weeklySchedule({
      monday: day('monday', 'Segunda-feira', '11:00', '23:00'),
    });
    const instant = new Date('2026-08-10T13:30:00.000Z');

    expect(DEFAULT_RESTAURANT_TIME_ZONE).toBe('America/Sao_Paulo');
    expect(getRestaurantAvailability(schedule, true, instant)).toMatchObject({
      isOpen: false,
      detail: 'Abre hoje às 11:00',
    });
    expect(getRestaurantAvailability(schedule, true, instant, 'UTC')).toMatchObject({
      isOpen: true,
      detail: 'Fecha às 23:00',
    });
    expect(getRestaurantBusinessDayId(new Date('2026-08-09T01:30:00.000Z'))).toBe('saturday');
  });
});
