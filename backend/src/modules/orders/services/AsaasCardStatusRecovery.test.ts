// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import repository from '../repositories/OrderRepository.js';
import verification from './AsaasPaymentVerificationService.js';
import finalizer from './FinalizeOrderCardPaymentService.js';
import service from './GetOrderCardPaymentStatusService.js';

const originals = {
  find: repository.findCardPaymentStatusByPublicId,
  verify: verification.execute,
  finalize: finalizer.execute,
};
const orderPublicId = '123e4567-e89b-42d3-a456-426614174001';
let verifyCalls;
let finalizations;
let approved;
beforeEach(() => {
  verifyCalls = 0;
  finalizations = 0;
  approved = true;
  repository.findCardPaymentStatusByPublicId = async () => ({
    id: 91,
    restaurantId: 7,
    userId: 15,
    publicId: orderPublicId,
    total: 59.9,
    paymentMethod: 'CARTAO',
    payOnDelivery: false,
    type: 'DELIVERY',
    paid: false,
    status: 'PENDENTE',
    cardCheckoutSessionId: 'asaas_pay:pay_91',
  });
  verification.execute = async (input) => {
    verifyCalls += 1;
    assert.deepEqual(input, {
      restaurantId: 7,
      orderId: 91,
      total: 59.9,
      method: 'CARTAO',
      paymentId: 'pay_91',
    });
    return { approved };
  };
  finalizer.execute = async (input) => {
    finalizations += 1;
    assert.deepEqual(input, {
      orderId: 91,
      restaurantId: 7,
      checkoutSessionId: 'asaas_pay:pay_91',
    });
    return { paid: true, status: 'PENDENTE' };
  };
});
afterEach(() => {
  repository.findCardPaymentStatusByPublicId = originals.find;
  verification.execute = originals.verify;
  finalizer.execute = originals.finalize;
});

test('retorno do checkout recupera aprovação Asaas confirmada no servidor', async () => {
  const result = await service.execute({ restaurantId: 7, orderPublicId, userId: 15 });
  assert.equal(result.paid, true);
  assert.equal(verifyCalls, 1);
  assert.equal(finalizations, 1);
});
test('consulta não faz chamadas financeiras para outro cliente', async () => {
  await assert.rejects(
    service.execute({ restaurantId: 7, orderPublicId, userId: 99 }),
    /não encontrado/,
  );
  assert.equal(verifyCalls, 0);
  assert.equal(finalizations, 0);
});
test('pagamento não aprovado segue pendente sem finalização', async () => {
  approved = false;
  assert.equal((await service.execute({ restaurantId: 7, orderPublicId, userId: 15 })).paid, false);
  assert.equal(finalizations, 0);
});
test('timeout de consulta mantém pedido pendente para nova conciliação', async () => {
  verification.execute = async () => {
    throw new Error('timeout');
  };
  assert.equal(
    (await service.execute({ restaurantId: 7, orderPublicId, userId: 15 })).status,
    'PENDING',
  );
  assert.equal(finalizations, 0);
});
