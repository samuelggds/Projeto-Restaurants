import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, Clock3, Sparkles, Store } from 'lucide-react';
import api from '../../../Services/api';
import * as S from '../GastroNexaLandingV2.styles';

type PlanInterest = 'BASICO' | 'PREMIUM' | 'GESTAO_TOTAL';
type PublicPlan = {
  code: PlanInterest;
  name: string;
  description: string;
  monthlyFee: number;
  trialDays: number;
  features: string[];
  featured: boolean;
};

const fallbackPlans: PublicPlan[] = [
  {
    code: 'BASICO',
    name: 'Básico',
    monthlyFee: 149.9,
    trialDays: 7,
    description: 'Operação de delivery para restaurantes que estão iniciando na plataforma.',
    features: ['Sistema de delivery', 'Suporte padrão'],
    featured: false,
  },
  {
    code: 'PREMIUM',
    name: 'Premium',
    monthlyFee: 249.9,
    trialDays: 15,
    description: 'Operação completa com implantação inicial assistida para começar pronto.',
    features: [
      'Sistema de delivery',
      'Cardápio digital com QR Code de mesa',
      'Implantação inicial assistida',
      'Cadastro inicial de até 150 produtos',
      'Suporte prioritário',
      'Agente de IA para automações do sistema',
    ],
    featured: false,
  },
  {
    code: 'GESTAO_TOTAL',
    name: 'Gestão Total',
    monthlyFee: 349.9,
    trialDays: 15,
    description: 'Tudo do Premium com gestão contínua sob solicitação da equipe GastroNexa.',
    features: [
      'Tudo do Plano Premium',
      'Implantação inicial assistida',
      'Gestão assistida contínua, inclusive com atualizações diárias sob solicitação',
      'Atualizações de produtos, preços, categorias, combos, banners e configurações',
      'Solicitações de atualização ilimitadas',
      'Suporte prioritário',
      'GastroNexa IA',
    ],
    featured: true,
  },
];

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizePlans(value: unknown): PublicPlan[] {
  const raw = Array.isArray((value as { plans?: unknown[] })?.plans)
    ? (value as { plans: unknown[] }).plans
    : [];
  return raw
    .map((item) => {
      const plan = item as Record<string, unknown>;
      const code = String(plan.code || '').toUpperCase();
      if (code !== 'BASICO' && code !== 'PREMIUM' && code !== 'GESTAO_TOTAL') return null;
      const monthlyFee = Number(plan.monthlyFee);
      const trialDays = Number(plan.trialDays);
      return {
        code,
        name: String(plan.name || code),
        description: String(plan.description || ''),
        monthlyFee: Number.isFinite(monthlyFee) ? monthlyFee : 0,
        trialDays: Number.isInteger(trialDays) && trialDays >= 0 ? trialDays : 0,
        features: Array.isArray(plan.features)
          ? plan.features.map((feature) => String(feature)).filter(Boolean)
          : [],
        featured: Boolean(plan.featured),
      } as PublicPlan;
    })
    .filter((plan): plan is PublicPlan => Boolean(plan));
}

export function MarketingPlans({ onSelectPlan }: { onSelectPlan: (plan: PlanInterest) => void }) {
  const [plans, setPlans] = useState<PublicPlan[]>(fallbackPlans);

  useEffect(() => {
    let active = true;
    api
      .get('/platform/plans', { skipBaseUrlFallback: true })
      .then((response) => {
        if (!active) return;
        const normalized = normalizePlans(response.data);
        if (normalized.length) setPlans(normalized);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const orderedPlans = useMemo(
    () => [...plans].sort((a, b) => Number(b.featured) - Number(a.featured)),
    [plans],
  );

  return (
    <S.PlanGrid>
      {orderedPlans.map((plan) => (
        <S.Plan key={plan.code} $featured={plan.featured}>
          <div className="plan-top">
            <span className="plan-icon">
              {plan.featured ? <Sparkles size={23} /> : <Store size={23} />}
            </span>
            {plan.featured ? <span className="plan-badge">OPERAÇÃO COMPLETA</span> : null}
          </div>
          <div>
            <h3>{plan.name}</h3>
            <p className="description">{plan.description}</p>
          </div>
          <div className="price">
            <span>R$</span>
            <strong>{formatPrice(plan.monthlyFee)}</strong>
            <small>/mês</small>
          </div>
          <span className="trial">
            <Clock3 size={14} />
            {plan.trialDays > 0 ? `${plan.trialDays} dias de teste` : 'Sem período de teste'}
          </span>
          <a
            className="plan-cta"
            href="#contato"
            onClick={() => onSelectPlan(plan.code)}
          >
            Quero o {plan.name} <ArrowUpRight size={17} />
          </a>
          <ul>
            {plan.features.map((feature) => (
              <li key={feature}>
                <Check size={16} />
                {feature}
              </li>
            ))}
          </ul>
        </S.Plan>
      ))}
    </S.PlanGrid>
  );
}
