import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

function readJsonVersion(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return typeof parsed.version === 'string' ? parsed.version : null;
  } catch {
    return null;
  }
}

function prismaClientIsCurrent() {
  const sourceSchema = resolve(process.cwd(), 'prisma/schema.prisma');
  const generatedSchema = resolve(process.cwd(), 'node_modules/.prisma/client/schema.prisma');
  const clientPackage = resolve(process.cwd(), 'node_modules/@prisma/client/package.json');
  const generatedPackage = resolve(process.cwd(), 'node_modules/.prisma/client/package.json');

  if (
    !existsSync(sourceSchema) ||
    !existsSync(generatedSchema) ||
    !existsSync(clientPackage) ||
    !existsSync(generatedPackage)
  ) {
    return false;
  }

  const source = readFileSync(sourceSchema);
  const generated = readFileSync(generatedSchema);
  if (!source.equals(generated)) return false;

  const installedVersion = readJsonVersion(clientPackage);
  const generatedVersion = readJsonVersion(generatedPackage);
  return Boolean(installedVersion && generatedVersion && installedVersion === generatedVersion);
}

function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: capture ? 'utf8' : undefined,
    stdio: capture ? 'pipe' : 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (capture) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }

  if (result.error) throw result.error;
  return result;
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

const migrate = run('npx', ['prisma', 'migrate', 'deploy']);
if (migrate.status !== 0) {
  throw new Error(`npx prisma migrate deploy falhou com código ${migrate.status}.`);
}

if (prismaClientIsCurrent()) {
  console.info('[dev:prepare] Prisma Client já está compatível com o schema atual; generate ignorado.');
} else {
  console.info('[dev:prepare] Prisma Client precisa ser regenerado.');
  const generate = run('npx', ['prisma', 'generate'], { capture: true });

  if (generate.status !== 0) {
    const output = `${generate.stdout || ''}\n${generate.stderr || ''}`;
    const windowsEngineLocked =
      process.platform === 'win32' &&
      /EPERM:/u.test(output) &&
      /query_engine-windows\.dll\.node/iu.test(output);

    if (windowsEngineLocked) {
      throw new Error(
        [
          'O Windows está mantendo o engine do Prisma aberto por outro processo Node.',
          'Feche o backend antigo que ainda estiver rodando e execute npm run dev novamente.',
          'O frontend Vite pode continuar aberto; não é necessário apagar node_modules nem resetar o banco.',
        ].join(' '),
      );
    }

    throw new Error(`npx prisma generate falhou com código ${generate.status}.`);
  }

  if (!prismaClientIsCurrent()) {
    throw new Error(
      'O Prisma Client foi gerado, mas não corresponde ao schema atual. A inicialização foi bloqueada.',
    );
  }
}

console.info('[dev:prepare] Prisma Client e migrations locais sincronizados.');
