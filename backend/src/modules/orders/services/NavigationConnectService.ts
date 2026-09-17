import { GoogleAuth } from 'google-auth-library';

const NAVIGATION_CONNECT_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const NAVIGATION_CONNECT_BASE_URL = 'https://navigationconnect.googleapis.com/v1';
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NavigationLatLng = {
  latitude?: number;
  longitude?: number;
};

type NavigationLocation = {
  point?: NavigationLatLng;
  sourceTime?: string;
  serverTime?: string;
};

type NavigationStop = {
  point?: NavigationLatLng;
};

export type NavigationConnectTrip = {
  name?: string;
  authToken?: {
    token?: string;
    expireTime?: string;
  };
  state?: string;
  execution?: {
    destination?: NavigationStop;
    location?: NavigationLocation;
    remainingDuration?: string;
    remainingDistanceMeters?: number;
    traveledDistanceMeters?: number;
    stopAddedInRoute?: boolean;
  };
  createTime?: string;
  updateTime?: string;
};

export type NavigationConnectTelemetry = {
  state: string;
  location: {
    latitude: number;
    longitude: number;
    recordedAt: string;
  } | null;
  destination: {
    latitude: number;
    longitude: number;
  } | null;
  remainingDurationSeconds: number | null;
  remainingDistanceMeters: number | null;
  updatedAt: string | null;
};

type GoogleApiError = {
  code?: number;
  message?: string;
  response?: {
    status?: number;
    data?: {
      error?: {
        code?: number;
        message?: string;
        status?: string;
      };
    };
  };
};

function envBoolean(name: string, fallback = false) {
  const raw = String(process.env[name] || '').trim().toLowerCase();
  if (!raw) return fallback;
  return raw === 'true';
}

function validCoordinate(value: unknown, minimum: number, maximum: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

function googleApiErrorStatus(error: unknown) {
  const candidate = error as GoogleApiError;
  return Number(candidate?.response?.status || candidate?.response?.data?.error?.code || candidate?.code || 0);
}

function googleApiErrorMessage(error: unknown) {
  const candidate = error as GoogleApiError;
  return String(
    candidate?.response?.data?.error?.message || candidate?.message || 'Falha na API Navigation Connect.',
  );
}

export function parseNavigationDurationSeconds(value: unknown) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)s$/);
  if (!match) return null;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.round(seconds);
}

export function extractNavigationConnectTelemetry(
  trip: NavigationConnectTrip | null | undefined,
): NavigationConnectTelemetry | null {
  if (!trip) return null;

  const latitude = validCoordinate(trip.execution?.location?.point?.latitude, -90, 90);
  const longitude = validCoordinate(trip.execution?.location?.point?.longitude, -180, 180);
  const destinationLatitude = validCoordinate(trip.execution?.destination?.point?.latitude, -90, 90);
  const destinationLongitude = validCoordinate(
    trip.execution?.destination?.point?.longitude,
    -180,
    180,
  );
  const remainingDistanceMeters = Number(trip.execution?.remainingDistanceMeters);
  const recordedAt = String(
    trip.execution?.location?.sourceTime ||
      trip.execution?.location?.serverTime ||
      trip.updateTime ||
      '',
  ).trim();

  return {
    state: String(trip.state || 'STATE_UNSPECIFIED'),
    location:
      latitude !== null && longitude !== null
        ? {
            latitude,
            longitude,
            recordedAt: recordedAt || new Date().toISOString(),
          }
        : null,
    destination:
      destinationLatitude !== null && destinationLongitude !== null
        ? { latitude: destinationLatitude, longitude: destinationLongitude }
        : null,
    remainingDurationSeconds: parseNavigationDurationSeconds(trip.execution?.remainingDuration),
    remainingDistanceMeters:
      Number.isFinite(remainingDistanceMeters) && remainingDistanceMeters >= 0
        ? Math.round(remainingDistanceMeters)
        : null,
    updatedAt: String(trip.updateTime || '').trim() || null,
  };
}

