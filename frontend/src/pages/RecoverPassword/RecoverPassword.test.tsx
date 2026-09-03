import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('../../Services/authService', () => ({
  default: {
    forgotPassword: mocks.forgotPassword,
    resetPassword: mocks.resetPassword,
  },
}));
vi.mock('../Login/hooks/useRestaurantLoginBranding', () => ({
  useRestaurantLoginBranding: () => ({
    name: 'Restaurante Teste',
    primaryColor: '#cf562f',
    logoUrl: '',
  }),
}));

import RecoverPassword from './RecoverPassword';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const TABLE_RETURN_PATH = '/restaurante-teste/mesa/12?rid=42&tk=test-token#conta';

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

describe('RecoverPassword', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.forgotPassword.mockResolvedValue({ message: 'Código enviado.' });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <MemoryRouter
          initialEntries={[`/recover-password?next=${encodeURIComponent(TABLE_RETURN_PATH)}`]}
        >
          <Routes>
            <Route path="/recover-password" element={<RecoverPassword />} />
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

  it('solicita o código por e-mail e preserva o contato durante a confirmação', async () => {
    const emailMethod = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'E-mail',
    ) as HTMLButtonElement;
    act(() => emailMethod.click());

    expect(emailMethod.getAttribute('aria-pressed')).toBe('true');
    const identifier = container.querySelector('#identifier') as HTMLInputElement;
    expect(identifier.type).toBe('email');
    setInputValue(identifier, 'cliente@example.test');

    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
    });

    expect(mocks.forgotPassword).toHaveBeenCalledWith({ email: 'cliente@example.test' });
    expect(identifier.readOnly).toBe(true);
    expect(container.textContent).toContain('Código solicitado para cliente@example.test.');
    expect(emailMethod.disabled).toBe(true);
  });

  it('permite trocar o contato antes de solicitar um novo código', async () => {
    const identifier = container.querySelector('#identifier') as HTMLInputElement;
    setInputValue(identifier, '(11) 99999-9999');

    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
    });

    const changeContact = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Alterar contato',
    ) as HTMLButtonElement;
    act(() => changeContact.click());

    expect(identifier.readOnly).toBe(false);
    expect(container.querySelector('#reset-code')).toBeNull();
  });

  it('retorna ao Login com o next completo após redefinir a senha', async () => {
    mocks.resetPassword.mockResolvedValue({ message: 'Senha redefinida.' });
    const emailMethod = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'E-mail',
    ) as HTMLButtonElement;
    act(() => emailMethod.click());
    setInputValue(
      container.querySelector('#identifier') as HTMLInputElement,
      'cliente@example.test',
    );

    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
    });

    setInputValue(container.querySelector('#reset-code') as HTMLInputElement, '123456');
    setInputValue(container.querySelector('#new-password') as HTMLInputElement, 'Senha@123');
    setInputValue(container.querySelector('#confirm-password') as HTMLInputElement, 'Senha@123');

    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.resetPassword).toHaveBeenCalledWith({
      email: 'cliente@example.test',
      code: '123456',
      newPassword: 'Senha@123',
      confirmPassword: 'Senha@123',
    });
    const location = container.textContent || '';
    expect(location).toMatch(/^\/login\?next=/u);
    expect(new URLSearchParams(location.split('?')[1]).get('next')).toBe(TABLE_RETURN_PATH);
  });
});
