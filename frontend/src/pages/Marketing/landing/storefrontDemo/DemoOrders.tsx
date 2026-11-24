import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Navigation,
  Pause,
  Play,
  ReceiptText,
  RotateCcw,
  Store,
} from 'lucide-react';
import { GuestOrderHistory, GuestOrderMobileHeader } from '../../../orders/GuestOrderHistory';
import { GuestOrdersFrame } from '../../../orders/GuestOrderHistory.styles';
import { toGuestOrderCard } from '../../../orders/guestOrderCard';
import * as Tracking from '../../../tracking/DeliveryTracking.styles';
import * as MapView from '../../../tracking/CustomerDeliveryMap.styles';
import * as Receipt from '../../../tracking/DeliveredOrderPage.styles';
import { demoStores } from './catalog';
import courierSprite from '../../../../assets/tracking/courier-delivery-8dir.png';
import { getCourierSpriteFrame } from '../../../tracking/customerTrackingMap';
import { formatPrice } from './demoSession';
import './DemoOrders.css';

import {
  prepMs,
  routeMs,
  deliveredMs,
  elapsedTime,
  getDemoOrderStatus,
  type DemoOrder,
  type DemoDeliveryClock,
} from './demoOrderProgress';
export type { DemoOrder, DemoDeliveryClock } from './demoOrderProgress';

type Props = {
  screen: 'orders' | 'tracking';
  orders: DemoOrder[];
  selectedId: string | null;
  storeName: string;
  onTrack: (id: string) => void;
  onMenu: () => void;
  onOrders: () => void;
  onClockChange: (id: string, clock: DemoDeliveryClock) => void;
};

const deliverySteps = [
  'Pedido recebido',
  'Preparando',
  'Saiu para entrega (A caminho)',
  'Entregue',
];
const pickupSteps = ['Pedido recebido', 'Preparando', 'Pronto para retirada', 'Retirado'];
const pickupHistory = ['Confirmado', 'Em preparo', 'Pronto', 'Retirado'];
const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
function listenForMotionPreference(notify: () => void) {
  const query = window.matchMedia?.(reducedMotionQuery);
  query?.addEventListener('change', notify);
  return () => query?.removeEventListener('change', notify);
}

function stageAt(order: DemoOrder, now: number) {
  const status = getDemoOrderStatus(order, now);
  return status === 'PREPARANDO' ? 0 : status === 'ENTREGUE' ? 2 : 1;
}

// Map geometry and sprite headings use the same street corners.
const stops = [
  { x: 44, y: 175 },
  { x: 117, y: 175 },
  { x: 117, y: 113 },
  { x: 233, y: 113 },
  { x: 233, y: 57 },
  { x: 313, y: 57 },
];
const route = stops.map(({ x, y }) => x + ',' + y).join(' ');
const legs = stops.slice(0, -1).map((from, index) => {
  const to = stops[index + 1];
  return {
    from,
    to,
    length: Math.hypot(to.x - from.x, to.y - from.y),
    direction: to.x > from.x ? 2 : 0,
  };
});
const pathLength = legs.reduce((total, leg) => total + leg.length, 0);
function locate(progress: number) {
  let distance = progress * pathLength;
  for (const leg of legs) {
    if (distance <= leg.length) {
      const part = distance / leg.length;
      return {
        x: leg.from.x + (leg.to.x - leg.from.x) * part,
        y: leg.from.y + (leg.to.y - leg.from.y) * part,
        direction: leg.direction,
      };
    }
    distance -= leg.length;
  }
  return { ...stops[stops.length - 1], direction: 2 };
}

const buildings = [
  [7, 6, 34, 21],
  [47, 9, 25, 30],
  [80, 5, 22, 30],
  [135, 6, 38, 28],
  [185, 7, 32, 30],
  [248, 7, 45, 29],
  [306, 11, 24, 29],
  [340, 8, 16, 32],
  [8, 72, 41, 26],
  [60, 76, 38, 22],
  [133, 72, 26, 25],
  [166, 77, 45, 20],
  [247, 73, 41, 26],
  [298, 75, 27, 21],
  [336, 73, 18, 25],
  [9, 128, 24, 24],
  [41, 127, 32, 30],
  [82, 127, 18, 31],
  [247, 127, 25, 32],
  [279, 130, 42, 28],
  [334, 132, 20, 27],
  [10, 192, 26, 31],
  [44, 195, 31, 22],
  [81, 191, 24, 27],
  [135, 192, 32, 28],
  [175, 196, 43, 23],
  [247, 193, 26, 24],
  [282, 192, 23, 22],
  [314, 192, 41, 27],
];

