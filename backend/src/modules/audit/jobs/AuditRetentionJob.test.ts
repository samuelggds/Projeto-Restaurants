// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import auditRetentionJob, { normalizeAuditRetentionDays } from './AuditRetentionJob.js';

const originals = {
  settingsFindUnique: prisma.platformSettings.findUnique,
  auditFindMany: prisma.auditLog.findMany,
  auditDeleteMany: prisma.auditLog.deleteMany,
};

afterEach(() => {
  prisma.platformSettings.findUnique = originals.settingsFindUnique;
  prisma.auditLog.findMany = originals.auditFindMany;
  prisma.auditLog.deleteMany = originals.auditDeleteMany;
});

test('normaliza a retencao dentro da faixa segura', () => {
  assert.equal(normalizeAuditRetentionDays('invalid'), 180);
  assert.equal(normalizeAuditRetentionDays(30), 90);
  assert.equal(normalizeAuditRetentionDays(5000), 3650);
  assert.equal(normalizeAuditRetentionDays(365), 365);
});

test('remove somente logs anteriores ao corte configurado', async () => {
  let receivedCutoff;
  let deletedIds;
  prisma.platformSettings.findUnique = async () => ({ auditRetentionDays: 120 });
  prisma.auditLog.findMany = async ({ where }) => {
    receivedCutoff = where.createdAt.lt;
    return [{ id: 7 }, { id: 8 }];
  };
  prisma.auditLog.deleteMany = async ({ where }) => {
    deletedIds = where.id.in;
    return { count: 2 };
  };

  const now = new Date('2026-08-28T12:00:00.000Z');
  const result = await auditRetentionJob.execute(now);

  assert.equal(receivedCutoff.toISOString(), '2026-04-30T12:00:00.000Z');
  assert.deepEqual(deletedIds, [7, 8]);
  assert.equal(result.deletedCount, 2);
  assert.equal(result.retentionDays, 120);
});
