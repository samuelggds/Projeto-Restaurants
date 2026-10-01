import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react';
import type { AdminCategory } from '../types';
import { adminErrorMessage } from '../utils/adminErrorMessage';

type CategoryDrag = {
  categoryId: number;
  pointerId: number;
  startX: number;
  startY: number;
  active: boolean;
  element: HTMLElement;
  preview: HTMLElement | null;
  startRect: DOMRect | null;
};

type Input = {
  categories: AdminCategory[];
  busy: boolean;
  onReorderCategories: (categoryIds: number[]) => Promise<void>;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setFeedback: Dispatch<SetStateAction<string>>;
};

function createDragPreview(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const preview = element.cloneNode(true) as HTMLElement;
  preview.removeAttribute('data-drag-source');
  preview.setAttribute('data-category-drag-preview', 'true');
  preview.setAttribute('aria-hidden', 'true');
  preview.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  preview.querySelectorAll<HTMLElement>('button, input, label, a, select, textarea').forEach(
    (node) => {
      node.tabIndex = -1;
    },
  );
  Object.assign(preview.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    zIndex: '10000',
    pointerEvents: 'none',
    transformOrigin: '50% 50%',
    transform: 'translate3d(0, 0, 0) scale(1.025) rotate(0.35deg)',
    boxShadow: '0 30px 70px rgba(47, 34, 25, 0.24)',
    borderColor: 'color-mix(in srgb, var(--a) 65%, #d1c5bb)',
    opacity: '0.98',
    willChange: 'transform',
  });
  document.body.appendChild(preview);
  return { preview, rect };
}

