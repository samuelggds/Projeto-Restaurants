import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyAdminPortalGrant: vi.fn(),
  clearAdminPortalGrant: vi.fn(),
}));

vi.mock('./Login', () => ({
  default: () => <div data-testid="admin-login-stub">Login administrativo</div>,
}));

vi.mock('./domain/adminPortalSession', () => ({
  verifyAdminPortalGrant: mocks.verifyAdminPortalGrant,
  clearAdminPortalGrant: mocks.clearAdminPortalGrant,
}));

import AdminPortalLoginGate from './AdminPortalLoginGate';
import {
  ADMIN_ACCESS_NOTICE_VISIBLE_MS,
  formatAdminAccessRemaining,
} from './domain/adminPortalAccessNotice';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const START_AT = '2026-09-30T12:00:00.000Z';
const EXPIRES_AT = '2026-10-07T12:00:00.000Z';

function renderGate(root: Root) {
  root.render(
    <MemoryRouter initialEntries={['/north-pizza/admin']}>
      <Routes>
        <Route path="/:restaurantSlug/admin" element={<AdminPortalLoginGate />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminPortalLoginGate', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START_AT);
    vi.clearAllMocks();
    mocks.verifyAdminPortalGrant.mockResolvedValue({
      valid: true,
      restaurantId: 7,
      slug: 'north-pizza',
      expiresAt: EXPIRES_AT,
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('mostra dias, horas, minutos e segundos em tempo real', () => {
    const now = Date.parse('2026-09-30T12:00:00.000Z');
    const expiresAt = '2026-10-07T11:02:03.000Z';

    expect(formatAdminAccessRemaining(expiresAt, now)).toBe('6d 23h 2m 3s');
    expect(formatAdminAccessRemaining(expiresAt, now + 1000)).toBe('6d 23h 2m 2s');
  });

  it('nunca mostra tempo negativo', () => {
    const expiresAt = '2026-09-30T12:00:00.000Z';
    expect(formatAdminAccessRemaining(expiresAt, Date.parse(expiresAt) + 5000)).toBe('0s');
  });

  it('mantém o aviso por 15 segundos e não o reapresenta na mesma montagem', async () => {
    await act(async () => {
      renderGate(root);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ADMIN_ACCESS_NOTICE_VISIBLE_MS).toBe(15_000);
    expect(container.querySelector('[data-testid="admin-access-window-notice"]')).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(14_999);
    });
    expect(container.querySelector('[data-testid="admin-access-window-notice"]')).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(container.querySelector('[data-testid="admin-access-window-notice"]')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(container.querySelector('[data-testid="admin-access-window-notice"]')).toBeNull();
  });

  it('volta a mostrar após remontar sem reiniciar a expiração do acesso', async () => {
    await act(async () => {
      renderGate(root);
      await Promise.resolve();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(ADMIN_ACCESS_NOTICE_VISIBLE_MS);
    });

    expect(container.querySelector('[data-testid="admin-access-window-notice"]')).toBeNull();

    act(() => root.unmount());
    root = createRoot(container);

    await act(async () => {
      renderGate(root);
      await Promise.resolve();
      await Promise.resolve();
    });

    const notice = container.querySelector('[data-testid="admin-access-window-notice"]');
    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain('6d 23h 59m 45s');
    expect(mocks.verifyAdminPortalGrant).toHaveBeenCalledTimes(2);
  });
});
