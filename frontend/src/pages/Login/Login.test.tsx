import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loginRequest: vi.fn(),
  loginWithGoogle: vi.fn(),
  verifyLogin2fa: vi.fn(),
  getGoogleClientId: vi.fn(),
  persistLogin: vi.fn(),
  promptDialog: vi.fn(),
}));

vi.mock('../../Services/authService', () => ({
  default: {
    login: mocks.loginRequest,
    loginWithGoogle: mocks.loginWithGoogle,
    verifyLogin2fa: mocks.verifyLogin2fa,
    getGoogleClientId: mocks.getGoogleClientId,
  },
}));
vi.mock('../../contexts/authContext.js', () => ({
  useAuth: () => ({ login: mocks.persistLogin }),
}));
vi.mock('../../components/AppDialog/context', () => ({
  useAppDialog: () => ({ promptDialog: mocks.promptDialog }),
}));
vi.mock('./hooks/useRestaurantLoginBranding', () => ({
  useRestaurantLoginBranding: () => ({
    name: 'Restaurante Teste',
    description: 'Cardápio de teste',
    primaryColor: '#cf562f',
    logoUrl: '',
  }),
}));

import Login from './Login';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const TABLE_RETURN_PATH = '/restaurante-teste/mesa/5?rid=1&tk=abc123#bebidas';
const SECOND_TABLE_RETURN_PATH = '/outro-restaurante/mesa/9?rid=2&tk=def456#conta';

function LocationProbe() {
  const location = useLocation();
  return <output>{`${location.pathname}${location.search}${location.hash}`}</output>;
}

function ContextSwitcher() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      data-testid="change-auth-context"
      onClick={() => navigate(`/login?next=${encodeURIComponent(SECOND_TABLE_RETURN_PATH)}`)}
    >
      Alterar contexto
    </button>
  );
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('Login contextual do cliente', () => {
  let container: HTMLDivElement;
  let root: Root;
  let googleCallback: ((response: { credential: string }) => Promise<void>) | undefined;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    googleCallback = undefined;
    mocks.getGoogleClientId.mockResolvedValue('google-client-id');
    Object.defineProperty(window, 'google', {
      configurable: true,
      value: {
        accounts: {
          id: {
            initialize: vi.fn(
              (configuration: {
                callback: (response: { credential: string }) => Promise<void>;
              }) => {
                googleCallback = configuration.callback;
              },
            ),
            renderButton: vi.fn(),
          },
        },
      },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <MemoryRouter initialEntries={[`/login?next=${encodeURIComponent(TABLE_RETURN_PATH)}`]}>
          <Routes>
            <Route
              path="/login"
              element={
                <>
                  <ContextSwitcher />
                  <Login />
                </>
              }
            />
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    Reflect.deleteProperty(window, 'google');
    vi.useRealTimers();
  });

  it('preserva a mesa durante email, senha e MFA até o redirect final', async () => {
    mocks.loginRequest.mockResolvedValue({ mfaRequired: true, mfaToken: 'mfa-token' });
    mocks.promptDialog.mockResolvedValue('123456');
    mocks.verifyLogin2fa.mockResolvedValue({
      token: 'customer-token',
      user: { id: 21, name: 'Cliente Teste', role: 'CLIENTE' },
    });

    setInputValue(container.querySelector('#email') as HTMLInputElement, 'cliente@teste.com');
    setInputValue(container.querySelector('#password') as HTMLInputElement, 'Senha@123');
    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.verifyLogin2fa).toHaveBeenCalledWith({
      mfaToken: 'mfa-token',
      code: '123456',
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(mocks.persistLogin).toHaveBeenCalledWith(
      { id: 21, name: 'Cliente Teste', role: 'CLIENTE' },
      'customer-token',
    );
    expect(container.textContent).toContain(TABLE_RETURN_PATH);
  });

  it('usa o mesmo next seguro após o callback do Google', async () => {
    mocks.loginWithGoogle.mockResolvedValue({
      token: 'google-customer-token',
      user: { id: 21, name: 'Cliente Google', role: 'CLIENTE' },
    });

    expect(googleCallback).toBeTypeOf('function');
    await act(async () => {
      await googleCallback?.({ credential: 'google-id-token' });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(mocks.loginWithGoogle).toHaveBeenCalledWith('google-id-token');
    expect(mocks.persistLogin).toHaveBeenCalledWith(
      { id: 21, name: 'Cliente Google', role: 'CLIENTE' },
      'google-customer-token',
    );
    expect(container.textContent).toContain(TABLE_RETURN_PATH);
  });

  it('usa o next mais recente no callback Google já inicializado', async () => {
    mocks.loginWithGoogle.mockResolvedValue({
      token: 'google-customer-token',
      user: { id: 21, name: 'Cliente Google', role: 'CLIENTE' },
    });
    const initializedCallback = googleCallback;

    act(() => {
      (container.querySelector('[data-testid="change-auth-context"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      await initializedCallback?.({ credential: 'google-id-token' });
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(container.textContent).toContain(SECOND_TABLE_RETURN_PATH);
    expect(container.textContent).not.toContain(TABLE_RETURN_PATH);
  });

  it('preserva o next durante a troca obrigatória de senha do CLIENTE', async () => {
    mocks.loginRequest.mockResolvedValue({
      token: 'temporary-customer-token',
      user: {
        id: 21,
        name: 'Cliente Teste',
        role: 'CLIENTE',
        mustChangePassword: true,
      },
    });

    setInputValue(container.querySelector('#email') as HTMLInputElement, 'cliente@teste.com');
    setInputValue(container.querySelector('#password') as HTMLInputElement, 'Temporaria@123');
    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(700);
    });

    const location = container.textContent || '';
    expect(location).toMatch(/^\/change-password\?next=/u);
    expect(new URLSearchParams(location.split('?')[1]).get('next')).toBe(TABLE_RETURN_PATH);
  });

  it('envia funcionário ATENDENTE à área exclusiva sem reutilizar o next do cliente', async () => {
    mocks.loginRequest.mockResolvedValue({
      token: 'attendant-token',
      user: {
        id: 31,
        name: 'Ana Atendente',
        role: 'FUNCIONARIO',
        subRole: 'ATENDENTE',
      },
    });

    setInputValue(container.querySelector('#email') as HTMLInputElement, 'atendente@teste.com');
    setInputValue(container.querySelector('#password') as HTMLInputElement, 'Senha@123');
    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(mocks.persistLogin).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'FUNCIONARIO', subRole: 'ATENDENTE' }),
      'attendant-token',
    );
    expect(container.textContent).toBe('/attendant');
  });
});
