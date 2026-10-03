export type AiPlanSubscription = {
  plan?: string | null;
  status?: string | null;
};

export function hasPremiumAiAccess(subscription: AiPlanSubscription | null | undefined) {
  return (
    ['PREMIUM', 'GESTAO_TOTAL'].includes(String(subscription?.plan || '').toUpperCase()) &&
    ['ATIVA', 'TESTE'].includes(String(subscription?.status || '').toUpperCase())
  );
}
