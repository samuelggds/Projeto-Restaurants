import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  Bike,
  CheckCircle2,
  CircleDot,
  Clock3,
  LocateFixed,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ordersService, {
  getGuestOrderOwnershipToken,
  getGuestOrderTrackingToken,
} from '../../Services/ordersService';
import { acquireSocket, connectGuestOrdersSocket } from '../../Services/socketService';
import { getAccessToken } from '../../modules/auth/session/authSession';
import { mergeCourierRoutePoints } from '../Courier/domain/courierLocation';
import { CustomerTrackingChatPanel } from './CustomerTrackingChatPanel';
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

function formatCourierPhone(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return String(value || '').trim();
}

export default function DeliveryTrackingPage() {
  const { id } = useParams();
  return <DeliveryTrackingContent key={id || 'invalid'} id={id} />;
}

function DeliveryTrackingContent({ id }: { id?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const orderId = Number(id || 0);
  const hasInvalidOrderId = !Number.isInteger(orderId) || orderId <= 0;
  const [data, setData] = useState<DeliveryTrackingData | null>(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const lastRouteRefreshAt = useRef(0);
  const dataRef = useRef<DeliveryTrackingData | null>(null);
  const isGuestTracking = Boolean(orderId && getGuestOrderTrackingToken(orderId));
  const confirmationLink = new URLSearchParams(location.search).get('confirm') === '1';

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
      if (!background) setLoading(true);
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
        }
      }
    };

    void refreshTracking();
    const pollTimer = window.setInterval(() => {
      if (!isDeliveryTrackingTerminalStatus(dataRef.current?.order.status)) {
        void refreshTracking(true);
      }
    }, TRACKING_POLL_INTERVAL_MS);

    const token = getAccessToken();
    const guestProof = !token ? getGuestOrderOwnershipToken(orderId) : '';
    const userLease = token ? acquireSocket(token, `delivery-tracking-${orderId}`) : null;
    const guestSocket =
      !token && guestProof
        ? connectGuestOrdersSocket(
            [{ orderId, token: guestProof }],
            `delivery-tracking-guest-${orderId}`,
          )
        : null;
    const socket = userLease?.socket || guestSocket;

    if (!socket) {
      return () => {
        active = false;
        window.clearInterval(pollTimer);
      };
    }
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
        if (isDeliveryTrackingTerminalStatus(status)) return;
      }
      void refreshTracking(true);
    };
    socket.on('order:delivery-location', onLocation);
    socket.on('order:status-changed', onStatus);

    return () => {
      active = false;
      window.clearInterval(pollTimer);
      socket.off('order:delivery-location', onLocation);
      socket.off('order:status-changed', onStatus);
      userLease?.release();
      guestSocket?.disconnect();
    };
  }, [hasInvalidOrderId, orderId, retryKey]);

  const routeMinutes = (() => {
    const routeSeconds = Number(data?.order.routeEstimate?.durationSeconds || 0);
    if (routeSeconds > 0) return Math.max(1, Math.ceil(routeSeconds / 60));

    const estimatedArrivalMs = Date.parse(String(data?.order.estimatedArrival || ''));
    if (Number.isFinite(estimatedArrivalMs)) {
      const remainingMs = estimatedArrivalMs - Date.now();
      if (remainingMs > 0) return Math.max(1, Math.ceil(remainingMs / 60_000));
    }

    return null;
  })();
  const isDelivered = data?.order.status === 'ENTREGUE';
  const isCancelled = data?.order.status === 'CANCELADO';
  const receiptConfirmed = Boolean(data?.order.deliveryConfirmedAt);
  const canConfirmReceipt =
    isDelivered && data?.order.canConfirmDeliveryReceipt === true && !receiptConfirmed;
  const isTerminal = isDelivered || isCancelled;
  const isInDeliveryWithoutLocation =
    data?.order.status === 'SAIU_PARA_ENTREGA' && data.locations.length === 0;
  const activeDeliveryCode =
    data?.order.status === 'SAIU_PARA_ENTREGA' && /^\d{4}$/.test(data.order.deliveryConfirmationCode || '')
      ? data.order.deliveryConfirmationCode
      : null;
  const deliveryStatusProgress = receiptConfirmed
    ? 4
    : data?.order.status === 'ENTREGUE'
      ? 3
      : data?.order.status === 'SAIU_PARA_ENTREGA'
        ? 2
        : data?.order.status === 'PREPARANDO' || data?.order.status === 'PRONTO'
          ? 1
          : data?.order.status === 'PENDENTE'
            ? 0
            : -1;
  const deliveryStatusSteps = [
    'Pedido recebido',
    'Em preparação na cozinha',
    'Saiu para entrega',
    'Chegou ao endereço',
  ] as const;
  const confirmReceipt = async () => {
    if (!canConfirmReceipt || confirmingReceipt) return;
    setReceiptError('');
    setConfirmingReceipt(true);
    try {
      const confirmedOrder = (await ordersService.confirmDeliveryReceived(orderId)) as {
        deliveryConfirmedAt?: string | null;
      };
      const confirmedAt =
        String(confirmedOrder?.deliveryConfirmedAt || '').trim() || new Date().toISOString();
      if (dataRef.current) {
        const updated = {
          ...dataRef.current,
          order: {
            ...dataRef.current.order,
            deliveryConfirmedAt: confirmedAt,
            canConfirmDeliveryReceipt: false,
          },
        };
        dataRef.current = updated;
        setData(updated);
      }
      navigate(`/orders/${orderId}/delivered`, { replace: true });
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (err as Error)?.message ||
        'Não foi possível confirmar o recebimento. Tente novamente.';
      setReceiptError(message);
    } finally {
      setConfirmingReceipt(false);
    }
  };

  return (
    <S.Page>
      <S.Header>
        <S.HeaderInner>
          <S.BackButton
            type="button"
            aria-label={isGuestTracking ? 'Voltar ao cardápio' : 'Voltar para meus pedidos'}
            onClick={() => (isGuestTracking ? navigate(-1) : navigate('/profile'))}
          >
            <ArrowLeft aria-hidden="true" />
            <span>Início</span>
          </S.BackButton>

          <S.DesktopRestaurantBrand>
            <span className="brand-mark">
              {data?.order.restaurant?.logo ? (
                <img src={data.order.restaurant.logo} alt="" />
              ) : (
                String(data?.order.restaurant?.name || 'G').slice(0, 1).toUpperCase()
              )}
            </span>
            <span>
              <strong>{data?.order.restaurant?.name || 'Restaurante'}</strong>
              <small><i aria-hidden="true" /> Acompanhe seu pedido</small>
            </span>
          </S.DesktopRestaurantBrand>

          <S.MobileHeaderTitle>Acompanhar pedido</S.MobileHeaderTitle>

          <S.DesktopHeaderOrder>
            <strong>Pedido #{data?.order.id || id}</strong>
          </S.DesktopHeaderOrder>
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
            {warning ? <S.Warning role="alert">{warning}</S.Warning> : null}
            {activeDeliveryCode ? (
              <DeliveryConfirmationCodePrompt
                code={activeDeliveryCode}
                orderId={data.order.id}
                deliveryStartedAt={data.order.deliveryStartedAt}
              />
            ) : null}
            {isDelivered ? (
              <>
                <S.CompletionNotice role="status">
                  <CheckCircle2 aria-hidden="true" />
                  <span>
                    <strong>Entrega concluída</strong>
                    <small>
                      {receiptConfirmed
                        ? 'O cliente confirmou o recebimento deste pedido.'
                        : 'A última posição foi preservada e o rastreamento foi encerrado.'}
                    </small>
                  </span>
                </S.CompletionNotice>
                {canConfirmReceipt ? (
                  <S.ReceiptConfirmation
                    $highlight={confirmationLink}
                    aria-labelledby="receipt-confirmation-title"
                  >
                    <span className="receipt-icon" aria-hidden="true"><CheckCircle2 /></span>
                    <div>
                      <small>{confirmationLink ? 'Confirmação solicitada pelo WhatsApp' : 'Última etapa'}</small>
                      <strong id="receipt-confirmation-title">Você recebeu seu pedido?</strong>
                      <p>Confirme somente quando o pedido estiver com você. O restaurante será avisado imediatamente.</p>
                      <button type="button" onClick={() => void confirmReceipt()} disabled={confirmingReceipt}>
                        <CheckCircle2 aria-hidden="true" />
                        {confirmingReceipt ? 'Confirmando recebimento...' : 'Confirmar recebimento'}
                      </button>
                      {receiptError ? <em role="alert">{receiptError}</em> : null}
                    </div>
                  </S.ReceiptConfirmation>
                ) : receiptConfirmed ? (
                  <S.ReceiptConfirmed role="status">
                    <CheckCircle2 aria-hidden="true" />
                    <span><strong>Recebimento confirmado</strong><small>Obrigado! O restaurante já recebeu sua confirmação.</small></span>
                  </S.ReceiptConfirmed>
                ) : null}
              </>
            ) : null}
            {isCancelled ? (
              <S.CancelledNotice role="status">
                <Ban aria-hidden="true" />
                <span><strong>Entrega cancelada</strong><small>O acompanhamento foi encerrado e novas posições não serão exibidas.</small></span>
              </S.CancelledNotice>
            ) : null}

            <S.FigmaTrackingLayout>
              <S.TrackingMapColumn>
                <S.DesktopTrackingTitle>Acompanhe seu Pedido</S.DesktopTrackingTitle>
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
                        etaMinutes={routeMinutes}
                        distanceMeters={data.order.routeEstimate?.distanceMeters ?? null}
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
                          : 'Aguardando a primeira posição do motoboy'}
                      </h2>
                      <p>
                        {isInDeliveryWithoutLocation
                          ? 'Seu pedido continua a caminho. Se o motoboy ativar a localização, o mapa aparecerá automaticamente.'
                          : 'O mapa aparecerá automaticamente quando a rota começar.'}
                      </p>
                    </S.MapPlaceholder>
                  )}
                </S.MapArea>
              </S.TrackingMapColumn>

              <S.TrackingSideColumn>
                <S.DesktopStatusCard aria-label="Status da Entrega">
                  <h2>Status da Entrega</h2>
                  <S.DeliveryStatusList>
                    {deliveryStatusSteps.slice(0, 3).map((label, index) => {
                      const complete = deliveryStatusProgress > index;
                      const active = deliveryStatusProgress === index;
                      const displayLabel =
                        index === 2 && active ? 'Saiu para entrega (Rota)' : label;
                      return (
                        <S.DeliveryStatusItem
                          key={label}
                          $active={active}
                          $complete={complete}
                          aria-current={active ? 'step' : undefined}
                        >
                          {complete ? <CheckCircle2 aria-hidden="true" /> : <CircleDot aria-hidden="true" />}
                          <span>{displayLabel}</span>
                        </S.DeliveryStatusItem>
                      );
                    })}
                  </S.DeliveryStatusList>
                </S.DesktopStatusCard>


              </S.TrackingSideColumn>

              <S.CourierSlot>
                <S.CourierCard>
                  <S.CourierAvatar>
                    {data.order.assignedCourier?.avatar ? (
                      <img
                        src={data.order.assignedCourier.avatar}
                        alt=""
                      />
                    ) : (
                      <Bike aria-hidden="true" />
                    )}
                  </S.CourierAvatar>
                  <span>
                    <strong>{data.order.assignedCourier?.name || 'Aguardando motoboy'}</strong>
                    {data.order.assignedCourier?.phone ? (
                      <a
                        className="courier-phone"
                        href={`tel:${data.order.assignedCourier.phone}`}
                      >
                        {formatCourierPhone(data.order.assignedCourier.phone)}
                      </a>
                    ) : (
                      <small className="courier-waiting">Telefone ainda não disponível</small>
                    )}
                  </span>
                  {data.order.assignedCourier?.phone ? (
                    <a
                      className="call"
                      href={`tel:${data.order.assignedCourier.phone}`}
                      aria-label={`Ligar para ${data.order.assignedCourier.name || 'o motoboy'}`}
                    >
                      <Phone aria-hidden="true" />
                    </a>
                  ) : null}
                </S.CourierCard>
              </S.CourierSlot>

              <S.MobileTrackingDetails>
                <S.MobileStatusList aria-label="Status da Entrega">
                  {['Pedido recebido', 'Preparando', 'Saiu para entrega (A caminho)', 'Entregue'].map((label, index) => {
                    const complete = deliveryStatusProgress > index;
                    const active = deliveryStatusProgress === index;
                    return (
                      <S.MobileStatusItem key={label} $active={active} $complete={complete}>
                        <i aria-hidden="true" />
                        <span>{label}</span>
                      </S.MobileStatusItem>
                    );
                  })}
                </S.MobileStatusList>
              </S.MobileTrackingDetails>

              {!isCancelled && data.order.assignedCourier ? (
                <S.TrackingChatSlot>
                  <CustomerTrackingChatPanel
                    orderId={data.order.id}
                    courierName={data.order.assignedCourier.name || 'Motoqueiro'}
                  />
                </S.TrackingChatSlot>
              ) : null}
            </S.FigmaTrackingLayout>
          </>
        ) : null}
      </S.Main>
    </S.Page>
  );
}