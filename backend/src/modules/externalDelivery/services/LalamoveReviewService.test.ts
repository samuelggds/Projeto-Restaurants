import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { errorHandlerMiddleware } from '../../../middlewares/security/errorHandlerMiddleware.js';
import { LalamoveReviewError, LalamoveReviewService } from './LalamoveReviewService.js';

type Row = {
  id: string;
  restaurantId: number;
  status: string;
  reviewReasonCode: string | null;
  reviewedAt: Date | null;
  reviewedByUserId: number | null;
  requestedAt: Date;
  updatedAt: Date;
  requestedByUserId: number;
};
type Lookup = { where: { restaurantId_provider: { restaurantId: number; provider: string } } };
type Audit = {
  restaurantId: number;
  userId: number;
  action: string;
  metadata: Record<string, unknown>;
};
const timestamp = '2026-10-09T19:00:00.000Z';
const context = { ipAddress: null, requestId: 'test-review', userAgent: null };
const change = {
  status: 'IN_REVIEW', expectedStatus: 'REQUESTED',
  expectedUpdatedAt: timestamp, reasonCode: null,
};

function fixture(options: {
  authorized?: boolean;
  count?: number;
  loseAtomicUpdate?: boolean;
  failAudit?: boolean;
} = {}) {
  const restaurants = Array.from({ length: options.count ?? 2 }, (_, index) => ({
    id: index + 1, name: 'Restaurante ' + (index + 1), slug: 'restaurante-' + (index + 1),
  }));
  const rows = new Map<number, Row>(restaurants.map(({ id }) => [id, {
    id: 'request-' + id, restaurantId: id, status: 'REQUESTED',
    reviewReasonCode: null, reviewedAt: null, reviewedByUserId: null,
    requestedAt: new Date(timestamp), updatedAt: new Date(timestamp), requestedByUserId: 100 + id,
  }]));
  const transactions: number[] = [];
  const writes: number[] = [];
  const audits: Audit[] = [];
  let active = 0;
  let maxActive = 0;
  let platformReads = 0;
  const database = {
    user: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        assert.deepEqual(where, { id: 900, role: 'SUPER_ADMIN', active: true, restaurantId: null });
        return options.authorized === false ? null : { id: 900, name: 'Platform reviewer', role: 'SUPER_ADMIN' };
      },
    },
    restaurant: {
      findMany: async ({ where, take, orderBy }: {
        where: { id?: { lt: number } }; take: number; orderBy: { id: string };
      }) => {
        platformReads += 1;
        assert.equal(take, 41);
        assert.deepEqual(orderBy, { id: 'desc' });
        return restaurants.filter(item => !where.id || item.id < where.id.lt)
          .sort((a, b) => b.id - a.id).slice(0, take);
      },
    },
    // No global onboarding delegate: tenant-scoped reads are mandatory.
  };
  async function tenant<T>(restaurantId: number, callback: (db: unknown) => Promise<T>): Promise<T> {
    transactions.push(restaurantId);
    active += 1;
    maxActive = Math.max(maxActive, active);
    const previous = rows.get(restaurantId);
    const auditLength = audits.length;
    function find(args: Lookup) {
      assert.deepEqual(args.where.restaurantId_provider, { restaurantId, provider: 'LALAMOVE' });
      return rows.get(restaurantId) ?? null;
    }
    const tx = {
      restaurantExternalDeliveryOnboarding: {
        findUnique: async (args: Lookup) => find(args),
        findUniqueOrThrow: async (args: Lookup) => {
          const row = find(args);
          assert.ok(row);
          return row;
        },
        updateMany: async ({ where, data }: {
          where: { id: string; restaurantId: number; provider: string; status: string; updatedAt: Date };
          data: { status: string; reviewReasonCode: string | null; reviewedAt: Date; reviewedByUserId: number };
        }) => {
          const row = rows.get(restaurantId);
          assert.ok(row);
          assert.deepEqual(where, {
            id: row.id, restaurantId, provider: 'LALAMOVE', status: row.status, updatedAt: row.updatedAt,
          });
          assert.deepEqual(Object.keys(data).sort(), ['reviewReasonCode', 'reviewedAt', 'reviewedByUserId', 'status']);
          writes.push(restaurantId);
          if (options.loseAtomicUpdate) return { count: 0 };
          rows.set(restaurantId, { ...row, ...data, updatedAt: new Date(row.updatedAt.getTime() + 1) });
          return { count: 1 };
        },
      },
      restaurant: {
        findUnique: async ({ where }: { where: { id: number } }) => {
          assert.equal(where.id, restaurantId);
          return restaurants.find(item => item.id === restaurantId) ?? null;
        },
      },
      auditLog: {
        create: async ({ data }: { data: Audit }) => {
          assert.equal(data.restaurantId, restaurantId);
          assert.equal(data.userId, 900);
          assert.equal(data.action, 'LALAMOVE_ONBOARDING_REVIEWED');
          if (options.failAudit) throw new Error('Audit unavailable');
          audits.push(data);
          return { id: audits.length };
        },
      },
    };
    try {
      return await callback(tx);
    } catch (error) {
      // Model transaction rollback; real PostgreSQL isolation runs in its own CI suite.
      if (previous) rows.set(restaurantId, previous);
      else rows.delete(restaurantId);
      audits.length = auditLength;
      throw error;
    } finally {
      active -= 1;
    }
  }
  type Dependencies = NonNullable<ConstructorParameters<typeof LalamoveReviewService>[0]>;
  const service = new LalamoveReviewService({ database, tenant } as unknown as Dependencies);
  return { service, rows, transactions, writes, audits, maxActive: () => maxActive, platformReads: () => platformReads };
}

