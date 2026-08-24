import type { BusinessHour } from '../types';

export type BusinessHoursErrors = Partial<Record<string, string>>;

export type RestaurantAvailability = {
  isOpen: boolean;
  tone: 'open' | 'closed';
  label: string;
  detail: string;
  reason: 'OPEN' | 'MANUALLY_CLOSED' | 'OUTSIDE_HOURS' | 'SCHEDULE_NOT_CONFIGURED';
};

const DAY_IDS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;
const VALID_DAY_IDS = new Set<string>(DAY_IDS);
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_RESTAURANT_TIME_ZONE = 'America/Sao_Paulo';

const SHORT_WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

type RestaurantClock = {
  dayIndex: number;
  minuteOfDay: number;
};

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

function timeInMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function restaurantClockAt(date: Date, timeZone = DEFAULT_RESTAURANT_TIME_ZONE): RestaurantClock {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
      timeZone: DEFAULT_RESTAURANT_TIME_ZONE,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  }

  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === 'weekday')?.value || 'Sun';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0) % 24;
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return {
    dayIndex: SHORT_WEEKDAY_TO_INDEX[weekday] ?? 0,
    minuteOfDay: hour * 60 + minute,
  };
}

function dayAt(hours: BusinessHour[], dayIndex: number, offset = 0) {
  const normalizedIndex = (dayIndex + offset + DAY_IDS.length) % DAY_IDS.length;
  return hours.find((item) => item.id === DAY_IDS[normalizedIndex]);
}

function isUsableDay(day: BusinessHour | undefined): day is BusinessHour {
  return Boolean(
    day?.enabled &&
    isValidTime(day.openingTime) &&
    isValidTime(day.closingTime) &&
    day.openingTime !== day.closingTime,
  );
}

/**
 * Missing or incomplete schedules preserve the legacy manual-open behavior.
 * Only a complete week saved by the admin becomes authoritative.
 */
export function isBusinessHoursScheduleConfigured(value: unknown): value is BusinessHour[] {
  if (!Array.isArray(value) || value.length !== DAY_IDS.length) return false;

  const ids = new Set<string>();
  const isValid = value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const day = item as Record<string, unknown>;
    const id = String(day.id || '');
    if (!VALID_DAY_IDS.has(id) || ids.has(id) || typeof day.enabled !== 'boolean') return false;
    ids.add(id);
    return (
      isValidTime(day.openingTime) &&
      isValidTime(day.closingTime) &&
      (day.enabled === false || day.openingTime !== day.closingTime)
    );
  });
  return isValid && ids.size === DAY_IDS.length;
}

export function normalizeBusinessHours(value: unknown, fallback: BusinessHour[]): BusinessHour[] {
  if (!Array.isArray(value)) return fallback;
  return fallback.map((day) => {
    const saved = value.find(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        String((item as Record<string, unknown>).id) === day.id,
    ) as Record<string, unknown> | undefined;
    return saved
      ? {
          id: day.id,
          label: day.label,
          enabled: Boolean(saved.enabled),
          openingTime: isValidTime(saved.openingTime) ? String(saved.openingTime) : day.openingTime,
          closingTime: isValidTime(saved.closingTime) ? String(saved.closingTime) : day.closingTime,
        }
      : day;
  });
}

export function resolveEditableBusinessHours(value: unknown, fallback: BusinessHour[]) {
  return {
    businessHours: normalizeBusinessHours(value, fallback),
    businessHoursConfigured: isBusinessHoursScheduleConfigured(value),
  };
}

export function serializeBusinessHours(
  businessHours: BusinessHour[],
  businessHoursConfigured: boolean,
) {
  return businessHoursConfigured ? { businessHours } : {};
}

export function validateBusinessHours(hours: BusinessHour[]): BusinessHoursErrors {
  const errors: BusinessHoursErrors = {};
  hours.forEach((day) => {
    if (!day.enabled) return;
    if (!isValidTime(day.openingTime) || !isValidTime(day.closingTime)) {
      errors[day.id] = 'Informe horários válidos.';
      return;
    }
    if (day.openingTime === day.closingTime) {
      errors[day.id] = 'A abertura e o fechamento não podem ter o mesmo horário.';
    }
  });
  return errors;
}

