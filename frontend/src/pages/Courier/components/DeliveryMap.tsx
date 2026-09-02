import { useEffect } from 'react';
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

function FollowLatest({ point, destination }: { point: RoutePoint; destination?: RoutePoint }) {
  const map = useMap();
  useEffect(() => {
    if (destination) {
      map.fitBounds(
        [
          [point.latitude, point.longitude],
          [destination.latitude, destination.longitude],
        ],
        { animate: true, padding: [58, 58], maxZoom: 16 },
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
      aria-label="Centralizar no motoqueiro"
      onClick={() => {
        if (destination) {
          map.fitBounds(
            [
              [point.latitude, point.longitude],
              [destination.latitude, destination.longitude],
            ],
            { animate: true, padding: [58, 58], maxZoom: 16 },
          );
          return;
        }
        map.setView([point.latitude, point.longitude], 17, { animate: true });
      }}
    >
      <Navigation size={21} />
    </S.RecenterControl>
  );
}

const courierIcon = divIcon({
  className: 'delivery-courier-marker',
  html: `<div class="delivery-courier-marker__pin" aria-label="Posicao do motoqueiro">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18.5" cy="17.5" r="3.5" />
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="15" cy="5" r="1" />
      <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </svg>
  </div>`,
  iconSize: [68, 68],
  iconAnchor: [34, 34],
  popupAnchor: [0, -34],
});

const destinationIcon = divIcon({
  className: 'delivery-destination-marker',
  html: `<div class="delivery-destination-marker__pin" aria-label="Destino da entrega">
    <span aria-hidden="true"></span>
  </div>`,
  iconSize: [52, 60],
  iconAnchor: [26, 58],
  popupAnchor: [0, -56],
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
  label = 'Motoqueiro',
  statusMessage = 'Entrega em andamento',
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
  const line = points.map((point) => [point.latitude, point.longitude] as [number, number]);
  const plannedRoute = routePath.map(
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
        {line.length > 1 && (
          <Polyline
            positions={line}
            pathOptions={{ color: '#d64d08', weight: 4, opacity: 0.58, dashArray: '8 10' }}
          />
        )}
        {plannedRoute.length > 1 && (
          <Polyline
            positions={plannedRoute}
            pathOptions={{
              color: '#2563eb',
              weight: 5,
              opacity: 0.72,
              className: 'delivery-planned-route',
            }}
          />
        )}
        <Marker position={[latest.latitude, latest.longitude]} icon={courierIcon}>
          <Popup>
            {label}
            <br />
            Posição atual
          </Popup>
        </Marker>
        {destination ? (
          <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon}>
            <Popup>
              Destino da entrega
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
          <Bike size={21} />
        </span>
        <span>
          <strong>{statusMessage}</strong>
          <small>{statusDetail}</small>
        </span>
        <i>GPS ativo</i>
      </S.MapStatus>
    </S.MapShell>
  );
}
