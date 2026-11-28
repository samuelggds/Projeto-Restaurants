import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RestaurantTrialSignup from './RestaurantTrialSignup';

vi.mock('../../../Services/api', () => ({
  default: { defaults: { baseURL: 'https://api.example.test', timeout: 15000 } },
}));
vi.mock('./TrialMenuSetup', () => ({ default: () => <div>Configure seu cardápio</div> }));
vi.mock('../../admin/components/RecurringBillingPayment', () => ({
  RecurringBillingPayment: () => <div>Preferências da mensalidade</div>,
}));
const mockAuth = vi.hoisted(() => ({
  exchange: vi.fn(),
  verifyGrant: vi.fn(),
  login: vi.fn(),
  verifyMfa: vi.fn(),
  accept: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('../../Login/domain/adminPortalSession', () => ({
  exchangeAdminPortalKey: mockAuth.exchange,
  verifyAdminPortalGrant: mockAuth.verifyGrant,
}));
vi.mock('../../../Services/authService', () => ({
  default: {
    login: mockAuth.login, logout: mockAuth.logout, verifyLogin2fa: mockAuth.verifyMfa,
    getPendingMfaChallenge: () => ({ mfaToken: 'desafio-do-canal' }),
  },
}));
vi.mock('../../../contexts/authContext', async () => {
  const { useState } = await import('react');
  return {
    useAuth() {
      const [user, setUser] = useState(null);
      return {
        user,
        login: (owner, token) => {
          mockAuth.accept(owner, token);
          setUser(owner);
        },
      };
    },
  };
});
vi.mock('../../Login/components/MfaVerificationModal', () => ({
  MfaVerificationModal: ({ onVerify, onSuccess }) => (
    <button onClick={async () => onSuccess(await onVerify('654321'))}>
      Confirmar segundo fator
    </button>
  ),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const basic = { code: 'BASICO', name: 'Entrada', monthlyFee: 79.9, trialDays: 7 };
const premium = { code: 'PREMIUM', name: 'Avançado', monthlyFee: 149.9, trialDays: 15 };
const verified = {
  adminPath: '/brasa/admin/acesso',
  menuPath: '/brasa',
  trialEndsAt: '2026-12-16T15:30:00.000Z',
};

describe('ativação pública do restaurante', () => {
  let root: Root;
  let container: HTMLDivElement;
  const get = vi.spyOn(axios, 'get');
  const post = vi.spyOn(axios, 'post');

  const field = (name: string) =>
    container.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
  function fill(name: string, value: string) {
    const element = field(name);
    const prototype =
      element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
    );
  }
  function submit() {
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
  async function render() {
    await act(async () => root.render(<RestaurantTrialSignup />));
  }
  async function startChallenge() {
    await act(async () => {
      fill('category', 'HAMBURGUERIA');
      fill('email', 'dono@example.test');
      fill('ownerName', 'Joana Santos');
      fill('restaurantName', 'Brasa');
      fill('whatsapp', '(11) 99999-9999');
    });
    await act(async () => submit());
  }
  function confirm() {
    fill('code', '123456');
    fill('password', 'Bom!Cardapio2026');
    container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    submit();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.login.mockResolvedValue({
      token: 'session',
      user: { id: 7, role: 'ADMIN', restaurantId: 3, email: 'dono@example.test' },
    });
    mockAuth.verifyGrant.mockResolvedValue({ valid: true, slug: 'brasa', restaurantId: 3 });
    mockAuth.logout.mockResolvedValue({});
    window.history.replaceState(null, '', '/ativar/restaurante?modelo=pizzaria&plano=PREMIUM');
    get
      .mockReset()
      .mockImplementation(async (url) =>
        url.endsWith('/availability')
          ? { data: { available: true, manualApproval: false } }
          : { data: { plans: [basic, premium] } },
      );
    post
      .mockReset()
      .mockImplementation(async (path) =>
        path.endsWith('/challenge')
          ? { data: { challenge: 'teste', expiresInMinutes: 15 } }
          : { data: verified },
      );
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.history.replaceState(null, '', '/');
  });

  it('permite testar a pizzaria e abrir uma hamburgueria com o plano revisado pelo proprietário', async () => {
    await render();
    expect(container.textContent).toContain('Forno Alto');
    expect(field('category').value).toBe('');
    expect((field('category') as HTMLSelectElement).options).toHaveLength(12);
    expect(field('plan').value).toBe('PREMIUM');
    await startChallenge();
    expect(post).toHaveBeenCalledWith(
      '/restaurant-trials/challenge',
      { email: 'dono@example.test' },
      expect.objectContaining({ withCredentials: false }),
    );
    expect(container.textContent).toContain('15 dias úteis');
    expect(container.querySelector('a[href*="/admin/"]')).toBeNull();
    await act(async () => confirm());
    expect(post).toHaveBeenCalledWith(
      '/restaurant-trials/activate',
      expect.objectContaining({
        category: 'HAMBURGUERIA',
        plan: 'PREMIUM',
        challenge: 'teste',
        code: '123456',
        quotedMonthlyFee: 149.9,
        quotedTrialDays: 15,
      }),
      expect.objectContaining({ withCredentials: false }),
    );
    expect(container.textContent).toContain('Teste ativado');
    expect(container.textContent).toContain('Configure seu cardápio');
    expect(mockAuth.exchange).toHaveBeenCalledWith('brasa', 'acesso');
    expect(mockAuth.verifyGrant).toHaveBeenCalledWith('brasa');
    expect(mockAuth.accept).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain('Preferências da mensalidade');
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[aria-controls="gx-trial-payment"]')!.click(),
    );
    expect(container.textContent).toContain('Preferências da mensalidade');
    expect(container.querySelector('a[href="/brasa/admin/acesso"]')).toBeTruthy();
    expect(window.location.search).toBe('?modelo=pizzaria&plano=PREMIUM');
  });

  it('mantém os dados ao editar o e-mail e exige uma nova verificação para o novo endereço', async () => {
    await render();
    await startChallenge();
    const edit = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === 'Editar dados',
    )!;
    await act(async () => edit.click());
    expect(field('category').value).toBe('HAMBURGUERIA');
    expect(field('restaurantName').value).toBe('Brasa');
    fill('email', 'novo@example.test');
    await act(async () => submit());
    expect(post).toHaveBeenLastCalledWith(
      '/restaurant-trials/challenge',
      { email: 'novo@example.test' },
      expect.anything(),
    );
    expect(container.textContent).toContain('novo@example.test');
  });

  it('omite planos indisponíveis para o teste e bloqueia o envio até recarregar o catálogo', async () => {
    get.mockResolvedValueOnce({ data: { available: true, manualApproval: false } });
    get.mockResolvedValueOnce({
      data: {
        plans: [
          { ...premium, trialDays: 0 },
          { ...basic, code: 'GESTAO_TOTAL' },
        ],
      },
    });
    await render();
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(
      true,
    );
    const retry = container.querySelector<HTMLButtonElement>('[role="alert"] button')!;
    await act(async () => retry.click());
    expect(field('plan').value).toBe('PREMIUM');
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(
      false,
    );
  });

  it('encaminha ao contato quando a plataforma requer aprovação antes de abrir um restaurante', async () => {
    get.mockResolvedValueOnce({ data: { available: true, manualApproval: true } });
    await render();
    expect(container.querySelector('a[href="/#contato"]')?.textContent).toBe('Falar com a equipe');
    expect(container.querySelector('form')).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it('mantém a verificação aberta se o servidor não confirmar o acesso ao restaurante', async () => {
    await render();
    await startChallenge();
    post.mockResolvedValueOnce({
      data: { ...verified, adminPath: 'https://example.test/admin/invalid' },
    });
    await act(async () => confirm());
    expect(container.textContent).not.toContain('Teste ativado');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível confirmar',
    );
  });

  it('protege o editor se o login pertence a outro restaurante e permite recuperar sem repetir a ativação', async () => {
    mockAuth.verifyGrant.mockResolvedValueOnce({ valid: true, slug: 'brasa', restaurantId: 99 });
    await render();
    await startChallenge();
    await act(async () => confirm());
    expect(container.textContent).toContain('Teste ativado');
    expect(container.textContent).not.toContain('Configure seu cardápio');
    expect(mockAuth.accept).not.toHaveBeenCalled();
    expect(mockAuth.logout).toHaveBeenCalledWith('session');
    fill('ownerPassword', 'Bom!Cardapio2026');
    await act(async () => submit());
    expect(container.textContent).toContain('Configure seu cardápio');
    expect(post.mock.calls.filter(([url]) => url === '/restaurant-trials/activate')).toHaveLength(
      1,
    );
  });

  it('aguarda e valida o segundo fator antes de liberar o editor', async () => {
    mockAuth.login.mockResolvedValueOnce({ mfaRequired: true, mfaToken: 'mfa-session' });
    mockAuth.verifyMfa.mockResolvedValueOnce({
      token: 'valid',
      user: { id: 7, role: 'ADMIN', restaurantId: 3, email: 'dono@example.test' },
    });
    await render();
    await startChallenge();
    await act(async () => confirm());
    expect(container.textContent).not.toContain('Configure seu cardápio');
    expect(mockAuth.accept).not.toHaveBeenCalled();
    const confirmMfa = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Confirmar segundo fator',
    )!;
    await act(async () => confirmMfa.click());
    expect(mockAuth.verifyMfa).toHaveBeenCalledWith({ mfaToken: 'desafio-do-canal', code: '654321' });
    expect(mockAuth.accept).toHaveBeenCalledOnce();
    expect(container.textContent).toContain('Configure seu cardápio');
  });
});