export function getRestaurantBusinessDayId(
  date = new Date(),
  timeZone = DEFAULT_RESTAURANT_TIME_ZONE,
) {
  return DAY_IDS[restaurantClockAt(date, timeZone).dayIndex];
}

export function getTodayBusinessHours(
  hours: BusinessHour[],
  date = new Date(),
  timeZone = DEFAULT_RESTAURANT_TIME_ZONE,
) {
  const clock = restaurantClockAt(date, timeZone);
  const today = dayAt(hours, clock.dayIndex);
  return !today || !today.enabled
    ? 'Hoje: fechado'
    : `Hoje: ${today.openingTime} às ${today.closingTime}`;
}

function getActiveClosingTime(hours: BusinessHour[], date: Date, timeZone: string) {
  const clock = restaurantClockAt(date, timeZone);
  const now = clock.minuteOfDay;
  const today = dayAt(hours, clock.dayIndex);

  if (isUsableDay(today)) {
    const opening = timeInMinutes(today.openingTime);
    const closing = timeInMinutes(today.closingTime);
    const crossesMidnight = closing < opening;
    if (
      (!crossesMidnight && now >= opening && now < closing) ||
      (crossesMidnight && now >= opening)
    ) {
      return today.closingTime;
    }
  }

  const yesterday = dayAt(hours, clock.dayIndex, -1);
  if (isUsableDay(yesterday)) {
    const opening = timeInMinutes(yesterday.openingTime);
    const closing = timeInMinutes(yesterday.closingTime);
    if (closing < opening && now < closing) return yesterday.closingTime;
  }

  return null;
}

function nextOpeningDetail(hours: BusinessHour[], date: Date, timeZone: string) {
  const clock = restaurantClockAt(date, timeZone);
  const now = clock.minuteOfDay;

  for (let offset = 0; offset <= 7; offset += 1) {
    const day = dayAt(hours, clock.dayIndex, offset);
    if (!isUsableDay(day)) continue;
    const opening = timeInMinutes(day.openingTime);
    if (offset === 0 && now >= opening) continue;

    if (offset === 0) return `Abre hoje às ${day.openingTime}`;
    if (offset === 1) return `Abre amanhã às ${day.openingTime}`;
    return `Abre ${day.label.toLocaleLowerCase('pt-BR')} às ${day.openingTime}`;
  }

  return 'Sem próxima abertura cadastrada';
}

export function isRestaurantOpenNow(
  hours: BusinessHour[],
  date = new Date(),
  timeZone = DEFAULT_RESTAURANT_TIME_ZONE,
) {
  return getActiveClosingTime(hours, date, timeZone) !== null;
}

export function isRestaurantOpenForOrders(value: unknown) {
  return value !== false;
}

export function getRestaurantAvailability(
  hours: BusinessHour[] | null | undefined,
  isOpenForOrders: unknown,
  date = new Date(),
  timeZone = DEFAULT_RESTAURANT_TIME_ZONE,
): RestaurantAvailability {
  if (!isRestaurantOpenForOrders(isOpenForOrders)) {
    return {
      isOpen: false,
      tone: 'closed',
      label: 'Fechado temporariamente',
      detail: 'O restaurante pausou os novos pedidos',
      reason: 'MANUALLY_CLOSED',
    };
  }

  if (!isBusinessHoursScheduleConfigured(hours)) {
    return {
      isOpen: true,
      tone: 'open',
      label: 'Aberto para pedidos',
      detail: 'Horário de funcionamento não informado',
      reason: 'SCHEDULE_NOT_CONFIGURED',
    };
  }

  const closingTime = getActiveClosingTime(hours, date, timeZone);
  if (closingTime) {
    return {
      isOpen: true,
      tone: 'open',
      label: 'Aberto agora',
      detail: `Fecha às ${closingTime}`,
      reason: 'OPEN',
    };
  }

  return {
    isOpen: false,
    tone: 'closed',
    label: 'Fechado agora',
    detail: nextOpeningDetail(hours, date, timeZone),
    reason: 'OUTSIDE_HOURS',
  };
}
