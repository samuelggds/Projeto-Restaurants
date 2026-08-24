import {
  type BusinessDayId,
  tryNormalizeBusinessHours,
} from '../../restaurantSettings/utils/businessHours.js';

export const RESTAURANT_CLOSED_MESSAGE =
  'O restaurante está fechado no momento e não está recebendo pedidos.';

export const DEFAULT_RESTAURANT_TIME_ZONE = 'America/Sao_Paulo';

const DAY_IDS_BY_WEEKDAY: Record<string, BusinessDayId> = {
  Sun: 'sunday',
  Mon: 'monday',
  Tue: 'tuesday',
  Wed: 'wednesday',
  Thu: 'thursday',
  Fri: 'friday',
  Sat: 'saturday',
};

const PREVIOUS_DAY: Record<BusinessDayId, BusinessDayId> = {
  monday: 'sunday',
  tuesday: 'monday',
  wednesday: 'tuesday',
  thursday: 'wednesday',
  friday: 'thursday',
  saturday: 'friday',
  sunday: 'saturday',
};

const zonedClockFormatters = new Map<string, Intl.DateTimeFormat>();

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function resolveRestaurantTimeZone(timeZone?: unknown) {
  const requested = typeof timeZone === 'string' ? timeZone.trim() : '';
  return requested && isValidTimeZone(requested) ? requested : DEFAULT_RESTAURANT_TIME_ZONE;
}

function getZonedClock(now: Date, timeZone?: unknown) {
  const resolvedTimeZone = resolveRestaurantTimeZone(timeZone);
  let formatter = zonedClockFormatters.get(resolvedTimeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTimeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    zonedClockFormatters.set(resolvedTimeZone, formatter);
  }

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  const hours = Number(parts.find((part) => part.type === 'hour')?.value);
  const minutes = Number(parts.find((part) => part.type === 'minute')?.value);
  const dayId = weekday ? DAY_IDS_BY_WEEKDAY[weekday] : undefined;

  if (!dayId || !Number.isInteger(hours) || !Number.isInteger(minutes)) {
    throw new Error('Não foi possível calcular o horário local do restaurante.');
  }

  return { dayId, minuteOfDay: hours * 60 + minutes };
}

export function isRestaurantOpenForOrders(
  isOpenForOrders: unknown,
  businessHours?: unknown,
  now = new Date(),
  timeZone?: unknown,
) {
  if (isOpenForOrders === false) return false;

  const schedule = tryNormalizeBusinessHours(businessHours);
  if (schedule.length === 0) return true;

  const { dayId, minuteOfDay } = getZonedClock(now, timeZone);
  const currentDay = schedule.find((day) => day.id === dayId);

  if (currentDay?.enabled) {
    const opening = timeToMinutes(currentDay.openingTime);
    const closing = timeToMinutes(currentDay.closingTime);

    if (opening < closing && minuteOfDay >= opening && minuteOfDay < closing) return true;
    if (opening > closing && minuteOfDay >= opening) return true;
  }

  const previousDay = schedule.find((day) => day.id === PREVIOUS_DAY[dayId]);

  if (previousDay?.enabled) {
    const previousOpening = timeToMinutes(previousDay.openingTime);
    const previousClosing = timeToMinutes(previousDay.closingTime);
    if (previousOpening > previousClosing && minuteOfDay < previousClosing) return true;
  }

  return false;
}

export function assertRestaurantIsOpenForOrders(
  isOpenForOrders: unknown,
  businessHours?: unknown,
  now = new Date(),
  timeZone?: unknown,
) {
  if (!isRestaurantOpenForOrders(isOpenForOrders, businessHours, now, timeZone)) {
    throw new Error(RESTAURANT_CLOSED_MESSAGE);
  }
}
