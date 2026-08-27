import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertAllowedIfoodUrl,
  fetchIfoodHtml,
  isPublicNetworkAddress,
} from './ifoodScraperHttp.js';

const publicDns = async () => [{ address: '8.8.8.8', family: 4 as const }];

test('aceita apenas HTTPS no dominio oficial do iFood', () => {
  assert.equal(assertAllowedIfoodUrl('https://www.ifood.com.br/menu').hostname, 'www.ifood.com.br');
  assert.throws(() => assertAllowedIfoodUrl('http://www.ifood.com.br/menu'), /somente URLs HTTPS/);
  assert.throws(() => assertAllowedIfoodUrl('https://ifood.com.br.evil.test/menu'), /domínio oficial/);
  assert.throws(() => assertAllowedIfoodUrl('https://user:pass@ifood.com.br/menu'), /credenciais/);
  assert.throws(() => assertAllowedIfoodUrl('https://ifood.com.br:8443/menu'), /porta HTTPS/);
});

test('bloqueia redes privadas, loopback, link-local e enderecos especiais', () => {
  for (const address of [
    '127.0.0.1',
    '10.0.0.8',
    '172.16.0.1',
    '192.168.1.2',
    '169.254.169.254',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ]) {
    assert.equal(isPublicNetworkAddress(address), false, address);
  }
  assert.equal(isPublicNetworkAddress('8.8.8.8'), true);
  assert.equal(isPublicNetworkAddress('2606:4700:4700::1111'), true);
});

test('rejeita quando qualquer resposta DNS aponta para rede interna', async () => {
  await assert.rejects(
    () =>
      fetchIfoodHtml('https://www.ifood.com.br/menu', {
        resolveHostname: async () => [
          { address: '8.8.8.8', family: 4 },
          { address: '127.0.0.1', family: 4 },
        ],
        request: async () => ({ statusCode: 200, headers: {}, body: 'unused' }),
      }),
    /rede privada/,
  );
});

test('revalida dominio e DNS em cada redirecionamento', async () => {
  await assert.rejects(
    () =>
      fetchIfoodHtml('https://www.ifood.com.br/menu', {
        resolveHostname: publicDns,
        request: async () => ({
          statusCode: 302,
          headers: { location: 'https://metadata.internal/latest' },
          body: '',
        }),
      }),
    /domínio oficial/,
  );
});

test('aceita somente resposta HTML nao vazia e retorna URL final validada', async () => {
  const result = await fetchIfoodHtml('https://www.ifood.com.br/menu#fragment', {
    resolveHostname: publicDns,
    request: async () => ({
      statusCode: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: '<html><body>Cardápio</body></html>',
    }),
  });
  assert.equal(result.finalUrl, 'https://www.ifood.com.br/menu');

  await assert.rejects(
    () =>
      fetchIfoodHtml('https://www.ifood.com.br/menu', {
        resolveHostname: publicDns,
        request: async () => ({
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          body: '{}',
        }),
      }),
    /conteúdo HTML/,
  );
});
