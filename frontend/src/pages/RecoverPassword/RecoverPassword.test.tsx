import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ forgotPassword: vi.fn(), resetPassword: vi.fn() }));
vi.mock('../../Services/authService', () => ({ default: mocks }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../Login/hooks/useRestaurantLoginBranding', () => ({
  useRestaurantLoginBranding: () => ({
    name: 'GastroNexa',
    description: 'Restaurante de teste',
    primaryColor: '#cf562f',
    logoUrl: '',
    category: 'PIZZARIA',
  }),
}));

import RecoverPassword from './RecoverPassword';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('recuperacao: intervalo de 30 segundos', () => {
  let container: HTMLDivElement;
  let root: Root;

  function renderPage() {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/recover-password']}>
          <RecoverPassword />
        </MemoryRouter>,
      );
    });
  }

  function button(text: string) {
    const element = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes(text),
    );
    expect(element).toBeDefined();
    return element as HTMLButtonElement;
  }

  function enterEmail() {
    act(() => button('E-mail').click());
    setInput(container.querySelector('#identifier') as HTMLInputElement, 'cliente@example.test');
  }

  async function submit() {
    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).requestSubmit();
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00.000Z'));
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.forgotPassword.mockResolvedValue({ message: 'Solicitacao recebida.' });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    renderPage();
    enterEmail();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('bloqueia no envio inicial, libera em 30s e reinicia depois de reenviar', async () => {
    await submit();
    expect(button('Reenviar em 30s').disabled).toBe(true);
    act(() => button('Reenviar em 30s').click());
    expect(mocks.forgotPassword).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(29_000); });
    expect(button('Reenviar em 1s').disabled).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(button('Reenviar código').disabled).toBe(false);
    await act(async () => { button('Reenviar código').click(); });
    expect(mocks.forgotPassword).toHaveBeenCalledTimes(2);
    expect(button('Reenviar em 30s').disabled).toBe(true);
  });

  it('nao permite contornar o intervalo usando alterar contato', async () => {
    await submit();
    act(() => button('Alterar contato').click());
    expect(button('Aguarde 30s').disabled).toBe(true);
    await submit();
    expect(mocks.forgotPassword).toHaveBeenCalledTimes(1);
  });

  it('mantem o prazo ao remontar a pagina, sem guardar email ou codigo', async () => {
    await submit();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    act(() => root.unmount());
    root = createRoot(container);
    renderPage();
    enterEmail();
    expect(button('Aguarde 20s').disabled).toBe(true);
    await submit();
    expect(mocks.forgotPassword).toHaveBeenCalledTimes(1);
    const stored = sessionStorage.getItem('gastronexa:password-reset:resend-until');
    expect(Number.isFinite(Number(stored))).toBe(true);
    expect(stored).not.toContain('cliente');
  });

  it('recalcula o prazo pelo relogio ao voltar para uma aba em segundo plano', async () => {
    await submit();
    vi.setSystemTime(new Date('2026-09-07T12:00:45.000Z'));
    act(() => window.dispatchEvent(new Event('focus')));
    expect(button('Reenviar código').disabled).toBe(false);
  });

  it('nao bloqueia a redefinicao enquanto o reenvio esta em contagem', async () => {
    await submit();
    setInput(container.querySelector('#reset-code') as HTMLInputElement, '123456');
    setInput(container.querySelector('#new-password') as HTMLInputElement, 'SenhaTeste@12345');
    setInput(container.querySelector('#confirm-password') as HTMLInputElement, 'SenhaTeste@12345');
    expect(button('Reenviar em 30s').disabled).toBe(true);
    expect(button('Redefinir senha').disabled).toBe(false);
  });

  it('evita submissao duplicada mesmo antes da resposta da API', async () => {
    let resolveRequest: (value: object) => void = () => undefined;
    mocks.forgotPassword.mockImplementation(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    await submit();
    await submit();
    expect(mocks.forgotPassword).toHaveBeenCalledTimes(1);
    await act(async () => { resolveRequest({ message: 'Solicitacao recebida.' }); });
    expect(button('Reenviar em 30s').disabled).toBe(true);
  });

  it('mantem espera depois de falha de rede e permite tentar novamente apos 30s', async () => {
    mocks.forgotPassword.mockRejectedValueOnce(new Error('Network Error'));
    await submit();
    expect(button('Aguarde 30s').disabled).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(button('Enviar código').disabled).toBe(false);
  });

  it('continua funcionando quando o navegador bloqueia sessionStorage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    await submit();
    expect(button('Reenviar em 30s').disabled).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(button('Reenviar código').disabled).toBe(false);
  });
});
