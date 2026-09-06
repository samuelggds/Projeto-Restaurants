import { CheckCircle2, Gauge } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Order, OrderStatus } from '../types';
import { useKitchenWorkspace } from '../useKitchenWorkspace';
import {
  Empty,
  MetricCards,
  OrderItems,
  StatusBadge,
  channelLabel,
  hasOrderPreparationDetails,
} from '../components/Shared';
import * as S from '../Kitchen.styles';
import * as O from './KitchenOverview.styles';

type ActiveOrderStatus = Extract<OrderStatus, 'PENDENTE' | 'PREPARANDO' | 'PRONTO'>;
const activeStatuses: ActiveOrderStatus[] = ['PENDENTE', 'PREPARANDO', 'PRONTO'];
const INITIAL_KITCHEN_TIME = Date.now();

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

function timestamp(value: string | undefined, fallback: number) {
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stageTimestamp(order: Order) {
  if (order.status === 'PREPARANDO') {
    return timestamp(order.preparationStartedAt ?? order.createdAtIso, Number.MAX_SAFE_INTEGER);
  }

  if (order.status === 'PRONTO') {
    return timestamp(
      order.readyAt ?? order.preparationStartedAt ?? order.createdAtIso,
      Number.MAX_SAFE_INTEGER,
    );
  }

  return timestamp(order.createdAtIso, Number.MAX_SAFE_INTEGER);
}

function oldestStageFirst(a: Order, b: Order) {
  return stageTimestamp(a) - stageTimestamp(b);
}

function elapsedFrom(value: string | undefined, now: number) {
  if (!value) return '00:00';
  const parsed = new Date(value).getTime();
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

function capacityState(activeCount: number, maxConcurrentOrders: number) {
  const safeMax = Math.max(1, maxConcurrentOrders);
  const percent = Math.min(100, Math.round((activeCount / safeMax) * 100));

  if (activeCount >= safeMax) {
    return {
      percent,
      tone: 'critical' as const,
      label: 'Capacidade máxima',
      detail: 'Novos pedidos pausados até uma vaga ser liberada.',
    };
  }

  if (percent >= 90) {
    return {
      percent,
      tone: 'critical' as const,
      label: 'Próxima do limite',
      detail: 'A cozinha está quase cheia. Priorize os pedidos mais antigos.',
    };
  }

  if (percent >= 70) {
    return {
      percent,
      tone: 'high' as const,
      label: 'Movimento alto',
      detail: 'Acompanhe a fila para evitar acúmulo de pedidos.',
    };
  }

  return {
    percent,
    tone: 'normal' as const,
    label: 'Operação normal',
    detail: 'A cozinha está recebendo pedidos dentro da capacidade configurada.',
  };
}

function stageCopy(order: Order) {
  if (order.status === 'PRONTO') return 'pronto há';
  if (order.status === 'PREPARANDO') return 'em preparo há';
  return 'aguardando há';
}

export function KitchenOverviewPage({ onOpenOrder }: { onOpenOrder?: (orderId: string) => void }) {
  const { orders, restaurant } = useKitchenWorkspace();
  const now = useKitchenClock();
  const active = orders.filter((order) => isActiveOrderStatus(order.status));
  const maxConcurrentOrders = restaurant.maxConcurrentOrders ?? 20;
  const capacity = capacityState(active.length, maxConcurrentOrders);
  const pendingCount = active.filter((order) => order.status === 'PENDENTE').length;
  const preparingCount = active.filter((order) => order.status === 'PREPARANDO').length;
  const readyCount = active.filter((order) => order.status === 'PRONTO').length;
  const previewOrders = [...active].sort(oldestStageFirst).slice(0, 4);

  return (
    <>
      <O.CapacityCard $tone={capacity.tone}>
        <span className="capacity-icon" aria-hidden="true">
          <Gauge />
        </span>
        <div className="capacity-content">
          <div className="capacity-heading">
            <span>
              <small>Capacidade da cozinha</small>
              <b>{capacity.label}</b>
            </span>
            <span className="capacity-percent">{capacity.percent}%</span>
          </div>
          <div
            className="capacity-track"
            role="progressbar"
            aria-label="Capacidade da cozinha"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={capacity.percent}
          >
            <i style={{ width: `${capacity.percent}%` }} />
          </div>
          <div className="capacity-detail">
            <strong>
              {active.length} de {maxConcurrentOrders} pedidos simultâneos
            </strong>
            <span>•</span>
            <em>{capacity.detail}</em>
          </div>
        </div>
      </O.CapacityCard>

      <MetricCards
        items={[
          { label: 'Ativos', value: active.length },
          { label: 'Pendentes', value: pendingCount, icon: 'clock' },
          { label: 'Preparando', value: preparingCount, icon: 'chef' },
        ]}
      />

      <O.QueueSection>
        <O.QueueHeader>
          <div>
            <h2>Fila de pedidos</h2>
            <p>Os pedidos mais antigos aparecem primeiro para facilitar a prioridade da cozinha.</p>
          </div>
          <span className="ready-count">
            <CheckCircle2 /> {readyCount} prontos
          </span>
        </O.QueueHeader>

        <S.Stack>
          {previewOrders.map((order) => (
            <S.PriorityOrder
              key={order.id}
              className="overview-order"
              role={onOpenOrder ? 'button' : undefined}
              tabIndex={onOpenOrder ? 0 : undefined}
              onClick={() => onOpenOrder?.(order.id)}
              onKeyDown={(event) => {
                if (!onOpenOrder || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                onOpenOrder(order.id);
              }}
              aria-label={onOpenOrder ? `Abrir ${order.id} na fila de pedidos` : undefined}
            >
              <div className="identity">
                <b>{order.id}</b>
                <span>
                  {order.channel === 'TABLE' ? order.reference : channelLabel[order.channel]} •{' '}
                  {stageCopy(order)} {orderElapsed(order, now)}
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
          {!previewOrders.length && <Empty>Nenhum pedido ativo no momento.</Empty>}
        </S.Stack>

        <O.QueueHint>
          Clique em um pedido para abrir a fila completa, conferir os itens e atualizar o status.
        </O.QueueHint>
      </O.QueueSection>
    </>
  );
}
