// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { resolveGupshupAppId, updateGupshupProfilePhoto } from './gupshupProfilePhoto.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

test('resolve o appId pelo número do restaurante', () => {
  process.env.GUPSHUP_APP_ID_BY_SOURCE_JSON = JSON.stringify({
    '5585999999999': 'app-north-pizza',
  });
  delete process.env.GUPSHUP_APP_ID;

  assert.equal(resolveGupshupAppId('+55 (85) 99999-9999'), 'app-north-pizza');
});

test('envia a imagem como multipart para o endpoint oficial de foto do perfil', async () => {
  process.env.GUPSHUP_API_KEY = 'secret-api-key';
  process.env.GUPSHUP_APP_ID = 'app-id-123';
  process.env.GUPSHUP_PROFILE_API_BASE_URL = 'https://api.gupshup.io';

  let receivedUrl = '';
  let receivedInit = null;
  const fakeFetch = async (url, init) => {
    receivedUrl = String(url);
    receivedInit = init;
    return new Response(null, { status: 200 });
  };

  const imageDataUrl = `data:image/png;base64,${Buffer.from('fake-png').toString('base64')}`;
  const result = await updateGupshupProfilePhoto({
    source: '5585999999999',
    imageDataUrl,
    send: fakeFetch,
  });

  assert.deepEqual(result, { updated: true });
  assert.equal(
    receivedUrl,
    'https://api.gupshup.io/wa/app/app-id-123/business/profile/photo',
  );
  assert.equal(receivedInit.method, 'PUT');
  assert.equal(receivedInit.headers.apikey, 'secret-api-key');
  assert.ok(receivedInit.body instanceof FormData);
  const image = receivedInit.body.get('image');
  assert.ok(image instanceof Blob);
  assert.equal(image.type, 'image/png');
});

test('rejeita formato fora dos aceitos pelo painel', async () => {
  process.env.GUPSHUP_API_KEY = 'secret-api-key';
  process.env.GUPSHUP_APP_ID = 'app-id-123';

  await assert.rejects(
    () =>
      updateGupshupProfilePhoto({
        source: '5585999999999',
        imageDataUrl: `data:image/gif;base64,${Buffer.from('gif').toString('base64')}`,
        send: async () => new Response(null, { status: 200 }),
      }),
    /PNG, JPG ou WEBP/,
  );
});
