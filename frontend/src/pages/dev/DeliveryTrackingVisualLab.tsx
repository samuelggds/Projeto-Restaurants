import { FormEvent, type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { Bike, CheckCircle2, CircleDot, Send, ShoppingBag, UserRound } from 'lucide-react';
import CustomerDeliveryMap from '../tracking/CustomerDeliveryMap';
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

const DESTINATION = { ...VISUAL_TRACKING_ROUTE[VISUAL_TRACKING_ROUTE.length - 1], label: 'Rua Fictícia, 123 — Bairro Teste' };

type LocalMessage = { id: string; side: 'courier' | 'customer'; text: string; time: string };

const INITIAL_MESSAGES: LocalMessage[] = [
  { id: 'courier-1', side: 'courier', text: 'Olá! Estou saindo do restaurante agora com o seu pedido. Chego em alguns minutos.', time: '15:30' },
  { id: 'customer-1', side: 'customer', text: 'Combinado! Vou descer para a portaria. Obrigado!', time: '15:31' },
];

function distance(a: CourierRoutePoint, b: CourierRoutePoint) {
  return Math.hypot(a.latitude - b.latitude, a.longitude - b.longitude);
}

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
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const currentPoint = useMemo(() => interpolateVisualRoute(VISUAL_TRACKING_ROUTE, progress), [progress]);
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
    <section data-testid="delivery-tracking-visual-lab" data-google-map-source="production" data-animation-duration-ms={VISUAL_TRACKING_ANIMATION_MS} style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button type="button" onClick={onBack} style={styles.brandButton}>
            <span style={styles.logo}>G</span>
            <span style={styles.brandCopy}>
              <strong>North Pizza — Teste visual</strong>
              <small style={styles.openText}><i style={styles.openDot} /> Aberto agora</small>
            </span>
          </button>
          <div style={styles.headerActions}>
            <button type="button" style={styles.headerPlainButton}><UserRound size={15} /> Olá, Entrar</button>
            <button type="button" style={styles.cartButton}><ShoppingBag size={15} /> Meu Carrinho <b style={styles.cartBadge}>3</b></button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <h1 style={styles.title}>Acompanhe seu Pedido</h1>
        <div style={styles.layout}>
          <section style={styles.mapCard}>
            <CustomerDeliveryMap
              points={[currentPoint]}
              routePath={VISUAL_TRACKING_ROUTE}
              destination={DESTINATION}
              etaMinutes={Math.max(1, Math.ceil(remainingSeconds / 60))}
              distanceMeters={3500 * (1 - progress)}
              courierName="Eduardo Silva"
              isTerminal={progress >= 1}
            />
            <div aria-live="polite" style={styles.animationBadge}>
              <Bike size={14} />
              <span style={styles.badgeCopy}>
                <strong>{progress >= 1 ? 'Motoqueiro chegou ao endereço' : 'Percurso fictício em tempo real'}</strong>
                <small>{progress >= 1 ? 'Animação concluída' : String(remainingSeconds) + 's restantes da simulação de 1 minuto'}</small>
              </span>
            </div>
          </section>

          <aside style={styles.side}>
            <section style={styles.panel}>
              <h2 style={styles.panelTitle}>Status da Entrega</h2>
              <div style={styles.statusList}>
                <div style={styles.statusItem}><CheckCircle2 size={17} color="#22a35a" /><span>Pedido recebido</span></div>
                <div style={styles.statusItem}><CheckCircle2 size={17} color="#22a35a" /><span>Em preparação na cozinha</span></div>
                <div style={{ ...styles.statusItem, color: '#e8562c', fontWeight: 800 }}><CircleDot size={17} color="#e8562c" /><span>{progress >= 1 ? 'Chegou ao endereço' : 'Saiu para entrega (Rota)'}</span></div>
              </div>
            </section>

            <section style={styles.courierCard}>
              <span style={styles.avatar}>ES</span>
              <span style={styles.brandCopy}><strong>Eduardo Silva</strong><small style={styles.rating}>★ 4,9 (Melhor profissional)</small></span>
            </section>

            <section style={styles.panel}>
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
  headerInner: { width: 'min(1160px, calc(100% - 32px))', minHeight: 72, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' },
  brandButton: { padding: 0, display: 'flex', alignItems: 'center', gap: 11, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' },
  logo: { width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 9, color: '#fff', background: '#e8562c', fontWeight: 900 },
  brandCopy: { display: 'grid', gap: 3 },
  openText: { display: 'flex', alignItems: 'center', gap: 5, color: '#77726d', fontSize: 10 },
  openDot: { width: 7, height: 7, borderRadius: '50%', background: '#22c55e' },
  headerActions: { display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' },
  headerPlainButton: { minHeight: 36, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 7, border: 0, borderRadius: 9, background: 'transparent', fontSize: 12, fontWeight: 700 },
  cartButton: { minHeight: 36, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 7, border: 0, borderRadius: 9, color: '#fff', background: '#e8562c', fontSize: 12, fontWeight: 800 },
  cartBadge: { minWidth: 18, height: 18, display: 'grid', placeItems: 'center', borderRadius: 999, color: '#e8562c', background: '#fff', fontSize: 9 },
  main: { width: 'min(1160px, calc(100% - 32px))', margin: '0 auto', padding: '38px 0 48px' },
  title: { margin: '0 0 22px', fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.1 },
  layout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))', gap: 30, alignItems: 'start' },
  mapCard: { position: 'relative', minWidth: 0 },
  animationBadge: { position: 'absolute', zIndex: 7, right: 14, bottom: 14, maxWidth: 'calc(100% - 28px)', padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 9, border: '1px solid rgba(232,86,44,.18)', borderRadius: 10, background: 'rgba(255,255,255,.95)', boxShadow: '0 9px 24px rgba(31,30,26,.12)' },
  badgeCopy: { display: 'grid', gap: 2, fontSize: 10 },
  side: { display: 'grid', gap: 18, minWidth: 0 },
  panel: { ...card, padding: 22 },
  panelTitle: { margin: 0, fontSize: 14 },
  statusList: { marginTop: 18, display: 'grid', gap: 15 },
  statusItem: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 600 },
  courierCard: { ...card, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, display: 'grid', placeItems: 'center', flex: '0 0 auto', borderRadius: '50%', color: '#fff', background: 'linear-gradient(145deg,#344150,#111827)', fontSize: 11, fontWeight: 900 },
  rating: { color: '#2c8b43', fontSize: 9, fontWeight: 800 },
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
