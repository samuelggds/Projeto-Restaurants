import getOsrmDeliveryRouteService from './GetOsrmDeliveryRouteService.js';
import type {
  DeliveryRoutingProvider,
  DeliveryRoutingRequest,
} from './DeliveryRoutingProvider.js';

class OsrmDeliveryRoutingProvider implements DeliveryRoutingProvider {
  readonly id = 'osrm' as const;

  async calculateDistanceMeters({ origin, destination }: DeliveryRoutingRequest) {
    const originCoordinates = await getOsrmDeliveryRouteService.geocodeAddress(origin);
    if (!originCoordinates) return null;

    const route = await getOsrmDeliveryRouteService.execute({
      ...originCoordinates,
      destination,
    });

    const distanceMeters = Number(route?.distanceMeters);
    return Number.isFinite(distanceMeters) && distanceMeters >= 0 ? distanceMeters : null;
  }
}

export default new OsrmDeliveryRoutingProvider();
