import { describe, expect, it } from 'vitest';
import { displayCommercialPlan, isOfferedCommercialPlan } from './commercialPlanPresentation';

describe('commercial plan presentation', () => {
  it('shows the two current commercial plans while preserving API codes', () => {
    expect(displayCommercialPlan('BASICO')).toBe('Entrada');
    expect(displayCommercialPlan('PREMIUM')).toBe('Avançado');
    expect(isOfferedCommercialPlan('BASICO')).toBe(true);
    expect(isOfferedCommercialPlan('PREMIUM')).toBe(true);
  });

  it('preserves legacy subscriptions without offering a third plan', () => {
    expect(displayCommercialPlan('GESTAO_TOTAL')).toBe('Avançado (contrato anterior)');
    expect(isOfferedCommercialPlan('GESTAO_TOTAL')).toBe(false);
    expect(displayCommercialPlan('')).toBe('Plano não identificado');
  });
});
