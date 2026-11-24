import assert from 'node:assert/strict';

const preview = new URL('/help-preview.html?view=storefront', process.argv[2]);

async function download(url, expectedType) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `Falha ao carregar ${url.pathname} (HTTP ${response.status})`);
  assert.match(response.headers.get('content-type') || '', expectedType, url.pathname);
  return response;
}

const page = await download(preview, /^text\/html\b/i);
const policy = page.headers.get('content-security-policy') || '';
// The gateway sets one enforced CSP; browsers intersect additional policies.
assert.ok(
  policy && !policy.includes(','),
  'A prévia deve receber a política de incorporação do gateway',
);
const directives = policy.split(';').map((part) => part.trim().split(/\s+/));
for (const [directive, value] of [
  ['frame-ancestors', "'self'"],
  ['connect-src', "'none'"],
  ['form-action', "'none'"],
]) {
  const allowed = directives.find(([name]) => name === directive)?.slice(1);
  assert.deepEqual(allowed, [value], `Política inesperada da vitrine publicada: ${directive}`);
}

const html = await page.text();
assert.ok(
  /<html\b[^>]*\bdata-preview-views="help storefront"/i.test(html),
  'A versão publicada não contém a vitrine',
);
const modules = html.match(/<script\b[^>]*\btype="module"[^>]*>/gi) || [];
assert.ok(modules.length, 'A entrada JavaScript da prévia não consta no documento');
await Promise.all(
  modules.map(async (tag) => {
    const path = tag.match(/\bsrc="([^"]+)"/i)?.[1];
    assert.ok(path, 'A prévia precisa de um módulo JavaScript externo');
    const url = new URL(path, preview);
    assert.equal(
      url.origin,
      preview.origin,
      'A vitrine deve carregar JavaScript da própria origem',
    );
    const script = await download(url, /^(?:text|application)\/javascript\b/i);
    assert.ok((await script.text()).trim(), `O módulo ${url.pathname} está vazio`);
  }),
);
console.log('Vitrine pública verificada: documento, incorporação e módulos JavaScript.');
