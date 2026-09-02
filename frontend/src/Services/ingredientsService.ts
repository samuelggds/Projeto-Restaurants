import api from './api';

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

class IngredientsService {
  async listIngredients() {
    const response = await api.get('/ingredients');
    return unwrapIngredients(response.data);
  }

  async createIngredient(payload: IngredientPayload) {
    const response = await api.post('/ingredients', payload);
    return response.data;
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
    return response.data;
  }

  async deleteIngredient(id: string | number) {
    const response = await api.delete(`/ingredients/${id}`);
    return response.data;
  }
}

export default new IngredientsService();
