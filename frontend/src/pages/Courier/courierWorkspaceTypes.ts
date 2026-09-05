import type { CourierRoutePoint } from './domain/courierLocation';

export type GeoStatus =
  | 'idle'
  | 'checking'
  | 'enabled'
  | 'blocked'
  | 'timeout'
  | 'error'
  | 'unsupported';

export type FinanceData = {
  today: { amount: number; deliveries: number };
  week: { amount: number; deliveries: number };
  month: { amount: number; deliveries: number };
  pending: { amount: number; deliveries: number };
  deliveries: Array<{
    id: number;
    courierEarning: number;
    courierPaidAt?: string | null;
    deliveredAt?: string | null;
    district?: string | null;
    city?: string | null;
    financeStatus?: string;
    settlement?: { publicId: string; status: string } | null;
  }>;
  pendingSettlements?: number;
  timezone?: string;
};

export type TrackingDestination = CourierRoutePoint & { label?: string };

export type WakeLockSentinelLike = {
  released?: boolean;
  release: () => Promise<void>;
};

export type TrackingResult = {
  locations?: unknown[];
  order?: {
    routeEstimate?: {
      destination?: TrackingDestination | null;
      routeCoordinates?: unknown[];
    } | null;
  };
};
