import { FormEvent, type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bike, CheckCircle2, CircleDot, Phone, Send } from 'lucide-react';
import courierDelivery8Dir from '../../assets/tracking/courier-delivery-8dir.webp';
import type { CourierRoutePoint } from '../Courier/domain/courierLocation';

export const VISUAL_TRACKING_ANIMATION_MS = 60_000;

const COURIER_DIRECTION_NAMES = [
  'up',
  'up-right',
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
  'up-left',
] as const;

type CourierDirectionName = (typeof COURIER_DIRECTION_NAMES)[number];

export const VISUAL_TRACKING_ROUTE: CourierRoutePoint[] = [
  { latitude: -3.73525, longitude: -38.54162 },
  { latitude: -3.73624, longitude: -38.54041 },
  { latitude: -3.73708, longitude: -38.53936 },
  { latitude: -3.73842, longitude: -38.53882 },
  { latitude: -3.73956, longitude: -38.54004 },
  { latitude: -3.74088, longitude: -38.54131 },
  { latitude: -3.74213, longitude: -38.54257 },
  { latitude: -3.74331, longitude: -38.54389 },
];

type LocalMessage = { id: string; side: 'courier' | 'customer'; text: string; time: string };

const INITIAL_MESSAGES: LocalMessage[] = [
  { id: 'courier-1', side: 'courier', text: 'Olá! Estou saindo do restaurante agora com o seu pedido. Chego em alguns minutos.', time: '15:30' },
  { id: 'customer-1', side: 'customer', text: 'Combinado! Vou descer para a portaria. Obrigado!', time: '15:31' },
];

function distance(a: CourierRoutePoint, b: CourierRoutePoint) {
  return Math.hypot(a.latitude - b.latitude, a.longitude - b.longitude);
}

const VISUAL_MAP_BOUNDS = VISUAL_TRACKING_ROUTE.reduce(
  (bounds, point) => ({
    minLat: Math.min(bounds.minLat, point.latitude),
    maxLat: Math.max(bounds.maxLat, point.latitude),
    minLng: Math.min(bounds.minLng, point.longitude),
    maxLng: Math.max(bounds.maxLng, point.longitude),
  }),
  {
    minLat: Number.POSITIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY,
    minLng: Number.POSITIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY,
  },
);

function toVisualMapPosition(point: CourierRoutePoint) {
  const latRange = Math.max(0.000001, VISUAL_MAP_BOUNDS.maxLat - VISUAL_MAP_BOUNDS.minLat);
  const lngRange = Math.max(0.000001, VISUAL_MAP_BOUNDS.maxLng - VISUAL_MAP_BOUNDS.minLng);
  return {
    x: 12 + ((point.longitude - VISUAL_MAP_BOUNDS.minLng) / lngRange) * 76,
    y: 88 - ((point.latitude - VISUAL_MAP_BOUNDS.minLat) / latRange) * 76,
  };
}

const VISUAL_STREET_SVG_POINTS = VISUAL_TRACKING_ROUTE.map((point) => {
  const position = toVisualMapPosition(point);
  return `${position.x},${position.y}`;
}).join(' ');

export function getVisualRouteFrame(route: CourierRoutePoint[], rawProgress: number) {
  if (!route.length) {
    return {
      point: { latitude: 0, longitude: 0 } as CourierRoutePoint,
      angleDegrees: 0,
      segmentIndex: 0,
    };
  }

  if (route.length === 1) {
    return { point: route[0], angleDegrees: 0, segmentIndex: 0 };
  }

  const progress = Math.max(0, Math.min(1, rawProgress));
  const lengths = route.slice(1).map((point, index) => distance(route[index], point));
  const total = lengths.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return { point: route[0], angleDegrees: 0, segmentIndex: 0 };
  }

  const target = total * progress;
  let traversed = 0;
  let segmentIndex = lengths.length - 1;

  for (let index = 0; index < lengths.length; index += 1) {
    if (traversed + lengths[index] >= target) {
      segmentIndex = index;
      break;
    }
    traversed += lengths[index];
  }

  const segment = Math.max(0.000001, lengths[segmentIndex]);
  const start = route[segmentIndex];
  const end = route[segmentIndex + 1];
  const local = progress >= 1 ? 1 : Math.max(0, Math.min(1, (target - traversed) / segment));
  const point: CourierRoutePoint = {
    latitude: start.latitude + (end.latitude - start.latitude) * local,
    longitude: start.longitude + (end.longitude - start.longitude) * local,
    recordedAt: new Date().toISOString(),
    heading: null,
    speed: null,
  };

  const screenStart = toVisualMapPosition(start);
  const screenEnd = toVisualMapPosition(end);
  const angleDegrees =
    (Math.atan2(screenEnd.y - screenStart.y, screenEnd.x - screenStart.x) * 180) / Math.PI;

  return { point, angleDegrees, segmentIndex };
}

