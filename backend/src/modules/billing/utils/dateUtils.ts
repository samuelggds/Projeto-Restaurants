export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addBusinessDays(date, businessDays) {
  const result = new Date(date);
  let added = 0;

  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!isWeekend) {
      added += 1;
    }
  }

  return result;
}
