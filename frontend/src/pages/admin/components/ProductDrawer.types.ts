import type { AdminCategory, AdminIngredient, AdminProduct } from '../types';

export type ProductDrawerProps = {
  product: AdminProduct | null;
  categories: AdminCategory[];
  ingredients: AdminIngredient[];
  products?: AdminProduct[];
  enableTemplates?: boolean;
  createIngredient?: (
    ingredient: Omit<AdminIngredient, 'id'>,
  ) => AdminIngredient | void | Promise<AdminIngredient | void>;
  close: () => void;
  save: (product: AdminProduct) => Promise<void>;
};

export type ProductDrawerHandle = {
  hasUnsavedChanges: () => boolean;
  save: () => Promise<boolean>;
  discard: () => void;
};

export type IngredientWizardTarget = { kind: 'OPTION'; groupIndex: number };
