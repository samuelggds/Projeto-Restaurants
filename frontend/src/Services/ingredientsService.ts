import api from './api';
import { resolvePublicIngredientImages, resolvePublicMediaSource } from './publicMediaSource';

export type IngredientPayload = {
  name: string;
  price: number;
  category: string;
  active?: boolean;
  image?: string | null;
  imageSelectionToken?: string;
};

export type IngredientImageSearchResult = {
  id: string;
  thumbnailUrl: string;
  previewUrl: string;
  source: 'Pexels';
  sourceUrl: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
  selectionToken: string;
};

export type IngredientImageSearchResponse = {
  query: string;
  page: number;
  provider: 'Pexels';
  results: IngredientImageSearchResult[];
};

function unwrapIngredients(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  return Array.isArray(record.ingredients) ? record.ingredients : [];
}

function resolveIngredientResponse(payload: unknown, baseUrl: unknown) {
  if (!payload || typeof payload !== 'object') return payload;
  const record = payload as Record<string, unknown>;
  return {
    ...record,
    image: resolvePublicMediaSource(record.image, baseUrl),
  };
}

class IngredientsService {
  async listIngredients() {
    const response = await api.get('/ingredients');
    return resolvePublicIngredientImages(
      unwrapIngredients(response.data),
      response.config?.baseURL || api.defaults?.baseURL || '',
    );
  }

  async createIngredient(payload: IngredientPayload) {
    const response = await api.post('/ingredients', payload);
    return resolveIngredientResponse(
      response.data,
      response.config?.baseURL || api.defaults?.baseURL || '',
    );
  }

  async searchImages(input: { name: string; category?: string; page?: number }) {
    const response = await api.post<IngredientImageSearchResponse>(
      '/ingredients/image-search',
      input,
    );
    return response.data;
  }

  async updateIngredient(id: string | number, payload: Partial<IngredientPayload>) {
    const response = await api.put(`/ingredients/${id}`, payload);
    return resolveIngredientResponse(
      response.data,
      response.config?.baseURL || api.defaults?.baseURL || '',
    );
  }

  async deleteIngredient(id: string | number) {
    const response = await api.delete(`/ingredients/${id}`);
    return response.data;
  }
}

export default new IngredientsService();
