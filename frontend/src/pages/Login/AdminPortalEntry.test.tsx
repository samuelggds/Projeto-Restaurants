import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  persistTenantSlug: vi.fn(),
  getAdminPortalGrant: vi.fn(),
  verifyAdminPortalGrant: vi.fn(),
  exchangeAdminPortalKey: vi.fn(),
}));

vi.mock('../../contexts/authContext', () => ({
  useAuth: () => ({ user: null, logout: mocks.logout }),
}));

vi.mock('../../shared/navigation/tenantRouteContext', () => ({
  persistTenantSlug: mocks.persistTenantSlug,
}));

vi.mock('./domain/adminPortalSession', () => ({
  getAdminPortalGrant: mocks.getAdminPortalGrant,
  verifyAdminPortalGrant: mocks.verifyAdminPortalGrant,
  exchangeAdminPortalKey: mocks.exchangeAdminPortalKey,
}));

import AdminPortalEntry from './AdminPortalEntry';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function Target() {
  return <div data-testid="admin-target">Painel administrativo</div>;
}

describe('AdminPortalEntry', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function renderEntry() {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/north-pizza/admin/' + 'a'.repeat(43)]}>
          <Routes>
            <Route path="/:restaurantSlug/admin/:accessKey" element={<AdminPortalEntry />} />
            <Route path="/:restaurantSlug/admin" element={<Target />} />
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('reutiliza grant válido ao abrir o mesmo link e não reinicia os sete dias', async () => {
    mocks.getAdminPortalGrant.mockReturnValue('grant-existente');
    mocks.verifyAdminPortalGrant.mockResolvedValue({
      valid: true,
      restaurantId: 7,
      slug: 'north-pizza',
      expiresAt: '2026-10-07T12:00:00.000Z',
    });

    await renderEntry();

    expect(mocks.verifyAdminPortalGrant).toHaveBeenCalledWith('north-pizza');
    expect(mocks.exchangeAdminPortalKey).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="admin-target"]')).not.toBeNull();
  });

  it('faz nova troca somente quando o grant existente já não é válido', async () => {
    mocks.getAdminPortalGrant.mockReturnValue('grant-expirado');
    mocks.verifyAdminPortalGrant.mockRejectedValue(new Error('Página não encontrada.'));
    mocks.exchangeAdminPortalKey.mockResolvedValue('novo-grant');

    await renderEntry();

    expect(mocks.verifyAdminPortalGrant).toHaveBeenCalledWith('north-pizza');
    expect(mocks.exchangeAdminPortalKey).toHaveBeenCalledWith('north-pizza', 'a'.repeat(43));
    expect(container.querySelector('[data-testid="admin-target"]')).not.toBeNull();
  });
});
