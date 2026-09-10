import {
  Armchair,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useOperationServices } from './services';
import type { AttendantCall, AttendantOrder, AttendantWorkspaceSnapshot } from '../types';
import { snapshotTime, elapsed, pendingDays, ageLabel, statusText, errorMessage } from './format';
import { Guide, Toolbar, Filters, List, OrderCard } from './shared.styles';
import { CallCard, TableGrid, TableCard } from './SalonViews.styles';
import { EmptyState } from './EmptyState';
import type { CallFilter, DayFilter } from './navigation';
import { PeriodFilters } from './PeriodFilters';

export function Calls({
  calls,
  attendantId,
  onChanged,
  referenceTime,
  initialMode = 'ACTIVE',
  initialDay = 'ALL',
}: {
  calls: AttendantCall[];
  attendantId: number;
  onChanged: () => void;
  referenceTime: number;
  initialMode?: CallFilter;
  initialDay?: DayFilter;
}) {
  const services = useOperationServices();
  const [mode, setMode] = useState<CallFilter>(initialMode);
  const [dayFilter, setDayFilter] = useState<DayFilter>(initialDay);
  const visible = calls
    .filter((call) => {
      const statusMatch =
        mode === 'ACTIVE'
          ? call.status !== 'RESOLVED'
          : mode === 'WAITING'
            ? call.status === 'WAITING'
            : call.status === 'RESOLVED';
      const old = pendingDays(call.requestedAt, referenceTime) > 0;
      return statusMatch && (dayFilter === 'ALL' || (dayFilter === 'OLD' ? old : !old));
    })
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));

  async function update(call: AttendantCall, status: 'IN_PROGRESS' | 'RESOLVED') {
    try {
      await services.updateCallStatus(call.id, status);
      toast.success(status === 'IN_PROGRESS' ? 'Chamado assumido.' : 'Chamado resolvido.');
      onChanged();
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível atualizar o chamado.'));
    }
  }

  return (
    <>
      <Toolbar>
        <Filters>
          <button
            type="button"
            className={mode === 'ACTIVE' ? 'active' : ''}
            aria-pressed={mode === 'ACTIVE'}
            onClick={() => setMode('ACTIVE')}
          >
            Aguardando / em atendimento
          </button>
          <button
            type="button"
            className={mode === 'WAITING' ? 'active' : ''}
            aria-pressed={mode === 'WAITING'}
            onClick={() => setMode('WAITING')}
          >
            Aguardando
          </button>
          <button
            type="button"
            className={mode === 'HISTORY' ? 'active' : ''}
            aria-pressed={mode === 'HISTORY'}
            onClick={() => setMode('HISTORY')}
          >
            Resolvidos
          </button>
        </Filters>
      </Toolbar>
      <PeriodFilters value={dayFilter} onChange={setDayFilter} total={visible.length} />
      <List>
        {visible.map((call) => {
          const mine = call.assignedToId === attendantId;
          return (
            <CallCard key={call.id}>
              <span className="table">Mesa {String(call.tableNumber).padStart(2, '0')}</span>
              <div>
                <strong>
                  {call.type === 'BILL' ? 'Fechamento de conta' : 'Atendimento no salão'}
                </strong>
                <small>
                  {call.status === 'WAITING'
                    ? 'Ninguém assumiu ainda.'
                    : call.status === 'IN_PROGRESS'
                      ? `Em atendimento por ${call.assignedToName || 'equipe'}.`
                      : `Resolvido por ${call.assignedToName || 'equipe'}.`}
                </small>
              </div>
              <time>{call.status === 'RESOLVED' ? 'Resolvido' : 'Ativo'}</time>
              {call.status === 'WAITING' && (
                <button type="button" onClick={() => void update(call, 'IN_PROGRESS')}>
                  Assumir chamado
                </button>
              )}
              {call.status === 'IN_PROGRESS' && mine && (
                <button
                  type="button"
                  className="success"
                  onClick={() => void update(call, 'RESOLVED')}
                >
                  Marcar como resolvido
                </button>
              )}
            </CallCard>
          );
        })}
        {!visible.length && (
          <EmptyState
            icon={CheckCircle2}
            title="Nenhum chamado nesta lista"
            text="Quando uma mesa pedir ajuda, o chamado aparece aqui."
          />
        )}
      </List>
    </>
  );
}

