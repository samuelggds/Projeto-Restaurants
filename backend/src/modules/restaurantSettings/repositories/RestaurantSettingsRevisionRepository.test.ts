// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import repository from './RestaurantSettingsRepository.js';

const originalFindUnique = prisma.restaurant.findUnique;

afterEach(() => {
  prisma.restaurant.findUnique = originalFindUnique;
});

test('consulta a revisão pelo tenant sem carregar logo, capa ou imagens de banner', async () => {
  let query;
  const expected = {
    id: 17,
    active: true,
    updatedAt: new Date('2026-08-01T12:00:00.000Z'),
    settings: { updatedAt: new Date('2026-08-02T12:00:00.000Z') },
    banners: [{ id: 4, updatedAt: new Date('2026-08-03T12:00:00.000Z') }],
  };
  prisma.restaurant.findUnique = async (args) => {
    query = args;
    return expected;
  };

  const result = await repository.findPublicRevisionByRestaurantId(17);

  assert.equal(result, expected);
  assert.deepEqual(query, {
    where: { id: 17 },
    select: {
      id: true,
      active: true,
      updatedAt: true,
      settings: { select: { updatedAt: true } },
      banners: {
        where: { active: true },
        select: { id: true, updatedAt: true },
        orderBy: { id: 'asc' },
      },
    },
  });
  assert.equal(JSON.stringify(query).includes('image'), false);
  assert.equal(JSON.stringify(query).includes('logo'), false);
  assert.equal(JSON.stringify(query).includes('coverImage'), false);
});
