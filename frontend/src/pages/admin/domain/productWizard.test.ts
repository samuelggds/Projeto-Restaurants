import { describe, expect, it } from 'vitest';

import {
  PRODUCT_WIZARD_STEPS,
  getAdjacentProductWizardStep,
  getProductWizardSequence,
} from './productWizard';

describe('product wizard navigation', () => {
  it('uses six focused questions for a ready-made product', () => {
    expect(getProductWizardSequence('COMPLETE')).toEqual([
      'TYPE',
      'BASIC',
      'PRICE',
      'APPEARANCE',
      'AVAILABILITY',
      'REVIEW',
    ]);
  });

  it('adds customization only for a customizable product', () => {
    expect(getProductWizardSequence('BUILDABLE')).toEqual(
      PRODUCT_WIZARD_STEPS.map((step) => step.id),
    );
  });

  it('skips customization in both directions for a ready-made product', () => {
    expect(getAdjacentProductWizardStep('APPEARANCE', 1, 'COMPLETE')).toBe('AVAILABILITY');
    expect(getAdjacentProductWizardStep('AVAILABILITY', -1, 'COMPLETE')).toBe('APPEARANCE');
  });

  it('keeps customization between appearance and availability when buildable', () => {
    expect(getAdjacentProductWizardStep('APPEARANCE', 1, 'BUILDABLE')).toBe('CUSTOMIZATION');
    expect(getAdjacentProductWizardStep('CUSTOMIZATION', 1, 'BUILDABLE')).toBe('AVAILABILITY');
  });

  it('does not move beyond the first or last available step', () => {
    expect(getAdjacentProductWizardStep('TYPE', -1, 'COMPLETE')).toBe('TYPE');
    expect(getAdjacentProductWizardStep('REVIEW', 1, 'BUILDABLE')).toBe('REVIEW');
  });
});
