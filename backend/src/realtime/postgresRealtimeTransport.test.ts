import assert from 'node:assert/strict';
import test from 'node:test';
import { PostgresRealtimeTransport } from './postgresRealtimeTransport.js';

test('evento gravado durante poll de recuperação chega no ciclo seguinte sem perder o cursor', async () => {
  let denyWrites = true;
  let releaseSnapshot: (() => void) | undefined;
  let notifySnapshot: (() => void) | undefined;
  const snapshotStarted = new Promise<void>((resolve) => {
    notifySnapshot = resolve;
  });
  const snapshotHeld = new Promise<void>((resolve) => {
    releaseSnapshot = resolve;
  });
  const stored: Array<{ id: bigint; room: null; event: string; payload: unknown[] }> = [];
  const emitted: string[] = [];
  let holdFirstRead = true;
  const db = {
    $queryRaw: async (sql: TemplateStringsArray, cursor: bigint) => {
      if (sql.join('').includes('MAX')) return [{ id: 0n }];
      const snapshot = stored.filter((row) => row.id > cursor);
      if (holdFirstRead) {
        holdFirstRead = false;
        notifySnapshot?.();
        await snapshotHeld;
      }
      return snapshot;
    },
    $executeRaw: async (sql: TemplateStringsArray, ...values: unknown[]) => {
      if (!sql.join('').includes('INSERT')) return 0;
      if (denyWrites) throw new Error('synthetic write outage');
      stored.push({
        id: BigInt(stored.length + 1),
        room: null,
        event: String(values.length === 2 ? values[1] : values[2]),
        payload: [],
      });
      return 1;
    },
  } as unknown as ConstructorParameters<typeof PostgresRealtimeTransport>[1];
  const local = {
    emit: (event: string) => {
      emitted.push(event);
    },
    to: () => local,
  };
  const relay = new PostgresRealtimeTransport(local, db);
  await relay.start();
  try {
    await relay.emit('synthetic-before-recovery');
    assert.equal(relay.healthy(), false);
    denyWrites = false;
    const recovering = relay.poll();
    await snapshotStarted;
    assert.equal(relay.healthy(), true, 'INSERT probe terminou antes da leitura em andamento');
    await relay.emit('synthetic-after-recovery');
    assert.equal(relay.poll(), recovering, 'poll concorrente aguarda a leitura existente');
    releaseSnapshot?.();
    await recovering;
    assert.deepEqual(emitted, [], 'snapshot anterior ao novo INSERT não contém o evento');
    await relay.poll();
    assert.deepEqual(emitted, ['synthetic-after-recovery']);
    await relay.poll();
    assert.deepEqual(emitted, ['synthetic-after-recovery'], 'cursor evita entrega duplicada');
  } finally {
    releaseSnapshot?.();
    await relay.stop();
  }
});

for (const subscriber of [true, false]) {
  test(`relay recupera escrita sem tráfego HTTP (subscriber=${subscriber})`, async (t) => {
    let now = 20_000;
    t.mock.method(Date, 'now', () => now);
    let denyWrites = true;
    let probes = 0;
    const events: string[] = [];
    const db = {
      $queryRaw: async (sql: TemplateStringsArray) =>
        sql.join('').includes('MAX')
          ? [{ id: 0n }]
          : [
              { id: 1n, room: null, event: '__runtime_write_probe__', payload: [] },
              { id: 2n, room: null, event: 'order:updated', payload: [{ id: 1 }] },
            ],
      $executeRaw: async (sql: TemplateStringsArray, ...values: unknown[]) => {
        if (!sql.join('').includes('INSERT')) return 0;
        if (values.includes('__runtime_write_probe__')) probes++;
        if (denyWrites) throw new Error('synthetic write outage');
        return 1;
      },
    } as unknown as ConstructorParameters<typeof PostgresRealtimeTransport>[1];
    const local = {
      emit: (event: string) => {
        events.push(event);
      },
      to: () => local,
    };
    const relay = new PostgresRealtimeTransport(subscriber ? local : undefined, db);
    await relay.start();
    try {
      await relay.emit('order:updated', { id: 1 });
      assert.equal(relay.healthy(), false);
      await relay.poll();
      assert.equal(relay.healthy(), false, 'uma leitura não comprova a volta da escrita');
      assert.equal(probes, 1);
      denyWrites = false;
      now += 4_999;
      await relay.poll();
      assert.equal(probes, 1, 'tentativas de recuperação possuem intervalo');
      assert.equal(relay.healthy(), false);
      now++;
      await relay.poll();
      assert.equal(relay.healthy(), true);
      assert.equal(probes, 2);
      assert.equal(events.includes('__runtime_write_probe__'), false);
      if (subscriber) assert.ok(events.includes('order:updated'));
    } finally {
      await relay.stop();
    }
  });
}
