// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import tableRepository from '../../table/repositories/TableRepository.js';
import resolvePublicTableService from '../../table/services/ResolvePublicTableService.js';
import tableSessionRepository from '../repositories/TableSessionRepository.js';
import openTableSessionService from './OpenTableSessionService.js';

const originalFindById = tableRepository.findById;
const originalResolvePublicTable = resolvePublicTableService.execute;
const originalFindOpened = tableSessionRepository.findOpenedByTable;

afterEach(() => {
  tableRepository.findById = originalFindById;
  resolvePublicTableService.execute = originalResolvePublicTable;
  tableSessionRepository.findOpenedByTable = originalFindOpened;
});

test('não gera PIN quando o administrador desativou pedidos pelo cardápio de mesa', async () => {
  tableRepository.findById = async () => ({
    id: 91,
    number: 12,
    restaurantId: 7,
    active: true,
  });
  resolvePublicTableService.execute = async () => ({
    id: 91,
    number: 12,
    restaurantId: 7,
    restaurantSlug: 'restaurante-teste',
    tableOrderingEnabled: false,
    waiterCallEnabled: true,
    billRequestEnabled: true,
  });
  let searchedOpenSession = false;
  tableSessionRepository.findOpenedByTable = async () => {
    searchedOpenSession = true;
    return null;
  };

  await assert.rejects(
    () =>
      openTableSessionService.execute({
        tableId: 91,
        restaurantId: 7,
        openedById: 3,
      }),
    /pedidos.*desativados/i,
  );
  assert.equal(searchedOpenSession, false);
});
