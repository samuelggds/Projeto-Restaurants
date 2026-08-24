import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  Bike,
  CheckCircle2,
  Clock3,
  LocateFixed,
  MapPin,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import ordersService from '../../Services/ordersService';
import { connectSocket, disconnectSocket } from '../../Services/socketService';
import { mergeCourierRoutePoints } from '../Courier/domain/courierLocation';
import {
  mergeTrackingLocation,
  normalizeDeliveryTrackingData,
  isDeliveryTrackingTerminalStatus,
  trackingEventMatches,
  type DeliveryTrackingData,
} from './deliveryTracking';

const DeliveryMap = lazy(() => import('../Courier/components/DeliveryMap'));
const TRACKING_POLL_INTERVAL_MS = 12_000;

export default function DeliveryTrackingPage() {
  const { id } = useParams();
  return <DeliveryTrackingContent key={id || 'invalid'} id={id} />;
}

function DeliveryTrackingContent({ id }: { id?: string }) {
  const navigate = useNavigate();
  const orderId = Number(id || 0);
  const hasInvalidOrderId = !Number.isInteger(orderId) || orderId <= 0;
  const [data, setData] = useState<DeliveryTrackingData | null>(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const lastRouteRefreshAt = useRef(0);
  const dataRef = useRef<DeliveryTrackingData | null>(null);

  useEffect(() => {
    if (hasInvalidOrderId) return;

    let active = true;
    let requestSequence = 0;
    let requestInFlight = false;
    const pendingLocations: unknown[] = [];
    const refreshTracking = async (background = false) => {
      if (requestInFlight) return;
      requestInFlight = true;
      const requestId = ++requestSequence;
      if (background) setRefreshing(true);
      else setLoading(true);
      try {
        const normalized = normalizeDeliveryTrackingData(
          await ordersService.getDeliveryTracking(orderId),
        );
        if (!normalized) throw new Error('O servidor retornou dados inválidos de rastreamento.');
        if (!active || requestId !== requestSequence) return;
        const current = dataRef.current;
        const preserved = current
          ? {
              ...normalized,
              order: {
                ...normalized.order,
                ...(isDeliveryTrackingTerminalStatus(current.order.status) &&
                !isDeliveryTrackingTerminalStatus(normalized.order.status)
                  ? { status: current.order.status }
                  : {}),
              },
              locations: mergeCourierRoutePoints(normalized.locations, current.locations),
            }
          : normalized;
        const merged = pendingLocations.reduce<DeliveryTrackingData>(
          (current, point) => mergeTrackingLocation(current, point),
          preserved,
        );
        pendingLocations.length = 0;
        dataRef.current = merged;
        setData(merged);
        setError('');
        setWarning('');
        setLastUpdatedAt(new Date());
        lastRouteRefreshAt.current = Date.now();
      } catch (err) {
        if (!active || requestId !== requestSequence) return;
        const message =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
            ?.error ||
          (err as Error)?.message ||
          'Não foi possível acompanhar esta entrega.';
        if (dataRef.current) setWarning(`${message} Tentaremos atualizar novamente.`);
        else setError(message);
      } finally {
        requestInFlight = false;
        if (active && requestId === requestSequence) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void refreshTracking();

    const token = localStorage.getItem('token');
    if (!token) return () => void (active = false);
    const socket = connectSocket(token, `delivery-tracking-${orderId}`);
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const onLocation = (point: unknown) => {
      if (!trackingEventMatches(point, orderId, dataRef.current?.order.restaurantId)) return;
      if (!dataRef.current) {
        pendingLocations.push(point);
        return;
      }
      const merged = mergeTrackingLocation(dataRef.current, point);
      if (merged === dataRef.current) return;
      dataRef.current = merged;
      setData(merged);
      setLastUpdatedAt(new Date());

      // A rota é recalculada periodicamente, sem chamar o provedor a cada ponto de GPS.
      if (Date.now() - lastRouteRefreshAt.current >= 20_000) void refreshTracking(true);
    };
    const onStatus = (rawOrder: unknown) => {
      const wrapped = rawOrder as { order?: unknown };
      const order = (wrapped?.order || rawOrder) as DeliveryTrackingData['order'];
      if (!trackingEventMatches(order, orderId, dataRef.current?.order.restaurantId)) return;
      if (dataRef.current) {
        const incomingStatus = String(order.status).toUpperCase();
        const status = isDeliveryTrackingTerminalStatus(dataRef.current.order.status)
          ? dataRef.current.order.status
          : incomingStatus;
        const updated = {
          ...dataRef.current,
          order: { ...dataRef.current.order, ...order, status },
        };
        dataRef.current = updated;
        setData(updated);
        setLastUpdatedAt(new Date());
        if (isDeliveryTrackingTerminalStatus(status)) return;
      }
      void refreshTracking(true);
    };
    queueMicrotask(() => {
      if (active) setSocketConnected(Boolean(socket.connected));
    });
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('order:delivery-location', onLocation);
    socket.on('order:status-changed', onStatus);
    const pollTimer = window.setInterval(() => {
      if (!isDeliveryTrackingTerminalStatus(dataRef.current?.order.status)) {
        void refreshTracking(true);
      }
    }, TRACKING_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(pollTimer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('order:delivery-location', onLocation);
      socket.off('order:status-changed', onStatus);
      disconnectSocket();
    };
  }, [hasInvalidOrderId, orderId, retryKey]);

  const latest = data?.locations[data.locations.length - 1];
  const formatTime = (value?: string | null) =>
    value
      ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : null;
  const routeMinutes = data?.order.routeEstimate
    ? Math.max(1, Math.ceil(data.order.routeEstimate.durationSeconds / 60))
    : null;
  const isDelivered = data?.order.status === 'ENTREGUE';
  const isCancelled = data?.order.status === 'CANCELADO';
  const isTerminal = isDelivered || isCancelled;

  return (
    <Page>
      <Header>
        <button type="button" onClick={() => navigate('/profile')}>
          <ArrowLeft /> Voltar
        </button>
        <div>
          <Bike />
          <span>
            <b>Pedido #{data?.order.id || id}</b>
            <small>Acompanhamento da entrega</small>
          </span>
        </div>
      </Header>
      <Main>
        {hasInvalidOrderId ? (
          <State>
            <LocateFixed />
            <h2>Pedido inválido para rastreamento.</h2>
          </State>
        ) : error ? (
          <State>
            <LocateFixed />
            <h2>{error}</h2>
            <RetryButton type="button" onClick={() => setRetryKey((value) => value + 1)}>
              <RefreshCw /> Tentar novamente
            </RetryButton>
          </State>
        ) : loading && !data ? (
          <State>
            <RefreshCw className="spinning" />
            <h2>Carregando rastreamento...</h2>
          </State>
        ) : (
          <>
            <TrackingBar $connected={socketConnected} role="status" aria-live="polite">
              <span>
                <i />
                {isDelivered
                  ? 'Acompanhamento concluído'
                  : isCancelled
                    ? 'Acompanhamento encerrado'
                    : socketConnected
                      ? 'Atualização em tempo real'
                      : 'Reconectando · atualização automática ativa'}
              </span>
              <small>
                {refreshing
                  ? 'Atualizando...'
                  : lastUpdatedAt
                    ? `Atualizado às ${lastUpdatedAt.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}`
                    : 'Aguardando atualização'}
              </small>
            </TrackingBar>
            {warning ? <Warning role="alert">{warning}</Warning> : null}
            {isDelivered ? (
              <DeliveredNotice>
                <CheckCircle2 />
                <span>
                  <strong>Entrega concluída</strong>
                  <small>A última posição foi preservada e o rastreamento foi encerrado.</small>
                </span>
              </DeliveredNotice>
            ) : null}
            {isCancelled ? (
              <CancelledNotice role="status">
                <Ban />
                <span>
                  <strong>Entrega cancelada</strong>
                  <small>O acompanhamento foi encerrado e novas posições não serão exibidas.</small>
                </span>
              </CancelledNotice>
            ) : null}
            <Summary>
              <article>
                <span>Status</span>
                <strong>
                  {data.order.status === 'SAIU_PARA_ENTREGA'
                    ? 'Saiu para entrega'
                    : isDelivered
                      ? 'Entregue'
                      : isCancelled
                        ? 'Cancelado'
                        : data.order.status}
                </strong>
              </article>
              <article>
                <span>Motoqueiro</span>
                <strong>{data.order.assignedCourier?.name || 'Aguardando retirada'}</strong>
              </article>
              <article>
                <span>Saiu para entrega às</span>
                <strong>{formatTime(data.order.deliveryStartedAt) || 'Aguardando saída'}</strong>
              </article>
              <article>
                <span>Previsão de chegada</span>
                <strong>
                  {formatTime(data.order.estimatedArrival) ||
                    (latest ? 'Calculando rota' : 'Aguardando GPS')}
                </strong>
                {routeMinutes && <small>Estimativa de rota: cerca de {routeMinutes} min</small>}
              </article>
            </Summary>
            {data.order.routeEstimate?.destination ? (
              <DestinationNotice>
                <MapPin />
                <span>
                  <small>Destino salvo no pedido</small>
                  <strong>
                    {data.order.routeEstimate.destination.label || 'Endereço de entrega'}
                  </strong>
                </span>
                {data.order.routeEstimate.distanceMeters !== null ? (
                  <b>
                    {(data.order.routeEstimate.distanceMeters / 1000).toLocaleString('pt-BR', {
                      maximumFractionDigits: 1,
                    })}{' '}
                    km
                  </b>
                ) : null}
              </DestinationNotice>
            ) : null}
            {data.order.assignedCourier?.phone && (
              <Contact href={`tel:${data.order.assignedCourier.phone}`}>
                <Phone /> Ligar para o motoqueiro
              </Contact>
            )}
            {data.locations.length ? (
              <Suspense
                fallback={
                  <State>
                    <RefreshCw className="spinning" />
                  </State>
                }
              >
                <DeliveryMap
                  points={data.locations}
                  routePath={isTerminal ? [] : data.order.routeEstimate?.routeCoordinates || []}
                  destination={data.order.routeEstimate?.destination}
                  label={data.order.assignedCourier?.name || 'Motoqueiro'}
                  statusMessage={
                    isDelivered
                      ? 'Seu pedido foi entregue'
                      : isCancelled
                        ? 'Entrega cancelada'
                        : 'Seu pedido está a caminho'
                  }
                  statusDetail={
                    isDelivered
                      ? 'Entrega concluída com sucesso.'
                      : isCancelled
                        ? 'O restaurante encerrou esta entrega.'
                        : 'Acompanhe a localização do motoqueiro em tempo real.'
                  }
                />
              </Suspense>
            ) : (
              <State>
                <Clock3 />
                <h2>Aguardando a primeira posição do motoqueiro</h2>
                <p>O mapa aparecerá automaticamente quando a rota começar.</p>
              </State>
            )}
            <Privacy>
              O mapa usa tiles do OpenStreetMap. A localização é exibida somente para este pedido
              autenticado.
            </Privacy>
          </>
        )}
      </Main>
    </Page>
  );
}

const Page = styled.div`
  min-height: 100dvh;
  background: #fbfaf8;
  color: #17191b;
`;
const Header = styled.header`
  height: 78px;
  background: #fff;
  border-bottom: 1px solid #e5e1dc;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(18px, 5vw, 72px);
  button {
    border: 0;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    color: #475569;
  }
  button svg {
    width: 18px;
  }
  div {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  div > svg {
    color: #d64d08;
  }
  span {
    display: grid;
  }
  small {
    color: #687079;
    margin-top: 3px;
  }
`;
const Main = styled.main`
  width: min(1120px, calc(100% - 32px));
  margin: 28px auto 50px;
`;
const TrackingBar = styled.div<{ $connected: boolean }>`
  margin-bottom: 14px;
  padding: 10px 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid ${(p) => (p.$connected ? '#bbf7d0' : '#fde68a')};
  border-radius: 12px;
  color: ${(p) => (p.$connected ? '#166534' : '#92400e')};
  background: ${(p) => (p.$connected ? '#f0fdf4' : '#fffbeb')};
  span {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 800;
  }
  i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: ${(p) => (p.$connected ? '#22c55e' : '#f59e0b')};
  }
  small {
    color: inherit;
    opacity: 0.78;
  }
  @media (max-width: 560px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;
const Warning = styled.p`
  margin: 0 0 14px;
  padding: 10px 13px;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  color: #9a3412;
  background: #fff7ed;
  font-size: 12px;
`;
const DeliveredNotice = styled.div`
  margin-bottom: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #bbf7d0;
  border-radius: 14px;
  color: #166534;
  background: #f0fdf4;
  > svg {
    width: 28px;
    height: 28px;
  }
  span {
    display: grid;
    gap: 3px;
  }
  small {
    color: #4d7c5a;
  }
`;
const CancelledNotice = styled(DeliveredNotice)`
  border-color: #fecaca;
  color: #991b1b;
  background: #fef2f2;
  small {
    color: #b91c1c;
  }
`;
const Summary = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
  article {
    background: #fff;
    border: 1px solid #e5e1dc;
    border-radius: 14px;
    padding: 18px;
    display: grid;
    gap: 7px;
  }
  span,
  small {
    font-size: 12px;
    color: #687079;
  }
  strong {
    font-size: 16px;
  }
  @media (max-width: 850px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;
const DestinationNotice = styled.div`
  margin-bottom: 16px;
  padding: 13px 15px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 11px;
  border: 1px solid #dbeafe;
  border-radius: 13px;
  color: #1e3a5f;
  background: #eff6ff;
  > svg {
    color: #2563eb;
  }
  span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  small {
    color: #64748b;
  }
  strong {
    overflow-wrap: anywhere;
  }
  b {
    white-space: nowrap;
  }
  @media (max-width: 520px) {
    grid-template-columns: auto 1fr;
    b {
      grid-column: 2;
      justify-self: start;
    }
  }
`;
const State = styled.div`
  min-height: 300px;
  display: grid;
  place-items: center;
  align-content: center;
  text-align: center;
  gap: 12px;
  color: #687079;
  svg {
    width: 34px;
    height: 34px;
    color: #d64d08;
  }
  .spinning {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  h2 {
    font-size: 18px;
    color: #334155;
    margin: 0;
  }
  p {
    margin: 0;
  }
`;
const RetryButton = styled.button`
  min-height: 42px;
  padding: 0 15px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 11px;
  color: white;
  background: #d64d08;
  font-weight: 800;
  cursor: pointer;
  svg {
    width: 17px;
    height: 17px;
    color: currentColor;
  }
`;
const Contact = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #eaf7ee;
  color: #166534;
  text-decoration: none;
  font-weight: 700;
  svg {
    width: 17px;
  }
`;
const Privacy = styled.p`
  font-size: 11px;
  color: #7c858d;
  text-align: center;
  margin-top: 12px;
`;
