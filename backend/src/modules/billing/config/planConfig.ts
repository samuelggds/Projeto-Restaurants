import { PlanType } from '@prisma/client';

export const PLAN_CONFIG = {
  [PlanType.BASICO]: {
    name: 'Básico',
    monthlyFee: 149.9,
    trialDays: 7,
    availableForSale: true,
    features: ['Sistema de delivery', 'Suporte padrão'],
  },

  [PlanType.PREMIUM]: {
    name: 'Premium',
    monthlyFee: 249.9,
    trialDays: 15,
    availableForSale: true,
    features: [
      'Sistema de delivery',
      'Cardápio digital com QR Code de mesa',
      'Suporte prioritário',
      'GastroNexa IA com US$ 2,00 de créditos iniciais',
    ],
  },
};

export const AVAILABLE_PLAN_TYPES = [PlanType.BASICO, PlanType.PREMIUM] as const;

export function isAvailablePlan(plan: PlanType) {
  return AVAILABLE_PLAN_TYPES.some((availablePlan) => availablePlan === plan);
}
