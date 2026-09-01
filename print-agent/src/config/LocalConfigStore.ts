import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { LocalAgentConfig } from '../types.js';

function defaultConfigPath() {
  const base = process.env.APPDATA || path.join(os.homedir(), '.config');
  return path.join(base, 'PizzaIADelivery', 'print-agent.json');
}

function normalizeApiBaseUrl(value: unknown) {
  const url = new URL(String(value || '').trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL do SaaS inválida.');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error('Use HTTPS fora do ambiente local.');
  }
  return url.toString().replace(/\/$/u, '');
}

export function validateLocalAgentConfig(value: unknown): LocalAgentConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Configuração local inválida.');
  }
  const record = value as Record<string, unknown>;
  const credential = String(record.credential || '').trim();
  if (!/^pa_[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/u.test(credential)) {
    throw new Error('Credencial de pareamento inválida.');
  }
  const transport = record.transport === 'mock' ? 'mock' : 'windows';
  const pollIntervalMs = Number(record.pollIntervalMs || 2_000);
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 1_000 || pollIntervalMs > 60_000) {
    throw new Error('Intervalo de polling deve ficar entre 1 e 60 segundos.');
  }
  return {
    apiBaseUrl: normalizeApiBaseUrl(record.apiBaseUrl),
    credential,
    printerName: String(record.printerName || '').trim() || null,
    transport,
    pollIntervalMs,
  };
}

export class LocalConfigStore {
  constructor(readonly filePath = defaultConfigPath()) {}

  async load() {
    const raw = await readFile(this.filePath, 'utf8');
    return validateLocalAgentConfig(JSON.parse(raw));
  }

  async save(config: LocalAgentConfig) {
    const validated = validateLocalAgentConfig(config);
    const directory = path.dirname(this.filePath);
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(temporary, `${JSON.stringify(validated, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    await rename(temporary, this.filePath);
    await chmod(this.filePath, 0o600).catch(() => undefined);
    return validated;
  }

  async update(patch: Partial<LocalAgentConfig>) {
    return this.save({ ...(await this.load()), ...patch });
  }

  safeSummary(config: LocalAgentConfig) {
    return {
      apiBaseUrl: config.apiBaseUrl,
      printerName: config.printerName,
      transport: config.transport,
      pollIntervalMs: config.pollIntervalMs,
      credentialConfigured: Boolean(config.credential),
      configPath: this.filePath,
    };
  }
}
