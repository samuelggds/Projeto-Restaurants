import { lazy } from 'react';

export const TableMenuExperience = lazy(
  () => import('../../digital-menu/TableMenuExperience'),
);

export const TableAccountPanel = lazy(() =>
  import('./TableAccountPanel').then((module) => ({
    default: module.TableAccountPanel,
  })),
);
