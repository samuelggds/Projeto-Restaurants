import {
  Bike,
  CheckCircle2,
  ChefHat,
  Clock3,
  History,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Order, OrderChannel, OrderStatus } from '../types';
import { useKitchenWorkspace as useWorkspace } from '../useKitchenWorkspace';
import { Empty, MetricCards, OrderItems, StatusBadge, channelLabel } from '../components/Shared';
import * as S from '../Kitchen.styles';

const activeStatuses: OrderStatus[] = ['PENDENTE', 'PREPARANDO', 'PRONTO'];
const INITIAL_KITCHEN_TIME = Date.now();

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
  const seconds = Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / 1000));
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

export function KitchenOverviewPage({ onOpenOrder }: { onOpenOrder?: (orderId: string) => void }) {
  const { orders } = useWorkspace();
  const now = useKitchenClock();
  const active = orders.filter((o) => activeStatuses.includes(o.status));
  const urgent = active
    .filter((o) => o.status !== 'PRONTO')
    .sort(
      (a, b) => new Date(a.createdAtIso ?? 0).getTime() - new Date(b.createdAtIso ?? 0).getTime(),
    )
    .slice(0, 4);
  return (
    <>
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
                as="button"
                type="button"
                onClick={() => onOpenOrder?.(order.id)}
                aria-label={`Abrir ${order.id} na fila de pedidos`}
              >
                <div className="identity">
                  <b>{order.id}</b>
                  <span>
                    {order.channel === 'TABLE' ? order.reference : channelLabel[order.channel]} •
                    aguardando há {orderElapsed(order, now)}
                  </span>
                </div>
                <OrderItems order={order} />
                <div className="right">
                  <StatusBadge status={order.status} />
                </div>
              </S.PriorityOrder>
            ))}
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
  value: OrderChannel;
  onChange: (channel: OrderChannel) => void;
}) {
  return (
    <S.ChannelButtons>
      {(
        [
          ['TABLE', 'Mesa', UtensilsCrossed],
          ['PICKUP', 'Retirada', ShoppingBag],
          ['DELIVERY', 'Delivery', Bike],
        ] as const
      ).map(([id, label, Icon]) => (
        <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>
          <Icon />
          {label}
        </button>
      ))}
    </S.ChannelButtons>
  );
}

