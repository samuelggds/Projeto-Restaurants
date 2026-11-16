import type { CourierRoutePoint } from '../Courier/domain/courierLocation';

export const COURIER_DIRECTION_NAMES = ['up','up-right','right','down-right','down','down-left','left','up-left'] as const;

export function normalizeHeading(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function bearingBetweenPoints(from: CourierRoutePoint, to: CourierRoutePoint) {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return normalizeHeading((Math.atan2(y, x) * 180) / Math.PI);
}

export function resolveCourierHeading(points: CourierRoutePoint[]) {
  const latest = points[points.length - 1];
  const heading = latest?.heading == null ? Number.NaN : Number(latest.heading);
  if (Number.isFinite(heading) && heading >= 0) return normalizeHeading(heading);
  if (points.length < 2) return 0;
  return bearingBetweenPoints(points[points.length - 2], latest);
}

export function getCourierDirectionIndex(headingDegrees: number) {
  return Math.round(normalizeHeading(headingDegrees) / 45) % 8;
}

export function getCourierSpriteFrame(directionIndex: number) {
  const index = ((Math.round(directionIndex) % 8) + 8) % 8;
  // The sheet's horizontal side views are west in the upper row and east below.
  const spriteIndex = index === 2 ? 6 : index === 6 ? 2 : index;
  return { column: spriteIndex % 4, row: spriteIndex >= 4 ? 1 : 0, name: COURIER_DIRECTION_NAMES[index] };
}
