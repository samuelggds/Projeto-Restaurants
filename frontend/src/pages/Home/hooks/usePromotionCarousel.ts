import { useCallback, useEffect, useMemo, useState } from 'react';

export const PROMOTION_CAROUSEL_INTERVAL_MS = 5_000;

function pageIsHidden() {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

export function usePromotionCarousel(itemIds: readonly number[]) {
  const itemSignature = itemIds.join(',');
  const ids = useMemo(
    () => (itemSignature ? itemSignature.split(',').map((id) => Number(id)) : []),
    [itemSignature],
  );
  const [activeId, setActiveId] = useState<number | null>(() => itemIds[0] ?? null);
  const [documentHidden, setDocumentHidden] = useState(pageIsHidden);
  const [cycleRevision, setCycleRevision] = useState(0);
  const resolvedActiveId =
    activeId !== null && ids.includes(activeId) ? activeId : (ids[0] ?? null);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const handleVisibilityChange = () => setDocumentHidden(pageIsHidden());
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const autoplayPaused = ids.length < 2 || documentHidden;

  useEffect(() => {
    if (autoplayPaused) return undefined;
    const timeoutId = window.setTimeout(() => {
      const currentIndex = resolvedActiveId === null ? -1 : ids.indexOf(resolvedActiveId);
      setActiveId(ids[(currentIndex + 1 + ids.length) % ids.length] ?? null);
    }, PROMOTION_CAROUSEL_INTERVAL_MS);
    return () => window.clearTimeout(timeoutId);
  }, [autoplayPaused, cycleRevision, ids, resolvedActiveId]);

  const restartCycle = useCallback(() => {
    setCycleRevision((revision) => revision + 1);
  }, []);

  const goTo = useCallback(
    (requestedIndex: number) => {
      if (!ids.length) return;
      const normalizedIndex = Math.min(Math.max(Math.trunc(requestedIndex), 0), ids.length - 1);
      setActiveId(ids[normalizedIndex]);
      restartCycle();
    },
    [ids, restartCycle],
  );

  const goNext = useCallback(() => {
    if (!ids.length) return;
    const currentIndex = resolvedActiveId === null ? -1 : ids.indexOf(resolvedActiveId);
    goTo((currentIndex + 1 + ids.length) % ids.length);
  }, [goTo, ids, resolvedActiveId]);

  const goPrevious = useCallback(() => {
    if (!ids.length) return;
    const currentIndex = resolvedActiveId === null ? 0 : ids.indexOf(resolvedActiveId);
    goTo((currentIndex - 1 + ids.length) % ids.length);
  }, [goTo, ids, resolvedActiveId]);

  const activeIndex = resolvedActiveId === null ? 0 : Math.max(ids.indexOf(resolvedActiveId), 0);

  return {
    activeIndex,
    autoplayPaused,
    goTo,
    goNext,
    goPrevious,
  };
}
