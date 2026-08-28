import { AlertTriangle, CalendarClock, CheckCircle2, Clock3 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { RestaurantTenant, SuperAdminData, TenantStatus } from '../types';
import {
  downloadCsv,
  formatCurrency,
  formatDate,
  normalizeSearch,
  statusTone,
  tenantLabels,
} from '../domain/superAdminDomain';
import { Empty, Metrics, Toolbar } from '../components/Shared';
import * as S from '../SuperAdmin.styles';

export function SubscriptionsPage({
  data,
  onSelect,
}: {
  data: SuperAdminData;
  onSelect: (restaurant: RestaurantTenant) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | TenantStatus>('ALL');
  const [plan, setPlan] = useState('ALL');
  const visible = useMemo(() => {
    const search = normalizeSearch(query);
    return data.restaurants.filter(
      (r) =>
        r.subscription &&
        (!search || normalizeSearch(`${r.name} ${r.email}`).includes(search)) &&
        (status === 'ALL' || r.status === status) &&
        (plan === 'ALL' || r.subscription.planCode === plan),
    );
  }, [data.restaurants, plan, query, status]);
  const monthNow = new Date();
  const renewThisMonth = data.restaurants.filter((r) => {
    if (!r.nextBillingAt) return false;
    const d = new Date(r.nextBillingAt);
    return d.getMonth() === monthNow.getMonth() && d.getFullYear() === monthNow.getFullYear();
  }).length;
  const exportRows = () =>
    downloadCsv(
      'assinaturas.csv',
      ['Restaurante', 'Plano', 'Status', 'Trial até', 'Próxima cobrança', 'Mensalidade', 'Dívida'],
      visible.map((r) => [
        r.name,
        r.subscription?.planCode,
        r.subscription?.status,
        r.subscription?.trialEndsAt,
        r.nextBillingAt,
        r.monthlyFee,
        r.subscription?.balanceDebt,
      ]),
    );
  return (
    <S.PageStack>
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="Buscar por restaurante ou e-mail"
        onExport={exportRows}
        resultCount={visible.length}
      >
        <select
          aria-label="Filtrar por status"
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
        <select
          aria-label="Filtrar por plano"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
        >
          <option value="ALL">Todos os planos</option>
          {data.plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </Toolbar>
      <Metrics
        items={[
          { label: 'Ativas', value: data.metrics.restaurantsActive, icon: <CheckCircle2 /> },
          { label: 'Em avaliação', value: data.metrics.restaurantsTrial, icon: <Clock3 /> },
          { label: 'Renovam neste mês', value: renewThisMonth, icon: <CalendarClock /> },
          { label: 'Em atraso', value: data.metrics.restaurantsOverdue, icon: <AlertTriangle /> },
        ]}
      />
      <S.Card>
        <S.SectionHeading>
          <div>
            <h2>Ciclos de assinatura</h2>
            <p>Gerencie plano, período de teste e vencimento. Toda alteração exige motivo.</p>
          </div>
        </S.SectionHeading>
        {visible.length ? (
          <S.Table>
            <div className="row head">
              <span>Restaurante</span>
              <span>Plano</span>
              <span>Status</span>
              <span>Trial até</span>
              <span>Próxima cobrança</span>
              <span>Ação</span>
            </div>
            {visible.map((r) => (
              <div className="row" key={r.id}>
                <span className="name" data-label="Restaurante">
                  <b>{r.name}</b>
                  <small>{r.email}</small>
                </span>
                <span data-label="Plano">{r.subscription?.planCode || 'Sem plano'}</span>
                <span data-label="Status">
                  <S.Badge $tone={statusTone(r.status)}>{tenantLabels[r.status]}</S.Badge>
                </span>
                <span data-label="Trial até">{formatDate(r.subscription?.trialEndsAt)}</span>
                <span data-label="Próxima cobrança">
                  {formatDate(r.nextBillingAt)}
                  <small style={{ display: 'block' }}>
                    {formatCurrency(r.monthlyFee, data.settings.currency, data.settings.locale)}
                  </small>
                </span>
                <button type="button" className="action" onClick={() => onSelect(r)}>
                  Gerenciar
                </button>
              </div>
            ))}
          </S.Table>
        ) : (
          <Empty title="Nenhuma assinatura encontrada" />
        )}
      </S.Card>
    </S.PageStack>
  );
}
