import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
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
      for (const match of readFileSync(entryPath, 'utf8').matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/gu)) {
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
const variableNames = [...composeSource.matchAll(/\$\{([A-Z][A-Z0-9_]*)/gu)].map((match) => match[1]);
const cleanEnvironment = { ...process.env };
for (const key of variableNames) delete cleanEnvironment[key];
delete cleanEnvironment.COMPOSE_FILE;
delete cleanEnvironment.COMPOSE_ENV_FILES;

function run(profile = '', overrides = {}) {
  let result;
  try {
    result = execFileSync('docker', [
      'compose', '--env-file', '.env.production.example',
      ...(profile ? ['--profile', profile] : []),
      '-f', composePath, 'config', '--format', 'json',
    ], {
      encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...cleanEnvironment, COMPOSE_PROFILES: profile, ...overrides },
    });
  } catch {
    // Não mostrar stdout/stderr do subprocesso: Compose resolvido contém credenciais.
    throw new Error('Não foi possível validar o Compose. Verifique Docker Compose e os arquivos de exemplo.');
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
    for (const [key, marker] of Object.entries(expectedMarkers)) {
      assert.ok(env[key] === marker, `${name} não encaminha corretamente ${key}`);
    }
    assert.ok(/pizza_runtime/u.test(env.DATABASE_URL), `${name} não usa a role runtime do exemplo`);
    assert.ok(!services[name].env_file?.length, `${name} não deve receber env_file sem filtragem`);
  }
}

const configured = run();
verifyRuntime(configured.services);
assert.ok(/pizza_owner/u.test(configured.services.migrate.environment.DATABASE_URL));
assert.equal(configured.services.backend.depends_on.bootstrap.condition, 'service_completed_successfully');
assert.equal(configured.services.bootstrap.depends_on.migrate.condition, 'service_completed_successfully');
assert.equal(configured.services.backend.environment.ROUTING_PROVIDER, 'geoapify');
assert.ok(!configured.services.osrm && !configured.services.nominatim);

const withOptionalSettings = run('', markers);
verifyRuntime(withOptionalSettings.services, markers);
const selfhost = run('selfhost-routing', { ROUTING_PROVIDER: 'osrm' });
assert.ok(selfhost.services.osrm && selfhost.services.nominatim);
assert.equal(selfhost.services.backend.environment.ROUTING_PROVIDER, 'osrm');
assert.equal(selfhost.services.worker.environment.ROUTING_PROVIDER, 'osrm');
console.info('Compose validado: opções runtime preservadas, segredos isolados e roteamento gerenciado/próprio.');
