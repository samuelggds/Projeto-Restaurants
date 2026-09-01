import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { parseSafeTenantE2EDatabaseUrl, redactDatabaseUrl } from './tenantE2eDatabaseSafety.mjs';

const backendRoot = process.cwd();
const dockerImage = process.env.TENANT_E2E_POSTGRES_IMAGE || 'postgres:16-alpine';
const dockerContainerName = `pizza-tenant-e2e-${process.pid}-${Date.now()}`;
const postgresUser = 'tenant_e2e_owner';
const postgresPassword = 'tenant-e2e-owner-password';
const postgresDatabase = 'tenant_e2e';
const runtimeUser = 'tenant_e2e_runtime';
const runtimePassword = 'tenant-e2e-runtime-password';
let ownsDockerContainer = false;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: backendRoot,
      env: options.env || process.env,
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    if (options.capture) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(' ')} falhou com código ${code}.${stderr ? ` ${stderr.trim()}` : ''}`,
        ),
      );
    });
  });
}

async function waitForPostgres() {
  let lastError;
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    try {
      await run(
        'docker',
        ['exec', dockerContainerName, 'pg_isready', '-U', postgresUser, '-d', postgresDatabase],
        { capture: true },
      );
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError || new Error('PostgreSQL E2E não ficou pronto a tempo.');
}

async function createDisposablePostgres() {
  console.log(`Criando PostgreSQL descartável ${dockerContainerName} com ${dockerImage}.`);
  await run('docker', [
    'run',
    '--detach',
    '--rm',
    '--name',
    dockerContainerName,
    '--env',
    `POSTGRES_USER=${postgresUser}`,
    '--env',
    `POSTGRES_PASSWORD=${postgresPassword}`,
    '--env',
    `POSTGRES_DB=${postgresDatabase}`,
    '--publish',
    '127.0.0.1::5432',
    dockerImage,
  ]);
  ownsDockerContainer = true;
  await waitForPostgres();

  const { stdout } = await run('docker', ['port', dockerContainerName, '5432/tcp'], {
    capture: true,
  });
  const match = /:(\d+)\s*$/u.exec(stdout.split(/\r?\n/u)[0] || '');
  if (!match) throw new Error(`Não foi possível descobrir a porta PostgreSQL: ${stdout}`);

  return `postgresql://${postgresUser}:${postgresPassword}@127.0.0.1:${match[1]}/${postgresDatabase}?schema=public`;
}

function buildRuntimeDatabaseUrl(ownerUrl) {
  const runtimeUrl = new URL(ownerUrl);
  runtimeUrl.username = runtimeUser;
  runtimeUrl.password = runtimePassword;
  return runtimeUrl.toString();
}

async function collectE2ETests({ rlsOnly = false } = {}) {
  const directory = path.resolve(backendRoot, 'src/e2e/multiTenant');
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.e2e.ts') &&
        (rlsOnly ? entry.name.endsWith('.rls.e2e.ts') : !entry.name.endsWith('.rls.e2e.ts')),
    )
    .map((entry) => path.relative(backendRoot, path.join(directory, entry.name)))
    .sort();
}

async function deployMigrationsWithStartupRetry(prismaCli, testEnv) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await run(process.execPath, [prismaCli, 'migrate', 'deploy'], { env: testEnv });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 4) break;
      console.warn(
        `Prisma ainda não alcançou o PostgreSQL (tentativa ${attempt}/4); repetindo de forma idempotente.`,
      );
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

async function cleanup() {
  if (!ownsDockerContainer) return;
  ownsDockerContainer = false;
  try {
    await run('docker', ['rm', '--force', dockerContainerName], { capture: true });
    console.log(`PostgreSQL descartável ${dockerContainerName} removido.`);
  } catch (error) {
    console.error('Falha ao remover o PostgreSQL descartável:', error.message);
  }
}

async function main() {
  const suppliedOwnerUrl = String(process.env.TENANT_E2E_OWNER_DATABASE_URL || '').trim();
  const ownerDatabaseUrl = suppliedOwnerUrl || (await createDisposablePostgres());
  const safeOwnerDatabase = parseSafeTenantE2EDatabaseUrl(ownerDatabaseUrl);
  const safeRuntimeDatabase = parseSafeTenantE2EDatabaseUrl(
    buildRuntimeDatabaseUrl(safeOwnerDatabase.url),
  );
  const rlsOnly = process.argv.includes('--rls-only');
  const testFiles = await collectE2ETests({ rlsOnly });
  if (!testFiles.length) throw new Error('Nenhum arquivo .e2e.ts multi-tenant foi encontrado.');

  const testEnv = {
    ...process.env,
    DATABASE_URL: safeRuntimeDatabase.url,
    DIRECT_URL: safeOwnerDatabase.url,
    TENANT_E2E_DATABASE_URL: safeRuntimeDatabase.url,
    TENANT_E2E_OWNER_DATABASE_URL: safeOwnerDatabase.url,
    TENANT_E2E_RUNTIME_DATABASE_URL: safeRuntimeDatabase.url,
    NODE_ENV: 'test',
    JWT_SECRET: process.env.JWT_SECRET || 'tenant-e2e-access-secret-32-characters-minimum',
    JWT_REFRESH_SECRET:
      process.env.JWT_REFRESH_SECRET || 'tenant-e2e-refresh-secret-32-characters-minimum',
    JWT_MFA_SECRET: process.env.JWT_MFA_SECRET || 'tenant-e2e-mfa-secret-32-characters-minimum',
    CREDENTIAL_ENCRYPTION_KEY:
      process.env.CREDENTIAL_ENCRYPTION_KEY || 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=',
    ALLOW_GLOBAL_PAYMENT_FALLBACK: 'false',
    ALLOW_INSECURE_STRIPE_WEBHOOK: 'false',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_tenant_e2e_only',
    ASAAS_WEBHOOK_TOKEN: 'tenant-e2e-asaas-webhook-token',
    AUTH_RATE_LIMIT_MAX_REQUESTS: '1000',
    GLOBAL_RATE_LIMIT_MAX_REQUESTS: '5000',
    SOCKET_AUTH_REVALIDATE_MS: '5000',
  };

  console.log(`Banco E2E owner validado: ${redactDatabaseUrl(safeOwnerDatabase.url)}`);
  console.log(`Banco E2E runtime validado: ${redactDatabaseUrl(safeRuntimeDatabase.url)}`);
  console.log('Aplicando migrações Prisma com a conexão owner.');
  const prismaCli = path.resolve(backendRoot, 'node_modules/prisma/build/index.js');
  const ownerEnv = { ...testEnv, DATABASE_URL: safeOwnerDatabase.url };
  await deployMigrationsWithStartupRetry(prismaCli, ownerEnv);

  console.log('Provisionando a role runtime NOSUPERUSER/NOBYPASSRLS sem ownership.');
  await run(
    process.execPath,
    [
      prismaCli,
      'db',
      'execute',
      '--file',
      path.resolve(backendRoot, 'prisma/rls/setup-e2e-runtime-role.sql'),
      '--schema',
      path.resolve(backendRoot, 'prisma/schema.prisma'),
    ],
    { env: ownerEnv },
  );

  console.log(`Executando ${testFiles.length} arquivo(s) E2E multi-tenant.`);
  const runner = path.resolve(backendRoot, 'scripts/runTsxWithOsUserInfoFallback.cjs');
  await run(process.execPath, [runner, '--test', '--test-concurrency=1', ...testFiles], {
    env: testEnv,
  });
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await cleanup();
}