export function Tables({
  snapshot,
  initialDay = 'ALL',
}: {
  snapshot: AttendantWorkspaceSnapshot;
  initialDay?: DayFilter;
}) {
  const now = snapshotTime(snapshot);
  const [dayFilter, setDayFilter] = useState<DayFilter>(initialDay);
  const visible = snapshot.tables.filter((table) => {
    const old = pendingDays(table.openedAt, now) > 0;
    return dayFilter === 'ALL' || (dayFilter === 'OLD' ? old : !old);
  });
  return (
    <>
      <PeriodFilters value={dayFilter} onChange={setDayFilter} total={visible.length} />
      <TableGrid>
        {visible.map((table) => {
          const old = pendingDays(table.openedAt, now) > 0;
          const attention =
            table.status === 'CLOSING_REQUESTED' || table.activeCallCount > 0 || old;
          return (
            <TableCard key={table.id} $attention={attention}>
              <header>
                <span>
                  <small>Mesa</small>
                  <strong>{String(table.tableNumber).padStart(2, '0')}</strong>
                </span>
                <em>
                  {old
                    ? ageLabel(table.openedAt, now)
                    : table.status === 'CLOSING_REQUESTED'
                      ? 'Conta solicitada'
                      : table.activeCallCount
                        ? 'Precisa de atenção'
                        : 'Ocupada'}
                </em>
              </header>
              <div>
                <span>
                  <Users /> <b>{table.participantCount}</b> pessoas
                </span>
                <span>
                  <ShoppingBag /> <b>{table.activeOrderCount}</b> pedidos
                </span>
                <span>
                  <BellRing /> <b>{table.activeCallCount}</b> chamados
                </span>
              </div>
              <p>
                {attention
                  ? 'Esta mesa merece atenção operacional.'
                  : 'Mesa sem pendências sinalizadas agora.'}
              </p>
            </TableCard>
          );
        })}
      </TableGrid>
      {!visible.length && (
        <EmptyState
          icon={Armchair}
          title={
            dayFilter === 'ALL'
              ? 'Nenhuma mesa em operação'
              : 'Nenhuma mesa encontrada neste período'
          }
          text={
            dayFilter === 'ALL'
              ? 'As mesas abertas aparecerão aqui.'
              : 'Selecione Todos os dias para consultar as demais mesas abertas.'
          }
        />
      )}
    </>
  );
}

export function Deliveries({
  snapshot,
  onOpen,
}: {
  snapshot: AttendantWorkspaceSnapshot;
  onOpen: (order: AttendantOrder) => void;
}) {
  const now = snapshotTime(snapshot);
  const deliveries = snapshot.orders.filter((order) => order.type === 'DELIVERY');
  return (
    <>
      <Guide>
        <Truck />
        <div>
          <strong>O que acompanhar aqui</strong>
          <p>
            A cozinha controla o preparo e o motoqueiro controla a entrega. O atendente acompanha e
            orienta o cliente.
          </p>
        </div>
      </Guide>
      <List>
        {deliveries.map((order) => (
          <OrderCard
            key={order.id}
            $attention={order.status === 'PRONTO' || pendingDays(order.createdAt, now) > 0}
          >
            <div className="status">
              <strong>{order.code}</strong>
              <em>
                {pendingDays(order.createdAt, now) > 0
                  ? ageLabel(order.createdAt, now)
                  : statusText(order.status)}
              </em>
            </div>
            <div className="copy">
              <b>{order.customerName || 'Cliente'}</b>
              <small>
                {order.status === 'PRONTO'
                  ? 'Pronto para seguir para a etapa de entrega.'
                  : 'Acompanhe o preparo sem prometer horário sem confirmação.'}
              </small>
            </div>
            <div className="time">
              <Clock3 /> {elapsed(order.createdAt, now)}
            </div>
            <button type="button" onClick={() => onOpen(order)}>
              Ver pedido <ChevronRight />
            </button>
          </OrderCard>
        ))}
        {!deliveries.length && (
          <EmptyState
            icon={Truck}
            title="Nenhum delivery ativo"
            text="Pedidos de entrega aparecem aqui enquanto estiverem na operação."
          />
        )}
      </List>
    </>
  );
}
