// Coordinates are pixels in the supplied map, not GPS locations.
// Keeping the image, route and marker in this space avoids drift when resized.
export const VISUAL_MAP_WIDTH = 1151;
export const VISUAL_MAP_HEIGHT = 636;
export const VISUAL_TRACKING_ANIMATION_MS = 60_000;

export type VisualMapPoint = { x: number; y: number };

export const VISUAL_TRACKING_ROUTE: VisualMapPoint[] = [
  { x: 170, y: 108 },
  { x: 328, y: 126 },
  { x: 315, y: 255 },
  { x: 129, y: 241 },
  { x: 110, y: 377 },
  { x: 436, y: 397 },
  { x: 452, y: 268 },
  { x: 651, y: 285 },
  { x: 642, y: 411 },
  { x: 826, y: 434 },
  { x: 853, y: 430 },
  { x: 860, y: 439 },
  { x: 868, y: 458 },
  { x: 880, y: 475 },
  { x: 729, y: 461 },
  { x: 711, y: 465 },
  { x: 700, y: 477 },
  { x: 674, y: 544 },
  { x: 748, y: 568 },
  { x: 786, y: 585 },
];

export const VISUAL_ROUTE_PATH = VISUAL_TRACKING_ROUTE.map(
  (point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
).join(' ');

export function getVisualRouteFrame(route: VisualMapPoint[], rawProgress: number) {
  const initial = { point: route[0] ?? { x: 0, y: 0 }, angleDegrees: 0, segmentIndex: 0 };
  if (route.length < 2) return initial;

  const progress = Number.isNaN(rawProgress) ? 0 : Math.max(0, Math.min(1, rawProgress));
  const lengths = route
    .slice(1)
    .map((point, index) => Math.hypot(point.x - route[index].x, point.y - route[index].y));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total === 0) return initial;

  const target = total * progress;
  let traversed = 0;

  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index];
    if (length === 0) continue;
    if (target <= traversed + length || index === lengths.length - 1) {
      const start = route[index];
      const end = route[index + 1];
      const local = Math.max(0, Math.min(1, (target - traversed) / length));
      return {
        point: {
          x: start.x + (end.x - start.x) * local,
          y: start.y + (end.y - start.y) * local,
        },
        angleDegrees: (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI,
        segmentIndex: index,
      };
    }
    traversed += length;
  }

  return { ...initial, point: route[route.length - 1] };
}

export const COURIER_DIRECTION_NAMES = [
  'up',
  'up-right',
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
  'up-left',
] as const;

export function getCourierDirectionIndex(angleDegrees: number) {
  return ((Math.round((angleDegrees + 90) / 45) % 8) + 8) % 8;
}

// The supplied artwork has six views in a 3 x 2 grid. Mirror only the
// lateral/three-quarter poses: the helmet and rider stay upright at turns.
const COURIER_FRAMES = [
  { column: 1, row: 1, mirror: false },
  { column: 0, row: 1, mirror: false },
  { column: 2, row: 0, mirror: true },
  { column: 1, row: 0, mirror: false },
  { column: 0, row: 0, mirror: false },
  { column: 1, row: 0, mirror: true },
  { column: 2, row: 0, mirror: false },
  { column: 0, row: 1, mirror: true },
] as const;

export function getCourierSpriteFrame(directionIndex: number) {
  return COURIER_FRAMES[directionIndex] ?? COURIER_FRAMES[0];
}
