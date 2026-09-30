import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import PaymentVisualLab from './PaymentVisualLab';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function findButton(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  ) as HTMLButtonElement | undefined;
}

describe('PaymentVisualLab', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('avança do cartão para aguardando e permite simular aprovação', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<PaymentVisualLab />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const continueButton = findButton(container, 'Continuar');
    expect(continueButton).toBeTruthy();

    await act(async () => {
      continueButton?.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Escolha o resultado fictício');
    expect(container.textContent).toContain('Simular pagamento aprovado');
    expect(container.textContent).toContain('Simular pagamento recusado');
    expect(container.textContent).toContain('Aguardando confirmação');

    const approveButton = findButton(container, 'Simular pagamento aprovado');
    await act(async () => {
      approveButton?.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Pagamento Aprovado!');

    act(() => root.unmount());
  });

  it('avança do PIX para a tela de confirmação fictícia', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<PaymentVisualLab />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const pixButton = findButton(container, 'PIX');
    expect(pixButton).toBeTruthy();

    await act(async () => {
      pixButton?.click();
      await Promise.resolve();
    });

    const continueButton = findButton(container, 'Continuar');
    await act(async () => {
      continueButton?.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Escolha o resultado fictício');
    expect(container.textContent).toContain('Código Pix');

    const rejectButton = findButton(container, 'Simular pagamento recusado');
    await act(async () => {
      rejectButton?.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Pagamento recusado');

    act(() => root.unmount());
  });
});
