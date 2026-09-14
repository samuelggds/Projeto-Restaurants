import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loginRequest: vi.fn(),
  loginWithGoogle: vi.fn(),
  verifyLogin2fa: vi.fn(),
  resendLogin2fa: vi.fn(),
  getGoogleClientId: vi.fn(),
  logout: vi.fn(),
  persistLogin: vi.fn(),
}));

vi.mock('../../Services/authService', () => ({
  default: {
    login: mocks.loginRequest,
    loginWithGoogle: mocks.loginWithGoogle,
    verifyLogin2fa: mocks.verifyLogin2fa,
    resendLogin2fa: mocks.resendLogin2fa,
    getGoogleClientId: mocks.getGoogleClientId,
    logout: mocks.logout,
  },
}));
vi.mock('../../contexts/authContext.js', () => ({
  useAuth: () => ({ login: mocks.persistLogin }),
}));
vi.mock('./hooks/useRestaurantLoginBranding', () => ({
  useRestaurantLoginBranding: () => ({
    name: 'Restaurante Teste',
    description: 'Cardápio de teste',
    primaryColor: '#cf562f',
    logoUrl: '',
    category: 'PIZZARIA',
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
    <>
      <button
        type="button"
        data-testid="change-auth-context"
        onClick={() =>
          navigate(
            `/outro-restaurante/login?next=${encodeURIComponent(SECOND_TABLE_RETURN_PATH)}`,
          )
        }
      >
        Alterar contexto
      </button>
      <button
        type="button"
        data-testid="change-to-team-context"
        onClick={() => navigate('/restaurante-teste/team')}
      >
        Acesso da equipe
      </button>
    </>
  );
}

function LoginHarness() {
  return (
    <>
      <ContextSwitcher />
      <Login />
    </>
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
    window.sessionStorage.clear();
    googleCallback = undefined;
    mocks.getGoogleClientId.mockResolvedValue('google-client-id');
    mocks.resendLogin2fa.mockResolvedValue({
      mfaRequired: true,
      mfaToken: 'new-mfa-token',
      destination: 'cli****@teste.com',
      resendAfterSeconds: 60,
    });
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
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <MemoryRouter
          initialEntries={[
            `/restaurante-teste/login?next=${encodeURIComponent(TABLE_RETURN_PATH)}`,
          ]}
        >
          <Routes>
            <Route path="/:restaurantSlug/login" element={<LoginHarness />} />
            <Route path="/:restaurantSlug/team" element={<LoginHarness />} />
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
    Reflect.deleteProperty(window, 'matchMedia');
    vi.useRealTimers();
  });

  it('aplica a identidade da categoria sem perder o contexto da mesa', () => {
    expect(
      container
        .querySelector('[data-testid="login-layout"]')
        ?.getAttribute('data-restaurant-category'),
    ).toBe('PIZZARIA');
    expect(
      container.querySelector('[data-testid="login-hero-content"]')?.getAttribute('data-category'),
    ).toBe('PIZZARIA');
    expect(container.textContent).toContain('A experiência digital da sua pizzaria começa aqui.');
    expect(container.textContent).toContain('Mesa 5 • acesso seguro');
  });

  it('preserva a mesa durante email, senha e MFA até o redirect final', async () => {
    mocks.loginRequest.mockResolvedValue({
      mfaRequired: true,
      mfaToken: 'mfa-token',
      destination: 'cli****@teste.com',
      resendAfterSeconds: 60,
    });
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

    expect(container.textContent).toContain('Autenticação de dois fatores');
    expect(container.textContent).toContain('cli****@teste.com');
    expect(container.textContent).toContain('1:00');

    const otpInputs = Array.from(
      container.querySelectorAll<HTMLInputElement>('[aria-label^="Dígito "]'),
    );
    expect(otpInputs).toHaveLength(6);
    '123456'.split('').forEach((digit, index) => setInputValue(otpInputs[index], digit));

    const verifyButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Verificar código'),
    );
    await act(async () => {
      verifyButton?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.verifyLogin2fa).toHaveBeenCalledWith({
      mfaToken: 'mfa-token',
      code: '123456',
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(520);
      await Promise.resolve();
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
    act(() => {
      (container.querySelector('[data-testid="change-to-team-context"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

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