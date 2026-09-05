import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../../Services/authService', () => ({
  default: { register: mocks.register },
}));
vi.mock('react-toastify', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock('../Login/hooks/useRestaurantLoginBranding', () => ({
  useRestaurantLoginBranding: () => ({
    name: 'Restaurante Teste',
    description: 'Cardápio de teste',
    primaryColor: '#cf562f',
    logoUrl: '',
  }),
}));

import Register from './Register';

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

describe('Register contextual do cliente', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.register.mockResolvedValue({ message: 'Cadastro concluído.' });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <MemoryRouter
          initialEntries={[
            `/restaurante-teste/register?next=${encodeURIComponent(TABLE_RETURN_PATH)}`,
          ]}
        >
          <Routes>
            <Route path="/:restaurantSlug/register" element={<Register />} />
            <Route path="/:restaurantSlug/login" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('cria somente uma conta CLIENTE e mantém a mesa até o Login tenant-scoped', async () => {
    expect(container.querySelector('[data-auth-context="TABLE"]')).not.toBeNull();
    expect(container.textContent).toContain('Criar conta para a Mesa 12');

    setInputValue(container.querySelector('#name') as HTMLInputElement, ' Samuel Cliente ');
    setInputValue(container.querySelector('#email') as HTMLInputElement, ' cliente@teste.com ');
    setInputValue(container.querySelector('#password') as HTMLInputElement, 'Senha@123');
    setInputValue(container.querySelector('#confirmPassword') as HTMLInputElement, 'Senha@123');

    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.register).toHaveBeenCalledWith({
      name: 'Samuel Cliente',
      email: 'cliente@teste.com',
      password: 'Senha@123',
      confirmPassword: 'Senha@123',
    });
    expect(mocks.register.mock.calls[0][0]).not.toHaveProperty('role');

    const location = container.textContent || '';
    expect(location).toMatch(/^\/restaurante-teste\/login\?next=/u);
    expect(new URLSearchParams(location.split('?')[1]).get('next')).toBe(TABLE_RETURN_PATH);
  });
});
