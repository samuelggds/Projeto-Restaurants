import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, MapPinOff } from 'lucide-react';
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ordersService from '../../../Services/ordersService';
import type { DeliveryAddress } from '../hooks/useDeliveryAddress';
import * as S from './AddressLocationMap.styles';

type AddressLocation = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  partialMatch: boolean;
};

const MAP_TILE_URL =
  String(import.meta.env.VITE_MAP_TILE_URL || '').trim() ||
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_TILE_ATTRIBUTION =
  String(import.meta.env.VITE_MAP_TILE_ATTRIBUTION || '').trim() ||
  '© OpenStreetMap contributors';

export const ADDRESS_LOCATION_DEBOUNCE_MS = 800;

function normalizedAddress(address: DeliveryAddress) {
  return {
    address: String(address.address || '').trim(),
    number: String(address.number || '').trim(),
    district: String(address.district || '').trim(),
    city: String(address.city || '').trim(),
    state: String(address.state || '').trim().toUpperCase(),
    zipCode: String(address.zipCode || '').trim(),
  };
}

function isCompleteAddress(address: ReturnType<typeof normalizedAddress>) {
  return Boolean(
    address.address.length >= 3 &&
      address.number &&
      address.district.length >= 2 &&
      address.city.length >= 2 &&
      address.state.length === 2,
  );
}

function addressLocationErrorMessage(error: unknown) {
  const responseCode = String(
    (
      error as {
        response?: {
          data?: {
            code?: unknown;
          };
        };
      }
    )?.response?.data?.code || '',
  ).trim();
  const errorMessage = error instanceof Error ? error.message : '';

  if (
    responseCode === 'ADDRESS_NOT_GEOCODED' ||
    errorMessage === 'ADDRESS_NOT_GEOCODED' ||
    errorMessage === 'ZERO_RESULTS'
  ) {
    return 'Não encontramos esse endereço no mapa. Confira rua, número, bairro, cidade e estado.';
  }

  return 'Não conseguimos confirmar o endereço no mapa agora. Confira os dados; se estiverem corretos, você ainda poderá continuar com o pedido.';
}

function AddressMapViewport({ location }: { location: AddressLocation }) {
  const map = useMap();

  useEffect(() => {
    const prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    map.setView([location.latitude, location.longitude], 17, {
      animate: !prefersReducedMotion,
    });
  }, [location.latitude, location.longitude, map]);

  return null;
}

export function AddressLocationMap({
  restaurantId,
  address,
  primaryColor,
}: {
  restaurantId: number | null;
  address: DeliveryAddress;
  primaryColor: string;
}) {
  const requestIdRef = useRef(0);
  const [location, setLocation] = useState<AddressLocation | null>(null);
  const [status, setStatus] = useState<'idle' | 'locating' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [resolvedAddressKey, setResolvedAddressKey] = useState('');

  const {
    address: street,
    number,
    district,
    city,
    state,
    zipCode,
  } = address;
  const normalized = useMemo(
    () =>
      normalizedAddress({
        address: street,
        number,
        district,
        city,
        state,
        zipCode,
        complement: '',
      }),
    [street, number, district, city, state, zipCode],
  );
  const addressKey = useMemo(() => JSON.stringify(normalized), [normalized]);
  const complete = isCompleteAddress(normalized);
  const canLocate = Boolean(restaurantId && complete);

  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;

    if (!restaurantId || !complete) return undefined;

    const timer = window.setTimeout(() => {
      setStatus('locating');
      setError('');

      void ordersService
        .getDeliveryAddressLocation({
          restaurantId,
          type: 'DELIVERY',
          ...normalized,
        })
        .then((result) => {
          if (requestIdRef.current !== currentRequestId) return;

          if (
            !result ||
            !Number.isFinite(result.latitude) ||
            !Number.isFinite(result.longitude)
          ) {
            throw new Error('ADDRESS_VALIDATION_UNAVAILABLE');
          }

          setResolvedAddressKey(addressKey);
          setLocation(result);
          setStatus('ready');
        })
        .catch((requestError) => {
          if (requestIdRef.current !== currentRequestId) return;
          setResolvedAddressKey(addressKey);
          setLocation(null);
          setStatus('error');
          setError(addressLocationErrorMessage(requestError));
        });
    }, ADDRESS_LOCATION_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [addressKey, complete, normalized, restaurantId]);

  const currentAddressResolved = resolvedAddressKey === addressKey;
  const visibleLocation = canLocate && currentAddressResolved ? location : null;
  const visibleStatus = !canLocate
    ? 'idle'
    : currentAddressResolved
      ? status
      : 'locating';
  const visibleError = canLocate && currentAddressResolved ? error : '';
  const loading = visibleStatus === 'locating';
  const markerColor = primaryColor || '#e85a2b';

  return (
    <S.Root $primary={primaryColor}>
      <S.MapFrame aria-busy={loading}>
        <S.MapCanvas
          $visible={Boolean(visibleLocation)}
          aria-label="Mapa com a localização do endereço de entrega"
        >
          {visibleLocation ? (
            <MapContainer
              center={[visibleLocation.latitude, visibleLocation.longitude]}
              zoom={17}
              scrollWheelZoom={false}
              attributionControl
              zoomControl
            >
              <TileLayer url={MAP_TILE_URL} attribution={MAP_TILE_ATTRIBUTION} />
              <CircleMarker
                center={[visibleLocation.latitude, visibleLocation.longitude]}
                radius={9}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: markerColor,
                  fillOpacity: 1,
                  weight: 3,
                }}
              />
              <AddressMapViewport location={visibleLocation} />
            </MapContainer>
          ) : null}
        </S.MapCanvas>

        {visibleStatus === 'idle' ? (
          <S.StateOverlay>
            <MapPin aria-hidden="true" />
            <strong>Localização do endereço</strong>
            <span>
              {restaurantId
                ? 'Preencha o endereço completo para visualizar a localização real no mapa.'
                : 'A localização ficará disponível assim que o restaurante for identificado.'}
            </span>
          </S.StateOverlay>
        ) : null}

        {loading ? (
          <S.StateOverlay role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <strong>Localizando endereço</strong>
            <span>Validando a localização informada...</span>
          </S.StateOverlay>
        ) : null}

        {visibleStatus === 'error' ? (
          <S.StateOverlay role="alert">
            <MapPinOff aria-hidden="true" />
            <strong>Mapa indisponível</strong>
            <span>{visibleError}</span>
          </S.StateOverlay>
        ) : null}
      </S.MapFrame>

      {visibleStatus === 'ready' && visibleLocation ? (
        <S.MapMeta>
          <MapPin aria-hidden="true" />
          <span>
            <strong>
              {visibleLocation.partialMatch ? 'Localização aproximada' : 'Localização encontrada'}
            </strong>
            <small>{visibleLocation.formattedAddress}</small>
          </span>
        </S.MapMeta>
      ) : null}
    </S.Root>
  );
}
