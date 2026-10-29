import { NfcDebtDeadlineMode } from '@prisma/client';
import {
  type BusinessDayId,
  normalizeBusinessHours,
} from '../../restaurantSettings/utils/businessHours.js';
import { resolveRestaurantTimeZone } from '../../orders/utils/restaurantAvailability.js';

const DAY_IDS: readonly BusinessDayId[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];
const BY_WEEKDAY: Record<string, BusinessDayId> = {
  Sun: 'sunday', Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday',
  Thu: 'thursday', Fri: 'friday', Sat: 'saturday',
};
const ONE_MINUTE = 60_000;
const ONE_DAY = 24 * 60 * ONE_MINUTE;

export function normalizeNfcDebtDeadlineMode(value: unknown): NfcDebtDeadlineMode {
  if (value === undefined || value === NfcDebtDeadlineMode.TWENTY_FOUR_HOURS) {
    return NfcDebtDeadlineMode.TWENTY_FOUR_HOURS;
  }
  if (value === NfcDebtDeadlineMode.BUSINESS_CLOSING) {
    return NfcDebtDeadlineMode.BUSINESS_CLOSING;
  }
  throw new Error('Selecione um prazo NFC válido: 24 horas ou fechamento do estabelecimento.');
}

export function assertNfcClosingSchedule(mode: NfcDebtDeadlineMode, schedule: unknown) {
  if (mode !== NfcDebtDeadlineMode.BUSINESS_CLOSING) return;
  const days = normalizeBusinessHours(schedule);
  if (!days?.some((day) => day.enabled)) {
    throw new Error('Configure os horários de funcionamento e ao menos um dia aberto antes de selecionar fechamento do estabelecimento.');
  }
}

type ZonedParts = {
  dayId: BusinessDayId;
  year: number;
  month: number;
  day: number;
  minuteOfDay: number;
};

function zonedPartsAt(date: Date, formatter: Intl.DateTimeFormat): ZonedParts {
  const values = Object.fromEntries(
    formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  );
  const dayId = BY_WEEKDAY[values.weekday];
  const hour = Number(values.hour) % 24;
  const minute = Number(values.minute);
  const year = Number(values.year), month = Number(values.month), day = Number(values.day);
  if (!dayId || !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) ||
      !Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error('Não foi possível calcular o relógio local do restaurante.');
  }
  return { dayId, year, month, day, minuteOfDay: hour * 60 + minute };
}

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Freeze the payment deadline when the visit opens.
 * It is NOT recalculated from mutable business hours when checking debt.
 *
 * Business closing uses the end of the active schedule window; shifts like
 * 18:00 -> 02:00 therefore end on the following calendar day.
 */
export function calculateNfcComandaDueAt(input: {
  openedAt: Date;
  mode: NfcDebtDeadlineMode;
  businessHours: unknown;
  timeZone?: unknown;
}): Date {
  const { openedAt, mode } = input;
  if (!Number.isFinite(openedAt.getTime())) throw new Error('Horário de abertura NFC inválido.');
  if (mode === NfcDebtDeadlineMode.TWENTY_FOUR_HOURS) {
    return new Date(openedAt.getTime() + ONE_DAY);
  }
  if (mode !== NfcDebtDeadlineMode.BUSINESS_CLOSING) {
    throw new Error('Modo de vencimento NFC não reconhecido.');
  }

  assertNfcClosingSchedule(mode, input.businessHours);
  const schedule = normalizeBusinessHours(input.businessHours)!;
  const timeZone = resolveRestaurantTimeZone(input.timeZone);
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
    timeZone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const now = zonedPartsAt(openedAt, formatter);
  const todayIndex = DAY_IDS.indexOf(now.dayId);
  const today = schedule.find((day) => day.id === now.dayId);
  const previous = schedule.find((day) => day.id === DAY_IDS[(todayIndex + 6) % 7]);
  let closingMinutes: number | null = null;
  let dayOffset = 0;

  if (today?.enabled) {
    const opening = toMinutes(today.openingTime), closing = toMinutes(today.closingTime);
    if (opening < closing && now.minuteOfDay >= opening && now.minuteOfDay < closing) {
      closingMinutes = closing;
    } else if (opening > closing && now.minuteOfDay >= opening) {
      closingMinutes = closing;
      dayOffset = 1;
    }
  }
  if (closingMinutes === null && previous?.enabled) {
    const opening = toMinutes(previous.openingTime), closing = toMinutes(previous.closingTime);
    if (opening > closing && now.minuteOfDay < closing) {
      closingMinutes = closing;
    }
  }

  if (closingMinutes === null) {
    throw new Error('Não é possível abrir comanda NFC fora do horário de funcionamento configurado para bloqueio no fechamento.');
  }

  // UTC-shaped local calendar minutes: compare zone-local date/time, not UTC clock.
  // Searching the upcoming minutes handles offsets (including daylight saving
  // transitions) without assuming that every restaurant is in São Paulo.
  const localTarget = Date.UTC(now.year, now.month - 1, now.day + dayOffset,
    Math.floor(closingMinutes / 60), closingMinutes % 60);
  const start = Math.ceil(openedAt.getTime() / ONE_MINUTE) * ONE_MINUTE;
  for (let instant = start; instant <= openedAt.getTime() + 27 * 60 * ONE_MINUTE; instant += ONE_MINUTE) {
    const parts = zonedPartsAt(new Date(instant), formatter);
    const nominalTime = Date.UTC(parts.year, parts.month - 1, parts.day,
      Math.floor(parts.minuteOfDay / 60), parts.minuteOfDay % 60);
    if (nominalTime >= localTarget) return new Date(instant);
  }
  throw new Error('Não foi possível determinar o próximo fechamento do restaurante.');
}
