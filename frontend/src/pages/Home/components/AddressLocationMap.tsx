import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, MapPinOff } from 'lucide-react';
import ordersService from '../../../Services/ordersService';
import type { DeliveryAddress } from '../hooks/useDeliveryAddress';
import * as S from './AddressLocationMap.styles';

type AddressLocation = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  locationType: string;
  partialMatch: boolean;
};

type LatLng = { lat: number; lng: number };
type GoogleMapInstance = {
  setCenter(position: LatLng): void;
  setZoom(zoom: number): void;
};
type GoogleMarkerInstance = {
  setPosition(position: LatLng): void;
  setTitle(title: string): void;
};
type GoogleGeocoderResult = {
  formatted_address?: string;
  partial_match?: boolean;
  geometry?: {
    location?: {
      lat(): number;
      lng(): number;
    };
    location_type?: string;
  };
};

type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
  Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance;
  Geocoder: new () => {
    geocode(
      request: { address: string; region?: string },
      callback: (results: GoogleGeocoderResult[] | null, status: string) => void,
    ): void;
  };
};

type AddressGoogleWindow = typeof window & {
  google?: { maps?: GoogleMapsApi };
  __gastronexaAddressGoogleMapsPromise?: Promise<GoogleMapsApi>;
};

const GOOGLE_MAPS_SCRIPT_ID = 'gastronexa-google-maps';

function getLoadedGoogleMaps() {
  return (window as AddressGoogleWindow).google?.maps;
}

function loadGoogleMaps() {
  const apiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps não está configurado neste ambiente.'));
  }

  const loaded = getLoadedGoogleMaps();
  if (loaded) return Promise.resolve(loaded);

  const googleWindow = window as AddressGoogleWindow;
  if (googleWindow.__gastronexaAddressGoogleMapsPromise) {
    return googleWindow.__gastronexaAddressGoogleMapsPromise;
  }

  googleWindow.__gastronexaAddressGoogleMapsPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const resolveMaps = () => {
      const maps = getLoadedGoogleMaps();
      if (maps) resolve(maps);
      else reject(new Error('Google Maps não ficou disponível após o carregamento.'));
    };

    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', resolveMaps, { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Falha ao carregar Google Maps.')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    script.addEventListener('load', resolveMaps, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Falha ao carregar Google Maps.')),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return googleWindow.__gastronexaAddressGoogleMapsPromise;
}

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

function googleAddressText(address: ReturnType<typeof normalizedAddress>) {
  return [
    [address.address, address.number].filter(Boolean).join(', '),
    address.district,
    address.city,
    address.state,
    address.zipCode,
    'Brasil',
  ]
    .filter(Boolean)
    .join(', ');
}

function geocodeWithGoogleMaps(
  maps: GoogleMapsApi,
  address: ReturnType<typeof normalizedAddress>,
): Promise<AddressLocation> {
  return new Promise((resolve, reject) => {
    const geocoder = new maps.Geocoder();
    geocoder.geocode({ address: googleAddressText(address), region: 'br' }, (results, status) => {
      const result = results?.[0];
      const latitude = Number(result?.geometry?.location?.lat());
      const longitude = Number(result?.geometry?.location?.lng());

      if (
        status !== 'OK' ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        reject(new Error(status || 'ADDRESS_NOT_GEOCODED'));
        return;
      }

      resolve({
        latitude,
        longitude,
        formattedAddress: String(result?.formatted_address || googleAddressText(address)),
        locationType: String(result?.geometry?.location_type || 'GEOCODED'),
        partialMatch: result?.partial_match === true,
      });
    });
  });
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markerRef = useRef<GoogleMarkerInstance | null>(null);
  const requestIdRef = useRef(0);
  const [location, setLocation] = useState<AddressLocation | null>(null);
  const [status, setStatus] = useState<'idle' | 'locating' | 'loading-map' | 'ready' | 'error'>(
    'idle',
  );
  const [error, setError] = useState('');
  const [resolvedAddressKey, setResolvedAddressKey] = useState('');

  const normalized = useMemo(() => normalizedAddress(address), [address]);
  const addressKey = useMemo(() => JSON.stringify(normalized), [normalized]);
  const complete = isCompleteAddress(normalized);
  const canLocate = Boolean(restaurantId && complete);

  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;

    if (!restaurantId || !complete) return undefined;

    const timer = window.setTimeout(() => {
      setStatus('locating');
      setError('');

      const resolveLocation = async () => {
        try {
          const result = await ordersService.getDeliveryAddressLocation({
            restaurantId,
            type: 'DELIVERY',
            ...normalized,
          });

          if (
            result &&
            Number.isFinite(result.latitude) &&
            Number.isFinite(result.longitude)
          ) {
            return result;
          }
        } catch {
          // The checkout map must not disappear only because server-side geocoding
          // is temporarily unavailable. Fall back to the browser Maps credential.
        }

        const maps = await loadGoogleMaps();
        return geocodeWithGoogleMaps(maps, normalized);
      };

      void resolveLocation()
        .then((result) => {
          if (requestIdRef.current !== currentRequestId) return;
          setResolvedAddressKey(addressKey);
          setLocation(result);
          setStatus('loading-map');
        })
        .catch(() => {
          if (requestIdRef.current !== currentRequestId) return;
          setResolvedAddressKey(addressKey);
          setLocation(null);
          setStatus('error');
          setError(
            'Não encontramos esse endereço no mapa. Confira número, bairro, cidade e estado.',
          );
        });
    }, 550);

    return () => window.clearTimeout(timer);
  }, [addressKey, complete, normalized, restaurantId]);

  useEffect(() => {
    if (!location || !containerRef.current) return undefined;

    let active = true;
    const position = { lat: location.latitude, lng: location.longitude };

    void loadGoogleMaps()
      .then((maps) => {
        if (!active || !containerRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new maps.Map(containerRef.current, {
            center: position,
            zoom: 17,
            disableDefaultUI: true,
            zoomControl: true,
            clickableIcons: false,
            gestureHandling: 'cooperative',
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            backgroundColor: '#eef2f3',
          });
        } else {
          mapRef.current.setCenter(position);
          mapRef.current.setZoom(17);
        }

        if (!markerRef.current) {
          markerRef.current = new maps.Marker({
            map: mapRef.current,
            position,
            title: location.formattedAddress,
          });
        } else {
          markerRef.current.setPosition(position);
          markerRef.current.setTitle(location.formattedAddress);
        }

        setError('');
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
        setError(
          'O endereço foi localizado, mas o Google Maps não pôde ser carregado agora.',
        );
      });

    return () => {
      active = false;
    };
  }, [location]);

  const currentAddressResolved = resolvedAddressKey === addressKey;
  const visibleLocation = canLocate && currentAddressResolved ? location : null;
  const visibleStatus = !canLocate
    ? 'idle'
    : currentAddressResolved
      ? status
      : 'locating';
  const visibleError = canLocate && currentAddressResolved ? error : '';
  const loading = visibleStatus === 'locating' || visibleStatus === 'loading-map';

  return (
    <S.Root $primary={primaryColor}>
      <S.MapFrame aria-busy={loading}>
        <S.MapCanvas
          ref={containerRef}
          $visible={Boolean(visibleLocation)}
          aria-label="Mapa Google com a localização do endereço de entrega"
        />

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
