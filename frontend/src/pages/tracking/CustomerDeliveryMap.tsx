import { useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, MapPinOff } from 'lucide-react';
import courierScooter3d from '../../assets/tracking/courier-scooter-gastronexa-3d.webp';
import type { CourierRoutePoint } from '../Courier/domain/courierLocation';
import * as S from './CustomerDeliveryMap.styles';

type Destination = CourierRoutePoint & { label?: string };

type LatLng = { lat: number; lng: number };
type MapPadding = { top: number; right: number; bottom: number; left: number };
type GoogleLatLngBounds = {
  extend(position: LatLng): void;
  contains(position: LatLng): boolean;
};
type GoogleMapInstance = {
  getBounds(): GoogleLatLngBounds | undefined;
  panTo(position: LatLng): void;
  fitBounds(bounds: GoogleLatLngBounds, padding: MapPadding): void;
};
type GoogleMarkerInstance = {
  setPosition(position: LatLng): void;
  setIcon(icon: Record<string, unknown>): void;
};
type GooglePolylineInstance = {
  setPath(path: LatLng[]): void;
};
type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
  Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance;
  Polyline: new (options: Record<string, unknown>) => GooglePolylineInstance;
  LatLngBounds: new () => GoogleLatLngBounds;
};

declare global {
  interface Window {
    __gastronexaGoogleMapsPromise?: Promise<GoogleMapsApi>;
  }
}

function getLoadedGoogleMaps() {
  return (window.google as { maps?: GoogleMapsApi } | undefined)?.maps;
}

const GOOGLE_MAPS_SCRIPT_ID = 'gastronexa-google-maps';
const DEFAULT_CENTER = { lat: -3.7319, lng: -38.5267 };
const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#eef2f3' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#53656b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d7dfe1' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#f4f6f6' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#d9e0e2' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fbfcfc' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e6ecee' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b8dce8' }] },
];

function loadGoogleMaps() {
  const apiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  if (!apiKey) return Promise.reject(new Error('Google Maps ainda não foi configurado neste ambiente.'));
  const loadedMaps = getLoadedGoogleMaps();
  if (loadedMaps) return Promise.resolve(loadedMaps);
  if (window.__gastronexaGoogleMapsPromise) return window.__gastronexaGoogleMapsPromise;

  window.__gastronexaGoogleMapsPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => {
        const maps = getLoadedGoogleMaps();
        if (maps) resolve(maps);
        else reject(new Error('Google Maps não ficou disponível após o carregamento.'));
      });
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar Google Maps.')));
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    script.onload = () => {
      const maps = getLoadedGoogleMaps();
        if (maps) resolve(maps);
      else reject(new Error('Google Maps não ficou disponível após o carregamento.'));
    };
    script.onerror = () => reject(new Error('Falha ao carregar Google Maps.'));
    document.head.appendChild(script);
  });

  return window.__gastronexaGoogleMapsPromise;
}

function squaredDistance(a: CourierRoutePoint, b: CourierRoutePoint) {
  const lat = a.latitude - b.latitude;
  const lng = a.longitude - b.longitude;
  return lat * lat + lng * lng;
}

