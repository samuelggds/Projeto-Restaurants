export type AiPlanSubscription = {
  plan?: string | null;
  status?: string | null;
};

export function hasPremiumAiAccess(subscription: AiPlanSubscription | null | undefined) {
  return (
    String(subscription?.plan || '').toUpperCase() === 'PREMIUM' &&
    ['ATIVA', 'TESTE'].includes(String(subscription?.status || '').toUpperCase())
  );
}
