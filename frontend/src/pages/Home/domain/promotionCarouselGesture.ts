export type CarouselSwipeDirection = 'NEXT' | 'PREVIOUS' | null;

type TouchPoint = {
  x: number;
  y: number;
};

const MINIMUM_HORIZONTAL_DISTANCE = 44;
const HORIZONTAL_DOMINANCE_RATIO = 1.2;

export function resolveCarouselSwipe(start: TouchPoint, end: TouchPoint): CarouselSwipeDirection {
  const horizontalDistance = end.x - start.x;
  const verticalDistance = end.y - start.y;
  const horizontalMagnitude = Math.abs(horizontalDistance);
  const verticalMagnitude = Math.abs(verticalDistance);

  if (horizontalMagnitude < MINIMUM_HORIZONTAL_DISTANCE) return null;
  if (horizontalMagnitude <= verticalMagnitude * HORIZONTAL_DOMINANCE_RATIO) return null;

  return horizontalDistance < 0 ? 'NEXT' : 'PREVIOUS';
}
