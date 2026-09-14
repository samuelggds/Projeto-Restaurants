import { addDays } from './dateUtils.js';

const DEFAULT_INVOICE_OPEN_DAYS = 5;

type Environment = Record<string, string | undefined>;

type SubscriptionPeriodLike = {
  currentPeriodEnd?: Date | string | null;
  trialEndsAt?: Date | string | null;
};

function validDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getInvoiceOpenDaysBeforeDue(env: Environment = process.env) {
  const rawValue =
    env.BILLING_INVOICE_OPEN_DAYS_BEFORE_DUE ?? env.BILLING_PIX_OPEN_DAYS_BEFORE_DUE;

  if (rawValue === undefined || rawValue.trim() === '') {
    return DEFAULT_INVOICE_OPEN_DAYS;
  }

  const configured = Number(rawValue);
  if (!Number.isFinite(configured) || configured < 0 || configured > 31) {
    return DEFAULT_INVOICE_OPEN_DAYS;
  }

  return Math.floor(configured);
}

export function getInvoiceCreationDate(
  dueDate: Date | string,
  env: Environment = process.env,
) {
  const normalized = validDate(dueDate);
  if (!normalized) throw new Error('Data de vencimento inválida.');
  return addDays(normalized, -getInvoiceOpenDaysBeforeDue(env));
}

export function isInvoiceCreationDue(
  dueDate: Date | string,
  now = new Date(),
  env: Environment = process.env,
) {
  return now >= getInvoiceCreationDate(dueDate, env);
}

export function addBillingMonth(dateValue: Date | string) {
  const source = validDate(dateValue);
  if (!source) throw new Error('Data de ciclo inválida.');

  const result = new Date(source);
  const billingDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + 1);
  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
    result.getHours(),
    result.getMinutes(),
    result.getSeconds(),
    result.getMilliseconds(),
  ).getDate();
  result.setDate(Math.min(billingDay, lastDayOfTargetMonth));
  return result;
}

export function resolveSubscriptionDueDate(subscription: SubscriptionPeriodLike) {
  const currentPeriodEnd = validDate(subscription.currentPeriodEnd);
  if (currentPeriodEnd) return currentPeriodEnd;

  const trialEndsAt = validDate(subscription.trialEndsAt);
  if (trialEndsAt) return trialEndsAt;

  return null;
}

export function invoicePeriodFromDueDate(dueDateValue: Date | string) {
  const dueDate = validDate(dueDateValue);
  if (!dueDate) throw new Error('Data de vencimento inválida.');

  return {
    month: dueDate.getMonth() + 1,
    year: dueDate.getFullYear(),
  };
}

export function nextSubscriptionPeriod(currentPeriodEndValue: Date | string) {
  const currentPeriodEnd = validDate(currentPeriodEndValue);
  if (!currentPeriodEnd) throw new Error('Fim do período atual inválido.');

  return {
    currentPeriodStart: currentPeriodEnd,
    currentPeriodEnd: addBillingMonth(currentPeriodEnd),
  };
}
