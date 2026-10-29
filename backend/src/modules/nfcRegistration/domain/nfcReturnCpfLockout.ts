// Exponential lockout for full-CPF verification at NFC checkout only.
// The first two invalid CPFs are counted without waiting; the third locks for
// 10 minutes, then every subsequent incorrect CPF doubles the previous wait.
// Attempts persist after timeout and reset only on successful card release.
const FIRST_LOCKED_FAILURE = 3;
const INITIAL_LOCKOUT_MS = 10 * 60_000;
const MAX_ATTEMPTS = 2_147_483_647; // PostgreSQL INTEGER / Prisma Int.
const MAX_SUPPORTED_TIMESTAMP = Date.UTC(9999, 11, 31, 23, 59, 59);

export function nextNfcReturnCpfFailure(previousAttempts: number, now: Date) {
  if (!Number.isSafeInteger(previousAttempts) || previousAttempts < 0 || !Number.isFinite(now.getTime())) {
    throw new TypeError('Contador NFC ou relógio inválido.');
  }

  const attempts = Math.min(previousAttempts + 1, MAX_ATTEMPTS);
  if (attempts < FIRST_LOCKED_FAILURE) {
    return { attempts, lockedUntil: null };
  }

  // Saturate only at the database-compatible timestamp limit, never wrap or
  // accidentally unlock if an exponent becomes too large to represent.
  const milliseconds = INITIAL_LOCKOUT_MS * (2 ** (attempts - FIRST_LOCKED_FAILURE));
  const lockedUntil = new Date(Math.min(MAX_SUPPORTED_TIMESTAMP, now.getTime() + milliseconds));
  return { attempts, lockedUntil };
}

export function nfcReturnCpfRemainingMinutes(lockedUntil: Date, now: Date) {
  return Math.max(0, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60_000));
}
