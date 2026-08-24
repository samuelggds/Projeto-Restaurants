import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminMockSettings } from '../data';
import { PaymentSettings } from './PaymentSettings';

describe('PaymentSettings', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('controla os meios aceitos e desabilita configurações indisponíveis', () => {
    const update = vi.fn();
    act(() =>
      root.render(
        <PaymentSettings
          settings={{ ...adminMockSettings, acceptsPix: false, acceptsCard: false }}
          update={update}
        />,
      ),
    );

    const pixToggle = container.querySelector(
      '[aria-label="Aceitar pagamentos por Pix"]',
    ) as HTMLInputElement;
    const cardToggle = container.querySelector(
      '[aria-label="Aceitar pagamentos com cartão"]',
    ) as HTMLInputElement;
    expect(pixToggle.checked).toBe(false);
    expect(cardToggle.checked).toBe(false);
    expect(Array.from(container.querySelectorAll('select')).every((field) => field.disabled)).toBe(
      true,
    );

    act(() => pixToggle.click());
    expect(update).toHaveBeenCalledWith('acceptsPix', true);
  });
});
