import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { requestIdMiddleware } from './requestIdMiddleware.js';
import { normalizeOrigin } from './httpAccessProtection.js';

test('request IDs cannot reflect secrets or arbitrary log content', () => {
  for (const supplied of ['Bearer private-secret', 'x'.repeat(20000), 'injected\nlog', '']) {
    const req = { headers: { 'x-request-id': supplied } } as unknown as Request;
    let reflected: unknown;
    requestIdMiddleware(
      req,
      {
        setHeader: (_name, value) => {
          reflected = value;
        },
      } as Response,
      () => undefined,
    );
    assert.match(req.requestId || '', /^[a-f0-9-]{36}$/u);
    assert.notEqual(reflected, supplied);
  }
  const id = '12345678-1234-4234-8234-123456789abc';
  const req = { headers: { 'x-request-id': id } } as unknown as Request;
  requestIdMiddleware(req, { setHeader: () => undefined } as unknown as Response, () => undefined);
  assert.equal(req.requestId, id);
});

test('origin normalization handles long slash runs without ambiguous regexes', () => {
  assert.equal(
    normalizeOrigin(` https://example.com${'/'.repeat(200000)} `),
    'https://example.com',
  );
  assert.equal(normalizeOrigin('https://example.com/path'), 'https://example.com/path');
});
