import tablePaymentReservationExpirationJob from './TablePaymentReservationExpirationJob.js';

let timer: NodeJS.Timeout | null = null;

export function startTablePaymentJobs() {
  if (timer) {
    return;
  }

  const configuredInterval = Number(process.env.TABLE_PAYMENT_EXPIRATION_INTERVAL_MS || 60_000);
  const intervalMs =
    Number.isSafeInteger(configuredInterval) && configuredInterval >= 10_000
      ? configuredInterval
      : 60_000;

  timer = setInterval(() => {
    tablePaymentReservationExpirationJob.execute().catch((error) => {
      console.error(
        '[TABLE_PAYMENT_EXPIRATION_JOB_ERROR]',
        error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      );
    });
  }, intervalMs);
  timer.unref();
}

export function stopTablePaymentJobs() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
