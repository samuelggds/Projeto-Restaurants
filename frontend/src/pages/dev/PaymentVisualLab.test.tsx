import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./DeliveryTrackingVisualLab', () => ({
  default: () => (
    <section
      data-testid="delivery-tracking-visual-lab"
      data-map-source="fictitious-google-style"
      data-animation-duration-ms="60000"
    >
      <h1>Acompanhe seu Pedido</h1>
      <p>Eduardo Silva</p>
      <p>Rua Fictícia, 123 — Bairro Teste</p>
    </section>
  ),
}));


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

  it('abre o checkout com PIX selecionado por padrão', async () => {
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
    expect(pixButton?.getAttribute('aria-pressed')).toBe('true');

    act(() => root.unmount());
  });

  it('permite escolher cartão manualmente e avançar para aguardando', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<PaymentVisualLab />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const cardButton = findButton(container, 'Cartão de Crédito');
    expect(cardButton).toBeTruthy();

    await act(async () => {
      cardButton?.click();
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

  it('mantém débito como débito depois de continuar para a confirmação', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<PaymentVisualLab />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const debitButton = findButton(container, 'Cartão de débito');
    expect(debitButton).toBeTruthy();

    await act(async () => {
      debitButton?.click();
      await Promise.resolve();
    });

    const continueButton = findButton(container, 'Continuar');
    await act(async () => {
      continueButton?.click();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-card-payment-type="debit"]')).not.toBeNull();
    expect(container.textContent).toContain('Cartão de Débito');
    expect(container.textContent).not.toContain('Cartão de Crédito');

    act(() => root.unmount());
  });

  it.each([
    ['Cartão recusado', 'Pagamento recusado'],
    ['Cartão cancelado', 'Pagamento cancelado'],
    ['Cartão expirado', 'Pagamento expirado'],
    ['Cartão estornado', 'Pagamento estornado'],
  ])('mostra o estado terminal correto para %s', async (buttonLabel, expectedCopy) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<PaymentVisualLab />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const scenarioButton = findButton(container, buttonLabel);
    expect(scenarioButton).toBeTruthy();

    await act(async () => {
      scenarioButton?.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain(expectedCopy);

    act(() => root.unmount());
  });

  it('abre o laboratório de acompanhamento com mapa fictício e animação de 1 minuto', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<PaymentVisualLab />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const trackingButton = findButton(container, 'Acompanhar pedido (GPS)');
    expect(trackingButton).toBeTruthy();

    await act(async () => {
      trackingButton?.click();
      await Promise.resolve();
    });

    const tracking = container.querySelector('[data-testid="delivery-tracking-visual-lab"]');
    expect(tracking).not.toBeNull();
    expect(tracking?.getAttribute('data-map-source')).toBe('fictitious-google-style');
    expect(tracking?.getAttribute('data-animation-duration-ms')).toBe('60000');
    expect(container.textContent).toContain('Acompanhe seu Pedido');

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
    expect(pixButton?.getAttribute('aria-pressed')).toBe('true');

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
