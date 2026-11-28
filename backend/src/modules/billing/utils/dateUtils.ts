export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addBusinessDays(date: Date, businessDays: number, timeZone?: string) {
  const result = new Date(date);
  const weekday = timeZone ? new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }) : null;
  let added = 0;

  while (added < businessDays) {
    if (weekday) result.setUTCDate(result.getUTCDate() + 1);
    else result.setDate(result.getDate() + 1);
    const isWeekend = weekday
      ? ['Sat', 'Sun'].includes(weekday.format(result))
      : result.getDay() === 0 || result.getDay() === 6;
    if (!isWeekend) {
      added += 1;
    }
  }

  return result;
}
