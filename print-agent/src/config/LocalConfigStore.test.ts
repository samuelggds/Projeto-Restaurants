import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { LocalConfigStore, validateLocalAgentConfig } from './LocalConfigStore.js';
import { sanitizeFields } from '../logger.js';

const credential =
  'pa_2f7a7df8-a444-4db9-a47a-5b79560352be.abcdefghijklmnopqrstuvwxyzABCDEFGH123456789';

test('config local salva pareamento e seleção sem expor token no resumo/log', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'print-agent-config-test-'));
  const filePath = path.join(directory, 'config.json');
  const store = new LocalConfigStore(filePath);
  try {
    await store.save({
      apiBaseUrl: 'http://localhost:3000',
      credential,
      printerName: null,
      transport: 'mock',
      pollIntervalMs: 2_000,
    });
    const selected = await store.update({ printerName: 'Mock Thermal Printer' });
    assert.equal(selected.printerName, 'Mock Thermal Printer');
    assert.equal((await store.load()).credential, credential);
    assert.equal(JSON.stringify(store.safeSummary(selected)).includes(credential), false);
    assert.equal(
      JSON.stringify(sanitizeFields({ credential, token: credential })).includes(credential),
      false,
    );
    assert.match(await readFile(filePath, 'utf8'), /Mock Thermal Printer/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('config rejeita HTTP remoto, polling agressivo e credencial inválida', () => {
  for (const value of [
    {
      apiBaseUrl: 'http://example.com',
      credential,
      printerName: null,
      transport: 'windows',
      pollIntervalMs: 2_000,
    },
    {
      apiBaseUrl: 'https://example.com',
      credential,
      printerName: null,
      transport: 'windows',
      pollIntervalMs: 100,
    },
    {
      apiBaseUrl: 'https://example.com',
      credential: 'invalida',
      printerName: null,
      transport: 'windows',
      pollIntervalMs: 2_000,
    },
  ]) {
    assert.throws(() => validateLocalAgentConfig(value));
  }
});
