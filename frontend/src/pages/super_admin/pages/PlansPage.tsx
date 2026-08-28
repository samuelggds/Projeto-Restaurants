import { DollarSign, Layers3, Store, Users } from 'lucide-react';
import type { PlatformPlan, SuperAdminData } from '../types';
import { formatCurrency } from '../domain/superAdminDomain';
import { Empty, Metrics } from '../components/Shared';
import * as S from '../SuperAdmin.styles';

export function PlansPage({
  data,
  onEdit,
}: {
  data: SuperAdminData;
  onEdit: (plan: PlatformPlan) => void;
}) {
  const activePlans = data.plans.filter((p) => p.active);
  return (
    <S.PageStack>
      <S.InlineAlert $tone="info">
        Alterações de preço valem para as próximas faturas. Faturas já emitidas permanecem imutáveis
        para preservar a consistência financeira.
      </S.InlineAlert>
      <Metrics
        items={[
          { label: 'Planos ativos', value: activePlans.length, icon: <Layers3 /> },
          {
            label: 'Restaurantes assinantes',
            value: data.plans.reduce((sum, p) => sum + p.restaurantsCount, 0),
            icon: <Users />,
          },
          {
            label: 'MRR atual',
            value: formatCurrency(data.metrics.mrr, data.settings.currency, data.settings.locale),
            icon: <DollarSign />,
          },
        ]}
      />
      {data.plans.length ? (
        <S.PlanGrid>
          {data.plans.map((plan) => (
            <S.PlanCard key={plan.code} $featured={plan.featured}>
              <S.Badge $tone={plan.active ? 'green' : 'gray'}>
                {plan.active ? 'ATIVO' : 'INATIVO'}
              </S.Badge>
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
              <div className="price">
                {formatCurrency(plan.monthlyFee, data.settings.currency, data.settings.locale)}
                <small>/mês</small>
              </div>
              <small>
                <Store size={13} /> {plan.restaurantsCount} restaurante(s) • trial de{' '}
                {plan.trialDays} dias
              </small>
              <div className="features">
                {plan.features.map((feature) => (
                  <span key={feature}>{feature}</span>
                ))}
              </div>
              <button type="button" className="edit" onClick={() => onEdit(plan)}>
                Editar plano
              </button>
            </S.PlanCard>
          ))}
        </S.PlanGrid>
      ) : (
        <Empty
          title="Nenhum plano configurado"
          description="Aplique as migrations da plataforma para inicializar o catálogo de planos."
        />
      )}
    </S.PageStack>
  );
}