export function interpolateVisualRoute(
  route: CourierRoutePoint[],
  rawProgress: number,
): CourierRoutePoint {
  return getVisualRouteFrame(route, rawProgress).point;
}

export function normalizeVisualAngle(angleDegrees: number) {
  let normalized = angleDegrees % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized <= -180) normalized += 360;
  return normalized;
}

export function getVisualCameraRotation(angleDegrees: number) {
  const headingUpRotation = normalizeVisualAngle(-90 - angleDegrees);
  return headingUpRotation * 0.65;
}

export function getCourierDirectionIndex(
  angleDegrees: number,
  cameraRotationDegrees = 0,
) {
  const screenAngle = normalizeVisualAngle(angleDegrees + cameraRotationDegrees);
  return ((Math.round((screenAngle + 90) / 45) % 8) + 8) % 8;
}

function getCourierSpritePosition(directionIndex: number) {
  const safeIndex = Math.max(0, Math.min(7, directionIndex));
  const column = safeIndex % 4;
  const row = safeIndex >= 4 ? 1 : 0;
  return {
    x: column === 0 ? 0 : (column / 3) * 100,
    y: row * 100,
  };
}

function MiniRestaurant3DMarker() {
  return (
    <span data-testid="visual-origin-restaurant-marker" style={styles.buildingMarker}>
      <span style={styles.restaurantBuilding}>
        <span style={styles.restaurantRoof} />
        <span style={styles.restaurantSign}>NORTH</span>
        <span style={styles.restaurantAwning}>
          <i /><i /><i /><i />
        </span>
        <span style={styles.restaurantDoor} />
        <span style={styles.restaurantWindow} />
      </span>
      <small style={styles.buildingLabel}>Restaurante</small>
    </span>
  );
}

function MiniHouse3DMarker() {
  return (
    <span data-testid="visual-destination-house-marker" style={styles.buildingMarker}>
      <span style={styles.houseBuilding}>
        <span style={styles.houseRoof} />
        <span style={styles.houseChimney} />
        <span style={styles.houseDoor} />
        <span style={styles.houseWindowLeft} />
        <span style={styles.houseWindowRight} />
      </span>
      <small style={styles.buildingLabel}>Sua casa</small>
    </span>
  );
}