function RouteMap({ progress }: { progress: number }) {
  const reducedMotion = useSyncExternalStore(
    listenForMotionPreference,
    () => window.matchMedia?.(reducedMotionQuery).matches ?? false,
    () => false,
  );
  const shownProgress = reducedMotion ? Math.floor(progress * 4) / 4 : progress;
  const position = locate(shownProgress);
  const { column, row } = getCourierSpriteFrame(position.direction);
  const last = stops[stops.length - 1];
  return (
    <svg
      viewBox="0 0 360 230"
      className="gx-route-map"
      role="img"
      aria-label="Mapa ilustrativo do percurso do restaurante ao endereço de entrega"
    >
      <rect className="gx-map-land" width="360" height="230" fill="#eae8db" />
      {buildings.map(([x, y, w, h]) => (
        <g className="gx-map-building" key={x + ',' + y}>
          <rect x={x + 2} y={y + 3} width={w} height={h} rx="3" fill="#cfcbb6" />
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx="3"
            fill="#e4d6bf"
            stroke="#cabda6"
            strokeWidth=".7"
          />
        </g>
      ))}
      <rect className="gx-map-park" x="132" y="125" width="86" height="38" rx="7" fill="#b6cf9f" />
      <path d="m145 151 25-15 31 9" stroke="#e6edd3" strokeWidth="4" fill="none" />
      {[143, 181, 205].map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 ? 150 : 135} r="5" fill="#78a577" />
      ))}
      <g className="gx-map-roads" stroke="#fffdf5" strokeWidth="15">
        <path d="M0 57H360M0 113H360M0 175H360M117 0V230M233 0V230" />
      </g>
      <g className="gx-route-map-labels" fill="#686454" fontSize="9">
        <text x="15" y="60">
          Rua do Mercado
        </text>
        <text x="249" y="116">
          Rua das Hortas
        </text>
        <text x="148" y="161">
          Praça das Flores
        </text>
      </g>
      <polyline
        className="gx-map-route-edge"
        points={route}
        stroke="#f9f7f0"
        strokeWidth="10"
        fill="none"
        strokeLinejoin="round"
      />
      <polyline
        className="gx-map-route-guide"
        points={route}
        stroke="#89756f"
        strokeWidth="3"
        strokeDasharray="3 5"
        fill="none"
        strokeLinecap="round"
      />
      <polyline
        className="gx-route-traveled"
        points={route}
        stroke="#a83f26"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="100"
        strokeDasharray="100"
        strokeDashoffset={100 - shownProgress * 100}
      />
      <circle
        cx={stops[0].x}
        cy={stops[0].y}
        r="6"
        fill="#a83f26"
        stroke="#fffef6"
        strokeWidth="3"
      />
      <circle cx={last.x} cy={last.y} r="6" fill="#234a39" stroke="#fffef6" strokeWidth="3" />
      <g fontSize="10" fontWeight="700">
        <rect x="7" y="185" width="74" height="19" rx="7" fill="#fffef6" />
        <text x="44" y="198" fill="#573221" textAnchor="middle">
          Restaurante
        </text>
        <rect x="277" y="68" width="69" height="19" rx="7" fill="#274837" />
        <text x="311" y="81" fill="white" textAnchor="middle">
          Entrega
        </text>
      </g>
      <g
        className="gx-route-bike"
        style={{ transform: 'translate(' + position.x + 'px,' + position.y + 'px)' }}
      >
        <ellipse cy="0" rx="11" ry="3" fill="#384336" opacity=".22" />
        <svg
          x="-22"
          y="-46"
          width="44"
          height="50"
          viewBox={column * 64 + ' ' + row * 72 + ' 64 72'}
          overflow="hidden"
        >
          <image href={courierSprite} width="256" height="144" preserveAspectRatio="none" />
        </svg>
      </g>
    </svg>
  );
}

