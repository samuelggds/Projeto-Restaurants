import type { Request, Response } from 'express';
import { z } from 'zod';
import googleAddressGeocodingService, {
  type AddressLocation,
} from '../services/GoogleAddressGeocodingService.js';
import geoapifyDeliveryRoutingProvider from '../services/GeoapifyDeliveryRoutingProvider.js';
import getOsrmDeliveryRouteService from '../services/GetOsrmDeliveryRouteService.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';

const schema = z.object({
  restaurantId: z.coerce.number().int().positive(),
  type: z.literal('DELIVERY').default('DELIVERY'),
  address: z.string().trim().min(3).max(180),
  number: z.string().trim().min(1).max(30),
  district: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  zipCode: z
    .string()
    .trim()
    .max(10)
    .optional()
    .transform((value) => String(value || '').replace(/\D/g, '')),
});

type Coordinates = {
  latitude: number;
  longitude: number;
};

function fallbackFormattedAddress(input: z.infer<typeof schema>) {
  return [
    [input.address, input.number].filter(Boolean).join(', '),
    input.district,
    input.city,
    input.state,
    input.zipCode,
    'Brasil',
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');
}

function fallbackLocation(
  coordinates: Coordinates | null,
  input: z.infer<typeof schema>,
  source: 'GEOAPIFY' | 'NOMINATIM',
): AddressLocation | null {
  if (
    !coordinates ||
    !Number.isFinite(coordinates.latitude) ||
    !Number.isFinite(coordinates.longitude)
  ) {
    return null;
  }

  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    formattedAddress: fallbackFormattedAddress(input),
    locationType: `${source}_FALLBACK`,
    partialMatch: true,
  };
}

async function firstAlternativeLocation(
  input: z.infer<typeof schema>,
): Promise<AddressLocation | null> {
  const providers = [
    geoapifyDeliveryRoutingProvider
      .geocodeAddress(input)
      .then((coordinates) => fallbackLocation(coordinates, input, 'GEOAPIFY')),
    getOsrmDeliveryRouteService
      .geocodeAddress(input)
      .then((coordinates) => fallbackLocation(coordinates, input, 'NOMINATIM')),
  ];

  return new Promise((resolve) => {
    let pending = providers.length;
    let settled = false;

    const finishWithoutLocation = () => {
      pending -= 1;
      if (!settled && pending === 0) {
        settled = true;
        resolve(null);
      }
    };

    providers.forEach((provider) => {
      void provider
        .then((location) => {
          if (settled) return;
          if (location) {
            settled = true;
            resolve(location);
            return;
          }
          finishWithoutLocation();
        })
        .catch(() => {
          if (!settled) finishWithoutLocation();
        });
    });
  });
}

class GetDeliveryAddressLocationController {
  async handle(req: Request, res: Response) {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Preencha o endereço completo para localizar no mapa.',
        code: 'ADDRESS_INCOMPLETE',
      });
    }

    resolveOrderRestaurantId({
      requestedRestaurantId: parsed.data.restaurantId,
      contextRestaurantId: req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null,
    });

    const googleLocation = await googleAddressGeocodingService.execute(parsed.data);
    const location = googleLocation || (await firstAlternativeLocation(parsed.data));

    if (!location) {
      return res.status(422).json({
        error: 'Não foi possível localizar este endereço no mapa.',
        code: 'ADDRESS_NOT_GEOCODED',
      });
    }

    return res.status(200).json({ location });
  }
}

export default new GetDeliveryAddressLocationController();
