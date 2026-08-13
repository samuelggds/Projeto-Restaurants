import type { BusinessHour } from "../types";
export type BusinessHoursErrors = Partial<Record<string, string>>;
export function normalizeBusinessHours(value: unknown, fallback: BusinessHour[]): BusinessHour[] {
  if (!Array.isArray(value)) return fallback;
  return fallback.map((day) => {
    const saved = value.find((item) => typeof item === "object" && item !== null && String((item as Record<string, unknown>).id) === day.id) as Record<string, unknown> | undefined;
    return saved ? { id: day.id, label: day.label, enabled: Boolean(saved.enabled), openingTime: /^\d{2}:\d{2}$/.test(String(saved.openingTime)) ? String(saved.openingTime) : day.openingTime, closingTime: /^\d{2}:\d{2}$/.test(String(saved.closingTime)) ? String(saved.closingTime) : day.closingTime } : day;
  });
}
export function validateBusinessHours(hours: BusinessHour[]): BusinessHoursErrors {
  const errors: BusinessHoursErrors = {};
  hours.forEach((day) => { if (day.enabled && (!/^\d{2}:\d{2}$/.test(day.openingTime) || !/^\d{2}:\d{2}$/.test(day.closingTime) || day.openingTime >= day.closingTime)) errors[day.id] = "O fechamento deve ser depois da abertura."; });
  return errors;
}
export function getTodayBusinessHours(hours: BusinessHour[], date = new Date()) {
  const ids = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = hours.find((item) => item.id === ids[date.getDay()]);
  return !today || !today.enabled ? "Hoje: fechado" : `Hoje: ${today.openingTime} às ${today.closingTime}`;
}
export function isRestaurantOpenNow(hours: BusinessHour[], date = new Date()) {
  const ids = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = hours.find((item) => item.id === ids[date.getDay()]);
  if (!today?.enabled) return false;
  const now = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return now >= today.openingTime && now < today.closingTime;
}

export function isRestaurantOpenForOrders(value: unknown) {
  return value !== false;
}
