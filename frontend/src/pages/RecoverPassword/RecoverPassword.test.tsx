import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
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
        <MemoryRouter initialEntries={['/recover-password']}>
          <RecoverPassword />
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
});
