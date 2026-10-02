import assert from 'node:assert/strict';
import test from 'node:test';
import {
  safeTablePaymentProviderError,
  shouldReleaseTablePaymentReservationAfterProviderError,
} from './tablePaymentProviderFailure.js';

test('falha antes de resolver o provider libera a reserva com mensagem sanitizada', () => {
  assert.equal(
    shouldReleaseTablePaymentReservationAfterProviderError(
      false,
      new Error('token interno sensível'),
    ),
    true,
  );
  assert.deepEqual(
    safeTablePaymentProviderError(false, new Error('token interno sensível')),
    {
      statusCode: 503,
      code: 'PAYMENT_PROVIDER_NOT_READY',
      message: 'Este método de pagamento não está disponível no momento.',
    },
  );
});

test('recusa explícita do cartão é definitiva e pode liberar a reserva', () => {
  const error = new Error('O cartão não foi autorizado.');
  error.name = 'CardPaymentDeclinedError';

  assert.equal(
    shouldReleaseTablePaymentReservationAfterProviderError(true, error),
    true,
  );
  assert.equal(safeTablePaymentProviderError(true, error).statusCode, 422);
  assert.equal(
    safeTablePaymentProviderError(true, error).code,
    'CARD_PAYMENT_DECLINED',
  );
});

test('falha de validação explícita do provider é definitiva mas não vaza detalhes', () => {
  const error = new Error('provider raw diagnostic should not escape');
  error.name = 'CardPaymentProviderRequestError';

  assert.equal(
    shouldReleaseTablePaymentReservationAfterProviderError(true, error),
    true,
  );
  const safe = safeTablePaymentProviderError(true, error);
  assert.equal(safe.statusCode, 422);
  assert.equal(safe.code, 'CARD_PAYMENT_INVALID');
  assert.doesNotMatch(safe.message, /diagnostic|provider raw/u);
});

test('timeout ou erro 5xx depois de enviar ao provider preserva a reserva para retry idempotente', () => {
  const error = new Error('socket timeout');

  assert.equal(
    shouldReleaseTablePaymentReservationAfterProviderError(true, error),
    false,
  );
  assert.deepEqual(safeTablePaymentProviderError(true, error), {
    statusCode: 502,
    code: 'PAYMENT_PROVIDER_CONFIRMATION_UNKNOWN',
    message:
      'Não foi possível confirmar a resposta do provedor. Tente novamente; a mesma tentativa será reutilizada com segurança.',
  });
});
