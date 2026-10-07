import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import test from 'node:test';

import { PrintAgentApi } from '../api/PrintAgentApi.js';
import { PrintAgentRunner } from './PrintAgentRunner.js';
import { MockPrinterTransport } from '../transports/MockPrinterTransport.js';
import type { AgentLogger } from '../logger.js';
import type { ClaimedPrintJob, LocalAgentConfig } from '../types.js';

const TEST_DEVICE_ID = '2f7a7df8-a444-4db9-a47a-5b79560352be';
const testCredential = `pa_${TEST_DEVICE_ID}.${'x'.repeat(43)}`;

const config: LocalAgentConfig = {
  apiBaseUrl: 'http://localhost:3000',
  credential: testCredential,
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

for (const status of [404, 409]) {
  for (const transientFirst of [false, true]) {
    test(`ACK ${status} ${transientFirst ? 'após falha de rede' : 'imediato'} libera próximos jobs sem reimprimir`, async () => {
      const secondId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const queue = [
        { ...job, copies: 1 },
        { ...job, publicId: secondId, copies: 1 },
      ];
      let firstAckCalls = 0;
      let claimCalls = 0;
      const api = new PrintAgentApi(config.apiBaseUrl, config.credential, async (input) => {
        const pathname = new URL(String(input)).pathname;
        let body: unknown = { status: 'PRINTED' };
        let responseStatus = 200;
        if (pathname.endsWith('/claim')) {
          claimCalls += 1;
          body = { job: queue.shift() ?? null };
        } else if (pathname.endsWith(`/${job.publicId}/printed`)) {
          firstAckCalls += 1;
          if (transientFirst && firstAckCalls === 1) throw new TypeError('Rede indisponível');
          body = { error: 'Job não pertence ao lease atual deste agente.' };
          responseStatus = status;
        } else if (!pathname.endsWith(`/${secondId}/printed`)) {
          assert.fail(`Não deve reportar falha nem repetir impressão: ${pathname}`);
        }
        return new Response(JSON.stringify(body), { status: responseStatus });
      });
      const transport = new MockPrinterTransport();
      const { logger, records } = loggerRecorder();
      const runner = new PrintAgentRunner(config, api, transport, logger);

      if (transientFirst) await assert.rejects(() => runner.processOnce(), /Rede indisponível/u);
      assert.equal(await runner.processOnce(), 'failed');
      assert.equal(transport.printed.length, 1);
      assert.equal(claimCalls, 1);
      assert.equal(await runner.processOnce(), 'printed');
      assert.equal(transport.printed.length, 2);
      assert.equal(claimCalls, 2);
      assert.equal(firstAckCalls, transientFirst ? 2 : 1);
      assert.equal(JSON.stringify(records).includes('PRINT_ACK_REJECTED'), true);
      assert.equal(JSON.stringify(records).includes(config.credential), false);
    });
  }
}

test('ACK HTTP 503 mantém retry sem buscar outro job nem reimprimir', async () => {
  let ackCalls = 0;
  let claimCalls = 0;
  const api = new PrintAgentApi(config.apiBaseUrl, config.credential, async (input) => {
    const pathname = new URL(String(input)).pathname;
    if (pathname.endsWith('/claim')) {
      claimCalls += 1;
      return new Response(JSON.stringify({ job: { ...job, copies: 1 } }));
    }
    assert.equal(pathname.endsWith(`/${job.publicId}/printed`), true);
    ackCalls += 1;
    return new Response(
      JSON.stringify(ackCalls === 1 ? { error: 'Indisponível' } : { status: 'PRINTED' }),
      {
        status: ackCalls === 1 ? 503 : 200,
      },
    );
  });
  const transport = new MockPrinterTransport();
  const { logger } = loggerRecorder();
  const runner = new PrintAgentRunner(config, api, transport, logger);
  await assert.rejects(() => runner.processOnce(), /Indisponível/u);
  assert.equal(await runner.processOnce(), 'printed');
  assert.equal(claimCalls, 1);
  assert.equal(transport.printed.length, 1);
});

test('polling remove listeners após cada espera e encerra sem listeners ao abortar', async () => {
  const controller = new AbortController();
  const listenerCounts: number[] = [];
  const api = {
    heartbeat: async () => {
      listenerCounts.push(getEventListeners(controller.signal, 'abort').length);
      if (listenerCounts.length === 15) controller.abort();
      return { ok: true as const, serverTime: new Date().toISOString() };
    },
    claim: async () => null,
    markPrinted: async () => assert.fail('não deveria confirmar'),
    markFailed: async () => assert.fail('não deveria falhar'),
  };
  const { logger } = loggerRecorder();
  const runner = new PrintAgentRunner(
    { ...config, pollIntervalMs: 1 },
    api,
    new MockPrinterTransport(),
    logger,
  );
  await runner.run(controller.signal);
  assert.equal(listenerCounts.length, 15);
  assert.equal(
    listenerCounts.every((count) => count === 0),
    true,
  );
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('abortar durante espera remove o listener e encerra o polling', async () => {
  const controller = new AbortController();
  let heartbeatCalls = 0;
  const api = {
    heartbeat: async () => {
      heartbeatCalls += 1;
      return { ok: true as const, serverTime: new Date().toISOString() };
    },
    claim: async () => null,
    markPrinted: async () => assert.fail('não deveria confirmar'),
    markFailed: async () => assert.fail('não deveria falhar'),
  };
  const { logger } = loggerRecorder();
  const runner = new PrintAgentRunner(
    { ...config, pollIntervalMs: 60_000 },
    api,
    new MockPrinterTransport(),
    logger,
  );
  const running = runner.run(controller.signal);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(getEventListeners(controller.signal, 'abort').length, 1);
  controller.abort();
  await running;
  assert.equal(heartbeatCalls, 1);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});
