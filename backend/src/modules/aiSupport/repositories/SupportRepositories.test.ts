// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import { SupportConversationRepository } from './SupportConversationRepository.js';
import { SupportMessageRepository } from './SupportMessageRepository.js';

const originalQueryRaw = prisma.$queryRaw;

afterEach(() => {
  prisma.$queryRaw = originalQueryRaw;
});

function queryText(query) {
  return String(query?.sql || query?.text || query?.strings?.join(' ') || query || '');
}

test('fila da plataforma exclui papéis internos antes de ranquear e contar', async () => {
  let captured = '';
  prisma.$queryRaw = async (strings) => {
    captured = Array.from(strings).join(' ');
    return [];
  };

  await new SupportConversationRepository().listLatest();

  assert.match(captured, /'ADMIN'/u);
  assert.match(captured, /'SUPER_ADMIN'/u);
  assert.doesNotMatch(captured, /'FUNCIONARIO'/u);
});

test('históricos PLATFORM e INTERNAL usam filtros independentes', async () => {
  const captured = [];
  prisma.$queryRaw = async (query) => {
    captured.push(queryText(query));
    return [];
  };
  const repository = new SupportMessageRepository();

  await repository.listForRestaurant({
    restaurantId: 3,
    beforeId: 0,
    limit: 10,
    channel: 'PLATFORM',
  });
  await repository.listForRestaurant({
    restaurantId: 3,
    beforeId: 0,
    limit: 10,
    channel: 'INTERNAL',
  });

  assert.match(captured[0], /SUPER_ADMIN/u);
  assert.doesNotMatch(captured[0], /issueStatus" IS NULL/u);
  assert.doesNotMatch(captured[0], /FUNCIONARIO/u);
  assert.match(captured[1], /issueStatus" IS NOT NULL/u);
  assert.match(captured[1], /FUNCIONARIO/u);
  assert.match(captured[1], /MOTOQUEIRO/u);
});
