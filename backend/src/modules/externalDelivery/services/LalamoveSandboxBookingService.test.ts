import assert from 'node:assert/strict';
import test from 'node:test';
import { LalamoveSandboxBookingService } from './LalamoveSandboxBookingService.js';

test('contratação Lalamove está desabilitada por padrão antes de acessar banco ou provedor', async () => {
  const previous = process.env.LALAMOVE_SANDBOX_BOOKING_ENABLED;
  delete process.env.LALAMOVE_SANDBOX_BOOKING_ENABLED;
  let providerCalls = 0;
  try {
    const service = new LalamoveSandboxBookingService({
      place: async () => {
        providerCalls++;
        return { orderId: '1', status: 'NEW', shareLink: null };
      },
    });
    await assert.rejects(
      () => service.book({ restaurantId: 1, actorId: 1, orderId: 1, expectedVersion: 1 }),
      /não habilitada/u,
    );
    assert.equal(providerCalls, 0);
  } finally {
    if (previous === undefined) delete process.env.LALAMOVE_SANDBOX_BOOKING_ENABLED;
    else process.env.LALAMOVE_SANDBOX_BOOKING_ENABLED = previous;
  }
});

test('ID, versão e tenant inválidos falham antes da operação financeira', async () => {
  const service = new LalamoveSandboxBookingService();
  await assert.rejects(
    () => service.book({ restaurantId: 0, actorId: 1, orderId: 1, expectedVersion: 1 }),
    /inválida/u,
  );
  await assert.rejects(
    () => service.book({ restaurantId: 1, actorId: 1, orderId: 1, expectedVersion: 0 }),
    /inválida/u,
  );
});
