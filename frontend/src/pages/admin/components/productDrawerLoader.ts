import { lazy, useEffect } from 'react';

// Share the exact same module import for prefetch and React.lazy. Other admin
// sections keep the heavy product editor outside their initial JavaScript.
const loadProductDrawerModule = () => import('./ProductDrawer');

export const ProductDrawer = lazy(() =>
  loadProductDrawerModule().then((module) => ({ default: module.ProductDrawer })),
);

export function usePreloadProductDrawer(active: boolean) {
  useEffect(() => {
    if (!active) return;
    // A failed speculative load must not break navigation. React.lazy still
    // surfaces an actual failure if the user opens the editor.
    void loadProductDrawerModule().catch(() => undefined);
  }, [active]);
}
