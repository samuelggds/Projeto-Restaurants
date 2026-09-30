import { FormEvent, type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bike, CheckCircle2, CircleDot, Phone, Send } from 'lucide-react';
import courierScooter3d from '../../assets/tracking/courier-scooter-gastronexa-3d.webp';
import type { CourierRoutePoint } from '../Courier/domain/courierLocation';

export const VISUAL_TRACKING_ANIMATION_MS = 60_000;

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

const VISUAL_ROUTE_SVG_POINTS = VISUAL_TRACKING_ROUTE.map((point) => {
  const position = toVisualMapPosition(point);
  return `${position.x},${position.y}`;
}).join(' ');

export function interpolateVisualRoute(route: CourierRoutePoint[], rawProgress: number): CourierRoutePoint {
  if (!route.length) return { latitude: 0, longitude: 0 };
  if (route.length === 1) return route[0];
  const progress = Math.max(0, Math.min(1, rawProgress));
  if (progress === 1) return route[route.length - 1];
  const lengths = route.slice(1).map((point, index) => distance(route[index], point));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return route[0];
  const target = total * progress;
  let traversed = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    const segment = lengths[index];
    if (traversed + segment >= target) {
      const local = segment <= 0 ? 0 : (target - traversed) / segment;
      const start = route[index];
      const end = route[index + 1];
      return {
        latitude: start.latitude + (end.latitude - start.latitude) * local,
        longitude: start.longitude + (end.longitude - start.longitude) * local,
        recordedAt: new Date().toISOString(),
        heading: null,
        speed: null,
      };
    }
    traversed += segment;
  }
  return route[route.length - 1];
}

export default function DeliveryTrackingVisualLab({ onBack }: { onBack?: () => void }) {
  const startedAtRef = useRef(Date.now());
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState<LocalMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    startedAtRef.current = Date.now();
    const update = () => setProgress(Math.min(1, (Date.now() - startedAtRef.current) / VISUAL_TRACKING_ANIMATION_MS));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, []);

  const currentPoint = useMemo(() => interpolateVisualRoute(VISUAL_TRACKING_ROUTE, progress), [progress]);
  const currentMapPosition = useMemo(() => toVisualMapPosition(currentPoint), [currentPoint]);
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
        @media (max-width: 760px) {
          .tracking-main { width: 100% !important; padding: 0 0 28px !important; }
          .tracking-title { display: none !important; }
          .tracking-layout { display: flex !important; flex-direction: column !important; gap: 0 !important; }
          .tracking-map-card { order: 1; }
          .tracking-side { order: 2; gap: 0 !important; }
          .tracking-courier { order: 1; border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; box-shadow: none !important; }
          .tracking-status { order: 2; border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; box-shadow: none !important; }
          .tracking-chat { order: 3; border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; box-shadow: none !important; }
          .visual-fake-map { height: 280px !important; min-height: 280px !important; border-radius: 0 !important; }
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
              style={styles.fakeMap}
            >
              <div style={{ ...styles.road, top: '8%', left: '-8%', width: '118%', transform: 'rotate(6deg)' }} />
              <div style={{ ...styles.road, top: '26%', left: '-5%', width: '112%', transform: 'rotate(-5deg)' }} />
              <div style={{ ...styles.road, top: '49%', left: '-6%', width: '116%', transform: 'rotate(8deg)' }} />
              <div style={{ ...styles.road, top: '71%', left: '-4%', width: '110%', transform: 'rotate(-7deg)' }} />
              <div style={{ ...styles.road, top: '3%', left: '18%', width: '94%', transform: 'rotate(84deg)' }} />
              <div style={{ ...styles.road, top: '2%', left: '43%', width: '95%', transform: 'rotate(88deg)' }} />
              <div style={{ ...styles.road, top: '4%', left: '70%', width: '91%', transform: 'rotate(95deg)' }} />
              <div style={{ ...styles.majorRoad, top: '56%', left: '-10%', width: '125%', transform: 'rotate(-18deg)' }} />
              <span style={{ ...styles.mapLabel, top: '14%', left: '8%' }}>Av. Exemplo</span>
              <span style={{ ...styles.mapLabel, top: '33%', left: '61%' }}>Rua Modelo</span>
              <span style={{ ...styles.mapLabel, top: '66%', left: '12%' }}>Praça Teste</span>
              <span style={{ ...styles.mapLabelPoi, top: '45%', left: '48%' }}>Hospital Demo</span>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                style={styles.routeSvg}
              >
                <polyline
                  points={VISUAL_ROUTE_SVG_POINTS}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={VISUAL_ROUTE_SVG_POINTS}
                  fill="none"
                  stroke="#3824d6"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                data-testid="visual-courier-marker"
                style={{
                  ...styles.courierMarker,
                  left: `${currentMapPosition.x}%`,
                  top: `${currentMapPosition.y}%`,
                }}
              >
                <img src={courierScooter3d} alt="Motoqueiro fictício" style={styles.courierImage} />
              </div>
              <div
                aria-label="Endereço fictício de entrega"
                style={{
                  ...styles.destinationMarker,
                  left: `${destinationMapPosition.x}%`,
                  top: `${destinationMapPosition.y}%`,
                }}
              >
                <span />
              </div>
              <div style={styles.etaBadge}>Chega em 15 min</div>
              <small style={styles.fakeMapNotice}>Mapa fictício para teste visual local</small>
            </div>
            <div aria-live="polite" style={styles.animationBadge}>
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
  fakeMap: { position: 'relative', width: '100%', height: 'min(68vh, 650px)', minHeight: 520, overflow: 'hidden', border: '1px solid #dce3e6', borderRadius: 12, background: '#e9eef1', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.6)' },
  road: { position: 'absolute', height: 12, border: '1px solid #d4dbde', background: '#fff', boxShadow: '0 0 0 2px rgba(225,231,233,.8)' },
  majorRoad: { position: 'absolute', height: 18, border: '1px solid #c9d1d5', background: '#fdfdfd', boxShadow: '0 0 0 3px rgba(218,225,228,.9)' },
  mapLabel: { position: 'absolute', zIndex: 2, color: '#6d777c', fontSize: 10, fontWeight: 600, transform: 'rotate(-5deg)' },
  mapLabelPoi: { position: 'absolute', zIndex: 2, color: '#dc5961', fontSize: 9, fontWeight: 700 },
  routeSvg: { position: 'absolute', zIndex: 3, inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  courierMarker: { position: 'absolute', zIndex: 6, width: 56, height: 56, transform: 'translate(-50%, -50%)', transition: 'left 260ms linear, top 260ms linear', filter: 'drop-shadow(0 6px 8px rgba(25,34,40,.2))' },
  courierImage: { width: '100%', height: '100%', objectFit: 'contain' },
  destinationMarker: { position: 'absolute', zIndex: 5, width: 28, height: 28, display: 'grid', placeItems: 'center', transform: 'translate(-50%, -50%) rotate(-45deg)', border: '4px solid #fff', borderRadius: '50% 50% 50% 0', background: '#ef4444', boxShadow: '0 4px 10px rgba(239,68,68,.3)' },
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