export function DemoOrders({
  screen,
  orders,
  selectedId,
  storeName,
  onTrack,
  onMenu,
  onOrders,
  onClockChange,
}: Props) {
  const [now, setNow] = useState(Date.now);
  const [search, setSearch] = useState('');
  const store = Object.values(demoStores).find((item) => item.name === storeName);
  const order = orders.find((item) => item.id === selectedId);
  const isTracking = screen === 'tracking' && Boolean(order);
  const running = (isTracking && order ? [order] : orders).some(
    (item) =>
      !item.deliveryClock?.paused &&
      elapsedTime(item, now) < (item.fulfillmentMethod === 'pickup' ? prepMs : deliveredMs),
  );
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), isTracking ? 180 : 1000);
    return () => window.clearInterval(timer);
  }, [running, isTracking]);

  if (!isTracking || !order) {
    const query = search.trim().replace(/^#/, '').toLocaleLowerCase('pt-BR');
    const cards = orders
      .map((item) => {
        const stage = stageAt(item, now);
        const pickup = item.fulfillmentMethod === 'pickup';
        const card = toGuestOrderCard({
          id: item.id,
          createdAt: new Date(item.placedAt).toISOString(),
          total: item.total / 100,
          type: 'DELIVERY',
          status: ['PREPARANDO', 'SAIU_PARA_ENTREGA', 'ENTREGUE'][stage],
          items: item.items.map((line) => ({
            quantity: line.quantity,
            product: {
              name: line.name,
              image:
                store?.products.find((product) => product.name === line.name)?.image ??
                store?.cover,
            },
          })),
        });
        if (pickup)
          return {
            ...card,
            steps: pickupHistory,
            statusLabel: pickupHistory[stage + 1],
            action: stage === 2 ? 'Ver retirada' : 'Acompanhar retirada',
          };
        return { ...card, action: stage === 2 ? 'Ver entrega' : card.action };
      })
      .filter(
        (card) =>
          String(card.id).includes(query) ||
          card.summary.toLocaleLowerCase('pt-BR').includes(query),
      );
    return (
      <GuestOrdersFrame
        as="section"
        $primary={store?.color ?? '#e85a2b'}
        aria-label="Pedidos da vitrine"
      >
        <GuestOrderMobileHeader
          restaurantName={storeName}
          restaurantLogo={store?.cover}
          onHome={onMenu}
        />
        <GuestOrderHistory
          orders={cards}
          restaurantName={storeName}
          search={search}
          onSearch={setSearch}
          onTrack={(id) => onTrack(String(id))}
          description="Acompanhe os pedidos de demonstração desta loja."
          searchPlaceholder="Buscar por número do pedido ou produto..."
        />
      </GuestOrdersFrame>
    );
  }

  const elapsed = elapsedTime(order, now);
  const stage = stageAt(order, now);
  const progress = Math.min(1, Math.max(0, (elapsed - prepMs) / routeMs));
  const paused = order.deliveryClock?.paused === true;
  const pickup = order.fulfillmentMethod === 'pickup';
  const steps = pickup ? pickupSteps : deliverySteps;
  function changeClock(elapsedMs: number, pause = false) {
    if (!order) return;
    const changedAt = Date.now();
    setNow(changedAt);
    onClockChange(order.id, { elapsedMs, changedAt, paused: pause });
  }

  return (
    <Tracking.Page as="section" aria-label="Acompanhamento de entrega">
      <Tracking.Header>
        <Tracking.HeaderInner className="gx-demo-tracking-heading">
          <Tracking.BackButton type="button" onClick={onOrders} aria-label="Voltar aos pedidos">
            <ArrowLeft aria-hidden="true" />
            <span>Pedidos</span>
          </Tracking.BackButton>
          <Tracking.MobileHeaderTitle>Acompanhar pedido</Tracking.MobileHeaderTitle>
          <Tracking.DesktopHeaderOrder>
            <strong>Pedido #{order.id}</strong>
          </Tracking.DesktopHeaderOrder>
        </Tracking.HeaderInner>
      </Tracking.Header>
      <Tracking.Main>
        {stage === 2 && (
          <Tracking.CompletionNotice role="status">
            <CheckCircle2 aria-hidden="true" />
            <span>
              <strong>{pickup ? 'Retirada concluída' : 'Entrega concluída'}</strong>
              <small>
                {pickup
                  ? 'O pedido foi retirado no balcão.'
                  : 'A última posição foi preservada e o rastreamento foi encerrado.'}
              </small>
            </span>
          </Tracking.CompletionNotice>
        )}
        <Tracking.FigmaTrackingLayout>
          <Tracking.TrackingMapColumn>
            <Tracking.DesktopTrackingTitle>Acompanhe seu Pedido</Tracking.DesktopTrackingTitle>
            {pickup ? (
              <Tracking.CourierSlot>
                <Tracking.CourierCard>
                  <Tracking.CourierAvatar>
                    <Store aria-hidden="true" />
                  </Tracking.CourierAvatar>
                  <span>
                    <strong>Retirada no balcão</strong>
                    <small className="courier-waiting">{storeName}</small>
                  </span>
                </Tracking.CourierCard>
              </Tracking.CourierSlot>
            ) : (
              <Tracking.MapArea aria-label="Mapa da entrega">
                {stage === 0 ? (
                  <Tracking.MapPlaceholder className="delivery-map-shell" role="status">
                    <Navigation aria-hidden="true" />
                    <h2>Aguardando início da rota</h2>
                    <p>O mapa aparecerá automaticamente quando a rota começar.</p>
                  </Tracking.MapPlaceholder>
                ) : (
                  <MapView.Shell className="delivery-map-shell">
                    <MapView.Canvas>
                      <RouteMap progress={progress} />
                    </MapView.Canvas>
                    <MapView.EtaCard>
                      <strong>
                        {stage === 2
                          ? 'Entrega concluída'
                          : 'Chegada em ' + Math.max(1, Math.ceil((1 - progress) * 8)) + ' min'}
                      </strong>
                    </MapView.EtaCard>
                    <MapView.LiveBadge>
                      <i aria-hidden="true" />
                      {stage === 2 ? 'Última posição do motoboy' : 'Localização simulada'}
                    </MapView.LiveBadge>
                  </MapView.Shell>
                )}
              </Tracking.MapArea>
            )}
          </Tracking.TrackingMapColumn>
          {!pickup && (
            <Tracking.CourierSlot>
              <Tracking.CourierCard>
                <Tracking.CourierAvatar>
                  <Bike aria-hidden="true" />
                </Tracking.CourierAvatar>
                <span>
                  <strong>{stage === 0 ? 'Aguardando motoboy' : 'Rafael Santos'}</strong>
                  <small className="courier-waiting">
                    {stage === 0
                      ? 'A cozinha está preparando seu pedido.'
                      : 'Motoboy da demonstração'}
                  </small>
                </span>
              </Tracking.CourierCard>
            </Tracking.CourierSlot>
          )}
          <Tracking.MobileTrackingDetails>
            <Tracking.MobileStatusList role="list" aria-label="Etapas da entrega">
              {steps.map((label, index) => (
                <Tracking.MobileStatusItem
                  role="listitem"
                  key={label}
                  $active={stage + 1 === index}
                  $complete={stage + 1 > index}
                  aria-current={stage + 1 === index ? 'step' : undefined}
                >
                  <i aria-hidden="true" />
                  <span>{label}</span>
                </Tracking.MobileStatusItem>
              ))}
            </Tracking.MobileStatusList>
          </Tracking.MobileTrackingDetails>
        </Tracking.FigmaTrackingLayout>
        <div className="gx-demo-tracking-extra">
          <p>
            <MapPin size={18} aria-hidden="true" />
            <span>
              <small>{pickup ? 'Local de retirada' : 'Endereço de entrega'}</small>
              <strong>{order.destination || storeName}</strong>
            </span>
          </p>
          <div className="gx-demo-tracking-controls" aria-label="Controles da demonstração">
            {stage === 1 && !pickup && (
              <Tracking.RetryButton
                type="button"
                onClick={() => changeClock(elapsedTime(order, Date.now()), !paused)}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}{' '}
                {paused ? 'Retomar rota' : 'Pausar rota'}
              </Tracking.RetryButton>
            )}
            <Tracking.RetryButton
              type="button"
              onClick={() =>
                changeClock(stage === 0 ? prepMs : stage === 1 ? deliveredMs : pickup ? 0 : prepMs)
              }
            >
              {stage === 2 ? <RotateCcw size={16} /> : <ChevronRight size={16} />}
              {pickup
                ? ['Marcar pronto para retirada', 'Confirmar retirada', 'Rever retirada'][stage]
                : ['Iniciar entrega', 'Concluir entrega', 'Rever percurso'][stage]}
            </Tracking.RetryButton>
          </div>
          <small>
            {pickup
              ? 'Retirada simulada em tempo acelerado.'
              : 'Percurso fictício em tempo acelerado.'}
          </small>
          <Receipt.OrderCard>
            <Receipt.SectionTitle>
              <span>
                <strong>Resumo do pedido</strong>
                <small>
                  {storeName} · Pedido #{order.id}
                </small>
              </span>
              <ReceiptText aria-hidden="true" />
            </Receipt.SectionTitle>
            <Receipt.ItemList>
              {order.items.map((item, index) => (
                <li key={index}>
                  <span>
                    {item.quantity}× {item.name}
                    {item.observation && (
                      <small className="gx-demo-item-note">{item.observation}</small>
                    )}
                  </span>
                </li>
              ))}
            </Receipt.ItemList>
            <Receipt.Total>
              <span>Total</span>
              <strong>{formatPrice(order.total)}</strong>
            </Receipt.Total>
            <Receipt.Payment>{order.method}</Receipt.Payment>
          </Receipt.OrderCard>
        </div>
      </Tracking.Main>
    </Tracking.Page>
  );
}
