// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import tableRepository from '../repositories/TableRepository.js';
import resolvePublicTableService from './ResolvePublicTableService.js';

const originalFindPublicByReference = tableRepository.findPublicByReference;

afterEach(() => {
  tableRepository.findPublicByReference = originalFindPublicByReference;
});

const publicTable = {
  id: 91,
  number: 12,
  restaurantId: 7,
  restaurant: {
    slug: 'restaurante-teste',
    settings: {
      tableOrderingEnabled: true,
      waiterCallEnabled: false,
      billRequestEnabled: true,
    },
    subscription: { plan: 'PREMIUM', status: 'ATIVA' },
  },
};

test('resolve a mesa pelo número e pelo restaurante sem confundir com o id interno', async () => {
  let receivedReference = null;
  tableRepository.findPublicByReference = async (reference) => {
    receivedReference = reference;
    return publicTable;
  };

  const result = await resolvePublicTableService.execute({
    tableNumber: '12',
    tableId: '91',
    restaurantId: '7',
    restaurantSlug: 'restaurante-teste',
  });

  assert.deepEqual(receivedReference, {
    number: 12,
    restaurantId: 7,
    restaurantSlug: 'restaurante-teste',
  });
  assert.deepEqual(result, {
    id: 91,
    number: 12,
    restaurantId: 7,
    restaurantSlug: 'restaurante-teste',
    tableOrderingEnabled: true,
    waiterCallEnabled: false,
    billRequestEnabled: true,
  });
});

test('rejeita QR sem restaurante e mesa pertencente a outro id', async () => {
  await assert.rejects(
    () => resolvePublicTableService.execute({ tableNumber: 12 }),
    /não identifica o restaurante/i,
  );

  tableRepository.findPublicByReference = async () => publicTable;
  await assert.rejects(
    () =>
      resolvePublicTableService.execute({
        tableNumber: 12,
        tableId: 92,
        restaurantId: 7,
      }),
    /não encontrada neste restaurante/i,
  );
});

test('rejeita restaurante fora do plano de cardápio de mesa', async () => {
  tableRepository.findPublicByReference = async () => ({
    ...publicTable,
    restaurant: {
      ...publicTable.restaurant,
      subscription: { plan: 'BASICO', status: 'ATIVA' },
    },
  });

  await assert.rejects(
    () =>
      resolvePublicTableService.execute({
        tableNumber: 12,
        restaurantSlug: 'restaurante-teste',
      }),
    /não está disponível/i,
  );
});
