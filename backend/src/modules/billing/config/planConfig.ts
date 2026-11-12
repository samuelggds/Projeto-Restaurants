import { PlanType } from '@prisma/client';

/**
 * Commercial names may change without changing persisted PlanType values.
 * Keep GESTAO_TOTAL for historical subscriptions, but do not sell it separately.
 */
export const PLAN_CONFIG = {
  [PlanType.BASICO]: {
    name: 'Entrada',
    monthlyFee: 79.9,
    trialDays: 7,
    availableForSale: true,
    features: [
      'Sistema de delivery',
      'Cardápio digital com QR Code de mesa',
      'Gestão de pedidos e mesas',
      'Implantação inicial assistida uma única vez',
      'Cadastro inicial de até 50 produtos, além de categorias, combos, banners e configurações',
      'Após a implantação, o próprio ADMIN gerencia o cardápio e as configurações',
      'Endereço público GastroNexa com /slug',
      'Suporte padrão',
    ],
  },

  [PlanType.PREMIUM]: {
    name: 'Avançado',
    monthlyFee: 149.9,
    trialDays: 15,
    availableForSale: true,
    features: [
      'Tudo do Plano Entrada',
      'Sistema de delivery',
      'Cardápio digital com QR Code de mesa',
      'Cartões NFC com comandas individuais (sujeito à homologação financeira)',
      'Implantação inicial assistida',
      'Cadastro assistido de produtos, categorias e combos sem limite de quantidade',
      'Gestão assistida contínua, inclusive com atualizações diárias sob solicitação',
      'Atualizações de produtos, preços, categorias, combos, banners e configurações',
      'Endereço público GastroNexa com /slug',
      'Domínio próprio opcional com gestão técnica pela GastroNexa',
      'Página personalizada do restaurante opcional no domínio próprio',
      'Cardápio em subdomínio quando a página personalizada estiver ativa',
      'Solicitações de atualização ilimitadas',
      'Suporte prioritário',
      'GastroNexa IA com US$ 2,00 de créditos iniciais',
    ],
  },

  [PlanType.GESTAO_TOTAL]: {
    name: 'Gestão Total (legado)',
    monthlyFee: 299.9,
    trialDays: 15,
    availableForSale: false,
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
] as const;

export function isAvailablePlan(plan: PlanType) {
  return AVAILABLE_PLAN_TYPES.some((availablePlan) => availablePlan === plan);
}
