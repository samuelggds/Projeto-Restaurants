import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { get } from 'node:http';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

// Exercise the real Caddy matcher/header handlers, without application servers,
// production credentials, certificate issuance or publicly exposed ports.
const executable = process.env.CADDY_BIN || 'caddy';
const environment = {
  ...process.env,
  APP_DOMAIN: 'http://app.headers.test:8080',
  API_DOMAIN: 'api.headers.test',
  ACME_EMAIL: 'headers@example.invalid',
};
const adapted = JSON.parse(
  execFileSync(executable, ['adapt', '--config', 'deploy/Caddyfile', '--adapter', 'caddyfile'], {
    encoding: 'utf8',
    env: environment,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  }),
);
const applicationServer = Object.values(adapted.apps.http.servers).find((server) =>
  JSON.stringify(server.routes).includes('app.headers.test'),
);
assert.ok(applicationServer, 'O Caddy deve conter o servidor HTTP da aplicação.');

function replaceUpstream(value) {
  if (Array.isArray(value)) return value.map(replaceUpstream);
  if (value && typeof value === 'object') {
    if (value.handler === 'reverse_proxy')
      return { handler: 'static_response', status_code: 200, body: 'Isolated header fixture' };
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, replaceUpstream(child)]),
    );
  }
  return value;
}

const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const { port } = reservation.address();
await new Promise((resolve, reject) =>
  reservation.close((error) => (error ? reject(error) : resolve())),
);

const configuration = {
  admin: { disabled: true, config: { persist: false } },
  apps: {
    http: {
      servers: {
        headers: {
          ...replaceUpstream(applicationServer),
          listen: [`127.0.0.1:${port}`],
          automatic_https: { disable: true },
        },
      },
    },
  },
};
const server = spawn(executable, ['run', '--config', '-'], {
  env: environment,
  windowsHide: true,
  stdio: ['pipe', 'ignore', 'pipe'],
});
let diagnostics = '';
server.stderr.on('data', (chunk) => {
  diagnostics = (diagnostics + chunk).slice(-8000);
});
const exit = once(server, 'exit');
server.stdin.end(JSON.stringify(configuration));
const request = (path) =>
  new Promise((resolve, reject) => {
    const outgoing = get(
      { hostname: '127.0.0.1', port, path, headers: { Host: 'app.headers.test' } },
      (response) => {
        response.resume();
        response.on('end', () =>
          resolve({ status: response.statusCode, headers: new Headers(response.headers) }),
        );
        response.on('error', reject);
      },
    );
    outgoing.setTimeout(2000, () =>
      outgoing.destroy(new Error('Tempo de resposta excedido no teste do Caddy.')),
    );
    outgoing.on('error', reject);
  });

try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (server.exitCode !== null)
      throw new Error(`O Caddy encerrou antes da validação: ${diagnostics}`);
    try {
      const result = await request('/');
      ready = result.status === 200;
      if (ready) break;
    } catch {
      /* Wait for the isolated listener, not an external service. */
    }
    await delay(100);
  }
  assert.ok(ready, `O Caddy não iniciou o servidor de validação: ${diagnostics}`);

  const cases = [
    ['/', false],
    ['/demonstracao', false],
    ['/admin', false],
    ['/kitchen', false],
    ['/assets/app.js', false],
    ['/demo-admin.html', true],
    ['/demo-admin.html?scenario=sample', true],
    ['/help-preview.html', true],
    ['/help-preview.html?area=settings-brand', true],
    ['/help-preview.html/extra', false],
    ['/demo-admin.html.bak', false],
    ['/other/help-preview.html', false],
  ];
  for (const [path, embedded] of cases) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    const policy = response.headers.get('content-security-policy') || '';
    assert.equal(policy.split('frame-ancestors').length, 2, `${path}: CSP única e explícita`);
    const directives = new Map(
      policy.split(';').map((part) => {
        const [name, ...values] = part.trim().split(/\s+/u);
        return [name, values.join(' ')];
      }),
    );
    assert.equal(directives.get('frame-ancestors'), embedded ? "'self'" : "'none'", path);
    assert.equal(directives.get('object-src'), "'none'", path);
    if (embedded) {
      assert.equal(directives.get('connect-src'), "'none'", path);
      assert.equal(directives.get('form-action'), "'none'", path);
      assert.equal(directives.get('base-uri'), "'none'", path);
      assert.equal(directives.get('script-src'), "'self'", path);
      assert.equal(
        directives.get('frame-src'),
        path.startsWith('/help-preview.html') ? "'none'" : "'self'",
        path,
      );
    } else {
      assert.match(directives.get('connect-src') || '', /https:\/\/api\.headers\.test/u, path);
    }
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', path);
  }
  console.info(
    `Caddy validado por HTTP: ${cases.length} rotas, prévias isoladas e demais páginas protegidas contra incorporação.`,
  );
} finally {
  if (server.exitCode === null) server.kill();
  await exit;
}
