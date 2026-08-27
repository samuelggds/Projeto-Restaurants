import { createHash } from 'node:crypto';

const ENVIRONMENT_ALIASES = new Map([
  ['local', 'development'],
  ['dev', 'development'],
  ['development', 'development'],
  ['test', 'test'],
  ['testing', 'test'],
  ['staging', 'staging'],
  ['stage', 'staging'],
  ['production', 'production'],
  ['prod', 'production'],
]);

export const PRODUCTION_UNLOCK_VALUE = 'ALLOW_PRODUCTION_OPERATIONS';

export function normalizeEnvironment(value, label = 'ambiente') {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  const environment = ENVIRONMENT_ALIASES.get(normalized);
  if (!environment) {
    throw new Error(
      `${label} inválido ou ausente. Use development, test, staging ou production explicitamente.`,
    );
  }
  return environment;
}

export function databaseFingerprint(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
      throw new Error('protocolo não suportado');
    }
    const database = decodeURIComponent(parsed.pathname.replace(/^\//u, '')) || '(sem nome)';
    const schema = decodeURIComponent(parsed.searchParams.get('schema') || 'public');
    const canonicalIdentity = JSON.stringify({
      protocol: parsed.protocol.slice(0, -1),
      username: decodeURIComponent(parsed.username || ''),
      host: parsed.hostname.toLowerCase() || '(sem host)',
      port: parsed.port || '5432',
      database,
      schema,
    });

    return {
      protocol: parsed.protocol.slice(0, -1),
      host: parsed.hostname || '(sem host)',
      port: parsed.port || '5432',
      database,
      schema,
      identityHash: createHash('sha256').update(canonicalIdentity).digest('hex').slice(0, 16),
    };
  } catch {
    throw new Error('DATABASE_URL inválida. A credencial não foi exibida.');
  }
}

export function formatDatabaseFingerprint(fingerprint) {
  if (!fingerprint) return '(sem-banco)';
  return `${fingerprint.host}:${fingerprint.port}/${fingerprint.database}?schema=${encodeURIComponent(fingerprint.schema)}#${fingerprint.identityHash}`;
}

export function assertOperationalEnvironment({
  targetEnvironment,
  allowProduction = false,
  requireDatabase = true,
  requireRuntimeEnvironment = true,
  requireDatabaseEnvironment = true,
  databaseUrl = process.env.DATABASE_URL,
}) {
  const target = normalizeEnvironment(targetEnvironment, '--environment');
  const runtimeRaw = String(process.env.NODE_ENV ?? '').trim();
  const runtime = runtimeRaw ? normalizeEnvironment(runtimeRaw, 'NODE_ENV') : null;

  if (requireRuntimeEnvironment && !runtime) {
    throw new Error(
      'NODE_ENV é obrigatório em scripts operacionais e deve corresponder a --environment.',
    );
  }

  if (runtime && runtime !== target) {
    throw new Error(
      `Ambiente declarado (${target}) diverge de NODE_ENV (${runtime}). Corrija a configuração antes de continuar.`,
    );
  }

  if (target === 'production') {
    if (!allowProduction) {
      throw new Error(
        'Operação bloqueada em produção por padrão. A liberação exige --allow-production e a variável OPS_ALLOW_PRODUCTION.',
      );
    }
    if (process.env.OPS_ALLOW_PRODUCTION !== PRODUCTION_UNLOCK_VALUE) {
      throw new Error(
        `Produção continua bloqueada. Defina OPS_ALLOW_PRODUCTION=${PRODUCTION_UNLOCK_VALUE} somente para a execução autorizada.`,
      );
    }
  }

  const database = databaseFingerprint(databaseUrl);
  if (requireDatabase && !database) {
    throw new Error('DATABASE_URL é obrigatória para este script operacional.');
  }

  const databaseEnvironmentRaw = String(process.env.OPS_DATABASE_ENV ?? '').trim();
  const databaseEnvironment = databaseEnvironmentRaw
    ? normalizeEnvironment(databaseEnvironmentRaw, 'OPS_DATABASE_ENV')
    : null;
  if (requireDatabaseEnvironment && !databaseEnvironment) {
    throw new Error(
      'OPS_DATABASE_ENV é obrigatório e deve declarar o ambiente real do DATABASE_URL.',
    );
  }
  if (databaseEnvironment && databaseEnvironment !== target) {
    throw new Error(
      `DATABASE_URL foi marcado como ${databaseEnvironment}, mas --environment declarou ${target}.`,
    );
  }

  const fingerprintVariable = `OPS_DATABASE_FINGERPRINT_${target.toUpperCase()}`;
  const allowedFingerprint = String(process.env[fingerprintVariable] ?? '')
    .trim()
    .toLowerCase();
  if (target === 'production' && !allowedFingerprint) {
    throw new Error(
      `${fingerprintVariable} é obrigatório para vincular a operação ao banco de produção. ` +
        `Identidade calculada: ${database?.identityHash || '(sem-banco)'}.`,
    );
  }
  if (allowedFingerprint && allowedFingerprint !== database?.identityHash) {
    throw new Error(
      `${fingerprintVariable} não corresponde ao DATABASE_URL atual. Operação bloqueada.`,
    );
  }

  return {
    target,
    runtime,
    databaseEnvironment,
    database,
    databaseLabel: formatDatabaseFingerprint(database),
    fingerprintVariable,
  };
}

export function assertHttpTarget(baseUrl, targetEnvironment) {
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error('--base-url deve ser uma URL absoluta válida.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('--base-url deve usar http ou https.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('--base-url não pode conter credenciais.');
  }
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error(
      '--base-url deve conter somente origem e porta, sem caminho, query ou fragmento.',
    );
  }
  if (targetEnvironment === 'production' && parsed.protocol !== 'https:') {
    throw new Error('Alvos declarados como produção devem usar HTTPS.');
  }

  return parsed.origin;
}
