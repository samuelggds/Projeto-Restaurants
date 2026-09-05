import { useEffect, useMemo } from 'react';
import { divIcon } from 'leaflet';
import { Bike, Navigation } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as S from './DeliveryMap.styles';

export type RoutePoint = {
  latitude: number;
  longitude: number;
  recordedAt?: string;
  speed?: number | null;
};

function distanceSquared(a: RoutePoint, b: RoutePoint) {
  const lat = a.latitude - b.latitude;
  const lng = a.longitude - b.longitude;
  return lat * lat + lng * lng;
}

function remainingRouteFromCurrentPosition(routePath: RoutePoint[], latest: RoutePoint) {
  if (routePath.length < 2) return routePath;
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  routePath.forEach((point, index) => {
    const distance = distanceSquared(point, latest);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  const remaining = routePath.slice(nearestIndex);
  return [latest, ...remaining.filter((point) => distanceSquared(point, latest) > 0.00000001)];
}

function FollowLatest({ point, destination }: { point: RoutePoint; destination?: RoutePoint }) {
  const map = useMap();
  useEffect(() => {
    if (destination) {
      map.fitBounds(
        [
          [point.latitude, point.longitude],
          [destination.latitude, destination.longitude],
        ],
        { animate: true, padding: [72, 72], maxZoom: 16 },
      );
      return;
    }
    map.setView([point.latitude, point.longitude], Math.max(map.getZoom(), 16), { animate: true });
  }, [destination, map, point.latitude, point.longitude]);
  return null;
}

function RecenterButton({ point, destination }: { point: RoutePoint; destination?: RoutePoint }) {
  const map = useMap();
  return (
    <S.RecenterControl
      type="button"
      aria-label="Centralizar trajeto"
      title="Centralizar trajeto"
      onClick={() => {
        if (destination) {
          map.fitBounds(
            [
              [point.latitude, point.longitude],
              [destination.latitude, destination.longitude],
            ],
            { animate: true, padding: [72, 72], maxZoom: 16 },
          );
          return;
        }
        map.setView([point.latitude, point.longitude], 17, { animate: true });
      }}
    >
      <Navigation size={20} />
    </S.RecenterControl>
  );
}

const courierIcon = divIcon({
  className: 'delivery-courier-marker',
  html: `<div class="delivery-courier-marker__halo"><div class="delivery-courier-marker__pin" aria-label="Posição do entregador">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18.5" cy="17.5" r="3.5" />
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="15" cy="5" r="1" />
      <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </svg>
  </div></div>`,
  iconSize: [58, 58],
  iconAnchor: [29, 29],
  popupAnchor: [0, -30],
});

const destinationIcon = divIcon({
  className: 'delivery-destination-marker',
  html: `<div class="delivery-destination-marker__pin" aria-label="Seu endereço">
    <span aria-hidden="true"></span>
  </div>`,
  iconSize: [46, 54],
  iconAnchor: [23, 52],
  popupAnchor: [0, -50],
});

const mapTileUrl =
  String(import.meta.env.VITE_MAP_TILE_URL || '').trim() ||
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const mapTileAttribution =
  String(import.meta.env.VITE_MAP_TILE_ATTRIBUTION || '').trim() ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export default function DeliveryMap({
  points,
  routePath = [],
  destination,
  label = 'Entregador',
  statusMessage = 'Seu pedido está a caminho',
  statusDetail = 'A posição é atualizada automaticamente.',
}: {
  points: RoutePoint[];
  routePath?: RoutePoint[];
  destination?: RoutePoint & { label?: string };
  label?: string;
  statusMessage?: string;
  statusDetail?: string;
}) {
  const latest = points[points.length - 1] || { latitude: -23.5505, longitude: -46.6333 };
  const remainingRoute = useMemo(
    () => remainingRouteFromCurrentPosition(routePath, latest),
    [latest.latitude, latest.longitude, routePath],
  );
  const plannedRoute = remainingRoute.map(
    (point) => [point.latitude, point.longitude] as [number, number],
  );

  return (
    <S.MapShell className="delivery-map-shell">
      <MapContainer
        center={[latest.latitude, latest.longitude]}
        zoom={16}
        zoomControl={false}
        className="delivery-map"
      >
        <TileLayer attribution={mapTileAttribution} url={mapTileUrl} />
        {plannedRoute.length > 1 && (
          <>
            <Polyline
              positions={plannedRoute}
              pathOptions={{
                color: '#ffffff',
                weight: 9,
                opacity: 0.92,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Polyline
              positions={plannedRoute}
              pathOptions={{
                color: '#2563eb',
                weight: 5,
                opacity: 0.96,
                lineCap: 'round',
                lineJoin: 'round',
                className: 'delivery-planned-route',
              }}
            />
          </>
        )}
        <Marker position={[latest.latitude, latest.longitude]} icon={courierIcon}>
          <Popup>
            <strong>{label}</strong>
            <br />
            Posição atual
          </Popup>
        </Marker>
        {destination ? (
          <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon}>
            <Popup>
              <strong>Seu endereço</strong>
              {destination.label ? (
                <>
                  <br />
                  {destination.label}
                </>
              ) : null}
            </Popup>
          </Marker>
        ) : null}
        <FollowLatest point={latest} destination={destination} />
        <RecenterButton point={latest} destination={destination} />
      </MapContainer>
      <S.MapStatus role="status">
        <span>
          <Bike size={20} />
        </span>
        <span>
          <strong>{statusMessage}</strong>
          <small>{statusDetail}</small>
        </span>
        <i>Tempo real</i>
      </S.MapStatus>
    </S.MapShell>
  );
}
