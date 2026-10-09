import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, Clock3, Gift, Globe2, Headphones, Hourglass, Settings2, Sparkles, Store, Wrench } from 'lucide-react';
import api from '../../../Services/api';
import * as S from '../GastroNexaLandingV2.styles';
import { presentPlanBenefits, type PlanBenefitCategory } from './planBenefitPresentation';

type PlanInterest = 'BASICO' | 'PREMIUM' | 'GESTAO_TOTAL';

const PLAN_ORDER: Record<PlanInterest, number> = {
  BASICO: 1,
  PREMIUM: 2,
  GESTAO_TOTAL: 3,
};
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
    monthlyFee: 99.9,
    trialDays: 7,
    description: 'Operação de delivery para restaurantes que estão iniciando na plataforma.',
    features: [
      'Sistema de delivery',
      'Implantação inicial assistida uma única vez',
      'Cadastro inicial de até 50 produtos, além de categorias, combos, banners e configurações',
      'Após a implantação, o próprio ADMIN gerencia o cardápio e as configurações',
      'Endereço público GastroNexa com /slug',
      'Suporte padrão',
    ],
    featured: false,
  },
  {
    code: 'PREMIUM',
    name: 'Premium',
    monthlyFee: 199.9,
    trialDays: 15,
    description: 'Operação completa com implantação inicial assistida para começar pronto.',
    features: [
      'Sistema de delivery',
      'Cardápio digital com QR Code de mesa',
      'Implantação inicial assistida',
      'Cadastro inicial de até 100 produtos',
      'Domínio próprio opcional configurado pela GastroNexa',
      'Suporte prioritário',
      'Agente de IA para automações do sistema',
    ],
    featured: false,
  },
  {
    code: 'GESTAO_TOTAL',
    name: 'Gestão Total',
    monthlyFee: 299.9,
    trialDays: 15,
    description: 'Tudo do Premium com gestão contínua sob solicitação da equipe GastroNexa.',
    features: [
      'Tudo do Plano Premium',
      'Implantação inicial assistida',
      'Gestão assistida contínua, inclusive com atualizações diárias sob solicitação',
      'Atualizações de produtos, preços, categorias, combos, banners e configurações',
      'Domínio próprio opcional com gestão técnica pela GastroNexa',
      'Página personalizada do restaurante opcional no domínio próprio',
      'Solicitações de atualização ilimitadas',
      'Suporte prioritário',
      'GastroNexa IA',
    ],
    featured: true,
  },
];

const benefitIcons: Record<PlanBenefitCategory, typeof Store> = {
  operation: Store,
  setup: Settings2,
  management: Wrench,
  presence: Globe2,
  support: Headphones,
};

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
    () => [...plans].sort((a, b) => PLAN_ORDER[a.code] - PLAN_ORDER[b.code]),
    [plans],
  );

  return (
    <S.PlanGrid>
      {orderedPlans.map((plan) => {
        const presentation = presentPlanBenefits(plan.features);
        return (
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
          <div className="plan-benefits">
            {presentation.includesPremium ? (
              <p className="plan-includes-premium">
                <Sparkles size={17} aria-hidden="true" /> Inclui tudo do Plano Premium
              </p>
            ) : null}
            {presentation.sections.map((section) => {
              const SectionIcon = benefitIcons[section.category];
              return (
                <section className="benefit-section" key={section.category} aria-label={section.label}>
                  <h4><SectionIcon size={16} aria-hidden="true" /> {section.label}</h4>
                  <ul>
                    {section.items.map((benefit) => (
                      <li key={benefit.original} title={benefit.original}>
                        <Check size={16} aria-hidden="true" />
                        <span><strong>{benefit.title}</strong>{benefit.detail ? <small>{benefit.detail}</small> : null}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {presentation.bonuses.map((benefit) => (
              <div className="plan-gift" key={benefit.original}>
                <Gift size={19} aria-hidden="true" />
                <div>
                  <span className="plan-gift-label">Bônus do plano</span>
                  <strong>{benefit.title}</strong>
                  {benefit.detail ? <small>{benefit.detail}</small> : null}
                </div>
              </div>
            ))}
            {presentation.upcoming.length ? (
              <section className="benefit-coming" aria-label="Em breve">
                <h4><Hourglass size={15} aria-hidden="true" /> Em breve</h4>
                {presentation.upcoming.map((benefit) => (
                  <p key={benefit.original}>
                    <span>{benefit.title}</span>
                    {benefit.detail ? <small>{benefit.detail}</small> : null}
                  </p>
                ))}
              </section>
            ) : null}
          </div>
        </S.Plan>
        );
      })}
    </S.PlanGrid>
  );
}
