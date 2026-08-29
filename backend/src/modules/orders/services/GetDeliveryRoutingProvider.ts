import geoapifyDeliveryRoutingProvider from './GeoapifyDeliveryRoutingProvider.js';
import osrmDeliveryRoutingProvider from './OsrmDeliveryRoutingProvider.js';
import type {
  DeliveryRoutingProvider,
  DeliveryRoutingProviderId,
} from './DeliveryRoutingProvider.js';

export function getConfiguredDeliveryRoutingProviderId(): DeliveryRoutingProviderId {
  const configured = String(process.env.ROUTING_PROVIDER || 'osrm')
    .trim()
    .toLowerCase();

  if (configured === 'geoapify') return 'geoapify';
  if (configured === 'osrm') return 'osrm';

  throw new Error('ROUTING_PROVIDER deve ser osrm ou geoapify.');
}

export function getDeliveryRoutingProvider(): DeliveryRoutingProvider {
  const providerId = getConfiguredDeliveryRoutingProviderId();
  return providerId === 'geoapify'
    ? geoapifyDeliveryRoutingProvider
    : osrmDeliveryRoutingProvider;
}
