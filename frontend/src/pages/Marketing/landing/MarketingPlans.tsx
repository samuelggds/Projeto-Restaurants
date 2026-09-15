import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, CheckCircle2, Sparkles, Store } from 'lucide-react';
import api from '../../../Services/api';
import * as S from '../GastroNexaLandingV2.styles';

type PlanInterest = 'BASICO' | 'PREMIUM';
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
    trialDays: 30,
    description: 'Para organizar seu delivery e começar uma nova fase.',
    features: ['Sistema de delivery', 'Gestão dos pedidos de entrega', 'Suporte padrão'],
    featured: false,
  },
  {
    code: 'PREMIUM',
    name: 'Premium',
    monthlyFee: 249.9,
    trialDays: 30,
    description: 'Para conectar o delivery e o atendimento das suas mesas.',
    features: ['Tudo do plano Básico', 'Cardápio digital com QR Code de mesa', 'Suporte prioritário'],
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
      if (code !== 'BASICO' && code !== 'PREMIUM') return null;
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

  return (
    <S.PlanGrid>
      {plans.map((plan) => (
        <S.Plan key={plan.code} $featured={plan.featured}>
          <div className="plan-top">
            <span className="plan-icon">
              {plan.featured ? <Sparkles size={23} /> : <Store size={23} />}
            </span>
            {plan.featured && <span className="plan-badge">OPERAÇÃO COMPLETA</span>}
          </div>
          <h3>{plan.name}</h3>
          <p className="description">{plan.description}</p>
          <div className="price">
            <span>R$</span>
            <strong>{formatPrice(plan.monthlyFee)}</strong>
            <small>/mês</small>
          </div>
          <span className="trial">
            <CheckCircle2 size={14} />
            {plan.trialDays > 0 ? `${plan.trialDays} dias de teste` : 'Sem período de teste'}
          </span>
          <S.Button
            href="#contato"
            $secondary={!plan.featured}
            $lime={plan.featured}
            onClick={() => onSelectPlan(plan.code)}
          >
            Quero o {plan.name} <ArrowUpRight size={17} />
          </S.Button>
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