function statusIs(statusCode: number) {
  return (error: unknown) => error instanceof LalamoveReviewError && error.statusCode === statusCode;
}

test('review service rejects non-platform actors before reading any tenant', async () => {
  const f = fixture({ authorized: false });
  await assert.rejects(() => f.service.listRequests(900), statusIs(403));
  await assert.rejects(() => f.service.updateRequest(900, 1, change, context), statusIs(403));
  assert.equal(f.platformReads(), 0);
  assert.deepEqual(f.transactions, []);
});

test('review identifiers reject booleans, objects, repeated query values and ambiguous numbers', async () => {
  const invalid: unknown[] = [true, false, [], ['1'], {}, null, undefined, '', ' 1 ', '01', '1e2', '0x10', '-1', '1.5', 0, -1, 1.5, NaN, Infinity, 2147483648];
  for (const value of invalid) {
    const f = fixture();
    await assert.rejects(() => f.service.updateRequest(900, value, change, context), statusIs(400));
    if (value != null) await assert.rejects(() => f.service.listRequests(900, value), statusIs(400));
    assert.deepEqual(f.transactions, []);
  }
  const f = fixture();
  await assert.rejects(() => f.service.listRequests(true), statusIs(400));
  const result = await f.service.updateRequest(900, '1', change, context);
  assert.equal(result.restaurantId, 1);
});

test('review queue scans bounded pages inside separate tenant transactions', async () => {
  const f = fixture({ count: 43 });
  const first = await f.service.listRequests(900);
  assert.equal(first.requests.length, 40);
  assert.equal(first.nextCursor, 4);
  assert.deepEqual(f.transactions, Array.from({ length: 40 }, (_, index) => 43 - index));
  assert.ok(f.maxActive() <= 5);
  for (const item of first.requests) {
    assert.equal(item.restaurant.id, item.restaurantId);
    assert.equal(item.connected, false);
    assert.equal(item.canDispatch, false);
  }
  const last = await f.service.listRequests(900, first.nextCursor);
  assert.deepEqual(last.requests.map(item => item.restaurantId), [3, 2, 1]);
  assert.equal(last.nextCursor, null);
});

test('an empty scanned page still exposes the cursor for remaining restaurants', async () => {
  const f = fixture({ count: 43 });
  for (let id = 4; id <= 43; id += 1) f.rows.delete(id);
  const first = await f.service.listRequests(900);
  assert.deepEqual(first.requests, []);
  assert.equal(first.nextCursor, 4);
  const last = await f.service.listRequests(900, first.nextCursor);
  assert.equal(last.requests.length, 3);
});

test('unknown stored status fails closed instead of exposing a connected account', async () => {
  const f = fixture();
  const row = f.rows.get(1);
  assert.ok(row);
  row.status = 'CONNECTED';
  await assert.rejects(() => f.service.listRequests(900), statusIs(409));
  assert.deepEqual(f.writes, []);
});

