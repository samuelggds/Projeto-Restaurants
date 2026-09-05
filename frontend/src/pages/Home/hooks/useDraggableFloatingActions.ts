import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

type Point = { x: number; y: number };
type Size = { width: number; height: number };

const STORAGE_KEY = '@PecaJaFood:floatingActionsPosition';
const VIEWPORT_MARGIN = 0;
const DRAG_THRESHOLD = 5;

function visibleViewportSize(): Size {
  const visualViewport = window.visualViewport;
  if (visualViewport) {
    return { width: visualViewport.width, height: visualViewport.height };
  }

  return {
    width: document.documentElement.clientWidth || window.innerWidth,
    height: document.documentElement.clientHeight || window.innerHeight,
  };
}

export function clampFloatingPosition(
  point: Point,
  element: Size,
  viewport: Size,
  margin = VIEWPORT_MARGIN,
): Point {
  const maximumX = Math.max(margin, viewport.width - element.width - margin);
  const maximumY = Math.max(margin, viewport.height - element.height - margin);
  return {
    x: Math.min(Math.max(point.x, margin), maximumX),
    y: Math.min(Math.max(point.y, margin), maximumY),
  };
}

function readStoredPosition(storageKey: string): Point | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null') as Partial<Point> | null;
    if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
    return { x: Number(value.x), y: Number(value.y) };
  } catch {
    return null;
  }
}

export function useDraggableFloatingActions(storageKey = STORAGE_KEY) {
  const elementRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<Point | null>(null);
  const pendingPositionRef = useRef<Point | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    captureTarget: HTMLElement;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [position, setPositionState] = useState<Point | null>(() => readStoredPosition(storageKey));
  const [dragging, setDragging] = useState(false);

  const applyPositionToElement = useCallback((next: Point) => {
    const element = elementRef.current;
    if (!element) return;
    element.style.left = '0px';
    element.style.top = '0px';
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
  }, []);

  const commitPosition = useCallback(
    (next: Point | null) => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      pendingPositionRef.current = null;
      positionRef.current = next;
      if (next) applyPositionToElement(next);
      setPositionState(next);
    },
    [applyPositionToElement],
  );

  const scheduleDragPosition = useCallback(
    (next: Point) => {
      positionRef.current = next;
      pendingPositionRef.current = next;
      if (animationFrameRef.current !== null) return;
      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        const pending = pendingPositionRef.current;
        pendingPositionRef.current = null;
        if (pending) applyPositionToElement(pending);
      });
    },
    [applyPositionToElement],
  );

  const flushScheduledPosition = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const pending = pendingPositionRef.current;
    pendingPositionRef.current = null;
    if (pending) applyPositionToElement(pending);
  }, [applyPositionToElement]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  const clampCurrentPosition = useCallback(() => {
    const element = elementRef.current;
    const current = positionRef.current;
    if (!element || !current) return;
    const rect = element.getBoundingClientRect();
    const next = clampFloatingPosition(
      current,
      { width: rect.width, height: rect.height },
      visibleViewportSize(),
    );
    if (next.x !== current.x || next.y !== current.y) commitPosition(next);
  }, [commitPosition]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(clampCurrentPosition);
    observer?.observe(element);
    window.addEventListener('resize', clampCurrentPosition);
    window.visualViewport?.addEventListener('resize', clampCurrentPosition);
    clampCurrentPosition();
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', clampCurrentPosition);
      window.visualViewport?.removeEventListener('resize', clampCurrentPosition);
    };
  }, [clampCurrentPosition]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    const target = event.target;
    const dragHandle =
      target instanceof Element
        ? target.closest<HTMLElement>('[data-floating-drag-handle="true"]')
        : null;
    if (!dragHandle) {
      return;
    }
    const element = elementRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      captureTarget: dragHandle,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    // Capture on the button itself. Capturing on the outer floating panel
    // retargets the desktop click to the panel and prevents the button's
    // onClick from opening or minimizing the content.
    dragHandle.setPointerCapture(event.pointerId);
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const element = elementRef.current;
      if (!drag || drag.pointerId !== event.pointerId || !element) return;
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return;
      drag.moved = true;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      scheduleDragPosition(
        clampFloatingPosition(
          { x: drag.originX + deltaX, y: drag.originY + deltaY },
          { width: rect.width, height: rect.height },
          visibleViewportSize(),
        ),
      );
    },
    [scheduleDragPosition],
  );

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (drag.captureTarget.hasPointerCapture(event.pointerId)) {
        drag.captureTarget.releasePointerCapture(event.pointerId);
      }
      dragRef.current = null;
      setDragging(false);
      if (!drag.moved) return;
      flushScheduledPosition();
      suppressClickRef.current = true;
      const current = positionRef.current;
      if (current) {
        setPositionState(current);
        try {
          localStorage.setItem(storageKey, JSON.stringify(current));
        } catch {
          // O movimento continua funcionando mesmo quando o armazenamento está indisponível.
        }
      }
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    },
    [flushScheduledPosition, storageKey],
  );

  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const style: CSSProperties | undefined = position
    ? {
        left: 0,
        top: 0,
        right: 'auto',
        bottom: 'auto',
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }
    : undefined;

  return {
    elementRef,
    style,
    dragging,
    positioned: Boolean(position),
    onPointerDown,
    onPointerMove,
    onPointerUp: finishDrag,
    onPointerCancel: finishDrag,
    onClickCapture,
  };
}
