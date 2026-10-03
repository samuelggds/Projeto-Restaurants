import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import {
  ManagedServiceError,
  managedMutation,
  normalizeManagedServiceError,
} from './managedServiceErrors.js';

test('converte somente conflitos Prisma esperados em erro de domínio', () => {
  const uniqueError = new Prisma.PrismaClientKnownRequestError('unique', {
    code: 'P2002',
    clientVersion: 'test',
  });
  const normalized = normalizeManagedServiceError(uniqueError);

  assert.ok(normalized instanceof ManagedServiceError);
  assert.equal(normalized.status, 409);
  assert.equal(normalized.code, 'MANAGED_SERVICE_CONFLICT');
});

test('mantém erro Prisma de infraestrutura fora do mapeamento HTTP 400', async () => {
  const foreignKeyError = new Prisma.PrismaClientKnownRequestError('foreign key', {
    code: 'P2003',
    clientVersion: 'test',
  });

  await assert.rejects(
    () => managedMutation(async () => {
      throw foreignKeyError;
    }),
    (error: unknown) => error === foreignKeyError,
  );
});
