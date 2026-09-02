// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertAllowedProviderImageUrl,
  createIngredientImageSelectionToken,
  downloadProviderImage,
  normalizeIngredientImageUpload,
  verifyIngredientImageSelectionToken,
} from './ingredientImageSecurity.js';

const validWebp = Buffer.from('524946460400000057454250', 'hex');

test('aceita upload WebP persistente e mantém foto opcional', () => {
  const image = `data:image/webp;base64,${validWebp.toString('base64')}`;
  assert.equal(normalizeIngredientImageUpload(image), image);
  assert.equal(normalizeIngredientImageUpload(null), null);
  assert.equal(normalizeIngredientImageUpload(undefined), undefined);
});

test('recusa MIME falso e formatos de arquivo não permitidos', () => {
  const html = Buffer.from('<html>não é imagem</html>');
  assert.throws(
    () => normalizeIngredientImageUpload(`data:image/jpeg;base64,${html.toString('base64')}`),
    /não é uma imagem/,
  );
  assert.throws(
    () => normalizeIngredientImageUpload('data:image/svg+xml;base64,PHN2Zz4='),
    /JPG, PNG ou WebP/,
  );
});

test('não aceita URL arbitrária nem protocolos inseguros', () => {
  assert.throws(
    () => assertAllowedProviderImageUrl('http://images.pexels.com/photo.jpg'),
    /não permitido/,
  );
  assert.throws(
    () => assertAllowedProviderImageUrl('https://localhost/photo.jpg'),
    /não permitido/,
  );
  assert.throws(() => assertAllowedProviderImageUrl('file:///etc/passwd'), /não permitido/);
});

test('bloqueia download quando DNS resolve para localhost ou rede privada', async () => {
  let requested = false;
  await assert.rejects(
    () =>
      downloadProviderImage('https://images.pexels.com/photo.jpg', {
        resolveHostname: async () => [{ address: '127.0.0.1', family: 4 }],
        request: async () => {
          requested = true;
          return {};
        },
      }),
    /rede não permitida/,
  );
  assert.equal(requested, false);
});

test('valida tipo declarado e assinatura real da imagem baixada', async () => {
  const dependencies = {
    resolveHostname: async () => [{ address: '93.184.216.34', family: 4 }],
    request: async () => ({
      statusCode: 200,
      headers: { 'content-type': 'image/jpeg' },
      body: Buffer.from('<html>conteúdo inválido</html>'),
    }),
  };

  await assert.rejects(
    () => downloadProviderImage('https://images.pexels.com/photo.jpg', dependencies),
    /não é uma imagem/,
  );
});

test('rejeita token de seleção expirado', () => {
  const token = createIngredientImageSelectionToken({
    version: 1,
    restaurantId: 8,
    provider: 'pexels',
    providerId: '44',
    downloadUrl: 'https://images.pexels.com/photos/44/image.jpeg',
    expiresAt: Date.now() - 1,
  });

  assert.throws(() => verifyIngredientImageSelectionToken(token, 8), /expirou ou é inválida/);
});

test('não segue redirect retornado pelo provedor', async () => {
  let requests = 0;
  await assert.rejects(
    () =>
      downloadProviderImage('https://images.pexels.com/photo.jpg', {
        resolveHostname: async () => [{ address: '93.184.216.34', family: 4 }],
        request: async () => {
          requests += 1;
          return {
            statusCode: 302,
            headers: { location: 'https://attacker.example/image.jpg' },
            body: Buffer.alloc(0),
          };
        },
      }),
    /Não foi possível importar/,
  );
  assert.equal(requests, 1);
});
