import {
  ArrowRight,
  Bike,
  CheckCircle2,
  ChefHat,
  Clock3,
  History,
  LayoutGrid,
  Printer,
  Radio,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { KitchenRealtimeStatus, Order, OrderChannel, OrderStatus } from '../types';
import { useKitchenWorkspace as useWorkspace } from '../useKitchenWorkspace';
import {
  Empty,
  MetricCards,
  OrderItems,
  StatusBadge,
  channelLabel,
  hasOrderPreparationDetails,
  statusLabel,
} from '../components/Shared';
import * as S from '../Kitchen.styles';
import { KitchenCardActions } from '../KitchenCardActions.styles';
import { KITCHEN_LIST_BATCH_SIZE, KitchenListControls } from '../components/KitchenListControls';
import * as D from './KitchenDashboard.styles';

type ActiveOrderStatus = Extract<OrderStatus, 'PENDENTE' | 'PREPARANDO' | 'PRONTO'>;
const activeStatuses: ActiveOrderStatus[] = ['PENDENTE', 'PREPARANDO', 'PRONTO'];
const INITIAL_KITCHEN_TIME = Date.now();
type ChannelFilterValue = OrderChannel | 'ALL';

function isActiveOrderStatus(status: OrderStatus): status is ActiveOrderStatus {
  return activeStatuses.some((activeStatus) => activeStatus === status);
}

function useKitchenClock() {
  const [now, setNow] = useState(INITIAL_KITCHEN_TIME);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function elapsedFrom(timestamp: string | undefined, now: number) {
  if (!timestamp) return '00:00';
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return '00:00';
  const seconds = Math.max(0, Math.floor((now - parsed) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const minuteClock = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  return hours > 0 ? `${String(hours).padStart(2, '0')}:${minuteClock}` : minuteClock;
}

function orderElapsed(order: Order, now: number) {
  if (order.status === 'PREPARANDO') {
    return elapsedFrom(order.preparationStartedAt ?? order.createdAtIso, now);
  }
  if (order.status === 'PRONTO') {
    return elapsedFrom(order.readyAt ?? order.preparationStartedAt ?? order.createdAtIso, now);
  }
  return elapsedFrom(order.createdAtIso, now);
}

function averagePreparationTime(orders: Order[]) {
  const durations = orders.flatMap((order) => {
    if (!order.preparationStartedAt || !order.readyAt) return [];
    const duration =
      new Date(order.readyAt).getTime() - new Date(order.preparationStartedAt).getTime();
    return duration >= 0 ? [duration] : [];
  });
  if (!durations.length) return '—';
  const averageMinutes = Math.round(
    durations.reduce((total, value) => total + value, 0) / durations.length / 60_000,
  );
  return `${averageMinutes} min`;
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function orderSearchContent(order: Order) {
  const details = order.itemDetails?.flatMap((item) => [
    item.name,
    item.observation ?? '',
    ...item.customizations.flatMap((group) => [group.groupName, ...group.options]),
    ...(item.removedComposition || []),
    ...(item.portions || []).flatMap((portion) => [portion.label, portion.observation ?? '']),
  ]);

  return normalizeSearch(
    [
      order.id,
      order.reference,
      order.customer ?? '',
      ...order.items,
      ...(details ?? []),
      order.observation ?? '',
    ].join(' '),
  );
}

function matchesOrderSearch(order: Order, query: string) {
  const content = orderSearchContent(order);
  return normalizeSearch(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => content.includes(term));
}

function timestamp(value: string | undefined, fallback: number) {
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function oldestCreatedFirst(a: Order, b: Order) {
  return (
    timestamp(a.createdAtIso, Number.MAX_SAFE_INTEGER) -
    timestamp(b.createdAtIso, Number.MAX_SAFE_INTEGER)
  );
}

function oldestReadyFirst(a: Order, b: Order) {
  return (
    timestamp(a.readyAt ?? a.createdAtIso, Number.MAX_SAFE_INTEGER) -
    timestamp(b.readyAt ?? b.createdAtIso, Number.MAX_SAFE_INTEGER)
  );
}

function newestCompletedFirst(a: Order, b: Order) {
  return (
    timestamp(b.completedAtIso ?? b.createdAtIso, 0) -
    timestamp(a.completedAtIso ?? a.createdAtIso, 0)
  );
}

function isToday(value: string | undefined, now: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const current = new Date(now);
  return (
    date.getFullYear() === current.getFullYear() &&
    date.getMonth() === current.getMonth() &&
    date.getDate() === current.getDate()
  );
}

export function KitchenOverviewPage({ onOpenOrder }: { onOpenOrder?: (orderId: string) => void }) {
  const { orders } = useWorkspace();
  const now = useKitchenClock();
  const active = orders.filter((order) => isActiveOrderStatus(order.status));
  const urgent = active
    .filter((o) => o.status !== 'PRONTO')
    .sort(oldestCreatedFirst)
    .slice(0, 4);
  const nextOrder = urgent[0];
  return (
    <>
      <D.ShiftBanner>
        <div className="copy">
          <span className="eyebrow">
            <Radio /> Produção em tempo real
          </span>
          <h2>{active.length ? `${active.length} pedidos em produção` : 'Produção em dia'}</h2>
          <p>
            {active.filter((order) => order.status === 'PENDENTE').length} aguardando início •{' '}
            {active.filter((order) => order.status === 'PREPARANDO').length} em preparo •{' '}
            {active.filter((order) => order.status === 'PRONTO').length} prontos para retirada
          </p>
        </div>
        <div className="signal">
          <span>
            <small>Próximo pedido</small>
            <b>{nextOrder?.id ?? 'Livre'}</b>
          </span>
          <span>
            <small>Maior espera</small>
            <b>{nextOrder ? orderElapsed(nextOrder, now) : '00:00'}</b>
          </span>
          {nextOrder && (
            <button type="button" onClick={() => onOpenOrder?.(nextOrder.id)}>
              Abrir próximo pedido <ArrowRight />
            </button>
          )}
        </div>
      </D.ShiftBanner>
      <MetricCards
        items={[
          { label: 'Pedidos ativos', value: active.length },
          {
            label: 'Pendentes',
            value: active.filter((o) => o.status === 'PENDENTE').length,
            icon: 'clock',
          },
          {
            label: 'Preparando',
            value: active.filter((o) => o.status === 'PREPARANDO').length,
            icon: 'chef',
          },
          {
            label: 'Prontos',
            value: active.filter((o) => o.status === 'PRONTO').length,
            tone: 'green',
          },
        ]}
      />
      <S.Grid>
        <S.Card>
          <header>
            <div>
              <h2>Prioridade da cozinha</h2>
              <p>Pedidos com maior tempo de espera.</p>
            </div>
            <ChefHat />
          </header>
          <S.Stack>
            {urgent.map((order) => (
              <S.PriorityOrder
                key={order.id}
                className="overview-priority"
                role="button"
                tabIndex={0}
                onClick={() => onOpenOrder?.(order.id)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  event.currentTarget.click();
                }}
                aria-label={`Abrir ${order.id} na fila de pedidos`}
              >
                <div className="identity">
                  <b>{order.id}</b>
                  <span>
                    {order.channel === 'TABLE' ? order.reference : channelLabel[order.channel]} •
                    aguardando há {orderElapsed(order, now)}
                  </span>
                  {hasOrderPreparationDetails(order) && (
                    <em className="preparation-alert">Montagem especial</em>
                  )}
                </div>
                <OrderItems order={order} compact />
                <div className="right">
                  <StatusBadge status={order.status} />
                </div>
              </S.PriorityOrder>
            ))}
            {!urgent.length && <Empty>Nenhum pedido aguardando preparo.</Empty>}
          </S.Stack>
        </S.Card>
        <S.Card>
          <header>
            <div>
              <h2>Resumo por canal</h2>
              <p>Pedidos ativos neste turno.</p>
            </div>
            <UtensilsCrossed />
          </header>
          <S.Stack>
            {(['TABLE', 'PICKUP', 'DELIVERY'] as OrderChannel[]).map((channel) => (
              <S.CodeBox key={channel}>
                <span className="label">
                  <b>{channelLabel[channel]}</b>
                  <small>Pendente e em preparo</small>
                </span>
                <span className="code">
                  {active.filter((o) => o.channel === channel && o.status !== 'PRONTO').length}
                </span>
              </S.CodeBox>
            ))}
          </S.Stack>
        </S.Card>
      </S.Grid>
    </>
  );
}

function ChannelFilter({
  value,
  onChange,
}: {
  value: ChannelFilterValue;
  onChange: (channel: ChannelFilterValue) => void;
}) {
  return (
    <S.ChannelButtons role="group" aria-label="Filtrar por canal">
      {(
        [
          ['ALL', 'Todos', LayoutGrid],
          ['TABLE', 'Mesa', UtensilsCrossed],
          ['PICKUP', 'Retirada', ShoppingBag],
          ['DELIVERY', 'Delivery', Bike],
        ] as const
      ).map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          className={value === id ? 'active' : ''}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          <Icon />
          {label}
        </button>
      ))}
    </S.ChannelButtons>
  );
}

function RealtimeIndicator({ status = 'connected' }: { status?: KitchenRealtimeStatus }) {
  const label =
    status === 'connected'
      ? 'Tempo real ativo'
      : status === 'connecting'
        ? 'Conectando'
        : 'Sincronização a cada 30 s';

  return (
    <span className={`live ${status}`} role="status" aria-live="polite">
      {label}
    </span>
  );
}

function KitchenCard({
  order,
  highlighted = false,
  now,
  position,
}: {
  order: Order;
  highlighted?: boolean;
  now: number;
  position: number;
}) {
  const {
    role,
    updateOrderStatus,
    reprintOrder,
    updatingOrderIds,
    reprintingOrderIds,
    orderUpdateError,
    reprintError,
    onRefresh,
  } = useWorkspace();
  const next =
    order.status === 'PENDENTE' ? 'PREPARANDO' : order.status === 'PREPARANDO' ? 'PRONTO' : null;
  const updating = updatingOrderIds.has(order.id);
  const actionError = orderUpdateError?.orderId === order.id ? orderUpdateError.message : null;
  const currentReprintError = reprintError?.orderId === order.id ? reprintError.message : null;
  const reprinting = reprintingOrderIds.has(order.id);
  const hasItems = Boolean(order.itemDetails?.length || order.items.some((item) => item.trim()));
  const visibleActionError = !hasItems
    ? 'Este pedido chegou sem itens. Atualize a fila antes de iniciar o preparo.'
    : actionError || currentReprintError;
  return (
    <S.KitchenOrder
      id={`kitchen-order-${encodeURIComponent(order.id.replace(/^#/, ''))}`}
      data-order-id={order.id}
      className={`${highlighted ? 'highlighted ' : ''}status-${order.status.toLocaleLowerCase('pt-BR')}`}
    >
      <div className="head">
        <span className="identity">
          <b>{order.id}</b>
          <small>
            {order.channel === 'TABLE' ? order.reference : channelLabel[order.channel]}
            {order.customer ? ` • ${order.customer}` : ''}
          </small>
        </span>
        <span className="card-flags">
          {position === 0 && order.status !== 'PRONTO' && (
            <em className="queue-lead">Próximo da fila</em>
          )}
          <StatusBadge status={order.status} />
        </span>
      </div>
      <OrderItems order={order} />
      {order.status === 'PRONTO' ? (
        <span className="waiting">Pronto há {orderElapsed(order, now)} • aguardando retirada</span>
      ) : (
        <span className="elapsed">
          <Clock3 size={17} />
          {order.status === 'PREPARANDO' ? 'Em preparo há ' : 'Aguardando há '}
          {orderElapsed(order, now)}
        </span>
      )}
      {role === 'KITCHEN' && (
        <KitchenCardActions>
          {next && (
            <button
              type="button"
              className={`action ${order.status === 'PENDENTE' ? 'pending' : 'preparing'}`}
              disabled={updating || !hasItems}
              aria-busy={updating}
              onClick={() => void updateOrderStatus(order.id, next)}
            >
              {!hasItems
                ? 'Itens indisponíveis'
                : updating
                  ? 'Atualizando...'
                  : order.status === 'PENDENTE'
                    ? 'Iniciar preparo'
                    : 'Marcar como pronto'}
            </button>
          )}
          <button
            type="button"
            className="reprint"
            disabled={reprinting}
            aria-busy={reprinting}
            onClick={() => void reprintOrder(order.id)}
          >
            <Printer size={14} /> {reprinting ? 'Solicitando…' : 'Reimprimir comanda'}
          </button>
        </KitchenCardActions>
      )}
      {visibleActionError && (
        <div className="action-error" role="alert">
          <span>{visibleActionError}</span>
          {onRefresh && (
            <button type="button" onClick={() => void onRefresh()}>
              Atualizar fila
            </button>
          )}
        </div>
      )}
    </S.KitchenOrder>
  );
}

export function KitchenQueuePage({
  focusedOrderId,
  onFocusComplete,
}: {
  focusedOrderId?: string | null;
  onFocusComplete?: () => void;
}) {
  const { orders, workspaceState } = useWorkspace();
  const now = useKitchenClock();
  const focusedOrder = focusedOrderId
    ? orders.find((order) => order.id === focusedOrderId)
    : undefined;
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState<ChannelFilterValue>(focusedOrder?.channel ?? 'ALL');
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(
    focusedOrder?.id ?? null,
  );
  const [visibleCounts, setVisibleCounts] = useState<Record<ActiveOrderStatus, number>>({
    PENDENTE: KITCHEN_LIST_BATCH_SIZE,
    PREPARANDO: KITCHEN_LIST_BATCH_SIZE,
    PRONTO: KITCHEN_LIST_BATCH_SIZE,
  });
  const resetVisibleCounts = () =>
    setVisibleCounts((current) => ({
      ...current,
      PENDENTE: KITCHEN_LIST_BATCH_SIZE,
      PREPARANDO: KITCHEN_LIST_BATCH_SIZE,
      PRONTO: KITCHEN_LIST_BATCH_SIZE,
    }));

  useEffect(() => {
    if (!focusedOrderId) return;
    const targetOrder = orders.find((order) => order.id === focusedOrderId);
    if (!targetOrder) {
      onFocusComplete?.();
      return;
    }
    let scrollFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      setChannel(targetOrder.channel);
      setStatus('ALL');
      setQuery('');
      scrollFrame = window.requestAnimationFrame(() => {
        document
          .getElementById(`kitchen-order-${encodeURIComponent(focusedOrderId.replace(/^#/, ''))}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    const timer = window.setTimeout(() => {
      setHighlightedOrderId(null);
      onFocusComplete?.();
    }, 2600);

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(scrollFrame);
      window.clearTimeout(timer);
    };
  }, [focusedOrderId, onFocusComplete, orders]);
  const visible = useMemo(
    () =>
      orders
        .filter(
          (o) =>
            (channel === 'ALL' || o.channel === channel) &&
            isActiveOrderStatus(o.status) &&
            (status === 'ALL' || o.status === status) &&
            matchesOrderSearch(o, query),
        )
        .sort(oldestCreatedFirst),
    [orders, channel, status, query],
  );
  return (
    <>
      <S.Toolbar>
        <input
          aria-label="Buscar pedidos da cozinha"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            resetVisibleCounts();
          }}
          placeholder="Buscar pedido ou mesa"
        />
        <ChannelFilter
          value={channel}
          onChange={(value) => {
            setChannel(value);
            setStatus('ALL');
            resetVisibleCounts();
          }}
        />
        <select
          aria-label="Filtrar por status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | 'ALL');
            resetVisibleCounts();
          }}
        >
          <option value="ALL">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="PREPARANDO">Preparando</option>
          <option value="PRONTO">Pronto</option>
        </select>
        <RealtimeIndicator status={workspaceState?.realtimeStatus} />
      </S.Toolbar>
      <MetricCards
        items={[
          {
            label: 'Pendentes',
            value: visible.filter((o) => o.status === 'PENDENTE').length,
            icon: 'clock',
          },
          {
            label: 'Preparando',
            value: visible.filter((o) => o.status === 'PREPARANDO').length,
            icon: 'chef',
          },
          {
            label: 'Prontos',
            value: visible.filter((o) => o.status === 'PRONTO').length,
            tone: 'green',
          },
          {
            label: 'Tempo médio',
            value: averagePreparationTime(
              orders.filter((order) => channel === 'ALL' || order.channel === channel),
            ),
            icon: 'clock',
          },
        ]}
      />
      <S.StatusColumns>
        {activeStatuses
          .filter((item) => status === 'ALL' || item === status)
          .map((item) => {
            const laneOrders = visible.filter((order) => order.status === item);
            return (
              <S.StatusColumn key={item} className={`lane-${item.toLocaleLowerCase('pt-BR')}`}>
                <header>
                  <span className="dot" />
                  <b>{statusLabel[item]}</b>
                  <span>{laneOrders.length}</span>
                </header>
                {laneOrders.slice(0, visibleCounts[item]).map((order, position) => (
                  <KitchenCard
                    key={order.id}
                    order={order}
                    highlighted={highlightedOrderId === order.id}
                    now={now}
                    position={position}
                  />
                ))}
                {!laneOrders.length && <Empty>Nenhum pedido neste status.</Empty>}
                <KitchenListControls
                  visibleCount={Math.min(visibleCounts[item], laneOrders.length)}
                  totalCount={laneOrders.length}
                  onShowMore={() =>
                    setVisibleCounts((current) => ({
                      ...current,
                      [item]: current[item] + KITCHEN_LIST_BATCH_SIZE,
                    }))
                  }
                  onReset={() =>
                    setVisibleCounts((current) => ({
                      ...current,
                      [item]: KITCHEN_LIST_BATCH_SIZE,
                    }))
                  }
                />
              </S.StatusColumn>
            );
          })}
      </S.StatusColumns>
    </>
  );
}

export function KitchenReadyPage() {
  const { orders, workspaceState } = useWorkspace();
  const now = useKitchenClock();
  const [channel, setChannel] = useState<ChannelFilterValue>('ALL');
  const [visibleCount, setVisibleCount] = useState(KITCHEN_LIST_BATCH_SIZE);
  const ready = orders
    .filter(
      (order) => order.status === 'PRONTO' && (channel === 'ALL' || order.channel === channel),
    )
    .sort(oldestReadyFirst);
  const longestReadyOrder = ready.reduce<Order | undefined>((longest, order) => {
    if (!longest) return order;
    const orderTime = new Date(order.readyAt ?? order.createdAtIso ?? 0).getTime();
    const longestTime = new Date(longest.readyAt ?? longest.createdAtIso ?? 0).getTime();
    return orderTime < longestTime ? order : longest;
  }, undefined);
  return (
    <>
      <S.Toolbar>
        <ChannelFilter
          value={channel}
          onChange={(value) => {
            setChannel(value);
            setVisibleCount(KITCHEN_LIST_BATCH_SIZE);
          }}
        />
        <RealtimeIndicator status={workspaceState?.realtimeStatus} />
      </S.Toolbar>
      <MetricCards
        items={[
          { label: 'Prontos', value: ready.length, tone: 'green' },
          {
            label: 'Maior espera',
            value: longestReadyOrder ? orderElapsed(longestReadyOrder, now) : '00:00',
            icon: 'clock',
          },
        ]}
      />
      <S.Card>
        <header>
          <div>
            <h2>Aguardando retirada</h2>
            <p>A cozinha finalizou estes pedidos; não é necessário alterar outro status.</p>
          </div>
          <CheckCircle2 />
        </header>
        <S.Stack>
          {ready.slice(0, visibleCount).map((order, index) => (
            <S.PriorityOrder key={order.id}>
              <div className="identity">
                <b>{order.id}</b>
                {index === 0 && <em className="ready-priority">Retirada prioritária</em>}
                <span>
                  {order.channel === 'TABLE' ? order.reference : channelLabel[order.channel]} •
                  pronto há {orderElapsed(order, now)}
                  {order.customer ? ` • ${order.customer}` : ''}
                </span>
              </div>
              <OrderItems order={order} />
              <div className="right">
                <StatusBadge status="PRONTO" />
              </div>
            </S.PriorityOrder>
          ))}
          {!ready.length && <Empty>Nenhum pedido pronto neste canal.</Empty>}
          <KitchenListControls
            visibleCount={Math.min(visibleCount, ready.length)}
            totalCount={ready.length}
            onShowMore={() => setVisibleCount((current) => current + KITCHEN_LIST_BATCH_SIZE)}
            onReset={() => setVisibleCount(KITCHEN_LIST_BATCH_SIZE)}
          />
        </S.Stack>
      </S.Card>
    </>
  );
}

export function KitchenHistoryPage() {
  const { orders } = useWorkspace();
  const now = useKitchenClock();
  const [channel, setChannel] = useState<ChannelFilterValue>('ALL');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(KITCHEN_LIST_BATCH_SIZE);
  const completed = orders
    .filter(
      (order) =>
        (channel === 'ALL' || order.channel === channel) &&
        (order.status === 'ENTREGUE' || order.status === 'CANCELADO') &&
        matchesOrderSearch(order, query),
    )
    .sort(newestCompletedFirst);
  const visibleCompleted = completed.slice(0, visibleCount);

  return (
    <>
      <S.Toolbar>
        <ChannelFilter
          value={channel}
          onChange={(value) => {
            setChannel(value);
            setVisibleCount(KITCHEN_LIST_BATCH_SIZE);
          }}
        />
        <input
          aria-label="Buscar no histórico da cozinha"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleCount(KITCHEN_LIST_BATCH_SIZE);
          }}
          placeholder="Buscar no histórico"
        />
      </S.Toolbar>
      <MetricCards
        items={[
          {
            label: 'Concluídos hoje',
            value: completed.filter(
              (order) => order.status === 'ENTREGUE' && isToday(order.completedAtIso, now),
            ).length,
            tone: 'green',
          },
          {
            label: 'Cancelados',
            value: completed.filter((o) => o.status === 'CANCELADO').length,
          },
          { label: 'Tempo médio', value: averagePreparationTime(completed), icon: 'clock' },
        ]}
      />
      <S.SectionTitle>
        <div>
          <h2>Histórico do turno</h2>
          <p>Pedidos finalizados e cancelados.</p>
        </div>
        <History />
      </S.SectionTitle>
      <S.HistoryTable>
        <div className="row head">
          <span>Pedido</span>
          <span>Canal</span>
          <span>Horário</span>
          <span>Status</span>
          <span>Total</span>
        </div>
        {visibleCompleted.map((order) => (
          <div className="history-order" key={order.id}>
            <div className="row">
              <b>{order.id}</b>
              <span>
                {order.channel === 'TABLE' ? order.reference : channelLabel[order.channel]}
              </span>
              <span>{order.completedAt ?? order.createdAt}</span>
              <span>
                <StatusBadge status={order.status} />
              </span>
              <span>
                {order.total.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
            </div>
            {(order.items.length > 0 || hasOrderPreparationDetails(order)) && (
              <details className="history-details">
                <summary>Ver itens, montagem e observações</summary>
                <OrderItems order={order} />
              </details>
            )}
          </div>
        ))}
        {!completed.length && <Empty>Nenhum pedido encontrado neste canal.</Empty>}
      </S.HistoryTable>
      <KitchenListControls
        visibleCount={Math.min(visibleCount, completed.length)}
        totalCount={completed.length}
        onShowMore={() => setVisibleCount((current) => current + KITCHEN_LIST_BATCH_SIZE)}
        onReset={() => setVisibleCount(KITCHEN_LIST_BATCH_SIZE)}
      />
    </>
  );
}
