import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { ManagedImageEnhancementService, type ManagedImageDependencies } from './ManagedImageEnhancementService.js';
import { ManagedImageError } from '../domain/managedImageEnhancement.js';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8mQAAAAASUVORK5CYII=';
const actor = { userId: 7, userRole: 'SUPER_ADMIN' };
const input = () => ({ imageDataUrl: image, purpose: 'PRODUCT', operationId: randomUUID() });

function fixture(overrides: Partial<ManagedImageDependencies> = {}) {
  const events: Array<{ name: string; data?: unknown }> = [];
  const deps: ManagedImageDependencies = {
    authorize: async (id, operator) => { events.push({ name: 'authorize', data: { id, operator } }); return { id, name: 'Restaurant' }; },
    configured: () => { events.push({ name: 'configured' }); },
    begin: async (attempt) => { events.push({ name: 'begin', data: attempt }); },
    edit: async () => { events.push({ name: 'edit' }); return { imageDataUrl: image, costUsd: 0.1, providerRequestId: 'request_test', tokens: { input: 20, output: 30 } }; },
    record: async (attempt, action, metadata) => { events.push({ name: action, data: { attempt, metadata } }); },
    ...overrides,
  };
  return { events, service: new ManagedImageEnhancementService(deps) };
}

test('autoriza tenant e registra tentativa antes do consumo pago pela plataforma', async () => {
  const { service, events } = fixture();
  const result = await service.execute(42, input(), actor);
  assert.equal(result.payer, 'PLATFORM');
  assert.equal(result.imageDataUrl, image);
  assert.equal('credits' in result, false);
  assert.deepEqual(events.map((event) => event.name), ['authorize', 'configured', 'begin', 'edit', 'MANAGED_IMAGE_AI_PROCESSED']);
  const metadata = JSON.stringify(events);
  assert.match(metadata, /"restaurantId":42/u);
  assert.match(metadata, /"userId":7/u);
  assert.doesNotMatch(metadata, /data:image|OPENAI_API_KEY/u);
});

test('nega acesso antes de chamar o provedor ou auditar consumo', async () => {
  const { service, events } = fixture({ authorize: async () => { throw new ManagedImageError(403, 'MANAGED_IMAGE_FORBIDDEN', 'Negado'); } });
  await assert.rejects(service.execute(42, input(), actor), { status: 403 });
  assert.equal(events.length, 0);
});

test('não consome em payload inválido nem se auditoria/idempotência falhar', async () => {
  const invalid = fixture();
  await assert.rejects(invalid.service.execute(42, { ...input(), restaurantId: 99 }, actor));
  assert.deepEqual(invalid.events.map((event) => event.name), ['authorize']);
  const unavailable = fixture({ begin: async () => { throw new Error('audit unavailable'); } });
  await assert.rejects(unavailable.service.execute(42, input(), actor));
  assert.equal(unavailable.events.some((event) => event.name === 'edit'), false);
});

test('falha incerta não provoca retry nem registra mensagens sensíveis do provedor', async () => {
  let calls = 0;
  const { service, events } = fixture({ edit: async () => { calls += 1; throw new Error('private-provider-content'); } });
  await assert.rejects(service.execute(42, input(), actor));
  assert.equal(calls, 1);
  assert.equal(events.at(-1)?.name, 'MANAGED_IMAGE_AI_FAILED');
  assert.match(JSON.stringify(events.at(-1)), /UNKNOWN/u);
  assert.doesNotMatch(JSON.stringify(events), /private-provider-content/u);
});

test('registra consumo mesmo quando a resposta não contém imagem utilizável', async () => {
  const { service, events } = fixture({ edit: async () => ({ imageDataUrl: '', costUsd: 0.1, providerRequestId: null, tokens: { input: null, output: null } }) });
  await assert.rejects(service.execute(42, input(), actor));
  assert.equal(events.at(-1)?.name, 'MANAGED_IMAGE_AI_PROCESSED');
});
