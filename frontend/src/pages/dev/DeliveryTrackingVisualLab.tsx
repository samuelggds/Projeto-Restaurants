import { FormEvent, type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Pause,
  Phone,
  Play,
  RotateCcw,
  Send,
} from 'lucide-react';
import courierViews from '../../assets/tracking/courier-lab-six-views.png';
import fictitiousGoogleMap from '../../assets/tracking/delivery-lab-map.png';
import {
  COURIER_DIRECTION_NAMES,
  VISUAL_MAP_HEIGHT,
  VISUAL_MAP_WIDTH,
  VISUAL_ROUTE_PATH,
  VISUAL_TRACKING_ANIMATION_MS,
  VISUAL_TRACKING_ROUTE,
  getCourierDirectionIndex,
  getCourierSpriteFrame,
  getVisualRouteFrame,
} from './deliveryVisualRoute';

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

export default function DeliveryTrackingVisualLab({ onBack }: { onBack?: () => void }) {
  const elapsedRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(
    () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  const [playbackId, setPlaybackId] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [courierReady, setCourierReady] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!running || !mapReady || !courierReady) return undefined;
    const startedAt = performance.now() - elapsedRef.current;
    let animationFrame = 0;

    const update = (now: number) => {
      elapsedRef.current = Math.min(VISUAL_TRACKING_ANIMATION_MS, Math.max(0, now - startedAt));
      const nextProgress = elapsedRef.current / VISUAL_TRACKING_ANIMATION_MS;
      setProgress(nextProgress);

      if (nextProgress < 1) {
        animationFrame = window.requestAnimationFrame(update);
      } else {
        setRunning(false);
      }
    };

    animationFrame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [running, playbackId, mapReady, courierReady]);

  const restart = () => {
    elapsedRef.current = 0;
    setProgress(0);
    setPlaybackId((current) => current + 1);
    setRunning(true);
  };

  const currentFrame = useMemo(
    () => getVisualRouteFrame(VISUAL_TRACKING_ROUTE, progress),
    [progress],
  );
  const courierDirectionIndex = getCourierDirectionIndex(currentFrame.angleDegrees);
  const courierDirection = COURIER_DIRECTION_NAMES[courierDirectionIndex];
  const courierSprite = getCourierSpriteFrame(courierDirectionIndex);
  const assetsReady = mapReady && courierReady;
  const arrived = progress >= 1;
  const remainingSeconds = Math.max(
    0,
    Math.ceil((VISUAL_TRACKING_ANIMATION_MS * (1 - progress)) / 1000),
  );
  const remainingLabel = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`;

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
            border: 0 !important;
            border-radius: 0 !important;
          }

          [data-testid="visual-courier-marker"] {
            width: 48px !important;
            height: 48px !important;
          }

          .tracking-map-controls {
            border-radius: 0 !important;
            padding: 14px !important;
          }

          .tracking-eta {
            top: 8px !important;
            left: 8px !important;
            padding: 5px 9px !important;
            font-size: 10px !important;
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
              style={styles.mapSurface}
            >
              <img
                data-testid="visual-map-image"
                src={fictitiousGoogleMap}
                alt="Mapa fictício da rota pelas ruas Rosinha, Paiol e Avenida Tenente Lisboa"
                width={VISUAL_MAP_WIDTH}
                height={VISUAL_MAP_HEIGHT}
                onLoad={() => setMapReady(true)}
                style={styles.mapImage}
                draggable={false}
              />
              <img
                data-testid="visual-courier-sheet"
                src={courierViews}
                alt=""
                onLoad={() => setCourierReady(true)}
                style={{ display: 'none' }}
              />
              <svg
                viewBox={`0 0 ${VISUAL_MAP_WIDTH} ${VISUAL_MAP_HEIGHT}`}
                style={styles.routeOverlay}
                aria-hidden="true"
              >
                <path
                  d={VISUAL_ROUTE_PATH}
                  fill="none"
                  stroke="white"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  data-testid="visual-route-line"
                  d={VISUAL_ROUTE_PATH}
                  fill="none"
                  stroke="#e96725"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={VISUAL_ROUTE_PATH}
                  pathLength="1"
                  fill="none"
                  stroke="#abb8bb"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${progress} 1`}
                />
                <circle
                  cx={VISUAL_TRACKING_ROUTE[0].x}
                  cy={VISUAL_TRACKING_ROUTE[0].y}
                  r="9"
                  fill="#fff"
                  stroke="#e96725"
                  strokeWidth="4"
                />
                <circle
                  cx={VISUAL_TRACKING_ROUTE.at(-1)!.x}
                  cy={VISUAL_TRACKING_ROUTE.at(-1)!.y}
                  r="11"
                  fill="#fff"
                  stroke={arrived ? '#22a35a' : '#e96725'}
                  strokeWidth="4"
                />
                <circle
                  cx={VISUAL_TRACKING_ROUTE.at(-1)!.x}
                  cy={VISUAL_TRACKING_ROUTE.at(-1)!.y}
                  r="4"
                  fill={arrived ? '#22a35a' : '#e96725'}
                />
              </svg>
              <div
                data-testid="visual-courier-marker"
                data-sprite-direction={courierDirection}
                data-sprite-index={courierDirectionIndex}
                style={{
                  ...styles.courierMapMarker,
                  left: `${(currentFrame.point.x / VISUAL_MAP_WIDTH) * 100}%`,
                  top: `${(currentFrame.point.y / VISUAL_MAP_HEIGHT) * 100}%`,
                  visibility: courierReady ? 'visible' : 'hidden',
                }}
              >
                <span style={styles.courierMapShadow} aria-hidden="true" />
                <span
                  data-testid="visual-courier-sprite"
                  role="img"
                  aria-label="Motoqueiro 3D fictício em movimento"
                  style={{
                    ...styles.courierMapSprite,
                    backgroundImage: `url(${courierViews})`,
                    backgroundPosition: `${courierSprite.column * 50}% ${courierSprite.row * 100}%`,
                    transform: courierSprite.mirror ? 'scaleX(-1)' : undefined,
                  }}
                />
              </div>

              <div className="tracking-eta" style={styles.etaBadge}>
                {arrived ? 'Entregador chegou' : 'Percurso de 1 minuto'}
              </div>

              <small style={styles.mapNotice}>Mapa fictício local para teste visual</small>
            </div>

            <div className="tracking-map-controls" style={styles.mapControls}>
              <div style={styles.playbackSummary}>
                <div style={styles.playbackHeading}>
                  <span
                    style={{
                      ...styles.liveDot,
                      background: running && assetsReady ? '#22a35a' : '#9aa5a4',
                    }}
                  />
                  <strong aria-live="polite">
                    {!assetsReady
                      ? 'Preparando o percurso'
                      : arrived
                        ? 'Motoqueiro chegou ao endereço'
                        : running
                          ? 'Simulação do GPS em tempo real'
                          : 'Simulação pausada'}
                  </strong>
                </div>
                <small style={styles.playbackDetail}>
                  {arrived
                    ? 'Animação concluída'
                    : `${remainingSeconds}s restantes · ${Math.round(progress * 100)}% do percurso`}
                </small>
              </div>
              <span style={styles.countdown} aria-hidden="true">
                {remainingLabel}
              </span>
              <div style={styles.playbackButtons}>
                <button
                  type="button"
                  style={styles.playbackButton}
                  aria-label={
                    running
                      ? 'Pausar simulação'
                      : progress === 0 || arrived
                        ? 'Iniciar simulação'
                        : 'Continuar simulação'
                  }
                  disabled={!assetsReady}
                  onClick={() => (arrived ? restart() : setRunning((current) => !current))}
                >
                  {running ? <Pause size={16} /> : <Play size={16} />}
                  {running ? 'Pausar' : 'Iniciar'}
                </button>
                <button
                  type="button"
                  onClick={restart}
                  disabled={!assetsReady}
                  aria-label="Reiniciar rota"
                  style={styles.replayButton}
                >
                  <RotateCcw size={16} />
                  Reiniciar
                </button>
              </div>
              <div style={styles.progressTrack}>
                <div
                  role="progressbar"
                  aria-label="Progresso da rota fictícia"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                  style={{ ...styles.progressFill, width: `${progress * 100}%` }}
                />
              </div>
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
                      ...(message.side === 'customer' ? styles.messageMine : styles.messageCourier),
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
    width: 'min(1320px, calc(100% - 40px))',
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
    gridTemplateColumns: 'minmax(0, 1.6fr) minmax(300px, .9fr)',
    gap: 26,
    alignItems: 'start',
  },
  mapCard: { position: 'relative', minWidth: 0 },
  mapSurface: {
    position: 'relative',
    width: '100%',
    aspectRatio: `${VISUAL_MAP_WIDTH} / ${VISUAL_MAP_HEIGHT}`,
    overflow: 'hidden',
    border: '1px solid #d7dcd7',
    borderRadius: '12px 12px 0 0',
    backgroundColor: '#eef2f6',
  },
  mapImage: {
    position: 'absolute',
    inset: 0,
    display: 'block',
    width: '100%',
    height: '100%',
    userSelect: 'none',
  },
  routeOverlay: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  courierMapMarker: {
    position: 'absolute',
    zIndex: 12,
    width: 70,
    height: 70,
    transform: 'translate(-50%, -88%)',
    pointerEvents: 'none',
    willChange: 'left, top',
  },
  courierMapShadow: {
    position: 'absolute',
    zIndex: 0,
    left: '50%',
    bottom: '8%',
    width: '45%',
    height: '9%',
    borderRadius: '50%',
    background: 'rgba(17,24,39,.2)',
    filter: 'blur(2px)',
    transform: 'translateX(-50%)',
  },
  courierMapSprite: {
    position: 'absolute',
    zIndex: 1,
    inset: 0,
    display: 'block',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '300% 200%',
    backgroundColor: 'transparent',
    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.14))',
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
  mapControls: {
    padding: '18px 20px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: '14px 12px',
    alignItems: 'center',
    border: '1px solid #e5e1dc',
    borderTop: 0,
    borderRadius: '0 0 12px 12px',
    background: '#fff',
  },
  playbackSummary: { minWidth: 0, display: 'grid', gap: 5 },
  playbackHeading: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 },
  playbackDetail: { color: '#7b8183', fontSize: 11 },
  liveDot: { flexShrink: 0, width: 7, height: 7, borderRadius: '50%' },
  countdown: {
    fontSize: 24,
    fontWeight: 750,
    fontVariantNumeric: 'tabular-nums',
    color: '#273637',
  },
  playbackButtons: { display: 'flex', flexWrap: 'wrap', gap: 8, gridColumn: '1 / -1' },
  playbackButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 38,
    padding: '8px 14px',
    border: '1px solid #e96725',
    borderRadius: 8,
    color: '#fff',
    background: '#e96725',
    fontSize: 12,
    fontWeight: 650,
    cursor: 'pointer',
  },
  replayButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 38,
    padding: '8px 14px',
    border: '1px solid #e5e1dc',
    borderRadius: 8,
    color: '#4d5759',
    background: '#fff',
    fontSize: 12,
    fontWeight: 650,
    cursor: 'pointer',
  },
  progressTrack: {
    gridColumn: '1 / -1',
    height: 4,
    background: '#f0efeb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#e96725',
    borderRadius: 4,
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
