import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SecuritySettings } from './SecuritySettings';

const mocks = vi.hoisted(() => ({
  user: { id: 10, role: 'ADMIN', restaurantId: 7, mfaEnabled: false },
  logout: vi.fn(),
  navigate: vi.fn(),
  updateMfaPreference: vi.fn(),
  getAuthenticatorStatus: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../../../contexts/authContext', () => ({
  useAuth: () => ({
    user: mocks.user,
    logout: mocks.logout,
  }),
}));

vi.mock('../../../Services/authService', () => ({
  default: {
    updateMfaPreference: mocks.updateMfaPreference,
    getAuthenticatorStatus: mocks.getAuthenticatorStatus,
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('SecuritySettings', () => {
  let host: HTMLDivElement;
  let root: Root;

  const render = async () => {
    await act(async () => {
      root.render(<SecuritySettings openEmployees={vi.fn()} />);
    });
  };

  const button = (name: string) =>
    [...host.querySelectorAll('button')].find((element) => element.textContent?.includes(name));

  const fillPassword = async (value: string) => {
    const input = host.querySelector<HTMLInputElement>('input[type="password"]');
    if (!input) throw new Error('Campo de senha não encontrado');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.mfaEnabled = false;
    mocks.updateMfaPreference.mockResolvedValue({ mfaEnabled: true });
    mocks.getAuthenticatorStatus.mockResolvedValue({ enabled: false });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it('exibe MFA desativado por padrão e exige senha antes de ativar', async () => {
    await render();

    expect(host.textContent).toContain('MFA desativado');
    expect(host.textContent).toContain('MFA administrativo obrigatório');
    expect(button('Ativar MFA')).toBeTruthy();

    await act(async () => button('Ativar MFA')?.click());

    expect(mocks.updateMfaPreference).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith('Digite sua senha atual para alterar o MFA.');
  });

  it('ativa o MFA da conta autenticada e encerra a sessão atual', async () => {
    await render();
    await fillPassword('senha-atual-segura');

    await act(async () => button('Ativar MFA')?.click());

    expect(mocks.updateMfaPreference).toHaveBeenCalledWith(true, 'senha-atual-segura');
    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(mocks.navigate).toHaveBeenCalledWith('/login');
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      'MFA ativado. Entre novamente para continuar.',
    );
  });

  it('não permite desativar MFA obrigatório pelo painel administrativo', async () => {
    mocks.user.mfaEnabled = true;
    await render();

    expect(host.textContent).toContain('MFA ativado');
    const control = button('MFA obrigatório');
    expect(control).toBeTruthy();
    expect(control?.disabled).toBe(true);
    expect(mocks.updateMfaPreference).not.toHaveBeenCalled();
  });

  it('mantém o gerenciamento de funcionários disponível', async () => {
    const openEmployees = vi.fn();
    await act(async () => {
      root.render(<SecuritySettings openEmployees={openEmployees} />);
    });

    await act(async () => button('Gerenciar funcionários')?.click());

    expect(openEmployees).toHaveBeenCalledOnce();
  });
});
