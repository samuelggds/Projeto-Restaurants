import assert from 'node:assert/strict';
import test from 'node:test';
import validatePinService from './ValidatePinService.js';

test('mantém o endpoint legado de PIN explicitamente desativado', async () => {
  await assert.rejects(
    () => validatePinService.execute({ tableId: 91, pin: '4827' }),
    /validação por PIN foi desativada/i,
  );
});

test('não aceita PIN mesmo quando o payload antigo está completo', async () => {
  await assert.rejects(
    () =>
      validatePinService.execute({
        tableId: 91,
        tableNumber: 12,
        restaurantId: 7,
        restaurantSlug: 'restaurante-teste',
        pin: '4827',
      }),
    /QR Code oficial/i,
  );
});
