import { spawn } from 'node:child_process';
import { readdir, writeFile } from 'node:fs/promises';
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

async function collectE2ETests({ rlsOnly = false, scaleOnly = false } = {}) {
  const directory = path.resolve(backendRoot, 'src/e2e/multiTenant');
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.e2e.ts') &&
        (!scaleOnly || entry.name === 'runtimeScale.e2e.ts') &&
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

async function verifyDisposableRestore(ownerDatabaseUrl, testEnv) {
  if (!ownsDockerContainer) throw new Error('O ensaio de restauração exige o container descartável criado por este script.');
  const { PrismaClient } = await import('@prisma/client');
  const snapshot = async (url) => {
    const client = new PrismaClient({ datasourceUrl: url });
    try {
      const names = await client.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
      const tables = [];
      for (const { tablename } of names) {
        const identifier = '"' + tablename.replaceAll('"', '""') + '"';
        const [row] = await client.$queryRawUnsafe(`SELECT COUNT(*)::integer AS count,
          md5(COALESCE(string_agg(hash, '' ORDER BY hash), '')) AS digest
          FROM (SELECT md5(row_to_json(t)::text) AS hash FROM ${identifier} t) content`);
        tables.push({ name: tablename, ...row });
      }
      const foreignKeys = await client.$queryRaw`SELECT conname, convalidated FROM pg_constraint
        WHERE contype = 'f' AND connamespace = 'public'::regnamespace ORDER BY conname`;
      const policies = await client.$queryRaw`SELECT tablename, policyname, permissive, roles::text, cmd, qual, with_check
        FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname`;
      return { tables, foreignKeys, policies };
    } finally { await client.$disconnect(); }
  };
  const before = await snapshot(ownerDatabaseUrl);
  await run('docker', ['exec', dockerContainerName, 'pg_dump', '-U', postgresUser, '-d', postgresDatabase, '-Fc', '-f', '/tmp/tenant-restore.dump'], { capture: true });
  await run('docker', ['exec', dockerContainerName, 'createdb', '-U', postgresUser, 'tenant_restore_e2e'], { capture: true });
  await run('docker', ['exec', dockerContainerName, 'pg_restore', '-U', postgresUser, '-d', 'tenant_restore_e2e', '--no-owner', '--no-privileges', '--exit-on-error', '/tmp/tenant-restore.dump'], { capture: true });
  const restoredUrl = new URL(ownerDatabaseUrl);
  restoredUrl.pathname = '/tenant_restore_e2e';
  const after = await snapshot(restoredUrl.toString());
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('A restauração divergiu do conteúdo, constraints ou policies originais.');
  const restoredRuntimeUrl = buildRuntimeDatabaseUrl(restoredUrl.toString());
  await run(process.execPath, [path.resolve(backendRoot, 'scripts/provisionRuntimeRole.mjs')], {
    env: { ...testEnv, DATABASE_URL: restoredUrl.toString(), DIRECT_URL: restoredUrl.toString(), RUNTIME_DATABASE_URL: restoredRuntimeUrl },
  });
  const restoredRuntime = new PrismaClient({ datasourceUrl: restoredRuntimeUrl });
  try {
    const [role] = await restoredRuntime.$queryRaw`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
    if (role.rolsuper || role.rolbypassrls) throw new Error('Role restaurada contorna RLS.');
    const [pilot] = await restoredRuntime.$queryRaw`SELECT COUNT(*)::integer AS count FROM "OrderIssueThread"`;
    if (pilot.count !== 0) throw new Error('RLS restaurada expôs dados sem contexto de tenant.');
  } finally { await restoredRuntime.$disconnect(); }
  const report = { timestamp: new Date().toISOString(), passed: true,
    environment: 'PostgreSQL descartável; segunda base vazia no mesmo container',
    tables: before.tables.length, rows: before.tables.reduce((sum, row) => sum + row.count, 0),
    foreignKeys: before.foreignKeys.length, policies: before.policies.length,
    checks: ['contagem e digest de todas as linhas', 'foreign keys validadas', 'policies preservadas', 'role runtime reprovisionada sem bypass', 'RLS bloqueia leitura sem contexto'],
    limitations: 'Não restaura um backup de produção, storage remoto ou chaves externas. RPO/RTO de produção ainda exigem ensaio no ambiente contratado.' };
  await writeFile(path.resolve(backendRoot, '../artifacts/restore-drill-result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('RESTORE_DRILL', JSON.stringify(report));
}

async function main() {
  const suppliedOwnerUrl = String(process.env.TENANT_E2E_OWNER_DATABASE_URL || '').trim();
  const ownerDatabaseUrl = suppliedOwnerUrl || (await createDisposablePostgres());
  const safeOwnerDatabase = parseSafeTenantE2EDatabaseUrl(ownerDatabaseUrl);
  const safeRuntimeDatabase = parseSafeTenantE2EDatabaseUrl(
    buildRuntimeDatabaseUrl(safeOwnerDatabase.url),
  );
  const rlsOnly = process.argv.includes('--rls-only');
  const scaleOnly = process.argv.includes('--scale');
  const testFiles = await collectE2ETests({ rlsOnly, scaleOnly });
  if (!testFiles.length) throw new Error('Nenhum arquivo .e2e.ts multi-tenant foi encontrado.');

  const testEnv = {
    ...process.env,
    DATABASE_URL: safeRuntimeDatabase.url,
    DIRECT_URL: safeOwnerDatabase.url,
    TENANT_E2E_DATABASE_URL: safeRuntimeDatabase.url,
    TENANT_E2E_OWNER_DATABASE_URL: safeOwnerDatabase.url,
    TENANT_E2E_RUNTIME_DATABASE_URL: safeRuntimeDatabase.url,
    NODE_ENV: 'test',
    DISTRIBUTED_STATE: 'memory',
    API_REPLICA_COUNT: '1',
    TENANT_E2E_SCALE_LOAD: scaleOnly ? 'true' : 'false',
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
    MP_WEBHOOK_SECRET: 'tenant-e2e-mp-webhook-secret',
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
  await run(process.execPath, [path.resolve(backendRoot, 'scripts/provisionRuntimeRole.mjs')], {
    env: { ...ownerEnv, RUNTIME_DATABASE_URL: safeRuntimeDatabase.url },
  });

  console.log(`Executando ${testFiles.length} arquivo(s) E2E multi-tenant.`);
  const runner = path.resolve(backendRoot, 'scripts/runTsxWithOsUserInfoFallback.cjs');
  await run(process.execPath, [runner, '--test', '--test-concurrency=1', ...testFiles], {
    env: testEnv,
  });
  if (process.argv.includes('--restore-check')) await verifyDisposableRestore(safeOwnerDatabase.url, testEnv);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await cleanup();
}
