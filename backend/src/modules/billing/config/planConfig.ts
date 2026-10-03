import { PlanType } from '@prisma/client';

export const PLAN_CONFIG = {
  [PlanType.BASICO]: {
    name: 'Básico',
    monthlyFee: 99.9,
    trialDays: 7,
    availableForSale: true,
    features: ['Sistema de delivery', 'Endereço público GastroNexa com /slug', 'Suporte padrão'],
  },

  [PlanType.PREMIUM]: {
    name: 'Premium',
    monthlyFee: 199.9,
    trialDays: 15,
    availableForSale: true,
    features: [
      'Sistema de delivery',
      'Cardápio digital com QR Code de mesa',
      'Implantação inicial assistida',
      'Cadastro inicial de até 150 produtos',
      'Endereço público GastroNexa com /slug',
      'Domínio próprio opcional configurado pela GastroNexa',
      'Suporte prioritário',
      'GastroNexa IA com US$ 2,00 de créditos iniciais',
    ],
  },

  [PlanType.GESTAO_TOTAL]: {
    name: 'Gestão Total',
    monthlyFee: 299.9,
    trialDays: 15,
    availableForSale: true,
    features: [
      'Tudo do Plano Premium',
      'Implantação inicial assistida',
      'Gestão assistida contínua, inclusive com atualizações diárias sob solicitação',
      'Atualizações de produtos, preços, categorias, combos, banners e configurações',
      'Endereço público GastroNexa com /slug',
      'Domínio próprio opcional com gestão técnica pela GastroNexa',
      'Página personalizada do restaurante opcional no domínio próprio',
      'Cardápio em subdomínio quando a página personalizada estiver ativa',
      'Solicitações de atualização ilimitadas',
      'Suporte prioritário',
      'GastroNexa IA',
    ],
  },
};

export const AVAILABLE_PLAN_TYPES = [
  PlanType.BASICO,
  PlanType.PREMIUM,
  PlanType.GESTAO_TOTAL,
] as const;

export function isAvailablePlan(plan: PlanType) {
  return AVAILABLE_PLAN_TYPES.some((availablePlan) => availablePlan === plan);
}
