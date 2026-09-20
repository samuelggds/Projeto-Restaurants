import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { LocalConfigStore, validateLocalAgentConfig } from './LocalConfigStore.js';
import { sanitizeFields } from '../logger.js';
import type { LocalAgentConfig } from '../types.js';

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

test('migração GastroNexa preserva pareamento sem ignorar configuração atual inválida', async (t) => {
  const temporaryRoot = path.join(os.tmpdir(), 'gastronexa-print-agent-migration-');
  const directory = await mkdtemp(temporaryRoot);
  const previousAppData = process.env.APPDATA;
  const config: LocalAgentConfig = {
    apiBaseUrl: 'https://api.example.com',
    credential,
    printerName: 'Legacy fixture printer',
    transport: 'mock',
    pollIntervalMs: 2_000,
  };

  try {
    process.env.APPDATA = directory;
    const legacyPath = path.join(directory, 'PizzaIADelivery', 'print-agent.json');
    const currentPath = path.join(directory, 'GastroNexa', 'print-agent.json');
    await new LocalConfigStore(legacyPath).save(config);
    const originalLegacy = await readFile(legacyPath, 'utf8');

    await t.test('padrão ausente lê legado e atualização salva na nova pasta', async () => {
      const store = new LocalConfigStore();
      assert.equal(store.filePath, currentPath);
      assert.deepEqual(await store.load(), config);
      await store.update({ printerName: 'Current fixture printer' });
      assert.equal((await store.load()).printerName, 'Current fixture printer');
      assert.equal(await readFile(legacyPath, 'utf8'), originalLegacy);
    });

    await t.test('configuração atual tem precedência sobre a legada', async () => {
      const current = await new LocalConfigStore().load();
      assert.equal(current.printerName, 'Current fixture printer');
      assert.equal(current.credential, config.credential);
    });

    await t.test('JSON e credencial inválidos na pasta atual não usam legado', async () => {
      await writeFile(currentPath, '{invalid JSON', 'utf8');
      await assert.rejects(new LocalConfigStore().load(), SyntaxError);
      await writeFile(currentPath, JSON.stringify({ ...config, credential: 'invalid' }), 'utf8');
      await assert.rejects(new LocalConfigStore().load(), /Credencial de pareamento inválida/u);
    });

    await t.test('erro de leitura diferente de ENOENT não usa legado', async () => {
      await rm(currentPath);
      await mkdir(currentPath);
      await assert.rejects(new LocalConfigStore().load(), (error: NodeJS.ErrnoException) => {
        assert.notEqual(error.code, 'ENOENT');
        assert.ok(error.code);
        return true;
      });
    });

    await t.test('caminho customizado ausente não usa legado', async () => {
      const custom = new LocalConfigStore(path.join(directory, 'custom-config.json'));
      await assert.rejects(custom.load(), { code: 'ENOENT' });
    });
  } finally {
    if (previousAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = previousAppData;
    assert.ok(path.resolve(directory).startsWith(path.resolve(temporaryRoot)));
    assert.equal(path.dirname(directory), path.dirname(temporaryRoot));
    await rm(directory, { recursive: true, force: true });
  }
});
