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
