import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (name) => readFileSync(path.join(root, name), 'utf8');
const composeAvailable = spawnSync('docker', ['compose', 'version'], { timeout: 10_000 }).status === 0;
if (process.env.REQUIRE_DOCKER_COMPOSE === 'true') {
  assert.ok(composeAvailable, 'Docker Compose is mandatory in the deployment CI gate.');
}

const ownerPassword = 'ci-owner-password-not-a-real-secret';
const ownerUrl = `postgresql://ci_owner:${ownerPassword}@db:5432/pizza_ai`;
const runtimeUrl = 'postgresql://ci_runtime:ci-runtime-password@db:5432/pizza_ai';

function renderConfig(provider) {
  const directory = mkdtempSync(path.join(tmpdir(), 'restaurant-compose-'));
  try {
    const runtimeFile = path.join(directory, 'runtime.env');
    writeFileSync(
      runtimeFile,
      read('.env.production.runtime.example')
        .replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${runtimeUrl}`)
        .replace(/^GEOAPIFY_API_KEY=.*$/m, 'GEOAPIFY_API_KEY=ci-geoapify-key')
        .replace(/^SUPER_ADMIN_BOOTSTRAP_PASSWORD=.*$/m, 'SUPER_ADMIN_BOOTSTRAP_PASSWORD=ci-bootstrap'),
      { mode: 0o600 },
    );
    // Deliberately do not inherit deployment credentials from the host environment.
    const env = Object.fromEntries(
      ['PATH', 'HOME', 'SYSTEMROOT', 'TMPDIR', 'TEMP'].flatMap((key) =>
        process.env[key] === undefined ? [] : [[key, process.env[key]]],
      ),
    );
    Object.assign(env, {
      DIRECT_URL: ownerUrl,
      POSTGRES_PASSWORD: ownerPassword,
      PRODUCTION_RUNTIME_ENV_FILE: runtimeFile,
      ...(provider ? { ROUTING_PROVIDER: provider } : {}),
    });
    const result = spawnSync(
      'docker',
      [
        'compose', '--env-file', '.env.production.example',
        '-f', 'docker-compose.production.yml',
        '--profile', 'maintenance', '--profile', 'selfhost-routing',
        'config', '--format', 'json',
      ],
      { cwd: root, env, encoding: 'utf8', timeout: 30_000, maxBuffer: 2 * 1024 * 1024 },
    );
    // Never print the rendered config: in a real deployment it contains secrets.
    assert.equal(result.status, 0, 'Compose configuration failed to render.');
    return JSON.parse(result.stdout);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('runtime template and Docker build exclude infrastructure credentials', () => {
  const runtime = read('.env.production.runtime.example');
  assert.doesNotMatch(runtime, /^(DIRECT_URL|POSTGRES_PASSWORD|POSTGRES_PASSWORD_FILE)=/m);
  assert.match(read('backend/.dockerignore'), /^\.env\.\*$/m);
  assert.match(read('backend/.dockerignore'), /^\*\*\/\.env\.\*$/m);
  assert.match(read('.gitignore'), /^\.env\.\*$/m);
});

test('production startup runs the runtime credential guard', () => {
  const startup = read('backend/src/config/validateEnvOnStartup.ts');
  assert.match(startup, /assertSafeRuntimeDatabaseEnvironment\(\)/);
});

test('rendered production Compose isolates migration and runtime secrets', { skip: !composeAvailable }, () => {
  const { services } = renderConfig();
  assert.equal(services.migrate.environment.DATABASE_URL, ownerUrl);
  assert.deepEqual(Object.keys(services.migrate.environment).sort(), ['DATABASE_URL', 'NODE_ENV']);
  assert.deepEqual(services.migrate.profiles, ['maintenance']);
  assert.deepEqual(services.migrate.command, ['npm', 'run', 'db:migrate:deploy']);
  assert.deepEqual(Object.keys(services.migrate.networks), ['data_internal']);
  for (const name of ['backend', 'worker']) {
    const service = services[name];
    assert.equal(service.environment.DATABASE_URL, runtimeUrl);
    for (const key of ['DIRECT_URL', 'POSTGRES_PASSWORD', 'POSTGRES_PASSWORD_FILE']) {
      assert.ok(!(key in service.environment), `${name} received a migration-only variable.`);
    }
    assert.ok(!JSON.stringify(service).includes(ownerPassword), `${name} received the owner secret.`);
    assert.doesNotMatch(service.command.join(' '), /prisma|migrate/);
  }
  assert.equal(services.worker.environment.SUPER_ADMIN_BOOTSTRAP_PASSWORD, '');
  assert.equal(services.worker.environment.SUPER_ADMIN_BOOTSTRAP_PASSWORD_FILE, '');
  assert.equal(services.backend.environment.SUPER_ADMIN_BOOTSTRAP_PASSWORD, 'ci-bootstrap');
});

test('OSRM defaults and Geoapify runtime key stay coherent', { skip: !composeAvailable }, () => {
  const defaults = renderConfig().services;
  assert.equal(defaults.backend.environment.ROUTING_PROVIDER, 'osrm');
  assert.equal(defaults.worker.environment.ROUTING_PROVIDER, 'osrm');
  assert.ok(defaults.osrm.profiles.includes('selfhost-routing'));
  assert.ok(defaults.nominatim.profiles.includes('selfhost-routing'));
  const geoapify = renderConfig('geoapify').services;
  assert.equal(geoapify.backend.environment.ROUTING_PROVIDER, 'geoapify');
  assert.equal(geoapify.backend.environment.GEOAPIFY_API_KEY, 'ci-geoapify-key');
  assert.equal(geoapify.worker.environment.GEOAPIFY_API_KEY, 'ci-geoapify-key');
});
