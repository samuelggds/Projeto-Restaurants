import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../../contexts/authContext.js', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}));
vi.mock('../../Services/api', () => ({
  default: { get: mocks.apiGet, post: mocks.apiPost },
}));
vi.mock('react-toastify', () => ({
  toast: { error: mocks.toastError, warn: vi.fn(), success: vi.fn() },
}));

import SystemBlockedPage from './SystemBlocked';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('SystemBlockedPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <MemoryRouter>
          <SystemBlockedPage />
        </MemoryRouter>,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('bloqueia cliques repetidos enquanto procura o link e fecha a aba sem destino', async () => {
    let resolveInvoices: (value: { data: never[] }) => void = () => undefined;
    mocks.apiGet.mockReturnValue(
      new Promise((resolve) => {
        resolveInvoices = resolve;
      }),
    );
    const paymentWindow = { location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(paymentWindow as unknown as Window);
    const payButton = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Pagar agora'),
    ) as HTMLButtonElement;

    act(() => payButton.click());
    expect(payButton.disabled).toBe(true);
    expect(payButton.getAttribute('aria-busy')).toBe('true');

    await act(async () => {
      resolveInvoices({ data: [] });
      await Promise.resolve();
    });

    expect(paymentWindow.close).toHaveBeenCalledOnce();
    expect(mocks.toastError).toHaveBeenCalledWith('Link de pagamento ainda não disponível');
    expect(payButton.disabled).toBe(false);
  });
});
