import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { UsdBrlExchangeRateService } from './UsdBrlExchangeRateService.js';

const originalFetch = globalThis.fetch;
const originalNodeEnv = process.env.NODE_ENV;
const originalMaxAge = process.env.FX_MAX_QUOTE_AGE_SECONDS;
const originalApiKey = process.env.FX_AWESOME_API_KEY;

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv('NODE_ENV', originalNodeEnv);
  restoreEnv('FX_MAX_QUOTE_AGE_SECONDS', originalMaxAge);
  restoreEnv('FX_AWESOME_API_KEY', originalApiKey);
});

test('aceita o ultimo tick valido mesmo com configuracao legada de 180 segundos', async () => {
  process.env.NODE_ENV = 'test';
  process.env.FX_MAX_QUOTE_AGE_SECONDS = '180';
  const quotedAt = new Date(Date.now() - 6 * 60 * 60 * 1000);

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        USDBRL: {
          code: 'USD',
          codein: 'BRL',
          bid: '5.20',
          ask: '5.25',
          timestamp: String(Math.floor(quotedAt.getTime() / 1000)),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  const quote = await new UsdBrlExchangeRateService().getCurrentQuote();

  assert.equal(quote.rateBrlPerUsd, 5.25);
  assert.equal(quote.source, 'AWESOME_API');
});

test('continua rejeitando cotacao realmente antiga', async () => {
  process.env.NODE_ENV = 'test';
  delete process.env.FX_MAX_QUOTE_AGE_SECONDS;
  const quotedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        USDBRL: {
          code: 'USD',
          codein: 'BRL',
          bid: '5.20',
          ask: '5.25',
          timestamp: String(Math.floor(quotedAt.getTime() / 1000)),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  await assert.rejects(
    () => new UsdBrlExchangeRateService().getCurrentQuote(),
    /Cotação USD\/BRL desatualizada/u,
  );
});
