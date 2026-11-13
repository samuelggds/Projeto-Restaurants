import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const composePath = 'docker-compose.production.yml';
const composeSource = readFileSync(composePath, 'utf8');
const forbiddenRuntimeKeys = new Set([
  'DIRECT_URL',
  'POSTGRES_PASSWORD',
  'RUNTIME_DATABASE_URL',
  'SUPER_ADMIN_BOOTSTRAP_PASSWORD',
  'SUPER_ADMIN_BOOTSTRAP_PASSWORD_FILE',
]);

// Opções consumidas pelo código de produção devem continuar disponíveis quando
// env_file é substituído pela lista explícita. Testes/E2E não são configuração runtime.
function usedRuntimeKeys(directory) {
  const keys = new Set();
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'e2e') continue;
      for (const key of usedRuntimeKeys(entryPath)) keys.add(key);
    } else if (entry.name.endsWith('.ts') && !/\.(test|e2e)\.ts$/u.test(entry.name)) {
      for (const match of readFileSync(entryPath, 'utf8').matchAll(
        /process\.env\.([A-Z][A-Z0-9_]*)/gu,
      )) {
        if (!forbiddenRuntimeKeys.has(match[1]) && !match[1].startsWith('TENANT_E2E_')) {
          keys.add(match[1]);
        }
      }
    }
  }
  return keys;
}

const runtimeKeys = usedRuntimeKeys('backend/src');
// Marcadores públicos comprovam que opções opcionais são encaminhadas pelo nome
// correto, incluindo tokens de Asaas, split, notificações e chaves de pedidos.
const passthroughKeys = [...composeSource.matchAll(/^  ([A-Z][A-Z0-9_]*): \$\{\1:-\}$/gmu)]
  .map((match) => match[1])
  .filter((key) => !forbiddenRuntimeKeys.has(key));
const markers = Object.fromEntries(passthroughKeys.map((key) => [key, `compose-test-${key}`]));
const variableNames = [...composeSource.matchAll(/\$\{([A-Z][A-Z0-9_]*)/gu)].map(
  (match) => match[1],
);
// Production Compose tests must not depend on committed environment templates.
const syntheticRequired = {
  DATABASE_URL: 'postgresql://pizza_runtime:synthetic-only@postgres:5432/pizza_test?schema=public',
  DIRECT_URL: 'postgresql://pizza_owner:synthetic-only@postgres:5432/pizza_test?schema=public',
  APP_DOMAIN: 'app.example.test',
  API_DOMAIN: 'api.example.test',
  POSTGRES_DB: 'pizza_test',
  POSTGRES_USER: 'pizza_owner',
  POSTGRES_PASSWORD: 'synthetic-only',
  VITE_MAP_TILE_URL: 'https://tiles.example.test/{z}/{x}/{y}.png',
  ACME_EMAIL: 'ops@example.test',
};
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'gastronexa-compose-check-'));
const temporaryEnvPath = path.join(temporaryDirectory, 'synthetic.env');
writeFileSync(
  temporaryEnvPath,
  Object.entries(syntheticRequired).map(([key, value]) => `${key}=${value}`).join('\n') + '\n',
  { encoding: 'utf8', mode: 0o600 },
);
process.on('exit', () => rmSync(temporaryDirectory, { recursive: true, force: true }));

const cleanEnvironment = { ...process.env };
for (const key of variableNames) delete cleanEnvironment[key];
delete cleanEnvironment.COMPOSE_FILE;
delete cleanEnvironment.COMPOSE_ENV_FILES;

function run(profile = '', overrides = {}) {
  let result;
  try {
    result = execFileSync(
      'docker',
      [
        'compose',
        '--env-file',
        temporaryEnvPath,
        ...(profile ? ['--profile', profile] : []),
        '-f',
        composePath,
        'config',
        '--format',
        'json',
      ],
      {
        encoding: 'utf8',
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...cleanEnvironment, COMPOSE_PROFILES: profile, ...overrides },
      },
    );
  } catch {
    // Não mostrar stdout/stderr do subprocesso: Compose resolvido contém credenciais.
    throw new Error(
      'Não foi possível validar o Compose. Verifique Docker Compose e as variáveis sintéticas de validação.',
    );
  }
  return JSON.parse(result);
}

function verifyRuntime(services, expectedMarkers = {}) {
  for (const name of ['backend', 'worker']) {
    const env = services[name].environment;
    for (const key of forbiddenRuntimeKeys) {
      assert.ok(!(key in env), `${name} recebeu uma credencial exclusiva de deploy: ${key}`);
    }
    for (const key of runtimeKeys) {
      assert.ok(key in env, `${name} não recebe a opção runtime ${key}`);
    }
    assert.equal(env.NFC_CASHLESS_PUBLIC_ENABLED, 'false', `${name} não pode habilitar acesso cashless público em produção`);
    assert.equal(
      env.LALAMOVE_SANDBOX_BOOKING_ENABLED,
      'false',
      `${name} não pode habilitar contratações Lalamove a partir do runtime de produção`,
    );
    for (const [key, marker] of Object.entries(expectedMarkers)) {
      assert.ok(env[key] === marker, `${name} não encaminha corretamente ${key}`);
    }
    assert.ok(/pizza_runtime/u.test(env.DATABASE_URL), `${name} não usa a role runtime do exemplo`);
    assert.ok(!services[name].env_file?.length, `${name} não deve receber env_file sem filtragem`);
  }
}

const configured = run();
verifyRuntime(configured.services);
assert.ok(
  configured.services.worker.healthcheck.test.some((value) => value.includes('3001/ready')),
);
assert.ok(
  !configured.services.worker.ports?.length,
  'Worker readiness must not expose a host port',
);
assert.ok(/pizza_owner/u.test(configured.services.migrate.environment.DATABASE_URL));
assert.equal(
  configured.services.backend.depends_on.bootstrap.condition,
  'service_completed_successfully',
);
assert.equal(
  configured.services.bootstrap.depends_on.migrate.condition,
  'service_completed_successfully',
);
assert.equal(configured.services.backend.environment.ROUTING_PROVIDER, 'google');
assert.ok(!configured.services.osrm && !configured.services.nominatim);

const withOptionalSettings = run('', markers);
verifyRuntime(withOptionalSettings.services, markers);
const selfhost = run('selfhost-routing', { ROUTING_PROVIDER: 'osrm' });
assert.ok(selfhost.services.osrm && selfhost.services.nominatim);
assert.equal(selfhost.services.backend.environment.ROUTING_PROVIDER, 'osrm');
assert.equal(selfhost.services.worker.environment.ROUTING_PROVIDER, 'osrm');
console.info(
  'Compose validado: opções runtime preservadas, segredos isolados e roteamento gerenciado/próprio.',
);