export default function DeliveryTrackingVisualLab({ onBack }: { onBack?: () => void }) {
  const startedAtRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState<LocalMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    startedAtRef.current = performance.now();
    let animationFrame = 0;

    const update = (now: number) => {
      const nextProgress = Math.min(
        1,
        (now - startedAtRef.current) / VISUAL_TRACKING_ANIMATION_MS,
      );
      setProgress(nextProgress);

      if (nextProgress < 1) {
        animationFrame = window.requestAnimationFrame(update);
      }
    };

    animationFrame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  const currentFrame = useMemo(
    () => getVisualRouteFrame(VISUAL_TRACKING_ROUTE, progress),
    [progress],
  );
  const currentPoint = currentFrame.point;
  const currentMapPosition = useMemo(() => toVisualMapPosition(currentPoint), [currentPoint]);
  const cameraRotation = useMemo(
    () => getVisualCameraRotation(currentFrame.angleDegrees),
    [currentFrame.angleDegrees],
  );
  const courierDirectionIndex = useMemo(
    () => getCourierDirectionIndex(currentFrame.angleDegrees, cameraRotation),
    [cameraRotation, currentFrame.angleDegrees],
  );
  const courierDirection = COURIER_DIRECTION_NAMES[
    courierDirectionIndex
  ] as CourierDirectionName;
  const courierSpritePosition = useMemo(
    () => getCourierSpritePosition(courierDirectionIndex),
    [courierDirectionIndex],
  );
  const originMapPosition = useMemo(
    () => toVisualMapPosition(VISUAL_TRACKING_ROUTE[0]),
    [],
  );
  const destinationMapPosition = useMemo(
    () => toVisualMapPosition(VISUAL_TRACKING_ROUTE[VISUAL_TRACKING_ROUTE.length - 1]),
    [],
  );
  const remainingSeconds = Math.max(0, Math.ceil((VISUAL_TRACKING_ANIMATION_MS * (1 - progress)) / 1000));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const message = draft.replace(/\\s+/g, ' ').trim();
    if (!message) return;
    setMessages((current) => current.concat({
      id: 'customer-' + String(current.length + 1),
      side: 'customer',
      text: message,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }));
    setDraft('');
  };

  return (
    <section data-testid="delivery-tracking-visual-lab" data-map-source="fictitious-google-style" data-animation-duration-ms={VISUAL_TRACKING_ANIMATION_MS} style={styles.page}>
      <style>{`
        [data-testid="visual-origin-restaurant-marker"] > span:first-child > span:nth-child(3) i:nth-child(odd) {
          background: #e85a2b;
        }
        [data-testid="visual-origin-restaurant-marker"] > span:first-child > span:nth-child(3) i:nth-child(even) {
          background: #fff4ed;
        }

        @media (max-width: 760px) {
          .tracking-main { width: 100% !important; padding: 0 0 28px !important; }
          .tracking-title { display: none !important; }
          .tracking-layout {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
            gap: 0 !important;
          }
          .tracking-map-card {
            order: 1;
            width: 100% !important;
            min-width: 0 !important;
            flex: 0 0 280px !important;
            overflow: hidden !important;
          }
          .tracking-side {
            order: 2;
            width: 100% !important;
            min-width: 0 !important;
            gap: 0 !important;
          }
          .tracking-courier { order: 1; border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; box-shadow: none !important; }
          .tracking-status { order: 2; border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; box-shadow: none !important; }
          .tracking-chat { order: 3; border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; box-shadow: none !important; }
          .visual-fake-map {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            min-width: 100% !important;
            height: 280px !important;
            min-height: 280px !important;
            max-height: 280px !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            background: #e9eef1 !important;
          }
          .tracking-animation-badge { display: none !important; }
        }
      `}</style>
      <header style={styles.header}>
        <div style={styles.mobileHeaderInner}>
          <button type="button" onClick={onBack} style={styles.backButton} aria-label="Voltar ao início do laboratório">
            <ArrowLeft size={20} />
            <span>Início</span>
          </button>
          <strong style={styles.headerTitle}>Acompanhar pedido</strong>
          <span style={styles.headerSpacer} aria-hidden="true" />
        </div>
      </header>

      <main className="tracking-main" style={styles.main}>
        <h1 className="tracking-title" style={styles.title}>Acompanhe seu Pedido</h1>
        <div className="tracking-layout" style={styles.layout}>
          <section className="tracking-map-card" style={styles.mapCard}>
            <div
              className="visual-fake-map"
              data-testid="visual-fictitious-map"
              data-courier-progress={progress.toFixed(4)}
              data-camera-rotation={cameraRotation.toFixed(2)}
              style={styles.fakeMap}
            >
              <div
                data-testid="visual-map-scene"
                style={{
                  ...styles.mapScene,
                  transformOrigin: `${currentMapPosition.x}% ${currentMapPosition.y}%`,
                  transform: `rotate(${cameraRotation}deg) scale(1.055)`,
                }}
              >
              <div style={{ ...styles.cityBlock, top: '5%', left: '5%', width: '27%', height: '17%' }} />
              <div style={{ ...styles.cityBlock, top: '7%', left: '58%', width: '30%', height: '18%' }} />
              <div style={{ ...styles.cityBlock, top: '31%', left: '8%', width: '25%', height: '18%' }} />
              <div style={{ ...styles.cityBlock, top: '31%', left: '62%', width: '28%', height: '17%' }} />
              <div style={{ ...styles.cityBlock, top: '59%', left: '7%', width: '27%', height: '17%' }} />
              <div style={{ ...styles.cityBlock, top: '62%', left: '64%', width: '25%', height: '17%' }} />

              <div style={{ ...styles.road, top: '24%', left: '-5%', width: '112%', transform: 'rotate(-4deg)' }} />
              <div style={{ ...styles.road, top: '51%', left: '-4%', width: '111%', transform: 'rotate(5deg)' }} />
              <div style={{ ...styles.road, top: '78%', left: '-5%', width: '112%', transform: 'rotate(-3deg)' }} />
              <div style={{ ...styles.road, top: '-2%', left: '22%', width: '104%', transform: 'rotate(88deg)' }} />
              <div style={{ ...styles.road, top: '-1%', left: '52%', width: '103%', transform: 'rotate(91deg)' }} />
              <div style={{ ...styles.road, top: '1%', left: '79%', width: '101%', transform: 'rotate(94deg)' }} />

              <span style={{ ...styles.mapLabel, top: '19%', left: '8%' }}>Rua das Palmeiras</span>
              <span style={{ ...styles.mapLabel, top: '45%', left: '66%' }}>Rua do Bosque</span>
              <span style={{ ...styles.mapLabel, top: '73%', left: '9%' }}>Av. Principal</span>
              <span style={{ ...styles.mapLabelPoi, top: '37%', left: '43%' }}>Praça Central</span>

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                style={styles.streetSvg}
              >
                <polyline
                  points={VISUAL_STREET_SVG_POINTS}
                  fill="none"
                  stroke="#cfd7da"
                  strokeWidth="5.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={VISUAL_STREET_SVG_POINTS}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="4.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={VISUAL_STREET_SVG_POINTS}
                  fill="none"
                  stroke="#e9edef"
                  strokeWidth=".35"
                  strokeDasharray="1.1 1.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div
                style={{
                  ...styles.originBuildingPosition,
                  left: `${originMapPosition.x}%`,
                  top: `${originMapPosition.y}%`,
                }}
              >
                <MiniRestaurant3DMarker />
              </div>
              <div
                style={{
                  ...styles.destinationBuildingPosition,
                  left: `${destinationMapPosition.x}%`,
                  top: `${destinationMapPosition.y}%`,
                }}
              >
                <MiniHouse3DMarker />
              </div>
              </div>
              <div
                data-testid="visual-courier-marker"
                data-route-segment={currentFrame.segmentIndex}
                data-route-angle={currentFrame.angleDegrees.toFixed(2)}
                data-sprite-direction={courierDirection}
                data-sprite-index={courierDirectionIndex}
                style={{
                  ...styles.courierMarker,
                  left: `${currentMapPosition.x}%`,
                  top: `${currentMapPosition.y}%`,
                }}
              >
                <span style={styles.courierRoadShadow} aria-hidden="true" />
                <span
                  data-testid="visual-courier-sprite"
                  role="img"
                  aria-label="Motoqueiro de entrega fictício em navegação"
                  style={{
                    ...styles.courierSprite,
                    backgroundImage: `url(${courierDelivery8Dir})`,
                    backgroundPosition: `${courierSpritePosition.x}% ${courierSpritePosition.y}%`,
                  }}
                />
              </div>
              <div style={styles.etaBadge}>Chega em 15 min</div>
              <small style={styles.fakeMapNotice}>Mapa fictício para teste visual local</small>
            </div>
            <div className="tracking-animation-badge" aria-live="polite" style={styles.animationBadge}>
              <Bike size={14} />
              <span style={styles.badgeCopy}>
                <strong>{progress >= 1 ? 'Motoqueiro chegou ao endereço' : 'Percurso fictício em tempo real'}</strong>
                <small>{progress >= 1 ? 'Animação concluída' : String(remainingSeconds) + 's restantes da simulação de 1 minuto'}</small>
              </span>
            </div>
          </section>

          <aside className="tracking-side" style={styles.side}>
            <section className="tracking-status" style={styles.panel}>
              <h2 style={styles.panelTitle}>Status da Entrega</h2>
              <div style={styles.statusList}>
                <div style={styles.statusItem}><CheckCircle2 size={17} color="#22a35a" /><span>Pedido recebido</span></div>
                <div style={styles.statusItem}><CheckCircle2 size={17} color="#22a35a" /><span>Em preparação na cozinha</span></div>
                <div style={{ ...styles.statusItem, color: '#e8562c', fontWeight: 800 }}><CircleDot size={17} color="#e8562c" /><span>{progress >= 1 ? 'Chegou ao endereço' : 'Saiu para entrega (Rota)'}</span></div>
              </div>
            </section>

            <section className="tracking-courier" style={styles.courierCard}>
              <span style={styles.avatar}>ES</span>
              <span style={styles.courierIdentity}>
                <strong>Eduardo Silva</strong>
                <small style={styles.courierPhone} title="Número fictício">(00) 00000-0000</small>
              </span>
              <button type="button" aria-label="Ligação fictícia para o entregador" style={styles.callButton}>
                <Phone size={19} />
              </button>
            </section>

            <section className="tracking-chat" style={styles.panel}>
              <h2 style={styles.panelTitle}>Mensagens com Eduardo</h2>
              <div aria-live="polite" style={styles.messages}>
                {messages.map((message) => (
                  <div key={message.id} style={{ ...styles.message, ...(message.side === 'customer' ? styles.messageMine : styles.messageCourier) }}>
                    <p style={styles.messageText}>{message.text}</p>
                    <time style={styles.messageTime}>{message.time}</time>
                  </div>
                ))}
              </div>
              <form onSubmit={submit} style={styles.composer}>
                <input value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 300))} placeholder="Enviar mensagem para o entregador..." aria-label="Mensagem fictícia para o entregador" style={styles.input} />
                <button type="submit" aria-label="Enviar mensagem fictícia" disabled={!draft.trim()} style={styles.sendButton}><Send size={17} /></button>
              </form>
            </section>
          </aside>
        </div>
      </main>
    </section>
  );
}

