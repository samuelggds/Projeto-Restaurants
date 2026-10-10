import { describe, expect, it } from 'vitest';
import { safeQuoteError } from './lalamoveQuoteError';

describe('Lalamove quote error safety', () => {
  it('shows an actionable message when the sandbox connection is missing', () => {
    expect(safeQuoteError({ response: { status: 409, data: {
      error: 'Conexão sandbox Lalamove não validada.',
    } } })).toBe('Conexão sandbox Lalamove não validada.');
  });
  it('explains missing server geocoding without exposing configuration values', () => {
    expect(safeQuoteError({ response: { status: 503, data: {
      error: 'Geocodificação não configurada no servidor. Contate o suporte.',
    } } })).toContain('Geocodificação não configurada');
  });
  it('does not render arbitrary upstream errors or secrets', () => {
    expect(safeQuoteError({ response: { data: { error: 'secret=do-not-render' } } }))
      .not.toContain('do-not-render');
    expect(safeQuoteError(new Error('private connection error')))
      .toContain('Não foi possível consultar');
  });
});

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, vi } from 'vitest';
import { AppDialogProvider } from '../../../components/AppDialog/AppDialogProvider';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';
import { LalamoveFreightQuote } from './LalamoveFreightQuote';

vi.mock('../../../Services/restaurantSettingsService', () => ({
  default: {
    getLalamoveDeliveryQuote: vi.fn(),
    requestLalamoveDeliveryQuote: vi.fn(),
    approveLalamoveDeliveryQuote: vi.fn(),
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Lalamove freight quote UI', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('opens an accessible responsive sandbox quote panel with safe empty state', async () => {
    vi.mocked(restaurantSettingsService.getLalamoveDeliveryQuote).mockResolvedValue(null);
    await act(async () => root.render(<AppDialogProvider><LalamoveFreightQuote orderId={54} /></AppDialogProvider>));
    const toggle = container.querySelector<HTMLButtonElement>('.quote-toggle');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    await act(async () => toggle?.click());
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Bolsa térmica obrigatória');
    expect(container.textContent).toContain('não contrata um motoboy');
    expect(container.querySelector('.quote-result')).not.toBeNull();
  });

  it('displays a verified quote and uses the in-app approval dialog without dispatch', async () => {
    const quote = {
      id: 'synthetic-quote', status: 'AVAILABLE', version: 2, total: '12.80',
      currency: 'BRL', serviceType: 'LALAGO', thermalBagRequired: true,
      expiresAt: new Date(Date.now() + 120000).toISOString(),
      canDispatch: false as const, environment: 'sandbox' as const,
    };
    vi.mocked(restaurantSettingsService.getLalamoveDeliveryQuote).mockResolvedValue(quote);
    vi.mocked(restaurantSettingsService.approveLalamoveDeliveryQuote).mockResolvedValue({
      ...quote, status: 'APPROVED', version: 3,
    });
    await act(async () => root.render(<AppDialogProvider><LalamoveFreightQuote orderId={54} /></AppDialogProvider>));
    await act(async () => container.querySelector<HTMLButtonElement>('.quote-toggle')?.click());
    expect(container.textContent).toContain('R$');
    expect(container.textContent).toContain('12,80');
    const approve = container.querySelector<HTMLButtonElement>('.quote-action--approve');
    expect(approve).not.toBeNull();
    await act(async () => approve?.click());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(restaurantSettingsService.approveLalamoveDeliveryQuote).not.toHaveBeenCalled();
    const confirm = document.querySelector<HTMLButtonElement>('[role="dialog"] button[type="submit"]');
    await act(async () => confirm?.click());
    expect(restaurantSettingsService.approveLalamoveDeliveryQuote).toHaveBeenCalledWith(54, 2, '12.80');
    expect(container.textContent).toContain('Valor aprovado');
  });
});
