import { act, useCallback } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import menuService from '../../../Services/menuService';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';
import {
  PUBLIC_SETTINGS_REFRESH_INTERVAL_MS,
  useDefaultRestaurantId,
  useRestaurantCatalog,
} from './useRestaurantCatalog';

vi.mock('../../../Services/menuService', () => ({
  default: {
    listProducts: vi.fn(),
    listProductsBySlug: vi.fn(),
  },
}));

vi.mock('../../../Services/restaurantSettingsService', () => ({
  default: {
    getDefaultPublicSettings: vi.fn(),
    getPublicSettings: vi.fn(),
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function Probe() {
  const onError = useCallback(() => undefined, []);
  const { settings } = useRestaurantCatalog({ restaurantId: 7, slug: '', onError });
  return <output>{String(settings?.isOpenForOrders ?? 'carregando')}</output>;
}

function DefaultRestaurantProbe({ enabled = true }: { enabled?: boolean }) {
  const restaurantId = useDefaultRestaurantId(enabled);
  return <output>{String(restaurantId ?? 'carregando')}</output>;
}

describe('useRestaurantCatalog settings refresh', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.mocked(menuService.listProducts).mockResolvedValue([]);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('atualiza o status da Home por polling e remove o timer ao desmontar', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.mocked(restaurantSettingsService.getPublicSettings)
      .mockResolvedValueOnce({ isOpenForOrders: true })
      .mockResolvedValueOnce({ isOpenForOrders: false });

    await act(async () => root.render(<Probe />));
    expect(container.textContent).toBe('true');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PUBLIC_SETTINGS_REFRESH_INTERVAL_MS);
    });
    expect(container.textContent).toBe('false');
    expect(restaurantSettingsService.getPublicSettings).toHaveBeenCalledTimes(2);

    await act(async () => root.unmount());
    await vi.advanceTimersByTimeAsync(PUBLIC_SETTINGS_REFRESH_INTERVAL_MS);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(restaurantSettingsService.getPublicSettings).toHaveBeenCalledTimes(2);

    root = createRoot(container);
  });

  it('não consulta em segundo plano e atualiza imediatamente quando a aba volta a ficar visível', async () => {
    let visibilityState: DocumentVisibilityState = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);
    vi.mocked(restaurantSettingsService.getPublicSettings)
      .mockResolvedValueOnce({ isOpenForOrders: true })
      .mockResolvedValueOnce({ isOpenForOrders: false });

    await act(async () => root.render(<Probe />));
    visibilityState = 'hidden';
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PUBLIC_SETTINGS_REFRESH_INTERVAL_MS);
    });
    expect(restaurantSettingsService.getPublicSettings).toHaveBeenCalledTimes(1);

    visibilityState = 'visible';
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(restaurantSettingsService.getPublicSettings).toHaveBeenCalledTimes(2);
    expect(container.textContent).toBe('false');
  });

  it('resolve e memoriza o restaurante padrão para uma visita anônima à raiz', async () => {
    vi.mocked(restaurantSettingsService.getDefaultPublicSettings).mockResolvedValue({
      restaurantId: 3,
    });

    await act(async () => root.render(<DefaultRestaurantProbe />));

    expect(container.textContent).toBe('3');
    expect(localStorage.getItem('menuRestaurantId')).toBe('3');
    expect(restaurantSettingsService.getDefaultPublicSettings).toHaveBeenCalledOnce();
  });

  it('não consulta o padrão quando já existe outro contexto de restaurante', async () => {
    await act(async () => root.render(<DefaultRestaurantProbe enabled={false} />));

    expect(container.textContent).toBe('carregando');
    expect(restaurantSettingsService.getDefaultPublicSettings).not.toHaveBeenCalled();
  });
});
