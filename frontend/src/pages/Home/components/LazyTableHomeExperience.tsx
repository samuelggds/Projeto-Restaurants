import { lazy } from 'react';

export const LazyTableMenuExperience = lazy(
  () => import('../../digital-menu/TableMenuExperience'),
);

export const LazyTableAccountPanel = lazy(() =>
  import('./TableAccountPanel').then((module) => ({
    default: module.TableAccountPanel,
  })),
);