function KitchenCard({
  order,
  highlighted = false,
  now,
}: {
  order: Order;
  highlighted?: boolean;
  now: number;
}) {
  const { role, updateOrderStatus } = useWorkspace();
  const next =
    order.status === 'PENDENTE' ? 'PREPARANDO' : order.status === 'PREPARANDO' ? 'PRONTO' : null;
  return (
    <S.KitchenOrder
      id={`kitchen-order-${order.id.replace(/^#/, '')}`}
      data-order-id={order.id}
      className={highlighted ? 'highlighted' : undefined}
    >
      <div className="head">
        <span className="identity">
          <b>{order.id}</b>
          <small>
            {order.channel === 'TABLE' ? order.reference : channelLabel[order.channel]}
            {order.customer ? ` • ${order.customer}` : ''}
          </small>
        </span>
        <StatusBadge status={order.status} />
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
      {next && role === 'KITCHEN' && (
        <button
          className={`action ${order.status === 'PENDENTE' ? 'pending' : 'preparing'}`}
          onClick={() => updateOrderStatus(order.id, next)}
        >
          {order.status === 'PENDENTE' ? 'Iniciar preparo' : 'Marcar como pronto'}
        </button>
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
  const { orders } = useWorkspace();
  const now = useKitchenClock();
  const focusedOrder = focusedOrderId
    ? orders.find((order) => order.id === focusedOrderId)
    : undefined;
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState<OrderChannel>(focusedOrder?.channel ?? 'TABLE');
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(
    focusedOrder?.id ?? null,
  );

  useEffect(() => {
    if (!focusedOrderId) return;
    const targetOrder = orders.find((order) => order.id === focusedOrderId);
    if (!targetOrder) {
      onFocusComplete?.();
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-order-id="${focusedOrderId}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    const timer = window.setTimeout(() => {
      setHighlightedOrderId(null);
      onFocusComplete?.();
    }, 2600);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [focusedOrderId, onFocusComplete, orders]);
  const visible = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.channel === channel &&
          activeStatuses.includes(o.status) &&
          (status === 'ALL' || o.status === status) &&
          `${o.id} ${o.reference} ${o.customer ?? ''} ${o.items.join(' ')}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [orders, channel, status, query],
  );
  return (
    <>
      <S.Toolbar>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar pedido ou mesa"
        />
        <ChannelFilter
          value={channel}
          onChange={(value) => {
            setChannel(value);
            setStatus('ALL');
          }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | 'ALL')}>
          <option value="ALL">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="PREPARANDO">Preparando</option>
          <option value="PRONTO">Pronto</option>
        </select>
        <button className="live">Atualização em tempo real</button>
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
          { label: 'Tempo médio', value: averagePreparationTime(orders), icon: 'clock' },
        ]}
      />
      <S.StatusColumns>
        {activeStatuses
          .filter((item) => status === 'ALL' || item === status)
          .map((item) => (
            <S.StatusColumn key={item}>
              <header>
                <span className="dot" />
                <b>{item}</b>
                <span>{visible.filter((o) => o.status === item).length}</span>
              </header>
              {visible
                .filter((o) => o.status === item)
                .map((order) => (
                  <KitchenCard
                    key={order.id}
                    order={order}
                    highlighted={highlightedOrderId === order.id}
                    now={now}
                  />
                ))}
              {!visible.some((o) => o.status === item) && (
                <Empty>Nenhum pedido neste status.</Empty>
              )}
            </S.StatusColumn>
          ))}
      </S.StatusColumns>
    </>
  );
}

export function KitchenReadyPage() {
  const { orders } = useWorkspace();
  const now = useKitchenClock();
  const [channel, setChannel] = useState<OrderChannel>('TABLE');
  const ready = orders.filter((o) => o.status === 'PRONTO' && o.channel === channel);
  const longestReadyOrder = ready.reduce<Order | undefined>((longest, order) => {
    if (!longest) return order;
    const orderTime = new Date(order.readyAt ?? order.createdAtIso ?? 0).getTime();
    const longestTime = new Date(longest.readyAt ?? longest.createdAtIso ?? 0).getTime();
    return orderTime < longestTime ? order : longest;
  }, undefined);
  return (
    <>
      <S.Toolbar>
        <ChannelFilter value={channel} onChange={setChannel} />
        <button className="live">Atualização em tempo real</button>
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
          {ready.map((order) => (
            <S.PriorityOrder key={order.id}>
              <div className="identity">
                <b>{order.id}</b>
                <span>
                  {order.channel === 'TABLE' ? order.reference : channelLabel[order.channel]} •
                  pronto há {orderElapsed(order, now)}
                </span>
              </div>
              <OrderItems order={order} />
              <div className="right">
                <StatusBadge status="PRONTO" />
              </div>
            </S.PriorityOrder>
          ))}
          {!ready.length && <Empty>Nenhum pedido pronto neste canal.</Empty>}
        </S.Stack>
      </S.Card>
    </>
  );
}

export function KitchenHistoryPage() {
  const { orders } = useWorkspace();
  const [channel, setChannel] = useState<OrderChannel>('TABLE');
  const completed = orders.filter(
    (o) => o.channel === channel && (o.status === 'ENTREGUE' || o.status === 'CANCELADO'),
  );
  return (
    <>
      <S.Toolbar>
        <ChannelFilter value={channel} onChange={setChannel} />
        <input placeholder="Buscar no histórico" />
      </S.Toolbar>
      <MetricCards
        items={[
          {
            label: 'Concluídos hoje',
            value: completed.filter((o) => o.status === 'ENTREGUE').length,
            tone: 'green',
          },
          {
            label: 'Cancelados',
            value: completed.filter((o) => o.status === 'CANCELADO').length,
          },
          { label: 'Tempo médio', value: '18 min', icon: 'clock' },
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
        {completed.map((order) => (
          <div className="row" key={order.id}>
            <b>{order.id}</b>
            <span>{order.channel === 'TABLE' ? order.reference : channelLabel[order.channel]}</span>
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
        ))}
        {!completed.length && <Empty>Nenhum pedido encontrado neste canal.</Empty>}
      </S.HistoryTable>
    </>
  );
}
