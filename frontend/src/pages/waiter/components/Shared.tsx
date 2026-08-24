/* eslint-disable react-refresh/only-export-components */
import { BellRing, CheckCircle2, ChefHat, Clock3, ShoppingBag, Users } from 'lucide-react';
import type { Order, OrderStatus } from '../types';
import * as S from '../Waiter.styles';

export const statusLabel: Record<OrderStatus, string> = {
  PENDENTE: 'Pendente',
  PREPARANDO: 'Preparando',
  PRONTO: 'Pronto',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};
export const channelLabel = {
  TABLE: 'Mesa',
  PICKUP: 'Retirada',
  DELIVERY: 'Delivery',
} as const;
export const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function MetricCards({
  items,
}: {
  items: {
    label: string;
    value: string | number;
    tone?: 'green';
    icon?: 'orders' | 'chef' | 'tables' | 'calls' | 'clock';
  }[];
}) {
  const icons = {
    orders: <ShoppingBag />,
    chef: <ChefHat />,
    tables: <Users />,
    calls: <BellRing />,
    clock: <Clock3 />,
  };
  return (
    <S.Metrics>
      {items.map((item) => (
        <S.Metric key={item.label} $tone={item.tone}>
          <i>{icons[item.icon ?? 'orders']}</i>
          <span>
            <small>{item.label}</small>
            <b>{item.value}</b>
          </span>
        </S.Metric>
      ))}
    </S.Metrics>
  );
}
export function StatusBadge({ status }: { status: OrderStatus }) {
  return <S.Status $status={status}>{statusLabel[status]}</S.Status>;
}
export function OrderItems({ order }: { order: Order }) {
  return (
    <S.ItemList>
      {order.items.map((item, index) => (
        <span key={`${item}-${index}`}>{item}</span>
      ))}
      {order.observation && <em>⚠ {order.observation}</em>}
    </S.ItemList>
  );
}
export function Empty({ children }: { children: string }) {
  return (
    <S.Empty>
      <CheckCircle2 />
      <b>{children}</b>
    </S.Empty>
  );
}
