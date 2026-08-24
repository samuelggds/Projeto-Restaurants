// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import bcrypt from 'bcrypt';
import resolvePublicTableService from '../../table/services/ResolvePublicTableService.js';
import tableSessionRepository from '../repositories/TableSessionRepository.js';
import validatePinService from './ValidatePinService.js';

const originalFindOpenedByTable = tableSessionRepository.findOpenedByTable;
const originalResolvePublicTable = resolvePublicTableService.execute;
const originalCompare = bcrypt.compare;

afterEach(() => {
  tableSessionRepository.findOpenedByTable = originalFindOpenedByTable;
  resolvePublicTableService.execute = originalResolvePublicTable;
  bcrypt.compare = originalCompare;
});

const session = {
  id: 51,
  tableId: 91,
  pinHash: 'hash',
  table: { id: 91, number: 12, restaurantId: 7, active: true },
};

test('valida PIN somente quando mesa, número e restaurante correspondem ao QR', async () => {
  tableSessionRepository.findOpenedByTable = async (tableId) => {
    assert.equal(Number(tableId), 91);
    return session;
  };
  resolvePublicTableService.execute = async (payload) => {
    assert.deepEqual(payload, {
      tableId: 91,
      tableNumber: 12,
      restaurantId: 7,
      restaurantSlug: 'restaurante-teste',
    });
    return {
      id: 91,
      number: 12,
      restaurantId: 7,
      restaurantSlug: 'restaurante-teste',
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: false,
    };
  };
  bcrypt.compare = async (pin, hash) => {
    assert.equal(pin, '4827');
    assert.equal(hash, 'hash');
    return true;
  };

  const result = await validatePinService.execute({
    tableId: 91,
    tableNumber: 12,
    restaurantId: 7,
    restaurantSlug: 'restaurante-teste',
    pin: '4827',
  });

  assert.equal(result.tableId, 91);
  assert.equal(result.tableNumber, 12);
  assert.equal(result.restaurantId, 7);
  assert.equal(result.billRequestEnabled, false);
});

test('rejeita PIN malformado antes de consultar a sessão', async () => {
  let queried = false;
  tableSessionRepository.findOpenedByTable = async () => {
    queried = true;
    return session;
  };

  await assert.rejects(() => validatePinService.execute({ tableId: 91, pin: '12a' }), /4 dígitos/i);
  assert.equal(queried, false);
});

test('não libera sessão quando pedidos de mesa foram desativados', async () => {
  tableSessionRepository.findOpenedByTable = async () => session;
  resolvePublicTableService.execute = async () => ({
    id: 91,
    number: 12,
    restaurantId: 7,
    restaurantSlug: 'restaurante-teste',
    tableOrderingEnabled: false,
    waiterCallEnabled: true,
    billRequestEnabled: true,
  });

  await assert.rejects(
    () =>
      validatePinService.execute({
        tableId: 91,
        tableNumber: 12,
        restaurantId: 7,
        pin: '4827',
      }),
    /pedidos.*desativados/i,
  );
});