class NavigationConnectService {
  private auth = new GoogleAuth({ scopes: [NAVIGATION_CONNECT_SCOPE] });

  isEnabled() {
    return envBoolean('NAVIGATION_CONNECT_ENABLED', false);
  }

  private get projectId() {
    return String(process.env.NAVIGATION_CONNECT_PROJECT_ID || '').trim();
  }

  private get androidAppId() {
    return String(process.env.NAVIGATION_CONNECT_ANDROID_APP_ID || '').trim();
  }

  private get enableHighFrequencyUpdates() {
    return envBoolean('NAVIGATION_CONNECT_HIGH_FREQUENCY_UPDATES', false);
  }

  private get enableRemainingRouteReporting() {
    return envBoolean('NAVIGATION_CONNECT_REMAINING_ROUTE_REPORTING', false);
  }

  private assertConfigured() {
    if (!this.isEnabled()) {
      throw new Error('Navigation Connect ainda não está habilitado neste ambiente.');
    }
    if (!this.projectId) {
      throw new Error('NAVIGATION_CONNECT_PROJECT_ID não está configurado.');
    }
    if (!this.androidAppId) {
      throw new Error('NAVIGATION_CONNECT_ANDROID_APP_ID não está configurado.');
    }
  }

  private assertTripId(tripId: string) {
    if (!UUID_V4_PATTERN.test(tripId)) {
      throw new Error('O identificador da viagem precisa ser um UUIDv4 válido.');
    }
  }

  private async request<T>(options: {
    method: 'GET' | 'POST';
    url: string;
    params?: Record<string, string>;
    data?: Record<string, unknown>;
  }) {
    const client = await this.auth.getClient();
    const response = await client.request<T>({
      ...options,
      headers: {
        'X-Goog-User-Project': this.projectId,
      },
    });
    return response.data;
  }

  async createTrip(tripId: string) {
    this.assertConfigured();
    this.assertTripId(tripId);

    try {
      const trip = await this.request<NavigationConnectTrip>({
        method: 'POST',
        url: `${NAVIGATION_CONNECT_BASE_URL}/projects/${encodeURIComponent(this.projectId)}/trips`,
        params: { tripId },
        data: {
          androidAppId: this.androidAppId,
          config: {
            enableHighFrequencyUpdates: this.enableHighFrequencyUpdates,
            enableRemainingRouteReporting: this.enableRemainingRouteReporting,
            enablePubsub: false,
          },
        },
      });

      const token = String(trip.authToken?.token || '').trim();
      const expireTime = String(trip.authToken?.expireTime || '').trim();
      if (!token || !expireTime) {
        throw new Error('A API criou a viagem sem retornar um token de navegação válido.');
      }

      return {
        trip,
        token,
        expireTime,
      };
    } catch (error) {
      if (googleApiErrorStatus(error) === 409) {
        throw new Error(
          'A sessão do Navigation Connect deste pedido já foi criada e o token original não pode ser recuperado. Reabra a navegação a partir da sessão já iniciada.',
        );
      }
      throw new Error(`Falha ao criar viagem no Navigation Connect: ${googleApiErrorMessage(error)}`);
    }
  }

  async getTrip(tripId: string) {
    if (!this.isEnabled()) return null;
    this.assertConfigured();
    this.assertTripId(tripId);

    try {
      return await this.request<NavigationConnectTrip>({
        method: 'GET',
        url: `${NAVIGATION_CONNECT_BASE_URL}/projects/${encodeURIComponent(this.projectId)}/trips/${encodeURIComponent(tripId)}`,
        params: { routePolylineFormat: 'SIMPLE' },
      });
    } catch (error) {
      if (googleApiErrorStatus(error) === 404) return null;
      throw new Error(`Falha ao consultar viagem no Navigation Connect: ${googleApiErrorMessage(error)}`);
    }
  }
}

export default new NavigationConnectService();
