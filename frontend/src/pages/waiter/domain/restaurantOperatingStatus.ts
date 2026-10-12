import type { BusinessHour } from '../../admin/types';
import {
  DEFAULT_RESTAURANT_TIME_ZONE,
  getRestaurantAvailability,
  getRestaurantBusinessDayId,
  isBusinessHoursScheduleConfigured,
} from '../../admin/domain/businessHours';

type OperatingStatus = {
  hoursLabel: string;
  label: string;
  tone: 'open' | 'closed' | 'unknown';
};

function getLocalMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_RESTAURANT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hours = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minutes = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return hours * 60 + minutes;
}

function minutes(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function formatHour(value: string) {
  const [hour, minute] = value.split(':');
  return minute === '00' ? `${Number(hour)}h` : `${Number(hour)}h${minute}`;
}

export function getWaiterOperatingStatus(
  hours: BusinessHour[] | null | undefined,
  acceptingOrders: boolean | undefined,
  date = new Date(),
): OperatingStatus {
  if (!isBusinessHoursScheduleConfigured(hours)) {
    return {
      hoursLabel: 'Horários não configurados',
      label: acceptingOrders === false ? 'Pedidos pausados' : 'Configure o funcionamento no ADMIN',
      tone: acceptingOrders === false ? 'closed' : 'unknown',
    };
  }

  const today = getRestaurantBusinessDayId(date);
  const previous = getRestaurantBusinessDayId(new Date(date.getTime() - 24 * 60 * 60 * 1000));
  const localMinute = getLocalMinutes(date);
  const previousDay = hours.find((item) => item.id === previous);
  const overnight = previousDay?.enabled &&
    minutes(previousDay.closingTime) < minutes(previousDay.openingTime) &&
    localMinute < minutes(previousDay.closingTime);
  const todayDay = hours.find((item) => item.id === today);
  const currentShift = overnight ? previousDay : todayDay;
  const hoursLabel = currentShift?.enabled
    ? `Salão · ${formatHour(currentShift.openingTime)} às ${formatHour(currentShift.closingTime)}`
    : 'Salão · fechado hoje';
  const availability = getRestaurantAvailability(hours, acceptingOrders, date);
  return {
    hoursLabel,
    label: acceptingOrders === false
      ? 'Pedidos pausados'
      : availability.isOpen
        ? 'Atendimento em andamento'
        : 'Encerrado',
    tone: availability.isOpen ? 'open' : 'closed',
  };
}
