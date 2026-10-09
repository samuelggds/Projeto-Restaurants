import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';
import { LalamoveConnection } from './LalamoveConnection';

vi.mock('../../../Services/restaurantSettingsService', () => ({
  default: {
    getLalamoveConnection: vi.fn(),
    requestLalamoveConnection: vi.fn(),
  },
}));

describe('LalamoveConnection', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('consulta status real e envia uma única solicitação, sem chaves de API', async () => {
    vi.mocked(restaurantSettingsService.getLalamoveConnection).mockResolvedValue({
      provider: 'LALAMOVE', status: 'NOT_REQUESTED',
      connected: false, canDispatch: false, requestedAt: null,
    });
    vi.mocked(restaurantSettingsService.requestLalamoveConnection).mockResolvedValue({
      provider: 'LALAMOVE', status: 'REQUESTED',
      connected: false, canDispatch: false, requestedAt: '2026-10-09T15:00:00Z',
    });
    await act(async () => { root.render(<LalamoveConnection />); });
    expect(container.textContent).toContain('Ainda não solicitado');
    const button = container.querySelector('button') as HTMLButtonElement;
    await act(async () => { button.click(); });
    expect(restaurantSettingsService.requestLalamoveConnection).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Solicitação recebida');
    expect(button.disabled).toBe(true);
    expect(container.textContent).toContain('bolsa térmica');
  });

  it('não permite duplicar solicitação existente', async () => {
    vi.mocked(restaurantSettingsService.getLalamoveConnection).mockResolvedValue({
      provider: 'LALAMOVE', status: 'IN_REVIEW',
      connected: false, canDispatch: false, requestedAt: '2026-10-09T15:00:00Z',
    });
    await act(async () => { root.render(<LalamoveConnection />); });
    expect(container.textContent).toContain('Em análise');
    expect((container.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    expect(restaurantSettingsService.requestLalamoveConnection).not.toHaveBeenCalled();
  });

  it('exibe erro de consulta e não simula conexão', async () => {
    vi.mocked(restaurantSettingsService.getLalamoveConnection).mockRejectedValue(
      new Error('offline'),
    );
    await act(async () => { root.render(<LalamoveConnection />); });
    expect(container.textContent).toContain('Não foi possível comunicar');
    expect((container.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
