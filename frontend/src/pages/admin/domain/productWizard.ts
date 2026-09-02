export const PRODUCT_WIZARD_STEPS = [
  { id: 'TYPE' },
  { id: 'BASIC' },
  { id: 'PRICE' },
  { id: 'APPEARANCE' },
  { id: 'CUSTOMIZATION' },
  { id: 'AVAILABILITY' },
  { id: 'REVIEW' },
] as const;

export type ProductWizardStep = (typeof PRODUCT_WIZARD_STEPS)[number]['id'];
export type ProductWizardSaleMode = 'COMPLETE' | 'BUILDABLE';

export function getProductWizardSequence(saleMode: ProductWizardSaleMode): ProductWizardStep[] {
  return PRODUCT_WIZARD_STEPS.filter(
    (step) => saleMode === 'BUILDABLE' || step.id !== 'CUSTOMIZATION',
  ).map((step) => step.id);
}

export function getAdjacentProductWizardStep(
  currentStep: ProductWizardStep,
  direction: -1 | 1,
  saleMode: ProductWizardSaleMode,
) {
  const sequence = getProductWizardSequence(saleMode);
  const currentIndex = sequence.indexOf(currentStep);

  if (currentIndex < 0) {
    return direction === 1 ? sequence[0] : sequence.at(-1);
  }

  return sequence[currentIndex + direction] ?? currentStep;
}
