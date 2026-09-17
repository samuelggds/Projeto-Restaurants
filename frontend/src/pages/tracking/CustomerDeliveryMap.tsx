import { useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, MapPinOff } from 'lucide-react';
import type { CourierRoutePoint } from '../Courier/domain/courierLocation';
import * as S from './CustomerDeliveryMap.styles';

type Destination = CourierRoutePoint & { label?: string };

type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => any;
  Marker: new (options: Record<string, unknown>) => any;
  Polyline: new (options: Record<string, unknown>) => any;
  LatLngBounds: new () => any;
  SymbolPath: { CIRCLE: unknown };
};

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
    __gastronexaGoogleMapsPromise?: Promise<GoogleMapsApi>;
  }
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
  if (!apiKey) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY não configurada.'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (window.__gastronexaGoogleMapsPromise) return window.__gastronexaGoogleMapsPromise;

  window.__gastronexaGoogleMapsPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.google?.maps) resolve(window.google.maps);
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
      if (window.google?.maps) resolve(window.google.maps);
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

function bikeSvg(heading = 0) {
  const rotation = Number.isFinite(heading) ? Number(heading) : 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="66" height="66" viewBox="0 0 66 66">
    <g transform="rotate(${rotation} 33 33)">
      <circle cx="33" cy="33" r="28" fill="#fff" stroke="#d9e4e7" stroke-width="2"/>
      <circle cx="33" cy="33" r="23" fill="#20a561"/>
      <path d="M33 12l7 13h-5v13h-4V25h-5l7-13z" fill="#fff" opacity=".95"/>
      <circle cx="24" cy="43" r="5" fill="none" stroke="#fff" stroke-width="2.5"/>
      <circle cx="43" cy="43" r="5" fill="none" stroke="#fff" stroke-width="2.5"/>
      <path d="M24 43l7-10h7l5 10M31 33l-3-5h7" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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
  const mapRef = useRef<any>(null);
  const bikeMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const mapsRef = useRef<GoogleMapsApi | null>(null);
  const initializedBoundsRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const previousPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const [mapError, setMapError] = useState('');

  const latest = points[points.length - 1];
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
        const initial = latest ? toLatLng(latest) : destination ? toLatLng(destination) : DEFAULT_CENTER;
        mapRef.current = new maps.Map(containerRef.current, {
          center: initial,
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
    if (!maps || !map || !latest) return;

    const target = toLatLng(latest);
    if (!bikeMarkerRef.current) {
      bikeMarkerRef.current = new maps.Marker({
        map,
        position: target,
        title: courierName,
        optimized: false,
        zIndex: 8,
        icon: {
          url: bikeSvg(latest.heading || 0),
          scaledSize: { width: 66, height: 66 },
          anchor: { x: 33, y: 33 },
        },
      });
      previousPositionRef.current = target;
    } else {
      bikeMarkerRef.current.setIcon({
        url: bikeSvg(latest.heading || 0),
        scaledSize: { width: 66, height: 66 },
        anchor: { x: 33, y: 33 },
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
  }, [courierName, latest?.latitude, latest?.longitude, latest?.heading]);

  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!maps || !map) return;

    if (destination) {
      const position = toLatLng(destination);
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = new maps.Marker({
          map,
          position,
          title: destination.label || 'Endereço de entrega',
          zIndex: 7,
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
  }, [destination?.latitude, destination?.longitude, latest?.latitude, latest?.longitude, remaining]);

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
    : 'Calculando distância';

  return (
    <S.Shell className="customer-google-delivery-map">
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
            <strong>{etaMinutes ? `${etaMinutes} min` : 'Calculando'}</strong>
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
