// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  applyCorsAndGlobalRateLimit,
  resolveGlobalRateLimitMax,
} from './httpAccessProtection.js';

const allowedOrigin = 'http://localhost:5173';
const originalEnv = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
});

test('mantém os cabeçalhos CORS quando o limite global responde 429', async () => {
  process.env.NODE_ENV = 'production';
  process.env.CORS_ORIGINS = allowedOrigin;
  process.env.FRONTEND_URL = allowedOrigin;
  process.env.RATE_LIMIT_MAX_REQUESTS = '3000';
  process.env.RATE_LIMIT_WINDOW_MS = '60000';

  const app = express();
  app.set('trust proxy', 1);
  applyCorsAndGlobalRateLimit(app);
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const request = () =>
      fetch(`http://127.0.0.1:${port}/health`, {
        headers: { Origin: allowedOrigin },
      });

    let limitedResponse: Response | null = null;
    for (let attempt = 0; attempt <= 3000; attempt += 1) {
      const response = await request();
      if (response.status === 429) {
        limitedResponse = response;
        break;
      }
    }

    assert.ok(limitedResponse);
    const body = await limitedResponse.json();
    assert.equal(limitedResponse.status, 429);
    assert.equal(limitedResponse.headers.get('access-control-allow-origin'), allowedOrigin);
    assert.equal(body.error, 'Muitas requisicoes. Tente novamente em instantes.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('usa margens seguras para telas em tempo real sem reduzir configuração maior', () => {
  assert.equal(resolveGlobalRateLimitMax(false, 300), 5000);
  assert.equal(resolveGlobalRateLimitMax(false, 8000), 8000);
  assert.equal(resolveGlobalRateLimitMax(true, 300), 3000);
  assert.equal(resolveGlobalRateLimitMax(true, 8000), 8000);
  assert.equal(resolveGlobalRateLimitMax(true, Number.NaN), 3000);
});

test('bloqueia POST cross-site de origem não autorizada e permite a origem configurada', async () => {
  process.env.NODE_ENV = 'production';
  process.env.CORS_ORIGINS = allowedOrigin;
  process.env.FRONTEND_URL = allowedOrigin;
  process.env.RATE_LIMIT_MAX_REQUESTS = '3000';

  const app = express();
  app.set('trust proxy', 1);
  applyCorsAndGlobalRateLimit(app);
  app.post('/auth/refresh', (_req, res) => res.status(204).end());
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const rejected = await fetch(`http://127.0.0.1:${port}/auth/refresh`, {
      method: 'POST',
      headers: { Origin: 'https://attacker.example', 'Sec-Fetch-Site': 'cross-site' },
    });
    const accepted = await fetch(`http://127.0.0.1:${port}/auth/refresh`, {
      method: 'POST',
      headers: { Origin: allowedOrigin, 'Sec-Fetch-Site': 'cross-site' },
    });

    assert.equal(rejected.status, 403);
    assert.equal(accepted.status, 204);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
