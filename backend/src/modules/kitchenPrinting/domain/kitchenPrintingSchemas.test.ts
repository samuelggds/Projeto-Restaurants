import assert from 'node:assert/strict';
import test from 'node:test';

import {
  printerAgentFailureSchema,
  printerAgentHeartbeatSchema,
  updatePrinterSettingsSchema,
} from './kitchenPrintingSchemas.js';

test('configuração aceita somente triggers, larguras e cópias suportadas', () => {
  assert.equal(
    updatePrinterSettingsSchema.parse({
      autoPrintTrigger: 'NEW_ORDER',
      paperWidth: 'MM58',
      copies: 5,
    }).copies,
    5,
  );
  for (const value of [
    { autoPrintTrigger: 'ORDER_INSERTED' },
    { paperWidth: 'MM72' },
    { copies: 0 },
    { copies: 6 },
    { restaurantId: 99 },
    {},
  ]) {
    assert.equal(updatePrinterSettingsSchema.safeParse(value).success, false);
  }
});

test('heartbeat e erro do agente são strict e limitados', () => {
  assert.equal(
    printerAgentHeartbeatSchema.safeParse({ printerName: 'EPSON TM-T20', appVersion: '1.0.0' })
      .success,
    true,
  );
  assert.equal(printerAgentHeartbeatSchema.safeParse({ restaurantId: 2 }).success, false);
  assert.equal(printerAgentFailureSchema.safeParse({ error: '' }).success, false);
  assert.equal(printerAgentFailureSchema.safeParse({ error: 'x'.repeat(1001) }).success, false);
});
