import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const LOCAL_DATABASE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
  'host.docker.internal',
]);

function parseDatabaseUrl(name, value) {
  const raw = String(value || '').trim();
  if (!raw) {
    throw new Error(`${name} é obrigatória para preparar o ambiente de desenvolvimento.`);
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${name} é inválida. A credencial não foi exibida.`);
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(`${name} deve apontar para PostgreSQL.`);
  }

  const host = parsed.hostname.toLowerCase();
  if (!LOCAL_DATABASE_HOSTS.has(host)) {
    throw new Error(
      `${name} aponta para host não local (${host}). A preparação automática do dev foi bloqueada.`,
    );
  }

  return {
    host,
    database: decodeURIComponent(parsed.pathname.replace(/^\/+/, '')) || '(sem nome)',
  };
}

const nodeEnv = String(process.env.NODE_ENV || 'development').trim().toLowerCase();
const databaseEnv = String(process.env.OPS_DATABASE_ENV || 'development').trim().toLowerCase();

if (nodeEnv === 'production' || databaseEnv === 'production') {
  throw new Error(
    'Preparação automática de desenvolvimento bloqueada: ambiente marcado como production.',
  );
}

const runtimeDatabase = parseDatabaseUrl('DATABASE_URL', process.env.DATABASE_URL);
const migrationDatabase = parseDatabaseUrl(
  'DIRECT_URL',
  process.env.DIRECT_URL || process.env.DATABASE_URL,
);

console.info(
  `[dev:prepare] Banco local confirmado: ${runtimeDatabase.host}/${runtimeDatabase.database}`,
);
if (
  runtimeDatabase.host !== migrationDatabase.host ||
  runtimeDatabase.database !== migrationDatabase.database
) {
  console.info(
    `[dev:prepare] Conexão de migration local: ${migrationDatabase.host}/${migrationDatabase.database}`,
  );
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} falhou com código ${result.status}.`);
  }
}

run('npx', ['prisma', 'generate']);
run('npx', ['prisma', 'migrate', 'deploy']);
console.info('[dev:prepare] Prisma Client e migrations locais sincronizados.');