test('review modifies only its tenant and records an audit in the same transaction', async () => {
  const f = fixture();
  const untouched = structuredClone(f.rows.get(2));
  const result = await f.service.updateRequest(900, 1, change, context);
  assert.deepEqual(f.transactions, [1]);
  assert.deepEqual(f.writes, [1]);
  assert.deepEqual(f.rows.get(2), untouched);
  assert.equal(result.status, 'IN_REVIEW');
  assert.equal(result.connected, false);
  assert.equal(result.canDispatch, false);
  assert.equal('reviewedByUserId' in result, false);
  assert.equal(f.rows.get(1)?.reviewedByUserId, 900);
  assert.equal(f.audits.length, 1);
  assert.deepEqual(f.audits[0].metadata, {
    provider: 'LALAMOVE', oldStatus: 'REQUESTED', newStatus: 'IN_REVIEW', reasonCode: null, connected: false,
  });
});

test('missing requests and stale versions never issue an update or audit', async () => {
  const missing = fixture();
  await assert.rejects(() => missing.service.updateRequest(900, 99, change, context), statusIs(404));
  assert.deepEqual(missing.writes, []);
  for (const payload of [
    { ...change, expectedUpdatedAt: '2026-10-09T18:59:59.000Z' },
    { ...change, expectedStatus: 'ACTION_REQUIRED' },
  ]) {
    const f = fixture();
    await assert.rejects(() => f.service.updateRequest(900, 1, payload, context), statusIs(409));
    assert.deepEqual(f.writes, []);
    assert.deepEqual(f.audits, []);
  }
});

test('a lost atomic compare-and-set returns conflict without recording a successful review', async () => {
  const f = fixture({ loseAtomicUpdate: true });
  await assert.rejects(() => f.service.updateRequest(900, 1, change, context), statusIs(409));
  assert.equal(f.rows.get(1)?.status, 'REQUESTED');
  assert.deepEqual(f.audits, []);
});

test('audit failure propagates so the transaction cannot commit an unaudited review', async () => {
  const f = fixture({ failAudit: true });
  await assert.rejects(() => f.service.updateRequest(900, 1, change, context), /Audit unavailable/);
  assert.equal(f.rows.get(1)?.status, 'REQUESTED');
  assert.deepEqual(f.audits, []);
});

test('review rejects credentials, activation and invalid transitions before entering a tenant', async () => {
  for (const payload of [
    { ...change, apiSecret: 'TEST_ONLY_SENTINEL' },
    { ...change, restaurantId: 2 },
    { ...change, status: 'CONNECTED' },
    { ...change, status: 'ACTIVE' },
    { ...change, status: 'SUSPENDED' },
    { ...change, reasonCode: 'OTHER' },
    { ...change, status: 'REQUESTED', expectedStatus: 'IN_REVIEW' },
  ]) {
    const f = fixture();
    await assert.rejects(() => f.service.updateRequest(900, 1, payload, context), statusIs(400));
    assert.deepEqual(f.transactions, []);
    assert.deepEqual(f.audits, []);
  }
});

test('resuming review clears the old pending reason without activating dispatch', async () => {
  const f = fixture();
  const row = f.rows.get(1);
  assert.ok(row);
  row.status = 'SUSPENDED';
  row.reviewReasonCode = 'THERMAL_BAG';
  const result = await f.service.updateRequest(900, 1, { ...change, expectedStatus: 'SUSPENDED' }, context);
  assert.equal(result.status, 'IN_REVIEW');
  assert.equal(result.reviewReasonCode, null);
  assert.equal(result.canDispatch, false);
});

test('shared HTTP error middleware preserves review 400/403/404/409 statuses', () => {
  for (const statusCode of [400, 403, 404, 409]) {
    let receivedStatus = 0;
    let body: unknown;
    const response = {
      status(value: number) { receivedStatus = value; return this; },
      json(value: unknown) { body = value; return this; },
    } as unknown as Response;
    const request = { path: '/super-admin/delivery-partners/lalamove/requests/1', requestId: 'review-test' } as Request;
    errorHandlerMiddleware(new LalamoveReviewError('Mensagem segura', statusCode), request, response, () => {});
    assert.equal(receivedStatus, statusCode);
    assert.deepEqual(body, { error: 'Mensagem segura', requestId: 'review-test' });
  }
});