function remainingRoute(routePath: CourierRoutePoint[], latest: CourierRoutePoint) {
  if (routePath.length < 2) return routePath;
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  routePath.forEach((point, index) => {
    const distance = squaredDistance(point, latest);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  const remaining = routePath.slice(nearestIndex);
  const future = remaining.filter((point) => squaredDistance(point, latest) > 0.00000001);
  return future.length ? [latest, ...future] : [latest, routePath[routePath.length - 1]].filter(Boolean);
}

function toLatLng(point: CourierRoutePoint) {
  return { lat: point.latitude, lng: point.longitude };
}

function destinationSvg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="54" height="64" viewBox="0 0 54 64">
    <path d="M27 3C14.9 3 5 12.8 5 25c0 16.4 22 36 22 36s22-19.6 22-36C49 12.8 39.1 3 27 3z" fill="#e45118" stroke="#fff" stroke-width="3"/>
    <circle cx="27" cy="25" r="8" fill="#fff"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function CustomerDeliveryMap({
  points,
  routePath = [],
  destination,
  etaMinutes,
  distanceMeters,
  courierName = 'Motoqueiro',
  isTerminal = false,
}: {
  points: CourierRoutePoint[];
  routePath?: CourierRoutePoint[];
  destination?: Destination;
  etaMinutes?: number | null;
  distanceMeters?: number | null;
  courierName?: string;
  isTerminal?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const bikeMarkerRef = useRef<GoogleMarkerInstance | null>(null);
  const destinationMarkerRef = useRef<GoogleMarkerInstance | null>(null);
  const routeLineRef = useRef<GooglePolylineInstance | null>(null);
  const mapsRef = useRef<GoogleMapsApi | null>(null);
  const initializedBoundsRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const previousPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const [mapError, setMapError] = useState('');
  const [mapsReady, setMapsReady] = useState(false);

  const latest = points[points.length - 1];
  const initialCenterRef = useRef(
    latest ? toLatLng(latest) : destination ? toLatLng(destination) : DEFAULT_CENTER,
  );
  const remaining = useMemo(
    () => (latest && !isTerminal ? remainingRoute(routePath, latest) : []),
    [isTerminal, latest, routePath],
  );

  useEffect(() => {
    let active = true;
    loadGoogleMaps()
      .then((maps) => {
        if (!active || !containerRef.current || mapRef.current) return;
        mapsRef.current = maps;
        mapRef.current = new maps.Map(containerRef.current, {
          center: initialCenterRef.current,
          zoom: 15,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          styles: MAP_STYLES,
          backgroundColor: '#eef2f3',
        });
        routeLineRef.current = new maps.Polyline({
          map: mapRef.current,
          path: [],
          geodesic: true,
          strokeColor: '#2f76f6',
          strokeOpacity: 0.98,
          strokeWeight: 7,
          zIndex: 2,
        });
        setMapError('');
        setMapsReady(true);
      })
      .catch((error) => {
        if (active) setMapError(error instanceof Error ? error.message : 'Não foi possível carregar o mapa.');
      });

    return () => {
      active = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!mapsReady || !maps || !map || !latest) return;

    const target = toLatLng(latest);
    if (!bikeMarkerRef.current) {
      bikeMarkerRef.current = new maps.Marker({
        map,
        position: target,
        title: courierName,
        optimized: false,
        zIndex: 8,
        icon: {
          url: courierScooter3d,
          scaledSize: { width: 96, height: 89 },
          anchor: { x: 48, y: 82 },
        },
      });
      previousPositionRef.current = target;
    } else {
      bikeMarkerRef.current.setIcon({
        url: courierScooter3d,
        scaledSize: { width: 96, height: 89 },
        anchor: { x: 48, y: 82 },
      });
      const start = previousPositionRef.current || target;
      const startedAt = performance.now();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / 900);
        const eased = 1 - Math.pow(1 - progress, 3);
        const position = {
          lat: start.lat + (target.lat - start.lat) * eased,
          lng: start.lng + (target.lng - start.lng) * eased,
        };
        bikeMarkerRef.current?.setPosition(position);
        if (progress < 1) animationRef.current = requestAnimationFrame(animate);
        else previousPositionRef.current = target;
      };
      animationRef.current = requestAnimationFrame(animate);
    }

    const bounds = map.getBounds?.();
    if (initializedBoundsRef.current && bounds && !bounds.contains(target)) map.panTo(target);
  }, [courierName, latest, mapsReady]);

  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!mapsReady || !maps || !map) return;

    if (destination) {
      const position = toLatLng(destination);
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = new maps.Marker({
          map,
          position,
          title: destination.label || 'Endereço de entrega',
          zIndex: 9,
          icon: {
            url: destinationSvg(),
            scaledSize: { width: 54, height: 64 },
            anchor: { x: 27, y: 61 },
          },
        });
      } else {
        destinationMarkerRef.current.setPosition(position);
      }
    }

    routeLineRef.current?.setPath(remaining.map(toLatLng));

    if (!initializedBoundsRef.current && latest) {
      const bounds = new maps.LatLngBounds();
      bounds.extend(toLatLng(latest));
      if (destination) bounds.extend(toLatLng(destination));
      remaining.forEach((point) => bounds.extend(toLatLng(point)));
      map.fitBounds(bounds, { top: 90, right: 52, bottom: 72, left: 52 });
      initializedBoundsRef.current = true;
    }
  }, [destination, latest, mapsReady, remaining]);

  const recenter = () => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!maps || !map || !latest) return;
    const bounds = new maps.LatLngBounds();
    bounds.extend(toLatLng(latest));
    if (destination) bounds.extend(toLatLng(destination));
    remaining.forEach((point) => bounds.extend(toLatLng(point)));
    map.fitBounds(bounds, { top: 90, right: 52, bottom: 72, left: 52 });
  };

  const distanceLabel = Number.isFinite(distanceMeters)
    ? `${(Number(distanceMeters) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km restantes`
    : 'Rota em acompanhamento';

  return (
    <S.Shell
      className="customer-google-delivery-map delivery-map-shell"
      data-courier-latitude={latest?.latitude ?? ''}
      data-courier-longitude={latest?.longitude ?? ''}
      data-tracking-terminal={isTerminal ? 'true' : 'false'}
    >
      <S.Canvas ref={containerRef} aria-label="Mapa Google com a rota da entrega" />
      {mapError ? (
        <S.ErrorState role="alert">
          <MapPinOff aria-hidden="true" />
          <strong>Mapa indisponível</strong>
          <p>{mapError} O rastreamento do pedido continua funcionando normalmente.</p>
        </S.ErrorState>
      ) : null}
      {!mapError ? (
        <>
          <S.EtaCard aria-live="polite">
            <small>{isTerminal ? 'Última rota' : 'Chegada estimada'}</small>
            <strong>{etaMinutes ? `${etaMinutes} min` : 'Em rota'}</strong>
            <span>{distanceLabel}</span>
          </S.EtaCard>
          <S.RecenterButton type="button" onClick={recenter} aria-label="Centralizar rota">
            <LocateFixed aria-hidden="true" />
          </S.RecenterButton>
          <S.LiveBadge>
            <i aria-hidden="true" />
            {isTerminal ? 'Rastreamento encerrado' : `${courierName} em tempo real`}
          </S.LiveBadge>
        </>
      ) : null}
    </S.Shell>
  );
}
