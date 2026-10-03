import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const LOCAL_DATABASE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
  'host.docker.internal',
]);

const PRISMA_STATE_FILE = resolve(
  process.cwd(),
  'node_modules/.cache/gastronexa/prisma-client-state.json',
);

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

function normalizeSchemaText(value) {
  return String(value || '')
    .replace(/^\uFEFF/u, '')
    .replace(/\r\n?/gu, '\n');
}

function currentPrismaSignature() {
  const schemaPath = resolve(process.cwd(), 'prisma/schema.prisma');
  const prismaPackage = resolve(process.cwd(), 'node_modules/prisma/package.json');
  const clientPackage = resolve(process.cwd(), 'node_modules/@prisma/client/package.json');

  if (!existsSync(schemaPath)) {
    throw new Error('prisma/schema.prisma não foi encontrado.');
  }

  const prismaVersion = readJsonVersion(prismaPackage);
  const clientVersion = readJsonVersion(clientPackage);
  if (!prismaVersion || !clientVersion) {
    throw new Error(
      'Prisma não está instalado corretamente. Execute npm install antes de iniciar o backend.',
    );
  }

  const schema = normalizeSchemaText(readFileSync(schemaPath, 'utf8'));
  return createHash('sha256')
    .update(schema)
    .update('\0')
    .update(prismaVersion)
    .update('\0')
    .update(clientVersion)
    .digest('hex');
}

function existingGeneratedClientLooksFresh() {
  const schemaPath = resolve(process.cwd(), 'prisma/schema.prisma');
  const prismaPackage = resolve(process.cwd(), 'node_modules/prisma/package.json');
  const clientPackage = resolve(process.cwd(), 'node_modules/@prisma/client/package.json');
  const generatedSchema = resolve(process.cwd(), 'node_modules/.prisma/client/schema.prisma');
  const generatedEntry = resolve(process.cwd(), 'node_modules/.prisma/client/index.js');

  const required = [schemaPath, prismaPackage, clientPackage, generatedSchema, generatedEntry];
  if (required.some((filePath) => !existsSync(filePath))) return false;

  const newestInput = Math.max(
    statSync(schemaPath).mtimeMs,
    statSync(prismaPackage).mtimeMs,
    statSync(clientPackage).mtimeMs,
  );
  const oldestGenerated = Math.min(
    statSync(generatedSchema).mtimeMs,
    statSync(generatedEntry).mtimeMs,
  );

  return oldestGenerated >= newestInput;
}

function readStoredPrismaSignature() {
  if (!existsSync(PRISMA_STATE_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(PRISMA_STATE_FILE, 'utf8'));
    return typeof parsed.signature === 'string' ? parsed.signature : null;
  } catch {
    return null;
  }
}

function storePrismaSignature(signature) {
  mkdirSync(dirname(PRISMA_STATE_FILE), { recursive: true });
  writeFileSync(
    PRISMA_STATE_FILE,
    `${JSON.stringify({ signature }, null, 2)}\n`,
    { encoding: 'utf8' },
  );
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

const expectedPrismaSignature = currentPrismaSignature();
const storedPrismaSignature = readStoredPrismaSignature();

if (storedPrismaSignature === expectedPrismaSignature) {
  console.info('[dev:prepare] Prisma Client já está sincronizado; generate ignorado.');
} else if (!storedPrismaSignature && existingGeneratedClientLooksFresh()) {
  storePrismaSignature(expectedPrismaSignature);
  console.info(
    '[dev:prepare] Prisma Client já havia sido gerado; assinatura local reconstruída sem novo generate.',
  );
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

  storePrismaSignature(expectedPrismaSignature);
  console.info('[dev:prepare] Prisma Client regenerado e assinatura local atualizada.');
}

console.info('[dev:prepare] Prisma Client e migrations locais sincronizados.');
