import { useEffect } from 'react';
import { divIcon } from 'leaflet';
import { Bike, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import CustomerDeliveryMap from '../../tracking/CustomerDeliveryMap';
import * as S from './DeliveryMap.styles';

export type RoutePoint = {
  latitude: number;
  longitude: number;
  recordedAt?: string;
  heading?: number | null;
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
  const futurePoints = remaining.filter((point) => distanceSquared(point, latest) > 0.00000001);
  if (futurePoints.length > 0) return [latest, ...futurePoints];

  const previousPoint = routePath[Math.max(0, nearestIndex - 1)];
  if (previousPoint && distanceSquared(previousPoint, latest) > 0.00000001) {
    return [previousPoint, latest];
  }

  return routePath.slice(-2);
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

function wazeUrlFor(
  destination?: RoutePoint & { label?: string },
  destinationQuery?: string,
) {
  const query = String(destinationQuery || destination?.label || '').trim();
  if (!destination && !query) return '';
  const url = new URL('https://waze.com/ul');
  if (destination) {
    url.searchParams.set('ll', `${destination.latitude},${destination.longitude}`);
  } else {
    url.searchParams.set('q', query);
  }
  url.searchParams.set('navigate', 'yes');
  return url.toString();
}

function CourierWazeLauncher({
  destination,
  routePath,
  statusDetail,
  destinationQuery,
}: {
  destination?: RoutePoint & { label?: string };
  routePath: RoutePoint[];
  statusDetail: string;
  destinationQuery?: string;
}) {
  const fallbackDestination = routePath[routePath.length - 1];
  const target = destination || fallbackDestination;
  const wazeUrl = wazeUrlFor(target, destinationQuery);

  return (
    <S.WazeLauncher className="delivery-map-shell">
      <S.WazeMark aria-hidden="true">W</S.WazeMark>
      <S.WazeCopy>
        <small>NAVEGAÇÃO DA ENTREGA</small>
        <h3>Abrir rota no Waze</h3>
        <p>
          Use o Waze para navegar até o cliente. O GastroNexa continua compartilhando sua posição
          com o cliente enquanto o rastreamento estiver ativo.
        </p>
        {destination?.label ? (
          <S.WazeDestination>
            <MapPin aria-hidden="true" />
            <span>
              <small>Destino</small>
              <strong>{destination.label}</strong>
            </span>
          </S.WazeDestination>
        ) : null}
        {wazeUrl ? (
          <S.WazeButton href={wazeUrl} rel="noreferrer">
            Abrir no Waze
            <ExternalLink aria-hidden="true" />
          </S.WazeButton>
        ) : (
          <S.WazeUnavailable>Destino ainda não disponível para navegação.</S.WazeUnavailable>
        )}
        <S.WazeTrackingNote>
          <i aria-hidden="true" />
          {statusDetail}
        </S.WazeTrackingNote>
      </S.WazeCopy>
    </S.WazeLauncher>
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
  tilesEnabled = true,
  destinationQuery,
}: {
  points: RoutePoint[];
  routePath?: RoutePoint[];
  destination?: RoutePoint & { label?: string };
  destinationQuery?: string;
  label?: string;
  statusMessage?: string;
  statusDetail?: string;
  tilesEnabled?: boolean;
}) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const customerTrackingRoute = /^\/orders\/\d+\/tracking\/?$/u.test(pathname);
  const courierRoute = /^\/courier\/?$/u.test(pathname);

  if (customerTrackingRoute) {
    return (
      <CustomerDeliveryMap
        points={points}
        routePath={routePath}
        destination={destination}
        courierName={label}
        isTerminal={statusMessage === 'Seu pedido foi entregue' || statusMessage === 'Entrega cancelada'}
      />
    );
  }

  if (courierRoute) {
    return (
      <CourierWazeLauncher
        destination={destination}
        routePath={routePath}
        statusDetail={statusDetail}
        destinationQuery={destinationQuery}
      />
    );
  }

  const latest = points[points.length - 1] || { latitude: -23.5505, longitude: -46.6333 };
  const remainingRoute = remainingRouteFromCurrentPosition(routePath, latest);
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
        {tilesEnabled && <TileLayer attribution={mapTileAttribution} url={mapTileUrl} />}
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
              className="delivery-planned-route"
              pathOptions={{
                color: '#2563eb',
                weight: 5,
                opacity: 0.96,
                lineCap: 'round',
                lineJoin: 'round',
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
