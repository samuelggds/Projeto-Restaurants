export type IngredientImageCandidate = {
  provider: 'pexels';
  providerId: string;
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl: string;
  sourceUrl: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
};

export interface IngredientImageSearchProvider {
  search(query: string, page: number, limit: number): Promise<IngredientImageCandidate[]>;
}

export class IngredientImageSearchUnavailableError extends Error {
  constructor(message = 'Não conseguimos buscar imagens agora.') {
    super(message);
    this.name = 'IngredientImageSearchUnavailableError';
  }
}
