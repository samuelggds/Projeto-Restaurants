import { AlertTriangle, Building2, Clock3, DollarSign, ShieldCheck } from 'lucide-react';
import type { RestaurantTenant, SuperAdminData } from '../types';
import { formatCurrency, formatDate, statusTone, tenantLabels } from '../domain/superAdminDomain';
import { Chart, Empty, Metrics } from '../components/Shared';
import * as S from '../SuperAdmin.styles';

export function RestaurantTable({
  restaurants,
  onSelect,
}: {
  restaurants: RestaurantTenant[];
  onSelect: (restaurant: RestaurantTenant) => void;
}) {
  if (!restaurants.length)
    return (
      <Empty
        title="Nenhum restaurante cadastrado"
        description="Use “Novo restaurante” para criar o primeiro tenant da plataforma."
      />
    );
  return (
    <S.Table>
      <div className="row head">
        <span>Restaurante</span>
        <span>Responsável</span>
        <span>Plano</span>
        <span>Status</span>
        <span>Último acesso</span>
        <span>Ação</span>
      </div>
      {restaurants.map((restaurant) => (
        <div className="row" key={restaurant.id}>
          <span className="name" data-label="Restaurante">
            <b>{restaurant.name}</b>
            <small>{restaurant.email}</small>
          </span>
          <span data-label="Responsável">
            {restaurant.primaryAdmin?.name || 'Sem administrador'}
          </span>
          <span data-label="Plano">{restaurant.subscription?.planCode || 'Sem plano'}</span>
          <span data-label="Status">
            <S.Badge $tone={statusTone(restaurant.status)}>
              {tenantLabels[restaurant.status]}
            </S.Badge>
          </span>
          <span data-label="Último acesso">{formatDate(restaurant.lastAccessAt, true)}</span>
          <button className="action" type="button" onClick={() => onSelect(restaurant)}>
            Ver detalhes
          </button>
        </div>
      ))}
    </S.Table>
  );
}

export function OverviewPage({
  data,
  onSelect,
}: {
  data: SuperAdminData;
  onSelect: (restaurant: RestaurantTenant) => void;
}) {
  const recent = [...data.restaurants]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 6);
  return (
    <S.PageStack>
      <Metrics
        items={[
          {
            label: 'Restaurantes ativos',
            value: data.metrics.restaurantsActive,
            icon: <Building2 />,
            hint: `${data.metrics.restaurantsTotal} no total`,
          },
          {
            label: 'Receita recorrente mensal',
            value: formatCurrency(data.metrics.mrr, data.settings.currency, data.settings.locale),
            icon: <DollarSign />,
            hint: 'MRR de assinaturas ativas',
          },
          {
            label: 'Em período de teste',
            value: data.metrics.restaurantsTrial,
            icon: <Clock3 />,
            hint: 'Acompanhe conversão e expiração',
          },
          {
            label: 'Faturas em aberto',
            value: data.metrics.pendingInvoicesCount,
            icon: <AlertTriangle />,
            hint: formatCurrency(
              data.metrics.pendingInvoicesTotal,
              data.settings.currency,
              data.settings.locale,
            ),
          },
        ]}
      />
      <S.Grid>
        <S.Card>
          <S.SectionHeading>
            <div>
              <h2>Crescimento da plataforma</h2>
              <p>Total acumulado de restaurantes ativos nos últimos meses.</p>
            </div>
          </S.SectionHeading>
          <Chart data={data.metrics.monthlyGrowth} valueKey="count" />
        </S.Card>
        <S.Card>
          <S.SectionHeading>
            <div>
              <h2>Saúde das assinaturas</h2>
              <p>Distribuição atual por status operacional.</p>
            </div>
            <ShieldCheck />
          </S.SectionHeading>
          <S.Stack>
            {[
              ['Ativas', 'Acesso normal à plataforma', data.metrics.restaurantsActive],
              ['Em avaliação', 'Período de teste', data.metrics.restaurantsTrial],
              ['Em atraso', 'Cobrança requer atenção', data.metrics.restaurantsOverdue],
              ['Bloqueadas', 'Sem acesso operacional', data.metrics.restaurantsBlocked],
              ['Canceladas', 'Assinatura encerrada', data.metrics.restaurantsCanceled],
            ].map(([label, hint, value]) => (
              <S.ListItem key={String(label)}>
                <span className="info">
                  <b>{label}</b>
                  <span>{hint}</span>
                </span>
                <strong>{value}</strong>
              </S.ListItem>
            ))}
          </S.Stack>
        </S.Card>
      </S.Grid>
      <S.Card>
        <S.SectionHeading>
          <div>
            <h2>Restaurantes recentes</h2>
            <p>Tenants adicionados mais recentemente à plataforma.</p>
          </div>
        </S.SectionHeading>
        <RestaurantTable restaurants={recent} onSelect={onSelect} />
      </S.Card>
    </S.PageStack>
  );
}
