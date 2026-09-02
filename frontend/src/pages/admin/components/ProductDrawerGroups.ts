import type { AdminProductOptionGroup } from '../types';

export const emptyGroup = (): AdminProductOptionGroup => ({
  name: '',
  description: '',
  required: true,
  selectionType: 'SINGLE',
  minSelections: 1,
  maxSelections: 1,
  options: [],
});

export const groupPreset = (preset: 'SINGLE' | 'EXTRAS' | 'PORTIONS'): AdminProductOptionGroup => {
  if (preset === 'SINGLE') {
    return { ...emptyGroup(), name: 'Escolha uma opção' };
  }
  if (preset === 'PORTIONS') {
    return {
      ...emptyGroup(),
      name: 'Opções por porção',
      required: false,
      selectionType: 'MULTIPLE',
      minSelections: 0,
      maxSelections: 1,
    };
  }
  return {
    ...emptyGroup(),
    name: 'Adicionais',
    required: false,
    selectionType: 'MULTIPLE',
    minSelections: 0,
    maxSelections: 5,
  };
};
