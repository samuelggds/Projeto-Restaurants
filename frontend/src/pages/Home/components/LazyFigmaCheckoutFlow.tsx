import { lazy } from 'react';

export const LazyFigmaCheckoutFlow = lazy(() =>
  import('../FigmaCheckoutFlow').then((module) => ({
    default: module.FigmaCheckoutFlow,
  })),
);
