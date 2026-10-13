import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loginRequest: vi.fn(),
  persistLogin: vi.fn(),
  verifyLogin2fa: vi.fn(),
  getGoogleClientId: vi.fn(),
}));

vi.mock('../../Services/authService', () => ({
  default: {
    login: mocks.loginRequest,
    verifyLogin2fa: mocks.verifyLogin2fa,
    getGoogleClientId: mocks.getGoogleClientId,
    getPendingMfaChallenge: () => null,
  },
}));
vi.mock('../../contexts/authContext.js', () => ({
  useAuth: () => ({ login: mocks.persistLogin }),
}));
vi.mock('../../shared/tenant/useCustomDomainTenant', () => ({
  useCustomDomainTenant: () => ({ isCustomDomain: false, tenant: null }),
}));
vi.mock('./hooks/useRestaurantLoginBranding', () => ({
  useRestaurantLoginBranding: () => ({
    name: 'Restaurante Teste',
    description: 'Cardápio de teste',
    primaryColor: '#cf562f',
    logoUrl: '',
    coverUrl: '',
    markUrl: '',
    category: 'PIZZARIA',
  }),
}));

import Login from './Login';
import { writeRememberedAccountEmail } from './domain/rememberedAccount';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function ScopeControls() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" data-testid="other-tenant"
        onClick={() => navigate('/outro-restaurante/login')}>Outro restaurante</button>
      <button type="button" data-testid="team-portal"
        onClick={() => navigate('/restaurante-teste/team')}>Equipe</button>
    </>
  );
}

describe('inicialização dos campos de login sem sobrescrever digitação', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    mocks.getGoogleClientId.mockResolvedValue('regression-client-id');
    mocks.loginRequest.mockResolvedValue({
      mfaRequired: true,
      mfaToken: 'regression-mfa-token',
      destination: 'c***@teste.com',
      resendAfterSeconds: 60,
    });
    vi.stubGlobal('google', {
      accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } },
    });
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function renderLogin() {
    // Deliberately do not flush startup timers: the user can type as soon as
    // the fields are committed, before any delayed initialization callback.
    act(() => root.render(
      <StrictMode>
        <MemoryRouter initialEntries={['/restaurante-teste/login']}>
          <ScopeControls />
          <Login />
        </MemoryRouter>
      </StrictMode>,
    ));
  }

  function input(selector: string): HTMLInputElement {
    const element = container.querySelector<HTMLInputElement>(selector);
    if (!element) throw new Error(`Campo ausente: ${selector}`);
    return element;
  }

  function typeValue(selector: string, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setter) throw new Error('Setter nativo do input indisponível.');
    act(() => {
      const element = input(selector);
      setter.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function changeScope(testId: string) {
    const button = container.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
    if (!button) throw new Error(`Navegação ausente: ${testId}`);
    act(() => button.click());
  }

  it('restaura somente o identificador do escopo antes de qualquer timer', () => {
    writeRememberedAccountEmail(
      { portal: 'CUSTOMER', restaurantSlug: 'restaurante-teste' },
      'lembrado@teste.com',
    );
    window.localStorage.setItem('rememberedEmail', 'legado@outro.com');
    renderLogin();
    expect(input('#email').value).toBe('lembrado@teste.com');
    expect(input('#password').value).toBe('');
    expect(window.localStorage.getItem('rememberedEmail')).toBeNull();
  });

  it('preserva digitação anterior aos timers e ainda exige o segundo fator', async () => {
    renderLogin();
    typeValue('#email', 'cliente@teste.com');
    typeValue('#password', 'Senha@regressao123');
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(input('#email').value).toBe('cliente@teste.com');
    expect(input('#password').value).toBe('Senha@regressao123');

    const form = container.querySelector('form');
    if (!form) throw new Error('Formulário de login ausente.');
    await act(async () => {
      form.requestSubmit();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(mocks.loginRequest).toHaveBeenCalledExactlyOnceWith({
      email: 'cliente@teste.com', password: 'Senha@regressao123',
    });
    expect(container.textContent).toContain('Verificação em duas etapas');
    expect(mocks.verifyLogin2fa).not.toHaveBeenCalled();
    expect(mocks.persistLogin).not.toHaveBeenCalled();
    expect(JSON.stringify(window.localStorage)).not.toContain('Senha@regressao123');
    expect(JSON.stringify(window.sessionStorage)).not.toContain('Senha@regressao123');
  });

  it('limpa a senha e troca o identificador antes de exibir outro restaurante', async () => {
    writeRememberedAccountEmail(
      { portal: 'CUSTOMER', restaurantSlug: 'restaurante-teste' }, 'primeiro@teste.com',
    );
    writeRememberedAccountEmail(
      { portal: 'CUSTOMER', restaurantSlug: 'outro-restaurante' }, 'segundo@teste.com',
    );
    renderLogin();
    typeValue('#password', 'senha-do-primeiro');
    changeScope('other-tenant');
    // Assert before effects/timers can mask a cross-tenant credential flash.
    expect(input('#email').value).toBe('segundo@teste.com');
    expect(input('#password').value).toBe('');
    typeValue('#email', 'digitado-no-segundo@teste.com');
    typeValue('#password', 'senha-do-segundo');
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(input('#email').value).toBe('digitado-no-segundo@teste.com');
    expect(input('#password').value).toBe('senha-do-segundo');
    expect(mocks.loginRequest).not.toHaveBeenCalled();
  });

  it('não reutiliza as credenciais do cliente no portal da equipe', () => {
    writeRememberedAccountEmail(
      { portal: 'CUSTOMER', restaurantSlug: 'restaurante-teste' }, 'cliente@teste.com',
    );
    writeRememberedAccountEmail(
      { portal: 'STAFF', restaurantSlug: 'restaurante-teste' }, 'anaatendente',
    );
    renderLogin();
    typeValue('#password', 'senha-do-cliente');
    changeScope('team-portal');
    expect(input('#email').value).toBe('anaatendente');
    expect(input('#password').value).toBe('');
    expect(mocks.loginRequest).not.toHaveBeenCalled();
  });
});
