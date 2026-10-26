import { TablePaymentError } from './tablePaymentSupport.js';

// A reserva da mesa é apenas uma transação PostgreSQL. Nunca envolver a
// criação/captura/estorno no gateway neste retry: uma resposta remota perdida
// não autoriza repetir a operação financeira.
const MAX_RETRIES = 4;
const MAX_BACKOFF_MS = 180;

function isRetryableReservationConflict(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; meta?: { target?: unknown } };

  if (candidate.code === 'P2034') return true;
  if (candidate.code !== 'P2002') return false;

  // Só recuperar a colisão da chave única da *mesma tentativa*. Outros
  // índices únicos são erros reais e não podem ser mascarados por retry.
  return JSON.stringify(candidate.meta?.target ?? '').includes('idempotencyKeyHash');
}

export async function retryTablePaymentReservation<T>(
  transaction: () => Promise<T>,
  pause: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds)),
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await transaction();
    } catch (error) {
      if (!isRetryableReservationConflict(error)) throw error;
      if (attempt >= MAX_RETRIES) {
        throw new TablePaymentError(
          'A conta da mesa foi atualizada simultaneamente. Atualize e tente novamente.',
          409,
          'TABLE_PAYMENT_CONFLICT',
        );
      }

      await pause(
        Math.min(MAX_BACKOFF_MS, 25 * 2 ** attempt) + Math.floor(Math.random() * 20),
      );
    }
  }
}
