export type DeliveryRouteAddress = {
  address?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
};

export type DeliveryRoutingRequest = {
  origin: DeliveryRouteAddress;
  destination: DeliveryRouteAddress;
};

export type DeliveryRoutingProviderId = 'osrm' | 'geoapify';

export interface DeliveryRoutingProvider {
  readonly id: DeliveryRoutingProviderId;
  calculateDistanceMeters(input: DeliveryRoutingRequest): Promise<number | null>;
}
