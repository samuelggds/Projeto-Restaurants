import api from './api';

const MAX_DELIVERY_TRACKING_ACCURACY_METERS = 500;

type InitialLocation = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  sentAt: string;
};

class CourierRouteService {
  async startRoute(orderId: string | number, initialLocation?: InitialLocation) {
    const accuracy = Number(initialLocation?.accuracy);
    const hasShareableInitialLocation =
      Boolean(initialLocation) &&
      Number.isFinite(accuracy) &&
      accuracy >= 0 &&
      accuracy <= MAX_DELIVERY_TRACKING_ACCURACY_METERS;

    const response = await api.patch(`/orders/${orderId}/start-route`, {
      ...(hasShareableInitialLocation ? { initialLocation } : {}),
    });
    return response.data;
  }
}

export default new CourierRouteService();
