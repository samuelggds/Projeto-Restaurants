export type DeliveryLocationPayload = {
  orderId: number;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  sentAt: string;
  recordedAt: Date;
};

type DeliveryLocationValidationResult =
  { ok: true; value: DeliveryLocationPayload } | { ok: false; error: string };

function optionalFiniteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateDeliveryLocationPayload(
  rawPayload: Record<string, unknown> | null | undefined,
  now = Date.now(),
): DeliveryLocationValidationResult {
  const orderId = Number(rawPayload?.orderId || 0);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return { ok: false, error: 'Pedido inválido para rastreio.' };
  }

  const latitude = Number(rawPayload?.latitude);
  const longitude = Number(rawPayload?.longitude);
  const validCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (!validCoordinates) {
    return { ok: false, error: 'Coordenadas inválidas.' };
  }

  const heading = optionalFiniteNumber(rawPayload?.heading);
  if (heading !== null && (heading < 0 || heading > 360)) {
    return { ok: false, error: 'Direção da localização inválida.' };
  }

  const speed = optionalFiniteNumber(rawPayload?.speed);
  if (speed !== null && (speed < 0 || speed > 100)) {
    return { ok: false, error: 'Velocidade da localização inválida.' };
  }

  const accuracy = optionalFiniteNumber(rawPayload?.accuracy);
  if (accuracy !== null && (accuracy < 0 || accuracy > 10_000)) {
    return { ok: false, error: 'Precisão da localização inválida.' };
  }

  const sentAtValue =
    typeof rawPayload?.sentAt === 'string' && rawPayload.sentAt.trim()
      ? rawPayload.sentAt.trim()
      : new Date(now).toISOString();
  const sentAtMs = Date.parse(sentAtValue);

  if (!Number.isFinite(sentAtMs)) {
    return { ok: false, error: 'Horário da localização inválido.' };
  }

  if (sentAtMs < now - 5 * 60_000 || sentAtMs > now + 60_000) {
    return { ok: false, error: 'Localização fora da janela de tempo permitida.' };
  }

  const recordedAt = new Date(sentAtMs);
  return {
    ok: true,
    value: {
      orderId,
      latitude,
      longitude,
      heading,
      speed,
      accuracy: accuracy === null ? null : Math.round(accuracy),
      sentAt: recordedAt.toISOString(),
      recordedAt,
    },
  };
}
