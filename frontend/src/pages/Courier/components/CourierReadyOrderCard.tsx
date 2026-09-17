import { useState } from 'react';
import { Bike, CheckCircle2, MapPin, PackageCheck, User } from 'lucide-react';
import styled from 'styled-components';
import CourierLocationChoiceModal from './CourierLocationChoiceModal';
import type { CourierOrder } from '../domain/courierOrders';
import { getAssignedCourierId } from '../domain/courierOrders';

type Props = {
  order: CourierOrder;
  accountId: number;
  activeRouteOrderId: number | null;
  onClaim: (orderId: number) => Promise<void>;
  onStartRoute: (orderId: number, options: { shareLocation: boolean }) => Promise<void>;
};

type Choice = 'location' | 'without-location' | null;

function customerName(order: CourierOrder) {
  return String((order.user as { name?: string } | undefined)?.name || 'Cliente');
}

function address(order: CourierOrder) {
  return [order.address, order.number, order.district, order.city].filter(Boolean).join(', ') || 'Endereço não informado';
}

export function CourierReadyOrderCard({ order, accountId, activeRouteOrderId, onClaim, onStartRoute }: Props) {
  const orderId = Number(order.id || 0);
  const assignedToMe = getAssignedCourierId(order) === accountId;
  const anotherRouteActive = Boolean(activeRouteOrderId && activeRouteOrderId !== orderId);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [choice, setChoice] = useState<Choice>(null);
  const [error, setError] = useState('');

  async function claim() {
    setLoading(true);
    setError('');
    try {
      await onClaim(orderId);
    } catch (cause) {
      setError((cause as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || (cause as Error)?.message || 'Não foi possível pegar este pedido.');
    } finally {
      setLoading(false);
    }
  }

  async function startRoute(shareLocation: boolean) {
    setLoading(true);
    setChoice(shareLocation ? 'location' : 'without-location');
    setError('');
    try {
      await onStartRoute(orderId, { shareLocation });
      setModalOpen(false);
    } catch (cause) {
      setError((cause as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || (cause as Error)?.message || 'Não foi possível iniciar a rota.');
    } finally {
      setLoading(false);
      setChoice(null);
    }
  }

  return (
    <>
      <Card>
        <Header>
          <span><PackageCheck /> Pedido #{orderId}</span>
          <Badge $assigned={assignedToMe}>{assignedToMe ? 'Atribuído a você' : 'Disponível'}</Badge>
        </Header>
        <InfoGrid>
          <div><User /><small>Cliente</small><strong>{customerName(order)}</strong></div>
          <div><MapPin /><small>Entrega</small><strong>{address(order)}</strong></div>
        </InfoGrid>
        {Number.isFinite(Number(order.deliveryDistanceMeters)) && Number(order.deliveryDistanceMeters) > 0 ? (
          <Meta>{(Number(order.deliveryDistanceMeters) / 1000).toFixed(1)} km estimados</Meta>
        ) : null}
        {error ? <Error role="alert">{error}</Error> : null}
        {!assignedToMe ? (
          <Primary type="button" onClick={() => void claim()} disabled={loading}>
            <PackageCheck /> {loading ? 'Pegando pedido...' : 'Pegar pedido'}
          </Primary>
        ) : (
          <>
            {anotherRouteActive ? (
              <Hint><CheckCircle2 /> Finalize a entrega #{activeRouteOrderId} para iniciar esta rota.</Hint>
            ) : null}
            <Primary type="button" onClick={() => setModalOpen(true)} disabled={loading || anotherRouteActive}>
              <Bike /> Iniciar rota
            </Primary>
          </>
        )}
      </Card>
      <CourierLocationChoiceModal
        open={modalOpen && assignedToMe && !anotherRouteActive}
        orderId={orderId}
        loading={loading}
        activeChoice={choice}
        error={error}
        onClose={() => !loading && setModalOpen(false)}
        onUseLocation={() => void startRoute(true)}
        onContinueWithoutLocation={() => void startRoute(false)}
      />
    </>
  );
}

const Card = styled.article`
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--courier-line);
  border-radius: 8px;
  background: #fff;
`;
const Header = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  > span { display: flex; align-items: center; gap: 7px; font-weight: 800; color: var(--courier-ink); }
  svg { width: 18px; }
`;
const Badge = styled.span<{ $assigned: boolean }>`
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  color: ${(p) => (p.$assigned ? '#176b52' : '#8a6418')};
  background: ${(p) => (p.$assigned ? '#edf8f1' : '#fff8e8')};
`;
const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 8px;
  > div { min-width: 0; padding: 10px; border: 1px solid var(--courier-line); border-radius: 7px; background: #fbfaf8; display: grid; grid-template-columns: 20px 1fr; gap: 2px 7px; }
  svg { grid-row: 1 / span 2; width: 17px; color: var(--courier-primary); }
  small { color: var(--courier-muted); font-size: 9px; text-transform: uppercase; }
  strong { overflow-wrap: anywhere; font-size: 12px; }
  @media (max-width: 520px) { grid-template-columns: 1fr; }
`;
const Meta = styled.small`color: var(--courier-muted); font-weight: 700;`;
const Primary = styled.button`
  min-height: 48px;
  border: 0;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  background: var(--courier-primary);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  &:disabled { cursor: not-allowed; opacity: 0.5; }
  svg { width: 18px; }
`;
const Hint = styled.p`
  margin: 0;
  padding: 9px 10px;
  border-radius: 7px;
  display: flex;
  gap: 7px;
  align-items: center;
  color: #7b5c1a;
  background: #fff8e8;
  font-size: 11px;
  svg { width: 16px; flex: 0 0 auto; }
`;
const Error = styled.p`
  margin: 0;
  padding: 9px 10px;
  border-radius: 7px;
  color: #9d352e;
  background: #fff5f4;
  font-size: 11px;
`;