const card: CSSProperties = { border: '1px solid #e5e1dc', borderRadius: 15, background: '#fff', boxShadow: '0 8px 24px rgba(31,30,26,.035)' };
const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', color: '#191919', background: '#fff', fontFamily: "Inter, system-ui, sans-serif" },
  header: { borderBottom: '1px solid #ebe7e2', background: '#fff' },
  mobileHeaderInner: { width: '100%', minHeight: 48, padding: '12px 20px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center' },
  backButton: { minWidth: 0, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 8, justifySelf: 'start', border: 0, background: 'transparent', color: '#72706b', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  headerTitle: { color: '#1f1e1a', fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap' },
  headerSpacer: { width: 50, justifySelf: 'end' },
  brandCopy: { display: 'grid', gap: 3 },
  main: { width: 'min(1160px, calc(100% - 32px))', margin: '0 auto', padding: '38px 0 48px' },
  title: { margin: '0 0 22px', fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.1 },
  layout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))', gap: 30, alignItems: 'start' },
  mapCard: { position: 'relative', minWidth: 0 },
  fakeMap: { position: 'relative', width: '100%', height: 'min(68vh, 650px)', minHeight: 520, overflow: 'hidden', isolation: 'isolate', border: '1px solid #d7dfe2', borderRadius: 12, background: 'linear-gradient(180deg,#eef3f1 0%,#e8eeec 100%)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.65)' },
  mapScene: { position: 'absolute', zIndex: 1, inset: 0, width: '100%', height: '100%', willChange: 'transform', transition: 'transform 720ms cubic-bezier(.22,1,.36,1)' },
  cityBlock: { position: 'absolute', zIndex: 0, border: '1px solid #dfe5e2', borderRadius: 9, background: 'linear-gradient(145deg,#e1e8df 0%,#d8e1d8 100%)', boxShadow: 'inset 0 0 0 3px rgba(255,255,255,.22)' },
  road: { position: 'absolute', zIndex: 1, height: 13, border: '1px solid #d5dcdf', background: '#fff', boxShadow: '0 0 0 2px rgba(222,228,231,.9)' },
  mapLabel: { position: 'absolute', zIndex: 2, color: '#6d777c', fontSize: 10, fontWeight: 600, transform: 'rotate(-4deg)' },
  mapLabelPoi: { position: 'absolute', zIndex: 2, color: '#5d8b68', fontSize: 9, fontWeight: 800 },
  streetSvg: { position: 'absolute', zIndex: 3, inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  courierMarker: { position: 'absolute', zIndex: 9, width: 64, height: 72, transform: 'translate(-50%, -56%)', willChange: 'left, top', transition: 'left 80ms linear, top 80ms linear' },
  courierRoadShadow: { position: 'absolute', zIndex: 0, left: '50%', bottom: 3, width: 34, height: 11, borderRadius: '50%', background: 'rgba(22,31,38,.22)', filter: 'blur(3px)', transform: 'translateX(-50%) scaleX(1.15)' },
  courierSprite: { position: 'absolute', zIndex: 1, inset: 0, display: 'block', backgroundRepeat: 'no-repeat', backgroundSize: '400% 200%', filter: 'drop-shadow(0 7px 7px rgba(21,31,39,.24))', transform: 'perspective(220px) rotateX(5deg) translateZ(0)', transformOrigin: '50% 82%', willChange: 'background-position' },
  originBuildingPosition: { position: 'absolute', zIndex: 7, transform: 'translate(-50%, -76%)', pointerEvents: 'none' },
  destinationBuildingPosition: { position: 'absolute', zIndex: 7, transform: 'translate(-50%, -76%)', pointerEvents: 'none' },
  buildingMarker: { position: 'relative', width: 58, display: 'grid', justifyItems: 'center', gap: 2, filter: 'drop-shadow(0 8px 7px rgba(31,41,55,.18))' },
  buildingLabel: { padding: '2px 5px', borderRadius: 999, color: '#454b48', background: 'rgba(255,255,255,.92)', boxShadow: '0 2px 5px rgba(31,41,55,.12)', fontSize: 7, fontWeight: 900, whiteSpace: 'nowrap' },

  restaurantBuilding: { position: 'relative', width: 48, height: 42, display: 'block', transform: 'perspective(80px) rotateX(2deg) rotateY(-5deg)', transformOrigin: 'bottom center' },
  restaurantRoof: { position: 'absolute', zIndex: 4, top: 0, left: 5, width: 39, height: 13, clipPath: 'polygon(12% 100%, 25% 16%, 79% 0, 100% 79%)', background: 'linear-gradient(145deg,#e7643b,#b83e24)', boxShadow: '0 3px 4px rgba(93,47,31,.18)' },
  restaurantSign: { position: 'absolute', zIndex: 5, top: 12, left: 8, width: 33, height: 9, display: 'grid', placeItems: 'center', borderRadius: 2, color: '#fff', background: '#2f3438', fontSize: 5, fontWeight: 900, letterSpacing: '.08em' },
  restaurantAwning: { position: 'absolute', zIndex: 5, top: 21, left: 7, width: 35, height: 7, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', overflow: 'hidden', borderRadius: '2px 2px 4px 4px', background: '#fff' },
  restaurantDoor: { position: 'absolute', zIndex: 4, left: 21, bottom: 1, width: 10, height: 15, borderRadius: '2px 2px 0 0', background: 'linear-gradient(90deg,#80513b,#a16a4b)' },
  restaurantWindow: { position: 'absolute', zIndex: 4, right: 7, bottom: 7, width: 9, height: 9, border: '1px solid rgba(44,94,111,.25)', borderRadius: 2, background: 'linear-gradient(145deg,#d9f6ff,#85c8dc)' },

  houseBuilding: { position: 'relative', width: 46, height: 42, display: 'block', transform: 'perspective(80px) rotateX(2deg) rotateY(6deg)', transformOrigin: 'bottom center' },
  houseRoof: { position: 'absolute', zIndex: 4, top: 2, left: 2, width: 42, height: 18, clipPath: 'polygon(50% 0,100% 72%,91% 100%,50% 41%,9% 100%,0 72%)', background: 'linear-gradient(145deg,#d64d3f,#9c2f2a)', boxShadow: '0 3px 4px rgba(90,38,32,.2)' },
  houseChimney: { position: 'absolute', zIndex: 3, top: 3, right: 8, width: 6, height: 12, borderRadius: '2px 2px 0 0', background: '#9c6651' },
  houseDoor: { position: 'absolute', zIndex: 3, left: 18, bottom: 1, width: 10, height: 17, borderRadius: '3px 3px 0 0', background: 'linear-gradient(90deg,#875238,#a96c49)' },
  houseWindowLeft: { position: 'absolute', zIndex: 3, left: 7, bottom: 10, width: 8, height: 8, border: '1px solid rgba(44,94,111,.2)', borderRadius: 2, background: 'linear-gradient(145deg,#e2f8ff,#8fc9df)' },
  houseWindowRight: { position: 'absolute', zIndex: 3, right: 6, bottom: 10, width: 8, height: 8, border: '1px solid rgba(44,94,111,.2)', borderRadius: 2, background: 'linear-gradient(145deg,#e2f8ff,#8fc9df)' },
  etaBadge: { position: 'absolute', zIndex: 8, top: 20, left: 20, padding: '8px 16px', border: '1px solid #efece6', borderRadius: 999, color: '#e85a2b', background: '#fff', boxShadow: '0 4px 8px rgba(16,24,39,.08)', fontSize: 13, fontWeight: 800 },
  fakeMapNotice: { position: 'absolute', zIndex: 8, right: 10, bottom: 8, padding: '4px 7px', borderRadius: 6, color: '#667178', background: 'rgba(255,255,255,.88)', fontSize: 8 },
  animationBadge: { position: 'absolute', zIndex: 7, right: 14, bottom: 14, maxWidth: 'calc(100% - 28px)', padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 9, border: '1px solid rgba(232,86,44,.18)', borderRadius: 10, background: 'rgba(255,255,255,.95)', boxShadow: '0 9px 24px rgba(31,30,26,.12)' },
  badgeCopy: { display: 'grid', gap: 2, fontSize: 10 },
  side: { display: 'grid', gap: 18, minWidth: 0 },
  panel: { ...card, padding: 22 },
  panelTitle: { margin: 0, fontSize: 14 },
  statusList: { marginTop: 18, display: 'grid', gap: 15 },
  statusItem: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 600 },
  courierCard: { ...card, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, display: 'grid', placeItems: 'center', flex: '0 0 auto', borderRadius: '50%', color: '#fff', background: 'linear-gradient(145deg,#344150,#111827)', fontSize: 11, fontWeight: 900 },
  courierIdentity: { minWidth: 0, display: 'grid', gap: 3 },
  courierPhone: { color: '#248c59', fontSize: 11, fontWeight: 800 },
  callButton: { width: 40, height: 40, marginLeft: 'auto', display: 'grid', placeItems: 'center', flex: '0 0 auto', border: 0, borderRadius: 20, color: '#e85a2b', background: '#fdf2ec', cursor: 'pointer' },
  messages: { minHeight: 220, maxHeight: 300, marginTop: 14, padding: '6px 0', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' },
  message: { width: 'min(86%, 260px)', display: 'grid', gap: 4 },
  messageCourier: { alignSelf: 'flex-start', color: '#333', background: '#f6f5f3', borderRadius: 11, padding: '10px 11px' },
  messageMine: { alignSelf: 'flex-end', color: '#b34727', background: '#fff0eb', borderRadius: 11, padding: '10px 11px' },
  messageText: { margin: 0, fontSize: 10, lineHeight: 1.45 },
  messageTime: { color: '#98938d', fontSize: 8, justifySelf: 'end' },
  composer: { marginTop: 10, padding: '3px 4px 3px 10px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 36px', alignItems: 'center', gap: 5, border: '1px solid #e6e2dd', borderRadius: 10 },
  input: { minWidth: 0, height: 38, border: 0, outline: 0, color: '#333', background: 'transparent', fontSize: 10 },
  sendButton: { width: 34, height: 34, display: 'grid', placeItems: 'center', border: 0, borderRadius: 8, color: '#e8562c', background: 'transparent' },
};
