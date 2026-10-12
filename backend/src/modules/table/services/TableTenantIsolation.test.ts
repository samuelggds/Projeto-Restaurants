// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import tableRepository from '../repositories/TableRepository.js';
import updateTableService from './UpdateTableService.js';

const originals = {
  findByIdForRestaurant: tableRepository.findByIdForRestaurant,
  findByNumber: tableRepository.findByNumber,
  update: tableRepository.update,
};

afterEach(() => {
  tableRepository.findByIdForRestaurant = originals.findByIdForRestaurant;
  tableRepository.findByNumber = originals.findByNumber;
  tableRepository.update = originals.update;
});

test('ADMIN do Restaurante A não altera uma mesa real pertencente ao Restaurante B', async () => {
  let updateCalls = 0;
  tableRepository.findByIdForRestaurant = async (tableId, restaurantId) => {
    assert.equal(tableId, 91);
    assert.equal(restaurantId, 7);
    return null;
  };
  tableRepository.update = async () => {
    updateCalls += 1;
    throw new Error('não deveria atualizar mesa');
  };

  await assert.rejects(
    () => updateTableService.execute({ id: 91, restaurantId: 7, number: 12 }),
    /Mesa não encontrada/i,
  );
  assert.equal(updateCalls, 0);
});

test('ADMIN não altera lugares de mesa pertencente a outro restaurante', async () => {
  let updates = 0;
  tableRepository.findByIdForRestaurant = async (id, restaurantId) => {
    assert.equal(id, 91);
    assert.equal(restaurantId, 7);
    return null;
  };
  tableRepository.update = async () => { updates++; throw new Error('Não deveria atualizar'); };
  await assert.rejects(
    () => updateTableService.execute({ id: 91, restaurantId: 7, seatCapacity: 6 }),
    /Mesa não encontrada/i,
  );
  assert.equal(updates, 0);
});

test('ADMIN atualiza capacidade da mesa do seu tenant sem alterar token e pedidos', async () => {
  tableRepository.findByIdForRestaurant = async (id, restaurantId) => {
    assert.equal(id, 91);
    assert.equal(restaurantId, 7);
    return { id: 91, number: 12, restaurantId: 7, seatCapacity: null, token: 'qr-opaco' };
  };
  tableRepository.update = async (id, restaurantId, data) => {
    assert.equal(id, 91); assert.equal(restaurantId, 7);
    assert.deepEqual(data, { seatCapacity: 6 });
    return { id: 91, restaurantId: 7, seatCapacity: 6, token: 'qr-opaco' };
  };
  const updated = await updateTableService.execute({ id: 91, restaurantId: 7, seatCapacity: 6 });
  assert.equal(updated.seatCapacity, 6);
  assert.equal(updated.token, 'qr-opaco');
});

test('ADMIN não grava capacidade inválida na mesa', async () => {
  let updates = 0;
  tableRepository.findByIdForRestaurant = async () =>
    ({ id: 91, number: 12, restaurantId: 7, seatCapacity: 4 });
  tableRepository.update = async () => { updates++; throw new Error('Capacidade inválida'); };
  for (const invalid of [0, -2, 51, '1.5', 'abc']) {
    await assert.rejects(
      () => updateTableService.execute({ id: 91, restaurantId: 7, seatCapacity: invalid }),
      /lugares/i,
    );
  }
  assert.equal(updates, 0);
});
