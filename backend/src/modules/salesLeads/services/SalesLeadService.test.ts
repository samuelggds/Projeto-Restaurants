import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { SalesLeadService } from './SalesLeadService.js';
import { createSalesLeadSchema, listSalesLeadsSchema } from '../domain/salesLeadSchemas.js';

const input = {
  name: ' Joana Silva ',
  restaurantName: 'Bistrô Teste',
  email: 'JOANA@example.test',
  phone: '(11) 99999-8888',
  city: 'São Paulo',
  state: 'sp',
  businessType: 'Restaurante',
  channels: ['TABLE', 'DELIVERY'],
  planInterest: 'PREMIUM',
  consent: true,
  message: '',
  website: '',
};
type Database = ConstructorParameters<typeof SalesLeadService>[0];

function memoryService() {
  const records = new Map<string, Record<string, unknown>>();
  let writes = 0;
  const db = {
    salesLead: {
      findUnique: async ({ where }: { where: { idempotencyKey: string } }) =>
        records.get(where.idempotencyKey) || null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const key = String(data.idempotencyKey);
        if (records.has(key)) throw Object.assign(new Error('Unique conflict'), { code: 'P2002' });
        writes++;
        const lead = { ...data, id: randomUUID() };
        records.set(key, lead);
        return lead;
      },
    },
  } as unknown as Database;
  return {
    service: new SalesLeadService(db),
    records,
    get writes() {
      return writes;
    },
  };
}

test('salva contato e aviso atomicamente, normaliza e não expõe dados na confirmação', async () => {
  const state = memoryService();
  const key = randomUUID();
  const result = await state.service.create(input, key);
  assert.equal(result.created, true);
  assert.deepEqual(Object.keys(result.response).sort(), ['emailStatus', 'id', 'received']);
  assert.equal(result.response.received, true);
  const record = state.records.get(key)!;
  assert.equal(record.email, 'joana@example.test');
  assert.equal(record.name, 'Joana Silva');
  assert.equal(record.phone, '11999998888');
  assert.equal(record.state, 'SP');
  assert.equal(record.message, null);
  assert.deepEqual(record.emailOutbox, { create: {} });
  assert.deepEqual(record.channels, ['DELIVERY', 'TABLE']);
});

test('concorrência e repetição com a mesma chave geram somente um contato', async () => {
  const state = memoryService();
  const key = randomUUID();
  const results = await Promise.all(
    Array.from({ length: 8 }, () => state.service.create(input, key)),
  );
  assert.equal(state.writes, 1);
  assert.equal(new Set(results.map((result) => result.response.id)).size, 1);
  assert.equal(results.filter((result) => result.created).length, 1);
  await assert.rejects(state.service.create({ ...input, email: 'different@example.test' }, key), {
    statusCode: 409,
  });
  assert.equal(state.writes, 1);
});

test('rejeita consentimento ausente, campos desconhecidos e chave inválida antes de gravar', async () => {
  const state = memoryService();
  for (const payload of [
    { ...input, consent: false },
    { ...input, status: 'ARCHIVED' },
    { ...input, channels: [] },
    { ...input, email: 'invalid' },
    { ...input, message: 'a'.repeat(2001) },
  ]) {
    await assert.rejects(state.service.create(payload, randomUUID()), { statusCode: 400 });
  }
  await assert.rejects(state.service.create(input, 'invalid-key'), { statusCode: 400 });
  assert.equal(state.writes, 0);
  assert.equal(createSalesLeadSchema.safeParse({ ...input, phone: '999' }).success, false);
  assert.equal(listSalesLeadsSchema.safeParse({ pageSize: 101 }).success, false);
});

test('honeypot preenchido não cria contato nem aviso', async () => {
  const state = memoryService();
  await state.service.create({ ...input, website: 'bot.example.test' }, randomUUID());
  assert.equal(state.writes, 0);
});

test('erro do banco não é confirmado como sucesso', async () => {
  const service = new SalesLeadService({
    salesLead: {
      findUnique: async () => null,
      create: async () => {
        throw new Error('storage unavailable');
      },
    },
  } as unknown as Database);
  await assert.rejects(service.create(input, randomUUID()), /storage unavailable/);
});

test('paginação limita resposta e preserva filtro e busca nas duas consultas', async () => {
  const queries: Record<string, unknown>[] = [];
  const service = new SalesLeadService({
    salesLead: {
      findMany: async (query: Record<string, unknown>) => {
        queries.push(query);
        return [];
      },
      count: async (query: Record<string, unknown>) => {
        queries.push(query);
        return 42;
      },
    },
  } as unknown as Database);
  const result = await service.list({ page: '2', pageSize: '20', q: ' Joana ', status: 'NEW' });
  assert.equal(result.total, 42);
  assert.equal(queries[0].skip, 20);
  assert.equal(queries[0].take, 20);
  assert.deepEqual(queries[0].where, queries[1].where);
  assert.deepEqual(queries[0].orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
});

test('mudança de status exige super administrador ativo e audita sem dados pessoais', async () => {
  let allowed = false;
  let writes = 0;
  const audit: Record<string, unknown>[] = [];
  const tx = {
    user: { findFirst: async () => (allowed ? { id: 1, name: 'Administrador' } : null) },
    salesLead: {
      findUnique: async () => ({ status: 'NEW' }),
      update: async () => {
        writes++;
        return { id: 'lead', status: 'CONTACTED', emailOutbox: null };
      },
    },
    auditLog: { create: async (data: Record<string, unknown>) => audit.push(data) },
  };
  const service = new SalesLeadService({
    $transaction: async (action: (transaction: typeof tx) => unknown) => action(tx),
  } as unknown as Database);
  const id = randomUUID();
  await assert.rejects(service.updateStatus(id, { status: 'CONTACTED' }, 1), { statusCode: 403 });
  assert.equal(writes, 0);
  allowed = true;
  await service.updateStatus(id, { status: 'CONTACTED' }, 1);
  assert.equal(writes, 1);
  assert.deepEqual((audit[0].data as Record<string, unknown>).metadata, {
    before: 'NEW',
    after: 'CONTACTED',
  });
});
