#!/usr/bin/env node

const baseUrl = (process.env.SMOKE_BASE_URL || process.argv[2] || '').replace(/\/$/u, '');
if (!baseUrl) {
  console.error('Informe SMOKE_BASE_URL ou passe a URL base como primeiro argumento.');
  process.exit(2);
}

const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10_000);
const probes = [
  { path: '/health', validate: (body) => body && typeof body === 'object' },
  { path: '/ready', validate: (body) => body && typeof body === 'object' },
];

for (const probe of probes) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${probe.path}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !probe.validate(body)) {
      throw new Error(`HTTP ${response.status} ou resposta inválida`);
    }
    console.log(`✓ ${probe.path} respondeu corretamente`);
  } catch (error) {
    console.error(`✗ ${probe.path}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
}
