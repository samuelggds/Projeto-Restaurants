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
import ordersService from '../../Services/ordersService';
import { acquireSocket } from '../../Services/socketService';
import { getAccessToken } from '../../modules/auth/session/authSession';
import { mergeCourierRoutePoints } from '../Courier/domain/courierLocation';
import DeliveryConfirmationCodePrompt from './DeliveryConfirmationCodePrompt';
import {
  mergeTrackingLocation,
  normalizeDeliveryTrackingData,
  isDeliveryTrackingTerminalStatus,
  trackingEventMatches,
  type DeliveryTrackingData,
} from './deliveryTracking';
import * as S from './DeliveryTracking.styles';

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

    const token = getAccessToken();
    if (!token) return () => void (active = false);
    const { socket, release } = acquireSocket(token, `delivery-tracking-${orderId}`);
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
      release();
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
  const isInDeliveryWithoutLocation =
    data?.order.status === 'SAIU_PARA_ENTREGA' && data.locations.length === 0;
  const activeDeliveryCode =
    data?.order.status === 'SAIU_PARA_ENTREGA' && /^\d{4}$/.test(data.order.deliveryConfirmationCode || '')
      ? data.order.deliveryConfirmationCode
      : null;
  const statusLabel = data
    ? data.order.status === 'SAIU_PARA_ENTREGA'
      ? 'Saiu para entrega'
      : isDelivered
        ? 'Entregue'
        : isCancelled
          ? 'Cancelado'
          : data.order.status
    : '';

  return (
    <S.Page>
      <S.Header>
        <S.HeaderInner>
          <S.BackButton
            type="button"
            aria-label="Voltar para meus pedidos"
            onClick={() => navigate('/profile')}
          >
            <ArrowLeft aria-hidden="true" /> <span>Meus pedidos</span>
          </S.BackButton>
          <S.OrderIdentity>
            <span aria-hidden="true"><Bike /></span>
            <span>
              <b>Pedido #{data?.order.id || id}</b>
              <small>Acompanhamento da entrega</small>
            </span>
          </S.OrderIdentity>
        </S.HeaderInner>
      </S.Header>
      <S.Main>
        {hasInvalidOrderId ? (
          <S.State role="status">
            <LocateFixed aria-hidden="true" />
            <h1>Pedido inválido para rastreamento</h1>
            <p>Volte aos seus pedidos e escolha uma entrega válida para acompanhar.</p>
          </S.State>
        ) : error ? (
          <S.State role="alert">
            <LocateFixed aria-hidden="true" />
            <h2>{error}</h2>
            <p>A conexão pode ter oscilado. Tente carregar o trajeto outra vez.</p>
            <S.RetryButton type="button" onClick={() => setRetryKey((value) => value + 1)}>
              <RefreshCw aria-hidden="true" /> Tentar novamente
            </S.RetryButton>
          </S.State>
        ) : loading && !data ? (
          <S.State role="status" aria-busy="true">
            <RefreshCw className="spinning" aria-hidden="true" />
            <h2>Carregando rastreamento...</h2>
            <p>Buscando a posição mais recente e a previsão de chegada.</p>
          </S.State>
        ) : data ? (
          <>
            <S.HeadingRow>
              <div>
                <S.Eyebrow>
                  {isTerminal
                    ? 'Último status da entrega'
                    : isInDeliveryWithoutLocation
                      ? 'Pedido em deslocamento'
                      : 'Trajeto em tempo real'}
                </S.Eyebrow>
                <h1>
                  {isDelivered
                    ? 'Entrega finalizada'
                    : isCancelled
                      ? 'Acompanhamento finalizado'
                      : isInDeliveryWithoutLocation
                        ? 'Seu pedido está a caminho'
                        : 'Acompanhe o trajeto do pedido'}
                </h1>
                <p>
                  {isInDeliveryWithoutLocation
                    ? 'O motoqueiro já retirou o pedido. A localização em tempo real não está disponível neste momento.'
                    : 'Veja a posição do motoqueiro, o destino e a previsão calculada para esta entrega.'}
                </p>
              </div>
              <S.TrackingBar $connected={socketConnected} role="status" aria-live="polite">
                <span>
                  <i aria-hidden="true" />
                  {isDelivered
                    ? 'Acompanhamento concluído'
                    : isCancelled
                      ? 'Acompanhamento encerrado'
                      : isInDeliveryWithoutLocation
                        ? 'Entrega em andamento'
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
              </S.TrackingBar>
            </S.HeadingRow>
            {warning ? <S.Warning role="alert">{warning}</S.Warning> : null}
            {activeDeliveryCode ? (
              <DeliveryConfirmationCodePrompt
                code={activeDeliveryCode}
                orderId={data.order.id}
                deliveryStartedAt={data.order.deliveryStartedAt}
              />
            ) : null}
            {isDelivered ? (
              <S.CompletionNotice role="status">
                <CheckCircle2 aria-hidden="true" />
                <span>
                  <strong>Entrega concluída</strong>
                  <small>A última posição foi preservada e o rastreamento foi encerrado.</small>
                </span>
              </S.CompletionNotice>
            ) : null}
            {isCancelled ? (
              <S.CancelledNotice role="status">
                <Ban aria-hidden="true" />
                <span>
                  <strong>Entrega cancelada</strong>
                  <small>O acompanhamento foi encerrado e novas posições não serão exibidas.</small>
                </span>
              </S.CancelledNotice>
            ) : null}
            <S.Workspace>
              <S.MapArea aria-label="Mapa da entrega">
                {data.locations.length ? (
                  <Suspense
                    fallback={
                      <S.MapPlaceholder role="status" aria-busy="true">
                        <RefreshCw className="spinning" aria-hidden="true" />
                        <h2>Preparando o mapa...</h2>
                      </S.MapPlaceholder>
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
                  <S.MapPlaceholder role="status">
                    <Clock3 aria-hidden="true" />
                    <h2>
                      {isInDeliveryWithoutLocation
                        ? 'Localização em tempo real indisponível'
                        : 'Aguardando a primeira posição do motoqueiro'}
                    </h2>
                    <p>
                      {isInDeliveryWithoutLocation
                        ? 'Seu pedido continua a caminho normalmente. Se o motoqueiro ativar a localização, o mapa aparecerá automaticamente.'
                        : 'O mapa aparecerá automaticamente quando a rota começar.'}
                    </p>
                  </S.MapPlaceholder>
                )}
              </S.MapArea>

              <S.DetailsPanel aria-labelledby="delivery-details-title">
                <S.PanelHeader>
                  <span>
                    <small id="delivery-details-title">Detalhes da rota</small>
                    <strong>Pedido #{data.order.id}</strong>
                  </span>
                  <S.StatusPill $tone={isDelivered ? 'success' : isCancelled ? 'danger' : 'active'}>
                    {statusLabel}
                  </S.StatusPill>
                </S.PanelHeader>
                <S.Summary>
                  <div>
                    <dt><Bike aria-hidden="true" /> Motoqueiro</dt>
                    <dd>{data.order.assignedCourier?.name || 'Aguardando retirada'}</dd>
                  </div>
                  <div>
                    <dt><Clock3 aria-hidden="true" /> Saiu para entrega às</dt>
                    <dd>{formatTime(data.order.deliveryStartedAt) || 'Aguardando saída'}</dd>
                  </div>
                  <div>
                    <dt><LocateFixed aria-hidden="true" /> Previsão de chegada</dt>
                    <dd>
                      {formatTime(data.order.estimatedArrival) ||
                        (latest
                          ? 'Calculando rota'
                          : isInDeliveryWithoutLocation
                            ? 'Sem localização em tempo real'
                            : 'Aguardando GPS')}
                    </dd>
                    {routeMinutes ? <small>Estimativa de rota: cerca de {routeMinutes} min</small> : null}
                  </div>
                </S.Summary>
                {data.order.routeEstimate?.destination ? (
                  <S.Destination>
                    <MapPin aria-hidden="true" />
                    <span>
                      <small>Destino salvo no pedido</small>
                      <strong>{data.order.routeEstimate.destination.label || 'Endereço de entrega'}</strong>
                    </span>
                    {data.order.routeEstimate.distanceMeters !== null ? (
                      <b>
                        {(data.order.routeEstimate.distanceMeters / 1000).toLocaleString('pt-BR', {
                          maximumFractionDigits: 1,
                        })}{' '}km
                      </b>
                    ) : null}
                  </S.Destination>
                ) : null}
                {data.order.assignedCourier?.phone ? (
                  <S.Contact href={`tel:${data.order.assignedCourier.phone}`}>
                    <Phone aria-hidden="true" /> Ligar para o motoqueiro
                  </S.Contact>
                ) : null}
                <S.Privacy>
                  O mapa usa tiles do OpenStreetMap. A localização é exibida somente para este pedido autenticado.
                </S.Privacy>
              </S.DetailsPanel>
            </S.Workspace>
          </>
        ) : null}
      </S.Main>
    </S.Page>
  );
}
