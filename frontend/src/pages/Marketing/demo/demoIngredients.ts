import type { AdminIngredient } from '../../admin/types';
import type { IngredientImageSearchResponse } from '../../../Services/ingredientsService';

const examples = [
  ['Bacon', 'Adicionais', 5, 'bacon'],
  ['Queijo cheddar', 'Queijos', 4, 'cheese'],
  ['Alface', 'Salada', 0, 'lettuce'],
  ['Tomate', 'Salada', 0, 'tomato'],
  ['Molho da casa', 'Molhos', 2, 'sauce'],
  ['Hambúrguer 160 g', 'Carnes', 8, 'patty'],
] as const;

export function createDemoIngredients(): AdminIngredient[] {
  return examples.map(([name, category, price, photo], index) => ({
    id: 9101 + index,
    name,
    category,
    price,
    active: true,
    image: `/demo/ingredients/${photo}.webp`,
  }));
}

export function demoIngredientImages(name: string, page = 1): IngredientImageSearchResponse {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const all = createDemoIngredients();
  const words = new Set(normalize(name).match(/[a-z0-9]+/g) ?? []);
  const match = all.filter((item) =>
    normalize(item.name)
      .split(' ')
      .filter((word) => word.length > 3)
      .some((word) => words.has(word)),
  );
  return {
    query: name,
    page,
    provider: 'Demo',
    results: match.map((item) => ({
      id: String(item.id),
      previewUrl: item.image!,
      thumbnailUrl: item.image!,
      source: 'Demo',
      sourceUrl: '',
      photographer: `GastroNexa · ${item.name}`,
      photographerUrl: '',
      alt: `Foto demonstrativa de ${item.name}`,
      selectionToken: `demo-ingredient:${item.id}`,
    })),
  };
}

export function resolveDemoIngredientImage<
  T extends { image?: string | null; imageSelectionToken?: string },
>(draft: T) {
  const { imageSelectionToken, ...ingredient } = draft;
  if (imageSelectionToken) {
    const example = createDemoIngredients().find(
      (item) => `demo-ingredient:${item.id}` === imageSelectionToken,
    );
    if (!example) throw new Error('Escolha uma imagem demonstrativa ou envie a sua.');
    return { ...ingredient, image: example.image };
  }
  return ingredient;
}
