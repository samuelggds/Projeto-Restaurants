/**
 * Commercial plans are Entrada (BASICO) and Avançado (PREMIUM).
 * GESTAO_TOTAL is a historical persisted code. Never rewrite it in the API or
 * treat it as an offer for new subscriptions.
 */
export type CommercialPlanCode = 'BASICO' | 'PREMIUM';

export function isOfferedCommercialPlan(plan: string): plan is CommercialPlanCode {
  return plan === 'BASICO' || plan === 'PREMIUM';
}

export function displayCommercialPlan(plan: string | null | undefined): string {
  switch (String(plan || '').trim().toUpperCase()) {
    case 'BASICO':
      return 'Entrada';
    case 'PREMIUM':
      return 'Avançado';
    case 'GESTAO_TOTAL':
      return 'Avançado (contrato anterior)';
    default:
      return 'Plano não identificado';
  }
}
