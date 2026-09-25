import geoapifyDeliveryRoutingProvider from './GeoapifyDeliveryRoutingProvider.js';
import googleRoutesDeliveryRoutingProvider from './GoogleRoutesDeliveryRoutingProvider.js';
import osrmDeliveryRoutingProvider from './OsrmDeliveryRoutingProvider.js';
import type {
  DeliveryRoutingProvider,
  DeliveryRoutingProviderId,
} from './DeliveryRoutingProvider.js';

export function getConfiguredDeliveryRoutingProviderId(): DeliveryRoutingProviderId {
  const configured = String(process.env.ROUTING_PROVIDER || 'osrm')
    .trim()
    .toLowerCase();

  if (configured === 'google') return 'google';
  if (configured === 'geoapify') return 'geoapify';
  if (configured === 'osrm') return 'osrm';

  throw new Error('ROUTING_PROVIDER deve ser google, osrm ou geoapify.');
}

export function getDeliveryRoutingProvider(): DeliveryRoutingProvider {
  const providerId = getConfiguredDeliveryRoutingProviderId();
  if (providerId === 'google') return googleRoutesDeliveryRoutingProvider;
  if (providerId === 'geoapify') return geoapifyDeliveryRoutingProvider;
  return osrmDeliveryRoutingProvider;
}
