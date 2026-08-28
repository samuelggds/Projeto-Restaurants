import { CheckCircle2, KeyRound, ShieldCheck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AdministratorStatus, PlatformAdministrator, SuperAdminData } from '../types';
import { downloadCsv, formatDate, normalizeSearch, statusTone } from '../domain/superAdminDomain';
import { Empty, Metrics, Toolbar } from '../components/Shared';
import * as S from '../SuperAdmin.styles';

export function AdministratorsPage({
  data,
  onSelect,
  onCreate,
}: {
  data: SuperAdminData;
  onSelect: (administrator: PlatformAdministrator) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState('');
  const [restaurant, setRestaurant] = useState('ALL');
  const [status, setStatus] = useState<'ALL' | AdministratorStatus>('ALL');
  const visible = useMemo(() => {
    const search = normalizeSearch(query);
    return data.administrators.filter(
      (a) =>
        (!search || normalizeSearch(`${a.name} ${a.email} ${a.restaurant}`).includes(search)) &&
        (restaurant === 'ALL' || String(a.restaurantId) === restaurant) &&
        (status === 'ALL' || a.status === status),
    );
  }, [data.administrators, query, restaurant, status]);
  const exportRows = () =>
    downloadCsv(
      'administradores.csv',
      [
        'Nome',
        'E-mail',
        'Restaurante',
        'Status',
        'Último acesso',
        'MFA efetivo',
        'Troca de senha pendente',
      ],
      visible.map((a) => [
        a.name,
        a.email,
        a.restaurant,
        a.status,
        a.lastAccessAt,
        a.effectiveMfa ? 'Sim' : 'Não',
        a.mustChangePassword ? 'Sim' : 'Não',
      ]),
    );
  return (
    <S.PageStack>
      <S.SectionHeading>
        <div>
          <h2>Acessos administrativos</h2>
          <p>Cada pessoa deve ter sua própria conta. Bloqueios são imediatos e auditados.</p>
        </div>
        <S.Button $variant="primary" onClick={onCreate}>
          + Novo administrador
        </S.Button>
      </S.SectionHeading>
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="Buscar nome, e-mail ou restaurante"
        onExport={exportRows}
        resultCount={visible.length}
      >
        <select
          aria-label="Filtrar por restaurante"
          value={restaurant}
          onChange={(e) => setRestaurant(e.target.value)}
        >
          <option value="ALL">Todos os restaurantes</option>
          {data.restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'ALL' | AdministratorStatus)}
        >
          <option value="ALL">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="BLOCKED">Bloqueados</option>
        </select>
      </Toolbar>
      <Metrics
        items={[
          { label: 'Administradores', value: data.administrators.length, icon: <Users /> },
          {
            label: 'Ativos',
            value: data.administrators.filter((a) => a.status === 'ACTIVE').length,
            icon: <CheckCircle2 />,
          },
          {
            label: 'Protegidos por MFA',
            value: data.administrators.filter((a) => a.effectiveMfa).length,
            icon: <ShieldCheck />,
          },
          {
            label: 'Troca de senha pendente',
            value: data.administrators.filter((a) => a.mustChangePassword).length,
            icon: <KeyRound />,
          },
        ]}
      />
      <S.Card>
        <S.SectionHeading>
          <div>
            <h2>Contas por restaurante</h2>
            <p>{visible.length} conta(s) encontrada(s).</p>
          </div>
        </S.SectionHeading>
        {visible.length ? (
          <S.Table>
            <div className="row head">
              <span>Administrador</span>
              <span>Restaurante</span>
              <span>Status</span>
              <span>Último acesso</span>
              <span>MFA</span>
              <span>Ação</span>
            </div>
            {visible.map((admin) => (
              <div className="row" key={admin.id}>
                <span className="name" data-label="Administrador">
                  <b>{admin.name}</b>
                  <small>{admin.email}</small>
                </span>
                <span data-label="Restaurante">{admin.restaurant}</span>
                <span data-label="Status">
                  <S.Badge $tone={statusTone(admin.status)}>
                    {admin.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
                  </S.Badge>
                </span>
                <span data-label="Último acesso">{formatDate(admin.lastAccessAt, true)}</span>
                <span data-label="MFA">{admin.effectiveMfa ? 'Protegido' : 'Não habilitado'}</span>
                <button type="button" className="action" onClick={() => onSelect(admin)}>
                  Detalhes
                </button>
              </div>
            ))}
          </S.Table>
        ) : (
          <Empty title="Nenhum administrador encontrado" />
        )}
      </S.Card>
    </S.PageStack>
  );
}
