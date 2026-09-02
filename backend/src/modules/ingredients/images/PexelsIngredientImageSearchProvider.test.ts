// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';

import { IngredientImageSearchUnavailableError } from './IngredientImageSearchProvider.js';
import { PexelsIngredientImageSearchProvider } from './PexelsIngredientImageSearchProvider.js';

test('envia busca limitada ao Pexels e ignora URLs fora dos hosts permitidos', async () => {
  const calls = [];
  const provider = new PexelsIngredientImageSearchProvider('pexels-secret', async (...args) => {
    calls.push(args);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        photos: [
          {
            id: 12,
            src: {
              tiny: 'https://images.pexels.com/photos/12/tiny.jpeg',
              medium: 'https://images.pexels.com/photos/12/medium.jpeg',
            },
            url: 'https://www.pexels.com/photo/12/',
            photographer: 'Foto Teste',
            photographer_url: 'https://www.pexels.com/@foto-teste',
            alt: 'Bacon',
          },
          {
            id: 13,
            src: {
              tiny: 'https://attacker.example/tiny.jpeg',
              medium: 'https://images.pexels.com/photos/13/medium.jpeg',
            },
            url: 'https://www.pexels.com/photo/13/',
          },
        ],
      }),
    };
  });

  const results = await provider.search('Bacon food ingredient', 2, 20);

  assert.equal(results.length, 1);
  assert.equal(results[0].providerId, '12');
  const [url, init] = calls[0];
  assert.equal(url.searchParams.get('query'), 'Bacon food ingredient');
  assert.equal(url.searchParams.get('locale'), 'pt-BR');
  assert.equal(url.searchParams.get('orientation'), 'square');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('per_page'), '6');
  assert.equal(init.headers.Authorization, 'pexels-secret');
  assert.equal(init.redirect, 'error');
});

test('converte ausência de chave e falha do Pexels em erro controlado', async () => {
  await assert.rejects(
    () =>
      new PexelsIngredientImageSearchProvider('', async () => assert.fail()).search('Bacon', 1, 6),
    IngredientImageSearchUnavailableError,
  );
  await assert.rejects(
    () =>
      new PexelsIngredientImageSearchProvider('secret', async () => ({
        ok: false,
        status: 429,
        json: async () => ({}),
      })).search('Bacon', 1, 6),
    IngredientImageSearchUnavailableError,
  );
});
