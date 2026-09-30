import {
  FormEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ArrowLeft, Bike, CheckCircle2, CircleDot, Minus, Phone, Plus, Send } from 'lucide-react';
import courierDelivery8Dir from '../../assets/tracking/courier-delivery-8dir.jpg';
import type { CourierRoutePoint } from '../Courier/domain/courierLocation';

export const VISUAL_TRACKING_ANIMATION_MS = 60_000;
export const VISUAL_MAP_MIN_ZOOM = 0.55;
export const VISUAL_MAP_MAX_ZOOM = 2.4;
export const VISUAL_MAP_ZOOM_STEP = 0.1;

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

type VisualPointer = { x: number; y: number };

function clampVisualMapZoom(value: number) {
  return Math.max(VISUAL_MAP_MIN_ZOOM, Math.min(VISUAL_MAP_MAX_ZOOM, value));
}

function pointerDistance(a: VisualPointer, b: VisualPointer) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pointerAngle(a: VisualPointer, b: VisualPointer) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

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


type IsoBuildingProps = {
  x: number;
  y: number;
  scale?: number;
  variant?: 'light' | 'warm' | 'cool';
};

function IsoBuilding({ x, y, scale = 1, variant = 'light' }: IsoBuildingProps) {
  const palette =
    variant === 'warm'
      ? { top: '#f4e1c8', left: '#d7b895', right: '#c7a27d' }
      : variant === 'cool'
        ? { top: '#e8edf0', left: '#c8d0d4', right: '#b6c0c6' }
        : { top: '#f2eee7', left: '#d8d3ca', right: '#c7c1b8' };

  return (
    <g transform={`translate(${x} ${y}) scale(${scale * 0.56})`}>
      <polygon points="0,10 18,2 34,10 16,18" fill={palette.top} />
      <polygon points="0,10 16,18 16,35 0,27" fill={palette.left} />
      <polygon points="16,18 34,10 34,27 16,35" fill={palette.right} />
      <polygon points="5,11 17,6 28,11 16,16" fill="rgba(255,255,255,.34)" />
      <rect x="4" y="17" width="3" height="5" rx=".5" fill="rgba(91,101,105,.22)" />
      <rect x="10" y="20" width="3" height="5" rx=".5" fill="rgba(91,101,105,.18)" />
      <rect x="23" y="17" width="3" height="5" rx=".5" fill="rgba(91,101,105,.18)" />
    </g>
  );
}

