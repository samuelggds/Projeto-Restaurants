export type CommercialWhatsappPeriod = { enabled: boolean; start: string; end: string };
export type CommercialWhatsappDay = {
  weekday: number;
  enabled: boolean;
  periods: [CommercialWhatsappPeriod, CommercialWhatsappPeriod];
};

export const DEFAULT_COMMERCIAL_WHATSAPP_HOURS: CommercialWhatsappDay[] = Array.from(
  { length: 7 },
  (_, weekday) => ({
    weekday,
    enabled: weekday >= 1 && weekday <= 5,
    periods: [
      { enabled: weekday >= 1 && weekday <= 5, start: '08:00', end: '12:00' },
      { enabled: weekday >= 1 && weekday <= 5, start: '14:00', end: '18:00' },
    ],
  }),
);

function clockMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/u.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function normalizeCommercialWhatsappHours(value: unknown): CommercialWhatsappDay[] {
  if (!Array.isArray(value) || value.length !== 7) return DEFAULT_COMMERCIAL_WHATSAPP_HOURS;
  const normalized = value.map((raw, weekday) => {
    const item = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const periodsRaw = Array.isArray(item.periods) ? item.periods.slice(0, 2) : [];
    const periods = [0, 1].map((index) => {
      const period =
        periodsRaw[index] && typeof periodsRaw[index] === 'object'
          ? (periodsRaw[index] as Record<string, unknown>)
          : {};
      return {
        enabled: period.enabled === true,
        start: String(period.start || '08:00'),
        end: String(period.end || '12:00'),
      };
    }) as [CommercialWhatsappPeriod, CommercialWhatsappPeriod];
    return { weekday, enabled: item.enabled === true, periods };
  });
  return normalized;
}

export function validateCommercialWhatsappHours(hours: CommercialWhatsappDay[]) {
  for (const day of hours) {
    if (!day.enabled) continue;
    const active = day.periods.filter((period) => period.enabled);
    for (const period of active) {
      const start = clockMinutes(period.start);
      const end = clockMinutes(period.end);
      if (start === null || end === null || start >= end) {
        return 'Cada período deve ter um horário inicial menor que o horário final.';
      }
    }
    if (active.length === 2) {
      const firstStart = clockMinutes(active[0].start)!;
      const firstEnd = clockMinutes(active[0].end)!;
      const secondStart = clockMinutes(active[1].start)!;
      const secondEnd = clockMinutes(active[1].end)!;
      if (Math.max(firstStart, secondStart) < Math.min(firstEnd, secondEnd)) {
        return 'Os dois períodos do mesmo dia não podem se sobrepor.';
      }
    }
  }
  return null;
}

function zonedParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    weekday: weekdays[values.weekday] ?? 0,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

export function isCommercialWhatsappHumanServiceOpen(
  hoursInput: unknown,
  timeZone: string,
  now = new Date(),
) {
  const hours = normalizeCommercialWhatsappHours(hoursInput);
  const current = zonedParts(now, timeZone);
  const day = hours[current.weekday];
  if (!day?.enabled) return false;
  return day.periods.some((period) => {
    if (!period.enabled) return false;
    const start = clockMinutes(period.start);
    const end = clockMinutes(period.end);
    return start !== null && end !== null && current.minutes >= start && current.minutes < end;
  });
}

export function formatCommercialWhatsappSchedule(hoursInput: unknown) {
  const hours = normalizeCommercialWhatsappHours(hoursInput);
  const labels = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  return hours
    .filter((day) => day.enabled && day.periods.some((period) => period.enabled))
    .map((day) => {
      const periods = day.periods
        .filter((period) => period.enabled)
        .map((period) => `${period.start}–${period.end}`)
        .join(' e ');
      return `${labels[day.weekday]}: ${periods}`;
    })
    .join('; ');
}
