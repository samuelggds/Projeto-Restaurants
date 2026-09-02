// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';

import { IngredientImageSearchUnavailableError } from '../images/IngredientImageSearchProvider.js';
import { IngredientImageSearchService } from './IngredientImageSearchService.js';

function candidate(id: number) {
  return {
    provider: 'pexels',
    providerId: String(id),
    thumbnailUrl: `https://images.pexels.com/photos/${id}/tiny.jpeg`,
    previewUrl: `https://images.pexels.com/photos/${id}/medium.jpeg`,
    downloadUrl: `https://images.pexels.com/photos/${id}/download.jpeg`,
    sourceUrl: `https://www.pexels.com/photo/${id}/`,
    photographer: `Fotógrafo ${id}`,
    photographerUrl: `https://www.pexels.com/@author-${id}`,
    alt: `Ingrediente ${id}`,
  };
}

test('monta busca contextual, limita resultados e não expõe segredos', async () => {
  const calls = [];
  const provider = {
    search: async (...args) => {
      calls.push(args);
      return Array.from({ length: 9 }, (_, index) => candidate(index + 1));
    },
  };
  const service = new IngredientImageSearchService(provider, async () => 'unused');

  const result = await service.search({ name: ' Bacon ', category: ' Adicionais ' }, 8);

  assert.deepEqual(calls, [['Bacon Adicionais food ingredient', 1, 6]]);
  assert.equal(result.results.length, 6);
  assert.equal(result.provider, 'Pexels');
  assert.match(result.results[0].selectionToken, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.doesNotMatch(JSON.stringify(result), /authorization|api[_-]?key|secret/i);
});

test('usa cache curto para busca idêntica e nova página para pesquisar novamente', async () => {
  let calls = 0;
  const provider = {
    search: async (_query, page) => {
      calls += 1;
      return [candidate(page)];
    },
  };
  const service = new IngredientImageSearchService(provider, async () => 'unused');

  await service.search({ name: 'Bacon' }, 3);
  await service.search({ name: 'Bacon' }, 3);
  const next = await service.search({ name: 'Bacon', page: 2 }, 3);

  assert.equal(calls, 2);
  assert.equal(next.page, 2);
  assert.equal(next.results[0].id, '2');
});

test('mantém o cache de buscas limitado', async () => {
  const service = new IngredientImageSearchService(
    { search: async (_query, page) => [candidate(page)] },
    async () => 'unused',
  );

  for (let index = 0; index < 505; index += 1) {
    await service.search({ name: `Ingrediente ${index}` }, 3);
  }

  assert.equal(service.cache.size, 500);
});

test('recusa query vazia e converte falha do provider em erro controlado', async () => {
  const provider = {
    search: async () => {
      throw new Error('provider internal secret');
    },
  };
  const service = new IngredientImageSearchService(provider, async () => 'unused');

  await assert.rejects(() => service.search({ name: '' }, 3), /Informe o nome/);
  await assert.rejects(
    () => service.search({ name: 'Bacon' }, 3),
    IngredientImageSearchUnavailableError,
  );
});

test('token de seleção só pode ser importado pelo tenant que fez a busca', async () => {
  const downloads = [];
  const service = new IngredientImageSearchService(
    { search: async () => [candidate(44)] },
    async (url) => {
      downloads.push(url);
      return 'data:image/webp;base64,UklGRgAAAABXRUJQ';
    },
  );
  const result = await service.search({ name: 'Bacon' }, 8);
  const token = result.results[0].selectionToken;

  await assert.rejects(() => service.importSelection(token, 9), /expirou ou é inválida/);
  const image = await service.importSelection(token, 8);

  assert.match(image, /^data:image\/webp/);
  assert.deepEqual(downloads, ['https://images.pexels.com/photos/44/download.jpeg']);
});
