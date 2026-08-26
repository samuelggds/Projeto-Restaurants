// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import tableAccountSettingsRepository from '../repositories/TableAccountSettingsRepository.js';
import { UpdateTableAccountSettingsService } from './UpdateTableAccountSettingsService.js';

const originalFindByRestaurantId = tableAccountSettingsRepository.findByRestaurantId;
const originalUpsert = tableAccountSettingsRepository.upsert;

afterEach(() => {
  tableAccountSettingsRepository.findByRestaurantId = originalFindByRestaurantId;
  tableAccountSettingsRepository.upsert = originalUpsert;
});

const currentSettings = {
  enabled: false,
  requirePrepaymentAboveCents: null,
  prepaymentWindows: [],
  allowCash: false,
  allowCardMachine: false,
  allowOnlinePayment: true,
  allowSplit: true,
  serviceFeeMode: 'DISABLED',
  serviceFeeBasisPoints: 0,
  preventCloseWithOutstandingBalance: true,
  requireEmployeeApprovalForPreparedItemCancellation: true,
  blockNewOrdersOnClosingRequest: true,
  reservationTimeoutMinutes: 10,
  timeZone: 'America/Sao_Paulo',
};

test('mescla um PATCH e persiste somente no restaurante autenticado', async () => {
  tableAccountSettingsRepository.findByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return currentSettings;
  };
  let persisted;
  tableAccountSettingsRepository.upsert = async (restaurantId, settings) => {
    persisted = { restaurantId, settings };
    return settings;
  };

  const result = await new UpdateTableAccountSettingsService().execute(7, {
    enabled: true,
    allowCash: true,
  });

  assert.equal(persisted.restaurantId, 7);
  assert.equal(persisted.settings.enabled, true);
  assert.equal(persisted.settings.allowCash, true);
  assert.equal(persisted.settings.allowOnlinePayment, true);
  assert.deepEqual(result, persisted.settings);
});

test('não aceita restaurantId no payload nem persiste configuração incoerente', async () => {
  tableAccountSettingsRepository.findByRestaurantId = async () => currentSettings;
  let persisted = false;
  tableAccountSettingsRepository.upsert = async () => {
    persisted = true;
  };
  const service = new UpdateTableAccountSettingsService();

  await assert.rejects(() => service.execute(7, { enabled: true, restaurantId: 8 }));
  await assert.rejects(() => service.execute(7, { serviceFeeMode: 'MANDATORY' }));
  assert.equal(persisted, false);
});
