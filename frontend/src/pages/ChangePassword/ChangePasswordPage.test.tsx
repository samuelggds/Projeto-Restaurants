import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiPut: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../Services/api', () => ({ default: { put: mocks.apiPut } }));
vi.mock('../../contexts/authContext', () => ({
  useAuth: () => ({ logout: mocks.logout }),
}));

import ChangePasswordPage from './ChangePasswordPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const TABLE_RETURN_PATH = '/restaurante-teste/mesa/5?rid=1&tk=abc#conta';

function LocationProbe() {
  const location = useLocation();
  return <output>{`${location.pathname}${location.search}${location.hash}`}</output>;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('ChangePasswordPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <MemoryRouter
          initialEntries={[`/change-password?next=${encodeURIComponent(TABLE_RETURN_PATH)}`]}
        >
          <Routes>
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/login" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('explica os campos ausentes após a primeira tentativa de envio', () => {
    const form = container.querySelector('form') as HTMLFormElement;
    const inputs = [...container.querySelectorAll('input')];

    act(() => form.requestSubmit());

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Informe a senha temporária atual.',
    );
    expect(inputs.every((input) => input.getAttribute('aria-invalid') === 'true')).toBe(true);
    expect(inputs[0].getAttribute('aria-describedby')).toBe('change-password-error');
  });

  it('preserva o destino contextual ao concluir a troca obrigatória', async () => {
    mocks.apiPut.mockResolvedValue({});
    const inputs = [...container.querySelectorAll('input')];
    setInputValue(inputs[0], 'Temporaria@123');
    setInputValue(inputs[1], 'NovaSenha@123');
    setInputValue(inputs[2], 'NovaSenha@123');

    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.apiPut).toHaveBeenCalledWith('/auth/password', {
      oldPassword: 'Temporaria@123',
      newPassword: 'NovaSenha@123',
    });
    expect(mocks.logout).toHaveBeenCalledOnce();
    const location = container.textContent || '';
    expect(location).toMatch(/^\/login\?next=/u);
    expect(new URLSearchParams(location.split('?')[1]).get('next')).toBe(TABLE_RETURN_PATH);
  });
});
