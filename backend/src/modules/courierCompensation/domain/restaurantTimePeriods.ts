const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

function partsAt(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(value.year),
    month: Number(value.month),
    day: Number(value.day),
    hour: Number(value.hour),
    minute: Number(value.minute),
    second: Number(value.second),
  };
}

export function normalizeRestaurantTimeZone(timeZone?: string | null) {
  const candidate = String(timeZone || DEFAULT_TIME_ZONE).trim();
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    throw new Error('Informe um fuso horário IANA válido, como America/Sao_Paulo.');
  }
}

function localMidnightToUtc(year: number, month: number, day: number, timeZone: string) {
  const targetAsUtc = Date.UTC(year, month - 1, day);
  let instant = new Date(targetAsUtc);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = partsAt(instant, timeZone);
    const representedAsUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    instant = new Date(instant.getTime() + (targetAsUtc - representedAsUtc));
  }
  return instant;
}

function addLocalDays(year: number, month: number, day: number, amount: number) {
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function getRestaurantPeriodBoundaries(now: Date, inputTimeZone?: string | null) {
  const timeZone = normalizeRestaurantTimeZone(inputTimeZone);
  const local = partsAt(now, timeZone);
  const localNoon = new Date(Date.UTC(local.year, local.month - 1, local.day, 12));
  const dayOfWeek = localNoon.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const tomorrow = addLocalDays(local.year, local.month, local.day, 1);
  const monday = addLocalDays(local.year, local.month, local.day, -daysSinceMonday);
  const nextMonday = addLocalDays(monday.year, monday.month, monday.day, 7);
  const nextMonthDate = new Date(Date.UTC(local.year, local.month, 1));

  return {
    timeZone,
    today: {
      gte: localMidnightToUtc(local.year, local.month, local.day, timeZone),
      lt: localMidnightToUtc(tomorrow.year, tomorrow.month, tomorrow.day, timeZone),
    },
    week: {
      gte: localMidnightToUtc(monday.year, monday.month, monday.day, timeZone),
      lt: localMidnightToUtc(nextMonday.year, nextMonday.month, nextMonday.day, timeZone),
    },
    month: {
      gte: localMidnightToUtc(local.year, local.month, 1, timeZone),
      lt: localMidnightToUtc(
        nextMonthDate.getUTCFullYear(),
        nextMonthDate.getUTCMonth() + 1,
        1,
        timeZone,
      ),
    },
  };
}