export function useCategoryCardReorder({
  categories,
  busy,
  onReorderCategories,
  setBusy,
  setFeedback,
}: Input) {
  const [categoryOrderIds, setCategoryOrderIds] = useState<number[]>(() =>
    categories.map((category) => category.id),
  );
  const [draggingCategoryId, setDraggingCategoryId] = useState<number | null>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());
  const orderRef = useRef<number[]>([]);
  const dragRef = useRef<CategoryDrag | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const effectiveCategoryOrderIds = useMemo(() => {
    const availableIds = new Set(categories.map((category) => category.id));
    const current = categoryOrderIds.filter((id) => availableIds.has(id));
    const seen = new Set(current);
    return [
      ...current,
      ...categories.map((category) => category.id).filter((id) => !seen.has(id)),
    ];
  }, [categories, categoryOrderIds]);

  const orderedCategories = useMemo(() => {
    const byId = new Map(categories.map((category) => [category.id, category]));
    return effectiveCategoryOrderIds
      .map((id) => byId.get(id))
      .filter((category): category is AdminCategory => Boolean(category));
  }, [categories, effectiveCategoryOrderIds]);

  useEffect(
    () => () => {
      cleanupRef.current?.();
      dragRef.current?.preview?.remove();
    },
    [],
  );

  const animateLayout = (previousRects: Map<number, DOMRect>, draggedId?: number) => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    window.requestAnimationFrame(() => {
      cardRefs.current.forEach((element, id) => {
        if (id === draggedId) return;
        const before = previousRects.get(id);
        if (!before) return;
        const after = element.getBoundingClientRect();
        const x = before.left - after.left;
        const y = before.top - after.top;
        if (Math.abs(x) < 1 && Math.abs(y) < 1) return;
        element.animate(
          [
            { transform: `translate3d(${x}px, ${y}px, 0)` },
            { transform: 'translate3d(0, 0, 0)' },
          ],
          { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      });
    });
  };

  const reorderLocally = (draggedId: number, targetId: number) => {
    if (draggedId === targetId) return;
    const current = orderRef.current;
    const sourceIndex = current.indexOf(draggedId);
    const targetIndex = current.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

    const previousRects = new Map<number, DOMRect>();
    cardRefs.current.forEach((element, id) => {
      previousRects.set(id, element.getBoundingClientRect());
    });

    const next = [...current];
    next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, draggedId);
    orderRef.current = next;
    setCategoryOrderIds(next);
    animateLayout(previousRects, draggedId);
  };

  const persistOrder = async (nextOrder: number[]) => {
    setBusy(true);
    setFeedback('');
    try {
      await onReorderCategories(nextOrder);
      setFeedback('Categorias reorganizadas com sucesso.');
    } catch (error) {
      const fallback = categories.map((category) => category.id);
      orderRef.current = fallback;
      setCategoryOrderIds(fallback);
      setFeedback(adminErrorMessage(error, 'Não foi possível salvar a ordem das categorias.'));
    } finally {
      setBusy(false);
    }
  };

  const settlePreview = (drag: CategoryDrag, cancelled: boolean) => {
    const preview = drag.preview;
    const startRect = drag.startRect;
    if (!preview || !startRect) return;
    const targetRect = cancelled
      ? startRect
      : cardRefs.current.get(drag.categoryId)?.getBoundingClientRect() || startRect;
    const targetX = targetRect.left - startRect.left;
    const targetY = targetRect.top - startRect.top;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      preview.remove();
      return;
    }

    const animation = preview.animate(
      [
        { transform: preview.style.transform, opacity: 0.98 },
        {
          transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(1) rotate(0deg)`,
          opacity: 0.18,
        },
      ],
      {
        duration: 180,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      },
    );
    void animation.finished.catch(() => undefined).finally(() => preview.remove());
  };

  const beginCategoryDrag = (
    event: ReactPointerEvent<HTMLElement>,
    categoryId: number,
  ) => {
    if (busy || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const target = event.target instanceof Element ? event.target : null;
    if (
      target?.closest(
        'button, a, input, select, textarea, label, [contenteditable="true"], [data-no-category-drag]',
      )
    ) {
      return;
    }

    event.preventDefault();
    orderRef.current = [...effectiveCategoryOrderIds];
    dragRef.current = {
      categoryId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      element: event.currentTarget,
      preview: null,
      startRect: null,
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onBlur);
      if (cleanupRef.current === cleanup) cleanupRef.current = null;
    };

    const complete = async (cancelled: boolean) => {
      const drag = dragRef.current;
      if (!drag || drag.categoryId !== categoryId || drag.pointerId !== event.pointerId) {
        cleanup();
        return;
      }
      dragRef.current = null;
      cleanup();
      if (!drag.active) return;

      drag.element.removeAttribute('data-drag-source');
      settlePreview(drag, cancelled);
      setDraggingCategoryId(null);

      if (cancelled) {
        const fallback = categories.map((category) => category.id);
        orderRef.current = fallback;
        setCategoryOrderIds(fallback);
        return;
      }

      const nextOrder = [...orderRef.current];
      const currentOrder = categories.map((category) => category.id);
      const changed =
        currentOrder.length === nextOrder.length &&
        currentOrder.some((id, index) => id !== nextOrder[index]);
      if (changed) await persistOrder(nextOrder);
    };

    function onMove(pointerEvent: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || drag.categoryId !== categoryId || drag.pointerId !== pointerEvent.pointerId) {
        return;
      }
      const deltaX = pointerEvent.clientX - drag.startX;
      const deltaY = pointerEvent.clientY - drag.startY;

      if (!drag.active) {
        if (Math.hypot(deltaX, deltaY) < 6) return;
        const { preview, rect } = createDragPreview(drag.element);
        drag.active = true;
        drag.preview = preview;
        drag.startRect = rect;
        drag.element.dataset.dragSource = 'true';
        setDraggingCategoryId(categoryId);
      }

      pointerEvent.preventDefault();
      const tilt = Math.max(-0.8, Math.min(0.8, deltaX * 0.008));
      if (drag.preview) {
        drag.preview.style.transform =
          `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.025) rotate(${tilt}deg)`;
      }

      const edge = 72;
      if (pointerEvent.clientY < edge) window.scrollBy(0, -10);
      else if (pointerEvent.clientY > window.innerHeight - edge) window.scrollBy(0, 10);

      const hoveredCard = document
        .elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
        ?.closest<HTMLElement>('[data-category-card]');
      const targetId = Number(hoveredCard?.dataset.categoryId);
      if (Number.isSafeInteger(targetId) && targetId > 0) reorderLocally(categoryId, targetId);
    }

    function onUp(pointerEvent: PointerEvent) {
      if (pointerEvent.pointerId === event.pointerId) void complete(false);
    }

    function onCancel(pointerEvent: PointerEvent) {
      if (pointerEvent.pointerId === event.pointerId) void complete(true);
    }

    function onBlur() {
      void complete(true);
    }

    cleanupRef.current?.();
    cleanupRef.current = cleanup;
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onBlur);
  };

  const moveCategoryWithKeyboard = async (categoryId: number, direction: -1 | 1) => {
    if (busy) return;
    const current = [...effectiveCategoryOrderIds];
    const currentIndex = current.indexOf(categoryId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= current.length) return;

    const previousRects = new Map<number, DOMRect>();
    cardRefs.current.forEach((element, id) => {
      previousRects.set(id, element.getBoundingClientRect());
    });
    const next = [...current];
    [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
    orderRef.current = next;
    setCategoryOrderIds(next);
    animateLayout(previousRects);
    await persistOrder(next);
  };

  const setCategoryCardRef = (categoryId: number, element: HTMLElement | null) => {
    if (element) cardRefs.current.set(categoryId, element);
    else cardRefs.current.delete(categoryId);
  };

  return {
    effectiveCategoryOrderIds,
    orderedCategories,
    draggingCategoryId,
    beginCategoryDrag,
    moveCategoryWithKeyboard,
    setCategoryCardRef,
  };
}
