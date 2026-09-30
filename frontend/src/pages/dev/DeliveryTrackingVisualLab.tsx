import { FormEvent, type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, CircleDot, Phone, Send } from 'lucide-react';
import courierDelivery8Dir from '../../assets/tracking/courier-delivery-8dir.jpg';
import fictitiousGoogleMap from '../../assets/tracking/fictitious-google-map.webp';
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

type LocalMessage = {
  id: string;
  side: 'courier' | 'customer';
  text: string;
  time: string;
};

const INITIAL_MESSAGES: LocalMessage[] = [
  {
    id: 'courier-1',
    side: 'courier',
    text: 'Olá! Estou saindo do restaurante agora com o seu pedido. Chego em alguns minutos.',
    time: '15:30',
  },
  {
    id: 'customer-1',
    side: 'customer',
    text: 'Combinado! Vou descer para a portaria. Obrigado!',
    time: '15:31',
  },
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
    x: 15 + ((point.longitude - VISUAL_MAP_BOUNDS.minLng) / lngRange) * 70,
    y: 84 - ((point.latitude - VISUAL_MAP_BOUNDS.minLat) / latRange) * 68,
  };
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
  const local =
    progress >= 1 ? 1 : Math.max(0, Math.min(1, (target - traversed) / segment));

  const point: CourierRoutePoint = {
    latitude: start.latitude + (end.latitude - start.latitude) * local,
    longitude: start.longitude + (end.longitude - start.longitude) * local,
    recordedAt: new Date().toISOString(),
    heading: null,
    speed: null,
  };

  const angleDegrees =
    (Math.atan2(
      -(end.latitude - start.latitude),
      end.longitude - start.longitude,
    ) *
      180) /
    Math.PI;

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
  const currentMapPosition = useMemo(
    () => toVisualMapPosition(currentPoint),
    [currentPoint],
  );
  const courierDirectionIndex = useMemo(
    () => getCourierDirectionIndex(currentFrame.angleDegrees),
    [currentFrame.angleDegrees],
  );
  const courierDirection = COURIER_DIRECTION_NAMES[
    courierDirectionIndex
  ] as CourierDirectionName;
  const courierSpritePosition = useMemo(
    () => getCourierSpritePosition(courierDirectionIndex),
    [courierDirectionIndex],
  );
  const etaMinutes = Math.max(1, Math.ceil(15 * (1 - progress)));
  const remainingSeconds = Math.max(
    0,
    Math.ceil((VISUAL_TRACKING_ANIMATION_MS * (1 - progress)) / 1000),
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const message = draft.replace(/\s+/g, ' ').trim();
    if (!message) return;

    setMessages((current) =>
      current.concat({
        id: 'customer-' + String(current.length + 1),
        side: 'customer',
        text: message,
        time: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }),
    );
    setDraft('');
  };

  return (
    <section
      data-testid="delivery-tracking-visual-lab"
      data-map-source="fictitious-google-screenshot"
      data-animation-duration-ms={VISUAL_TRACKING_ANIMATION_MS}
      style={styles.page}
    >
      <style>{`
        @media (max-width: 760px) {
          .tracking-main {
            width: 100% !important;
            padding: 0 0 28px !important;
          }

          .tracking-title {
            display: none !important;
          }

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
            overflow: hidden !important;
          }

          .tracking-map-surface {
            height: 300px !important;
            min-height: 300px !important;
            border: 0 !important;
            border-radius: 0 !important;
          }

          [data-testid="visual-courier-marker"] {
            width: 72px !important;
            height: 82px !important;
          }

          .tracking-side {
            order: 2;
            width: 100% !important;
            min-width: 0 !important;
            gap: 0 !important;
          }

          .tracking-courier,
          .tracking-status,
          .tracking-chat {
            border-radius: 0 !important;
            border-left: 0 !important;
            border-right: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button
            type="button"
            onClick={onBack}
            style={styles.backButton}
            aria-label="Voltar ao início do laboratório"
          >
            <ArrowLeft size={20} />
            <span>Início</span>
          </button>
          <strong style={styles.headerTitle}>Acompanhar pedido</strong>
          <span style={styles.headerSpacer} aria-hidden="true" />
        </div>
      </header>

      <main className="tracking-main" style={styles.main}>
        <h1 className="tracking-title" style={styles.title}>
          Acompanhe seu Pedido
        </h1>

        <div className="tracking-layout" style={styles.layout}>
          <section
            className="tracking-map-card"
            data-testid="visual-fictitious-map"
            data-courier-progress={progress.toFixed(4)}
            data-route-angle={currentFrame.angleDegrees.toFixed(2)}
            data-sprite-direction={courierDirection}
            style={styles.mapCard}
          >
            <div
              className="tracking-map-surface"
              data-testid="visual-google-map-screenshot"
              style={{
                ...styles.mapSurface,
                backgroundImage: `url(${fictitiousGoogleMap})`,
              }}
            >
              <div
                data-testid="visual-courier-marker"
                data-sprite-direction={courierDirection}
                data-sprite-index={courierDirectionIndex}
                style={{
                  ...styles.courierMapMarker,
                  left: `${currentMapPosition.x}%`,
                  top: `${currentMapPosition.y}%`,
                }}
              >
                <span style={styles.courierMapShadow} aria-hidden="true" />
                <span
                  data-testid="visual-courier-sprite"
                  role="img"
                  aria-label="Motoqueiro 3D fictício em movimento"
                  style={{
                    ...styles.courierMapSprite,
                    backgroundImage: `url(${courierDelivery8Dir})`,
                    backgroundPosition: `${courierSpritePosition.x}% ${courierSpritePosition.y}%`,
                  }}
                />
              </div>

              <div style={styles.etaBadge}>
                Chega em {etaMinutes} min
              </div>

              <small style={styles.mapNotice}>
                Mapa fictício local para teste visual
              </small>
            </div>

            <div style={styles.labBadge} aria-live="polite">
              <strong>
                {progress >= 1
                  ? 'Motoqueiro chegou ao endereço'
                  : 'Simulação do GPS em tempo real'}
              </strong>
              <small>
                {progress >= 1
                  ? 'Animação concluída'
                  : String(remainingSeconds) + 's restantes'}
              </small>
            </div>
          </section>

          <aside className="tracking-side" style={styles.side}>
            <section className="tracking-courier" style={styles.courierCard}>
              <span style={styles.avatar}>ES</span>
              <span style={styles.courierIdentity}>
                <strong>Eduardo Silva</strong>
                <small style={styles.courierPhone}>(00) 00000-0000</small>
              </span>
              <button
                type="button"
                aria-label="Ligar para entregador fictício"
                style={styles.callButton}
              >
                <Phone size={17} />
              </button>
            </section>

            <section className="tracking-status" style={styles.panel}>
              <h2 style={styles.panelTitle}>Status da Entrega</h2>
              <div style={styles.statusList}>
                <div style={styles.statusItem}>
                  <CheckCircle2 size={17} color="#22a35a" />
                  <span>Pedido recebido</span>
                </div>
                <div style={styles.statusItem}>
                  <CheckCircle2 size={17} color="#22a35a" />
                  <span>Em preparação na cozinha</span>
                </div>
                <div style={{ ...styles.statusItem, color: '#e8562c', fontWeight: 800 }}>
                  <CircleDot size={17} color="#e8562c" />
                  <span>{progress >= 1 ? 'Chegou ao endereço' : 'Saiu para entrega (Rota)'}</span>
                </div>
              </div>
            </section>

            <section className="tracking-chat" style={styles.panel}>
              <h2 style={styles.panelTitle}>Mensagens com Eduardo</h2>
              <div style={styles.messages}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      ...styles.message,
                      ...(message.side === 'customer'
                        ? styles.messageMine
                        : styles.messageCourier),
                    }}
                  >
                    <p style={styles.messageText}>{message.text}</p>
                    <time style={styles.messageTime}>{message.time}</time>
                  </div>
                ))}
              </div>

              <form onSubmit={submit} style={styles.composer}>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 300))}
                  placeholder="Enviar mensagem para o entregador..."
                  aria-label="Mensagem fictícia para o entregador"
                  style={styles.input}
                />
                <button
                  type="submit"
                  aria-label="Enviar mensagem fictícia"
                  disabled={!draft.trim()}
                  style={styles.sendButton}
                >
                  <Send size={17} />
                </button>
              </form>
            </section>
          </aside>
        </div>
      </main>
    </section>
  );
}

const card: CSSProperties = {
  border: '1px solid #e5e1dc',
  borderRadius: 15,
  background: '#fff',
  boxShadow: '0 8px 24px rgba(31,30,26,.035)',
};

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    color: '#191919',
    background: '#fff',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: { borderBottom: '1px solid #ebe7e2', background: '#fff' },
  headerInner: {
    width: '100%',
    minHeight: 48,
    padding: '12px 20px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
    alignItems: 'center',
  },
  backButton: {
    minWidth: 0,
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    justifySelf: 'start',
    border: 0,
    background: 'transparent',
    color: '#72706b',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  headerTitle: {
    color: '#1f1e1a',
    fontSize: 18,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  headerSpacer: { width: 50, justifySelf: 'end' },
  main: {
    width: 'min(1160px, calc(100% - 32px))',
    margin: '0 auto',
    padding: '38px 0 48px',
  },
  title: {
    margin: '0 0 22px',
    fontSize: 'clamp(24px, 3vw, 32px)',
    lineHeight: 1.1,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.15fr) minmax(330px, .9fr)',
    gap: 26,
    alignItems: 'start',
  },
  mapCard: { position: 'relative', minWidth: 0 },
  mapSurface: {
    position: 'relative',
    width: '100%',
    height: 'min(68vh, 650px)',
    minHeight: 520,
    overflow: 'hidden',
    border: '1px solid #d7dcd7',
    borderRadius: 12,
    backgroundColor: '#eef2f6',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.45)',
  },
  courierMapMarker: {
    position: 'absolute',
    zIndex: 12,
    width: 86,
    height: 98,
    transform: 'translate(-50%, -64%)',
    pointerEvents: 'none',
    filter: 'drop-shadow(0 7px 8px rgba(17,24,39,.28))',
    transition: 'left 90ms linear, top 90ms linear',
  },
  courierMapShadow: {
    position: 'absolute',
    zIndex: 0,
    left: '50%',
    bottom: 3,
    width: 42,
    height: 11,
    borderRadius: '50%',
    background: 'rgba(17,24,39,.28)',
    filter: 'blur(3px)',
    transform: 'translateX(-50%)',
  },
  courierMapSprite: {
    position: 'absolute',
    zIndex: 1,
    inset: 0,
    display: 'block',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '400% 200%',
    backgroundPositionRepeat: 'no-repeat',
    backgroundColor: 'transparent',
    filter: 'contrast(1.08) saturate(1.12) drop-shadow(0 2px 3px rgba(0,0,0,.18))',
  },
  etaBadge: {
    position: 'absolute',
    zIndex: 10,
    top: 16,
    left: 16,
    padding: '9px 15px',
    border: '1px solid rgba(31,41,55,.08)',
    borderRadius: 999,
    color: '#e45118',
    background: 'rgba(255,255,255,.96)',
    boxShadow: '0 8px 22px rgba(31,41,55,.14)',
    fontSize: 12,
    fontWeight: 850,
  },
  mapNotice: {
    position: 'absolute',
    zIndex: 10,
    left: 12,
    bottom: 10,
    padding: '4px 7px',
    borderRadius: 6,
    color: '#5e6c71',
    background: 'rgba(255,255,255,.92)',
    fontSize: 8,
    fontWeight: 700,
  },
  labBadge: {
    position: 'absolute',
    zIndex: 8,
    right: 14,
    bottom: 14,
    maxWidth: 'calc(100% - 28px)',
    padding: '9px 11px',
    display: 'grid',
    gap: 2,
    border: '1px solid rgba(232,86,44,.18)',
    borderRadius: 10,
    background: 'rgba(255,255,255,.95)',
    boxShadow: '0 9px 24px rgba(31,30,26,.12)',
    fontSize: 10,
    pointerEvents: 'none',
  },
  side: { display: 'grid', gap: 18, minWidth: 0 },
  panel: { ...card, padding: 22 },
  panelTitle: { margin: 0, fontSize: 14 },
  statusList: { marginTop: 18, display: 'grid', gap: 15 },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 12,
    fontWeight: 600,
  },
  courierCard: {
    ...card,
    padding: '16px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    display: 'grid',
    placeItems: 'center',
    flex: '0 0 auto',
    borderRadius: '50%',
    color: '#fff',
    background: 'linear-gradient(145deg,#344150,#111827)',
    fontSize: 11,
    fontWeight: 900,
  },
  courierIdentity: { minWidth: 0, display: 'grid', gap: 3 },
  courierPhone: { color: '#248c59', fontSize: 11, fontWeight: 800 },
  callButton: {
    width: 40,
    height: 40,
    marginLeft: 'auto',
    display: 'grid',
    placeItems: 'center',
    flex: '0 0 auto',
    border: 0,
    borderRadius: 20,
    color: '#e85a2b',
    background: '#fdf2ec',
    cursor: 'pointer',
  },
  messages: {
    minHeight: 220,
    maxHeight: 300,
    marginTop: 14,
    padding: '6px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto',
  },
  message: { width: 'min(86%, 260px)', display: 'grid', gap: 4 },
  messageCourier: {
    alignSelf: 'flex-start',
    color: '#333',
    background: '#f6f5f3',
    borderRadius: 11,
    padding: '10px 11px',
  },
  messageMine: {
    alignSelf: 'flex-end',
    color: '#b34727',
    background: '#fff0eb',
    borderRadius: 11,
    padding: '10px 11px',
  },
  messageText: { margin: 0, fontSize: 10, lineHeight: 1.45 },
  messageTime: { color: '#98938d', fontSize: 8, justifySelf: 'end' },
  composer: {
    marginTop: 10,
    padding: '3px 4px 3px 10px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1fr) 36px',
    alignItems: 'center',
    gap: 5,
    border: '1px solid #e6e2dd',
    borderRadius: 10,
  },
  input: {
    minWidth: 0,
    height: 38,
    border: 0,
    outline: 0,
    color: '#333',
    background: 'transparent',
    fontSize: 10,
  },
  sendButton: {
    width: 34,
    height: 34,
    display: 'grid',
    placeItems: 'center',
    border: 0,
    borderRadius: 8,
    color: '#e8562c',
    background: 'transparent',
  },
};
