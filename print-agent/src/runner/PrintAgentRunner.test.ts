import assert from 'node:assert/strict';
import test from 'node:test';

import { PrintAgentRunner } from './PrintAgentRunner.js';
import { MockPrinterTransport } from '../transports/MockPrinterTransport.js';
import type { AgentLogger } from '../logger.js';
import type { ClaimedPrintJob, LocalAgentConfig } from '../types.js';

const config: LocalAgentConfig = {
  apiBaseUrl: 'http://localhost:3000',
  credential: 'pa_2f7a7df8-a444-4db9-a47a-5b79560352be.abcdefghijklmnopqrstuvwxyzABCDEFGH123456789',
  printerName: 'Mock Thermal Printer',
  transport: 'mock',
  pollIntervalMs: 1_000,
};

const job: ClaimedPrintJob = {
  publicId: 'ea9f0d45-f719-434b-8864-f85ec4aa6a24',
  type: 'TEST',
  source: 'TEST',
  payloadVersion: 1,
  payload: {
    version: 1,
    kind: 'TEST',
    restaurantName: 'North Pizza',
    requestedAt: '2026-08-31T22:30:00.000Z',
    message: 'Conexão com a impressora OK.',
  },
  paperWidth: 'MM80',
  copies: 3,
  attempts: 1,
  leaseExpiresAt: '2026-08-31T22:31:00.000Z',
  createdAt: '2026-08-31T22:30:00.000Z',
};

function loggerRecorder() {
  const records: unknown[] = [];
  const logger: AgentLogger = {
    info: (event, fields) => records.push({ event, fields }),
    error: (event, fields) => records.push({ event, fields }),
  };
  return { logger, records };
}

test('sucesso imprime todas as cópias antes de ACK PRINTED', async () => {
  const calls: string[] = [];
  const api = {
    heartbeat: async () => ({ ok: true as const, serverTime: new Date().toISOString() }),
    claim: async () => ({ ...job }),
    markPrinted: async (id: string) => calls.push(`printed:${id}`),
    markFailed: async (id: string) => calls.push(`failed:${id}`),
  };
  const transport = new MockPrinterTransport();
  const { logger } = loggerRecorder();
  const result = await new PrintAgentRunner(config, api, transport, logger).processOnce();
  assert.equal(result, 'printed');
  assert.equal(transport.printed.length, 3);
  assert.deepEqual(calls, [`printed:${job.publicId}`]);
});

test('falha não confirma PRINTED e reporta FAILED para retry', async () => {
  const calls: Array<{ type: string; error?: string }> = [];
  const api = {
    heartbeat: async () => ({ ok: true as const, serverTime: new Date().toISOString() }),
    claim: async () => ({ ...job, copies: 1 }),
    markPrinted: async () => calls.push({ type: 'printed' }),
    markFailed: async (_id: string, error: string) => calls.push({ type: 'failed', error }),
  };
  const transport = new MockPrinterTransport();
  transport.failWith = new Error('Sem papel');
  const { logger, records } = loggerRecorder();
  const result = await new PrintAgentRunner(config, api, transport, logger).processOnce();
  assert.equal(result, 'failed');
  assert.deepEqual(calls, [{ type: 'failed', error: 'Sem papel' }]);
  assert.equal(JSON.stringify(records).includes(config.credential), false);
});

test('fila vazia não chama transporte nem ACK', async () => {
  const transport = new MockPrinterTransport();
  const api = {
    heartbeat: async () => ({ ok: true as const, serverTime: new Date().toISOString() }),
    claim: async () => null,
    markPrinted: async () => assert.fail('não deveria confirmar'),
    markFailed: async () => assert.fail('não deveria falhar'),
  };
  const { logger } = loggerRecorder();
  assert.equal(await new PrintAgentRunner(config, api, transport, logger).processOnce(), 'idle');
  assert.equal(transport.printed.length, 0);
});

test('falha de rede após o spooler não marca FAILED nem provoca retry imediato', async () => {
  let failedCalls = 0;
  let printedCalls = 0;
  let claimCalls = 0;
  const api = {
    heartbeat: async () => ({ ok: true as const, serverTime: new Date().toISOString() }),
    claim: async () => {
      claimCalls += 1;
      return { ...job, copies: 1 };
    },
    markPrinted: async () => {
      printedCalls += 1;
      if (printedCalls === 1) throw new Error('ACK indisponível');
    },
    markFailed: async () => {
      failedCalls += 1;
    },
  };
  const transport = new MockPrinterTransport();
  const { logger, records } = loggerRecorder();
  const runner = new PrintAgentRunner(config, api, transport, logger);

  await assert.rejects(() => runner.processOnce(), /ACK indisponível/u);
  assert.equal(transport.printed.length, 1);
  assert.equal(failedCalls, 0);
  assert.equal(JSON.stringify(records).includes('PRINT_ACK_PENDING'), true);
  assert.equal(await runner.processOnce(), 'printed');
  assert.equal(transport.printed.length, 1);
  assert.equal(claimCalls, 1);
});
