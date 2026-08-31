const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const TEST_DATABASE_NAME = /(?:^|[_-])(ci|e2e|test)(?:[_-]|$)/iu;

export function parseSafeTenantE2EDatabaseUrl(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) {
    throw new Error('TENANT_E2E_DATABASE_URL não foi informada.');
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('TENANT_E2E_DATABASE_URL inválida.');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('A suíte multi-tenant aceita somente PostgreSQL.');
  }

  if (!LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error('O PostgreSQL E2E deve estar em localhost/loopback.');
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, '')).trim();
  if (!databaseName || !TEST_DATABASE_NAME.test(databaseName)) {
    throw new Error('O nome do banco deve conter ci, e2e ou test de forma explícita.');
  }

  return {
    databaseName,
    url: parsed.toString(),
  };
}

export function redactDatabaseUrl(rawValue) {
  const parsed = new URL(String(rawValue || ''));
  if (parsed.password) parsed.password = '***';
  return parsed.toString();
}
