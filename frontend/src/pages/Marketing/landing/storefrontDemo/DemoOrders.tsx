import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  ChevronRight,
  CircleCheck,
  CookingPot,
  MapPin,
  Motorbike,
  PackageCheck,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import courierSprite from '../../../../assets/tracking/courier-delivery-8dir.png';
import { getCourierSpriteFrame } from '../../../tracking/customerTrackingMap';
import { formatPrice } from './demoSession';
import './DemoOrders.css';

export type DemoDeliveryClock = { elapsedMs: number; changedAt: number; paused: boolean };
export type DemoOrder = {
  id: string;
  placedAt: number;
  items: { name: string; quantity: number }[];
  total: number;
  method: string;
  destination: string;
  example?: boolean;
  deliveryClock?: DemoDeliveryClock;
};

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

const prepMs = 6000;
const routeMs = 48000;
const deliveredMs = prepMs + routeMs;
const statuses = ['Em preparo', 'A caminho', 'Entregue'];
const stageIcons = [CookingPot, Motorbike, PackageCheck];
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
function listenForMotionPreference(notify: () => void) {
  const query = window.matchMedia?.(reducedMotionQuery);
  query?.addEventListener('change', notify);
  return () => query?.removeEventListener('change', notify);
}

function elapsedTime(order: DemoOrder, now: number) {
  const clock = order.deliveryClock;
  const delta = Math.max(0, now - (clock?.changedAt ?? order.placedAt));
  return Math.min(deliveredMs, (clock?.elapsedMs ?? 0) + (clock?.paused ? 0 : delta));
}

function stageAt(elapsed: number) {
  if (elapsed < prepMs) return 0;
  return elapsed < deliveredMs ? 1 : 2;
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
      <rect width="360" height="230" fill="#eae8db" />
      {buildings.map(([x, y, w, h]) => (
        <g key={x + ',' + y}>
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
      <rect x="132" y="125" width="86" height="38" rx="7" fill="#b6cf9f" />
      <path d="m145 151 25-15 31 9" stroke="#e6edd3" strokeWidth="4" fill="none" />
      {[143, 181, 205].map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 ? 150 : 135} r="5" fill="#78a577" />
      ))}
      <g stroke="#fffdf5" strokeWidth="15">
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
        points={route}
        stroke="#f9f7f0"
        strokeWidth="10"
        fill="none"
        strokeLinejoin="round"
      />
      <polyline
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
  const order = orders.find((item) => item.id === selectedId);
  const isTracking = screen === 'tracking' && Boolean(order);
  const running = (isTracking && order ? [order] : orders).some(
    (item) => !item.deliveryClock?.paused && elapsedTime(item, now) < deliveredMs,
  );
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), isTracking ? 180 : 1000);
    return () => window.clearInterval(timer);
  }, [running, isTracking]);

  if (!isTracking || !order) {
    return (
      <section className="gx-demo-orders" aria-label="Pedidos da vitrine">
        <h3>Meus pedidos</h3>
        {!orders.length && <p>Seus pedidos de demonstração aparecem aqui.</p>}
        <ul className="gx-demo-order-list">
          {orders.map((item) => {
            const stage = stageAt(elapsedTime(item, now));
            return (
              <li key={item.id}>
                <div className="gx-demo-order-top">
                  <strong>Pedido #{item.id}</strong>
                  <span className="gx-demo-order-status">{statuses[stage]}</span>
                </div>
                <small>
                  {item.example ? 'Pedido de exemplo' : 'Pedido simulado'} ·{' '}
                  {timeFormat.format(item.placedAt)}
                </small>
                <p>{item.items.map((line) => line.quantity + ' × ' + line.name).join(', ')}</p>
                <div className="gx-demo-order-bottom">
                  <b>{formatPrice(item.total)}</b>
                  <button type="button" onClick={() => onTrack(item.id)}>
                    {stage === 2 ? 'Ver entrega' : 'Acompanhar pedido'} <ChevronRight size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <button type="button" className="gx-demo-order-back" onClick={onMenu}>
          Voltar ao cardápio
        </button>
      </section>
    );
  }

  const elapsed = elapsedTime(order, now);
  const stage = stageAt(elapsed);
  const progress = Math.min(1, Math.max(0, (elapsed - prepMs) / routeMs));
  const paused = order.deliveryClock?.paused === true;
  const StageIcon = stageIcons[stage];
  function changeClock(elapsedMs: number, pause = false) {
    if (!order) return;
    const changedAt = Date.now();
    setNow(changedAt);
    onClockChange(order.id, { elapsedMs, changedAt, paused: pause });
  }

  return (
    <section className="gx-demo-orders" aria-label="Acompanhamento de entrega">
      <header className="gx-demo-order-heading">
        <div>
          <small>Pedido #{order.id}</small>
          <h3>Acompanhar entrega</h3>
        </div>
        <StageIcon size={27} aria-hidden="true" />
      </header>
      <p className="gx-demo-order-message" aria-live="polite">
        {stage === 0
          ? 'A cozinha está preparando seu pedido.'
          : stage === 1
            ? 'Rafael saiu do restaurante e está a caminho.'
            : 'Pedido entregue. Bom apetite!'}
      </p>
      <figure className="gx-demo-map-panel">
        <RouteMap progress={progress} />
        <figcaption>
          <MapPin size={17} aria-hidden="true" />
          <span>
            <small>Endereço de entrega</small>
            <strong>{order.destination}</strong>
          </span>
        </figcaption>
      </figure>
      <ol aria-label="Etapas da entrega" className="gx-demo-route-stages">
        {statuses.map((label, i) => (
          <li
            key={label}
            aria-current={i === stage ? 'step' : undefined}
            data-complete={i <= stage}
          >
            <CircleCheck size={16} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ol>
      <div className="gx-demo-order-actions">
        {stage === 1 && (
          <button
            type="button"
            onClick={() => changeClock(elapsedTime(order, Date.now()), !paused)}
          >
            {paused ? <Play size={15} /> : <Pause size={15} />}{' '}
            {paused ? 'Retomar rota' : 'Pausar rota'}
          </button>
        )}
        <button type="button" onClick={() => changeClock(stage === 1 ? deliveredMs : prepMs)}>
          {stage === 2 ? <RotateCcw size={15} /> : <ChevronRight size={15} />}
          {stage === 0 ? 'Iniciar entrega' : stage === 1 ? 'Concluir entrega' : 'Rever percurso'}
        </button>
      </div>
      <p className="gx-demo-route-note">Percurso fictício em tempo acelerado.</p>
      <details className="gx-demo-order-summary">
        <summary>Resumo do pedido</summary>
        <p>{storeName}</p>
        <ul>
          {order.items.map((item, i) => (
            <li key={i}>
              {item.quantity} × {item.name}
            </li>
          ))}
        </ul>
        <p>
          {order.method} · <b>{formatPrice(order.total)}</b>
        </p>
      </details>
      <button type="button" className="gx-demo-order-back" onClick={onOrders}>
        Voltar aos pedidos
      </button>
    </section>
  );
}
