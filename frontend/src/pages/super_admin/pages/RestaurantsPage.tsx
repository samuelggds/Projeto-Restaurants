import { Building2, CheckCircle2, Clock3, LockKeyhole } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PlatformPlan, RestaurantTenant, SuperAdminData, TenantStatus } from '../types';
import { downloadCsv, normalizeSearch, tenantLabels } from '../domain/superAdminDomain';
import { Metrics, Toolbar } from '../components/Shared';
import { RestaurantTable } from './OverviewPage';
import * as S from '../SuperAdmin.styles';

export function RestaurantsPage({
  data,
  onSelect,
}: {
  data: SuperAdminData;
  onSelect: (restaurant: RestaurantTenant) => void;
}) {
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('ALL');
  const [status, setStatus] = useState<'ALL' | TenantStatus>('ALL');
  const visible = useMemo(() => {
    const search = normalizeSearch(query);
    return data.restaurants.filter(
      (restaurant) =>
        (!search ||
          normalizeSearch(
            `${restaurant.name} ${restaurant.slug} ${restaurant.email} ${restaurant.primaryAdmin?.name || ''}`,
          ).includes(search)) &&
        (plan === 'ALL' || restaurant.subscription?.planCode === plan) &&
        (status === 'ALL' || restaurant.status === status),
    );
  }, [data.restaurants, plan, query, status]);
  const exportRows = () =>
    downloadCsv(
      'restaurantes.csv',
      [
        'ID',
        'Restaurante',
        'Slug',
        'E-mail',
        'Responsável',
        'Plano',
        'Status',
        'Criado em',
        'Último acesso',
      ],
      visible.map((r) => [
        r.id,
        r.name,
        r.slug,
        r.email,
        r.primaryAdmin?.name,
        r.subscription?.planCode,
        r.status,
        r.createdAt,
        r.lastAccessAt,
      ]),
    );
  return (
    <S.PageStack>
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="Buscar restaurante, slug, e-mail ou responsável"
        onExport={exportRows}
        resultCount={visible.length}
      >
        <label className="sr-only" htmlFor="restaurant-plan">
          Plano
        </label>
        <select id="restaurant-plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="ALL">Todos os planos</option>
          {data.plans.map((item: PlatformPlan) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="restaurant-status">
          Status
        </label>
        <select
          id="restaurant-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="ALL">Todos os status</option>
          {Object.entries(tenantLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Toolbar>
      <Metrics
        items={[
          { label: 'Total cadastrado', value: data.metrics.restaurantsTotal, icon: <Building2 /> },
          { label: 'Ativos', value: data.metrics.restaurantsActive, icon: <CheckCircle2 /> },
          { label: 'Em teste', value: data.metrics.restaurantsTrial, icon: <Clock3 /> },
          { label: 'Bloqueados', value: data.metrics.restaurantsBlocked, icon: <LockKeyhole /> },
        ]}
      />
      <S.Card>
        <S.SectionHeading>
          <div>
            <h2>Diretório de restaurantes</h2>
            <p>
              {visible.length} resultado(s). Abra os detalhes para alterar acesso ou assinatura com
              auditoria.
            </p>
          </div>
        </S.SectionHeading>
        <RestaurantTable restaurants={visible} onSelect={onSelect} />
      </S.Card>
    </S.PageStack>
  );
}
