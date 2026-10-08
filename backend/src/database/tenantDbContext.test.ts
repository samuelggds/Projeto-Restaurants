import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import prisma from '../config/prisma.js';
import { assertSecureRuntimeDatabaseRole, TENANT_RLS_TABLES } from './tenantDbContext.js';

test('runtime and catalog inventory cover every migration with ENABLE and FORCE tenant RLS', () => {
  const enabled = new Set<string>();
  const forced = new Set<string>();
  const migrations = new URL('../../prisma/migrations/', import.meta.url);
  for (const entry of readdirSync(migrations)) {
    const file = new URL(`${entry}/migration.sql`, migrations);
    if (!existsSync(file)) continue;
    const sql = readFileSync(file, 'utf8');
    for (const match of sql.matchAll(
      /ALTER TABLE\s+"([^"]+)"\s+(ENABLE|FORCE) ROW LEVEL SECURITY/gu,
    )) {
      (match[2] === 'ENABLE' ? enabled : forced).add(match[1]);
    }
    // Employee and assistant migrations apply the same policy in a SQL loop.
    for (const loop of sql.matchAll(
      /FOREACH table_name IN ARRAY ARRAY\[([\s\S]*?)\][\s\S]*?LOOP([\s\S]*?)END LOOP/gu,
    )) {
      for (const table of loop[1].matchAll(/'([^']+)'/gu)) {
        if (loop[2].includes('ENABLE ROW LEVEL SECURITY')) enabled.add(table[1]);
        if (loop[2].includes('FORCE ROW LEVEL SECURITY')) forced.add(table[1]);
      }
    }
  }
  assert.deepEqual([...enabled].sort(), [...TENANT_RLS_TABLES]);
  assert.deepEqual([...forced].sort(), [...TENANT_RLS_TABLES]);
});

test('runtime guard checks every protected table and rejects unsafe or unknown database roles', async (t) => {
  type RoleRow = {
    role_name: string;
    is_superuser: boolean;
    bypasses_rls: boolean;
    owns_pilot_tables: boolean;
  };
  const safe: RoleRow = {
    role_name: 'test_runtime',
    is_superuser: false,
    bypasses_rls: false,
    owns_pilot_tables: false,
  };
  let rows = [safe];
  const original = prisma.$queryRaw;
  prisma.$queryRaw = (async (sql: TemplateStringsArray, ...parameters: unknown[]) => {
    assert.match(sql.join('?'), /relations\.relname = ANY\(\?::text\[\]\)/u);
    assert.deepEqual(parameters, [[...TENANT_RLS_TABLES]]);
    return rows;
  }) as typeof prisma.$queryRaw;
  t.after(() => {
    prisma.$queryRaw = original;
  });

  assert.deepEqual(await assertSecureRuntimeDatabaseRole(), {
    roleName: 'test_runtime',
    isSuperuser: false,
    bypassesRls: false,
    ownsPilotTables: false,
  });
  for (const privilege of ['is_superuser', 'bypasses_rls', 'owns_pilot_tables'] as const) {
    rows = [{ ...safe, [privilege]: true }];
    await assert.rejects(assertSecureRuntimeDatabaseRole(), /runtime é insegura para RLS/u);
  }
  rows = [];
  await assert.rejects(assertSecureRuntimeDatabaseRole(), /Não foi possível verificar/u);
});
