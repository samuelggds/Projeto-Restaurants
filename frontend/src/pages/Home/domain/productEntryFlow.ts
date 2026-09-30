export type ProductEntryKind = 'COMBO' | 'READY' | 'CUSTOMIZABLE';

export function resolveProductEntryKind(product: {
  kind?: 'STANDARD' | 'COMBO';
  saleMode?: 'COMPLETE' | 'BUILDABLE';
}): ProductEntryKind {
  if (product.kind === 'COMBO') return 'COMBO';
  if (product.saleMode === 'COMPLETE') return 'READY';
  return 'CUSTOMIZABLE';
}

export function createReadyProductConfiguration(configurationVersion?: number) {
  return {
    selectedOptions: [],
    selectedOptionIds: [],
    observation: '',
    configurationVersion,
  };
}