function IsoTree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * 0.72})`}>
      <ellipse cx="0" cy="5" rx="4.4" ry="2.2" fill="rgba(63,79,57,.18)" />
      <rect x="-0.7" y="-1" width="1.4" height="6" rx=".6" fill="#8a6a4d" />
      <circle cx="-1.5" cy="-2" r="3.2" fill="#789f55" />
      <circle cx="2" cy="-1" r="3.4" fill="#6f9650" />
      <circle cx=".3" cy="-4.2" r="3.5" fill="#88aa60" />
    </g>
  );
}

function IsometricCityScene() {
  return (
    <svg
      data-testid="visual-isometric-city"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={styles.isometricSvg}
    >
      <defs>
        <linearGradient id="iso-lot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eee5d7" />
          <stop offset="100%" stopColor="#ddd2c1" />
        </linearGradient>
        <linearGradient id="iso-water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5aa8b5" />
          <stop offset="100%" stopColor="#2f8495" />
        </linearGradient>
        <filter id="iso-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="1.2"
            stdDeviation="1.1"
            floodColor="#574f45"
            floodOpacity=".2"
          />
        </filter>
      </defs>

      {/* A pista é o próprio fundo da maquete. Os lotes ficam por cima,
          então nenhuma construção ocupa a rua. */}
      <rect width="100" height="100" fill="#77736c" />

      <path
        d="M84 100 C82 90 89 83 92 73 C95 63 93 54 100 47 L100 100 Z"
        fill="url(#iso-water)"
      />
      <path
        d="M81 100 C80 90 87 82 89 73 C92 62 90 53 98 45"
        fill="none"
        stroke="#d6c9b8"
        strokeWidth="2"
      />

      <g data-testid="visual-isometric-lots">
        <polygon points="2,2 35,2 39,9 29,18 4,18" fill="url(#iso-lot)" stroke="#c8bcaa" strokeWidth=".45" />
        <polygon points="76,2 98,2 98,21 88,24 78,15" fill="url(#iso-lot)" stroke="#c8bcaa" strokeWidth=".45" />
        <polygon points="3,28 33,23 49,31 42,48 8,48" fill="url(#iso-lot)" stroke="#c8bcaa" strokeWidth=".45" />
        <polygon points="54,30 72,24 86,33 82,45 66,48 55,42" fill="url(#iso-lot)" stroke="#c8bcaa" strokeWidth=".45" />
        <polygon points="2,56 31,52 43,60 37,72 7,75" fill="url(#iso-lot)" stroke="#c8bcaa" strokeWidth=".45" />
        <polygon points="76,51 98,47 98,72 84,74 74,64" fill="url(#iso-lot)" stroke="#c8bcaa" strokeWidth=".45" />
        <polygon points="45,72 72,62 82,72 76,91 54,94 43,84" fill="url(#iso-lot)" stroke="#c8bcaa" strokeWidth=".45" />
        <polygon points="2,93 26,83 36,91 33,100 2,100" fill="url(#iso-lot)" stroke="#c8bcaa" strokeWidth=".45" />
      </g>

      <g opacity=".28" data-testid="visual-isometric-curbs">
        <polyline points="2,20 31,20 43,12" fill="none" stroke="#f8f2e9" strokeWidth=".55" />
        <polyline points="74,22 87,27 99,24" fill="none" stroke="#f8f2e9" strokeWidth=".55" />
        <polyline points="2,50 39,50 52,42" fill="none" stroke="#f8f2e9" strokeWidth=".55" />
        <polyline points="2,77 36,74 44,66" fill="none" stroke="#f8f2e9" strokeWidth=".55" />
        <polyline points="43,96 76,93 84,77" fill="none" stroke="#f8f2e9" strokeWidth=".55" />
      </g>

      {/* Rota apenas indica navegação; não cria outra rua por cima da maquete. */}
      <polyline
        data-testid="visual-navigation-route"
        points={VISUAL_STREET_SVG_POINTS}
        fill="none"
        stroke="#d8cbb9"
        strokeWidth=".42"
        strokeDasharray=".7 .85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Todos os elementos urbanos abaixo ficam intencionalmente dentro dos lotes. */}
      <g filter="url(#iso-shadow)" data-testid="visual-isometric-buildings">
        <IsoBuilding x={7} y={6} scale={0.84} />
        <IsoBuilding x={19} y={8} scale={0.64} variant="cool" />
        <IsoBuilding x={27} y={5} scale={0.54} variant="warm" />

        <IsoBuilding x={80} y={6} scale={0.62} variant="warm" />
        <IsoBuilding x={89} y={9} scale={0.5} variant="cool" />

        <IsoBuilding x={8} y={31} scale={0.64} />
        <IsoBuilding x={19} y={29} scale={0.72} variant="cool" />
        <IsoBuilding x={31} y={34} scale={0.58} variant="warm" />

        <IsoBuilding x={59} y={32} scale={0.56} variant="warm" />
        <IsoBuilding x={69} y={29} scale={0.7} variant="cool" />
        <IsoBuilding x={75} y={36} scale={0.5} />

        <IsoBuilding x={8} y={59} scale={0.6} variant="warm" />
        <IsoBuilding x={19} y={57} scale={0.72} />
        <IsoBuilding x={29} y={61} scale={0.52} variant="cool" />

        <IsoBuilding x={80} y={54} scale={0.56} variant="cool" />
        <IsoBuilding x={88} y={58} scale={0.62} />

        <IsoBuilding x={50} y={75} scale={0.6} />
        <IsoBuilding x={61} y={70} scale={0.7} variant="cool" />
        <IsoBuilding x={69} y={78} scale={0.54} variant="warm" />

        <IsoBuilding x={7} y={91} scale={0.52} variant="cool" />
        <IsoBuilding x={18} y={87} scale={0.58} />
        <IsoBuilding x={27} y={92} scale={0.46} variant="warm" />
      </g>

      <g data-testid="visual-isometric-trees">
        <IsoTree x={6} y={15} scale={0.56} />
        <IsoTree x={31} y={14} scale={0.5} />
        <IsoTree x={82} y={18} scale={0.5} />
        <IsoTree x={95} y={13} scale={0.46} />

        <IsoTree x={7} y={44} scale={0.52} />
        <IsoTree x={38} y={43} scale={0.48} />
        <IsoTree x={60} y={44} scale={0.48} />
        <IsoTree x={79} y={41} scale={0.5} />

        <IsoTree x={8} y={70} scale={0.52} />
        <IsoTree x={33} y={68} scale={0.48} />
        <IsoTree x={84} y={68} scale={0.48} />
        <IsoTree x={94} y={65} scale={0.44} />

        <IsoTree x={50} y={88} scale={0.5} />
        <IsoTree x={72} y={86} scale={0.48} />
        <IsoTree x={8} y={97} scale={0.44} />
      </g>

      <path
        d="M79 82 L91 76 L94 80 L81 86 Z"
        fill="#d6d0c6"
        stroke="#8d8c88"
        strokeWidth=".5"
      />
      <path d="M80 81.5 L92 75.5" stroke="#f6f2eb" strokeWidth="1.1" />
    </svg>
  );
}

export default function DeliveryTrackingVisualLab({ onBack }: { onBack?: () => void }) {
  const startedAtRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState<LocalMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const [mapZoom, setMapZoom] = useState(1);
  const [manualMapRotation, setManualMapRotation] = useState(0);
  const [isMapDragging, setIsMapDragging] = useState(false);
  const manualMapRotationRef = useRef(0);
  const activePointersRef = useRef(new Map<number, VisualPointer>());
  const dragGestureRef = useRef<{
    pointerId: number;
    startX: number;
    startRotation: number;
  } | null>(null);
  const pinchGestureRef = useRef<{
    startDistance: number;
    startAngle: number;
    startZoom: number;
    startRotation: number;
  } | null>(null);

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
  const cameraAnchor = useMemo(() => ({ x: 50, y: 62 }), []);
  const cameraTranslate = useMemo(
    () => ({
      x: cameraAnchor.x - currentMapPosition.x,
      y: cameraAnchor.y - currentMapPosition.y,
    }),
    [cameraAnchor, currentMapPosition],
  );
  const cameraRotation = useMemo(
    () => getVisualCameraRotation(currentFrame.angleDegrees),
    [currentFrame.angleDegrees],
  );
  const visualCameraRotation = cameraRotation * 0.08;
  const finalMapRotation = normalizeVisualAngle(
    visualCameraRotation + manualMapRotation,
  );
  const courierDirectionIndex = useMemo(
    () => getCourierDirectionIndex(currentFrame.angleDegrees, finalMapRotation),
    [currentFrame.angleDegrees, finalMapRotation],
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

  const updateManualMapRotation = (nextRotation: number) => {
    const normalized = normalizeVisualAngle(nextRotation);
    manualMapRotationRef.current = normalized;
    setManualMapRotation(normalized);
  };

  const handleMapWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? VISUAL_MAP_ZOOM_STEP : -VISUAL_MAP_ZOOM_STEP;
    setMapZoom((current) =>
      Number(clampVisualMapZoom(current + delta).toFixed(2)),
    );
  };

  const handleMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const point = { x: event.clientX, y: event.clientY };
    activePointersRef.current.set(event.pointerId, point);
    const pointers = Array.from(activePointersRef.current.entries());

    if (pointers.length >= 2) {
      const first = pointers[0][1];
      const second = pointers[1][1];
      pinchGestureRef.current = {
        startDistance: Math.max(1, pointerDistance(first, second)),
        startAngle: pointerAngle(first, second),
        startZoom: mapZoom,
        startRotation: manualMapRotationRef.current,
      };
      dragGestureRef.current = null;
      setIsMapDragging(true);
      return;
    }

    dragGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startRotation: manualMapRotationRef.current,
    };
    setIsMapDragging(true);
  };

  const handleMapPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(event.pointerId)) return;

    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const pointers = Array.from(activePointersRef.current.values());
    if (pointers.length >= 2 && pinchGestureRef.current) {
      const [first, second] = pointers;
      const distanceNow = Math.max(1, pointerDistance(first, second));
      const angleNow = pointerAngle(first, second);
      const pinch = pinchGestureRef.current;

      setMapZoom(
        Number(
          clampVisualMapZoom(
            pinch.startZoom * (distanceNow / pinch.startDistance),
          ).toFixed(2),
        ),
      );
      updateManualMapRotation(
        pinch.startRotation + normalizeVisualAngle(angleNow - pinch.startAngle),
      );
      return;
    }

    const drag = dragGestureRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const horizontalDelta = event.clientX - drag.startX;
    updateManualMapRotation(drag.startRotation + horizontalDelta * 0.42);
  };

  const finishMapPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    const pointers = Array.from(activePointersRef.current.entries());
    pinchGestureRef.current = null;

    if (pointers.length === 1) {
      const [pointerId, point] = pointers[0];
      dragGestureRef.current = {
        pointerId,
        startX: point.x,
        startRotation: manualMapRotationRef.current,
      };
      setIsMapDragging(true);
      return;
    }

    dragGestureRef.current = null;
    setIsMapDragging(false);
  };

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
    <section data-testid="delivery-tracking-visual-lab" data-map-source="local-isometric-cartoon" data-animation-duration-ms={VISUAL_TRACKING_ANIMATION_MS} style={styles.page}>
      <style>{`
        [data-testid="visual-origin-restaurant-marker"] > span:first-child > span:nth-child(3) i:nth-child(odd) {
          background: #e85a2b;
        }
        [data-testid="visual-origin-restaurant-marker"] > span:first-child > span:nth-child(3) i:nth-child(even) {
          background: #fff4ed;
        }
        [aria-label="Controles de zoom da maquete"] button {
          width: 36px;
          height: 36px;
          padding: 0;
          display: grid;
          place-items: center;
          border: 0;
          background: transparent;
          color: #4d4a45;
          cursor: pointer;
        }
        [aria-label="Controles de zoom da maquete"] button:hover:not(:disabled) {
          background: #f3eee5;
        }
        [aria-label="Controles de zoom da maquete"] button:disabled {
          opacity: .35;
          cursor: not-allowed;
        }
        [aria-label="Controles de zoom da maquete"] > span {
          color: #5f5a52;
          font-size: 10px;
          font-weight: 800;
          text-align: center;
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
            background: #e9e1d4 !important;
          }
          .tracking-animation-badge { display: none !important; }
          [data-testid="visual-courier-marker"] {
            width: 68px !important;
            height: 78px !important;
          }
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
              data-camera-rotation={finalMapRotation.toFixed(2)}
              data-auto-camera-rotation={visualCameraRotation.toFixed(2)}
              data-manual-rotation={manualMapRotation.toFixed(2)}
              data-map-zoom={mapZoom.toFixed(2)}
              onWheel={handleMapWheel}
              onPointerDown={handleMapPointerDown}
              onPointerMove={handleMapPointerMove}
              onPointerUp={finishMapPointer}
              onPointerCancel={finishMapPointer}
              onLostPointerCapture={finishMapPointer}
              style={{
                ...styles.fakeMap,
                cursor: isMapDragging ? 'grabbing' : 'grab',
              }}
            >
              <div
                data-testid="visual-map-scene"
                style={{
                  ...styles.mapScene,
                  transformOrigin: `${currentMapPosition.x}% ${currentMapPosition.y}%`,
                  transform: `translate(${cameraTranslate.x}%, ${cameraTranslate.y}%) rotate(${finalMapRotation}deg) scale(${mapZoom})`,
                }}
              >
                <IsometricCityScene />
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
                data-camera-anchor="50,62"
                style={{
                  ...styles.courierMarker,
                  left: `${cameraAnchor.x}%`,
                  top: `${cameraAnchor.y}%`,
                }}
              >
                <span style={styles.courierRoadShadow} aria-hidden="true" />
                <span data-testid="visual-courier-halo" style={styles.courierHalo} aria-hidden="true" />
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
              <div style={styles.zoomControls} aria-label="Controles de zoom da maquete" onPointerDown={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  aria-label="Reduzir mapa isométrico"
                  disabled={mapZoom <= VISUAL_MAP_MIN_ZOOM}
                  onClick={() =>
                    setMapZoom((current) =>
                      Number(
                        clampVisualMapZoom(current - VISUAL_MAP_ZOOM_STEP).toFixed(2),
                      ),
                    )
                  }
                >
                  <Minus size={16} />
                </button>
                <span aria-live="polite">{Math.round(mapZoom * 100)}%</span>
                <button
                  type="button"
                  aria-label="Ampliar mapa isométrico"
                  disabled={mapZoom >= VISUAL_MAP_MAX_ZOOM}
                  onClick={() =>
                    setMapZoom((current) =>
                      Number(
                        clampVisualMapZoom(current + VISUAL_MAP_ZOOM_STEP).toFixed(2),
                      ),
                    )
                  }
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                type="button"
                aria-label="Redefinir orientação do mapa"
                style={styles.resetRotationButton}
                onClick={(event) => {
                  event.stopPropagation();
                  updateManualMapRotation(0);
                }}
              >
                Norte
              </button>
              <div style={styles.etaBadge}>Chega em 15 min</div>
              <small style={styles.fakeMapNotice}>Arraste para girar • roda/pinça para zoom</small>
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
  fakeMap: { position: 'relative', width: '100%', height: 'min(68vh, 650px)', minHeight: 520, overflow: 'hidden', isolation: 'isolate', border: '1px solid #d6cdbc', borderRadius: 12, background: 'linear-gradient(180deg,#efe8d9 0%,#e4dccd 100%)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.58)', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', overscrollBehavior: 'contain' },
  mapScene: { position: 'absolute', zIndex: 1, inset: '-50%', width: '200%', height: '200%', willChange: 'transform', transition: 'transform 240ms cubic-bezier(.22,1,.36,1)', filter: 'saturate(.95) contrast(.98)' },
  isometricSvg: { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 10px 18px rgba(74,65,52,.08))' },
  cityBlock: { position: 'absolute', zIndex: 0, border: '1px solid #dfe5e2', borderRadius: 9, background: 'linear-gradient(145deg,#e1e8df 0%,#d8e1d8 100%)', boxShadow: 'inset 0 0 0 3px rgba(255,255,255,.22)' },
  road: { position: 'absolute', zIndex: 1, height: 13, border: '1px solid #d5dcdf', background: '#fff', boxShadow: '0 0 0 2px rgba(222,228,231,.9)' },
  mapLabel: { position: 'absolute', zIndex: 2, color: '#6d777c', fontSize: 10, fontWeight: 600, transform: 'rotate(-4deg)' },
  mapLabelPoi: { position: 'absolute', zIndex: 2, color: '#5d8b68', fontSize: 9, fontWeight: 800 },
  streetSvg: { position: 'absolute', zIndex: 3, inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  courierMarker: { position: 'absolute', zIndex: 40, width: 78, height: 88, transform: 'translate(-50%, -58%)', pointerEvents: 'none', filter: 'drop-shadow(0 8px 7px rgba(21,31,39,.28))' },
  courierRoadShadow: { position: 'absolute', zIndex: 0, left: '50%', bottom: 5, width: 38, height: 11, borderRadius: '50%', background: 'rgba(22,31,38,.28)', filter: 'blur(3px)', transform: 'translateX(-50%) scaleX(1.18)' },
  courierHalo: { position: 'absolute', zIndex: 1, left: '50%', top: '52%', width: 48, height: 48, border: '3px solid rgba(232,86,44,.92)', borderRadius: '50%', background: 'rgba(255,255,255,.9)', boxShadow: '0 4px 16px rgba(232,86,44,.28)', transform: 'translate(-50%, -50%)' },
  courierSprite: { position: 'absolute', zIndex: 2, inset: 0, display: 'block', overflow: 'hidden', borderRadius: 16, backgroundRepeat: 'no-repeat', backgroundSize: '400% 200%', backgroundColor: 'transparent', filter: 'contrast(1.08) saturate(1.12) drop-shadow(0 2px 2px rgba(255,255,255,.72))', transform: 'perspective(240px) rotateX(5deg) translateZ(0)', transformOrigin: '50% 82%', willChange: 'background-position' },
  originBuildingPosition: { position: 'absolute', zIndex: 7, transform: 'translate(-50%, -76%) scale(.72)', transformOrigin: '50% 100%', pointerEvents: 'none' },
  destinationBuildingPosition: { position: 'absolute', zIndex: 7, transform: 'translate(-50%, -76%) scale(.68)', transformOrigin: '50% 100%', pointerEvents: 'none' },
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
  zoomControls: { position: 'absolute', zIndex: 50, top: 18, right: 18, minHeight: 36, display: 'grid', gridTemplateColumns: '36px 48px 36px', alignItems: 'center', overflow: 'hidden', border: '1px solid rgba(112,103,91,.2)', borderRadius: 11, background: 'rgba(255,255,255,.94)', boxShadow: '0 7px 20px rgba(63,55,45,.14)', backdropFilter: 'blur(8px)' },
  zoomButton: { width: 36, height: 36, display: 'grid', placeItems: 'center', border: 0, background: 'transparent', color: '#4d4a45', cursor: 'pointer' },
  etaBadge: { position: 'absolute', zIndex: 8, top: 20, left: 20, padding: '8px 16px', border: '1px solid #efece6', borderRadius: 999, color: '#e85a2b', background: '#fff', boxShadow: '0 4px 8px rgba(16,24,39,.08)', fontSize: 13, fontWeight: 800 },
  resetRotationButton: { position: 'absolute', zIndex: 50, top: 62, right: 18, minWidth: 48, height: 30, padding: '0 9px', border: '1px solid rgba(112,103,91,.2)', borderRadius: 9, color: '#5f5a52', background: 'rgba(255,255,255,.94)', boxShadow: '0 5px 14px rgba(63,55,45,.1)', fontSize: 9, fontWeight: 800, cursor: 'pointer' },
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
