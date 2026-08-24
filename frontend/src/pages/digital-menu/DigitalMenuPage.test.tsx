import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DigitalMenuPage } from './DigitalMenuPage';
import type { DigitalMenuData } from './types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const data: DigitalMenuData = {
  restaurantName: 'Restaurante Teste',
  monogram: 'RT',
  tableNumber: 12,
  orderStatus: 'received',
  categories: [{ id: 'pratos', name: 'Pratos', image: '/categoria.png' }],
  products: [
    {
      id: '1',
      categoryId: 'pratos',
      name: 'Produto teste',
      description: 'Descrição',
      price: 20,
      image: '/produto.png',
      rating: 5,
      preparationTime: '20 min',
    },
  ],
};

describe('DigitalMenuPage actions', () => {
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

  it('não confirma chamado visualmente quando não existe callback de envio', () => {
    act(() => root.render(<DigitalMenuPage data={data} />));
    const atendimento = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Atendimento'),
    );

    act(() => atendimento?.click());

    expect(container.textContent).toContain('não está disponível neste cardápio');
    expect(container.textContent).not.toContain('Garçom chamado com sucesso');
  });

  it('só mostra sucesso depois que o callback confirma o chamado', async () => {
    let confirmRequest: (() => void) | undefined;
    const onCallWaiter = vi.fn(
      () =>
        new Promise<true>((resolve) => {
          confirmRequest = () => resolve(true);
        }),
    );
    await act(async () => root.render(<DigitalMenuPage data={data} onCallWaiter={onCallWaiter} />));
    const atendimento = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Atendimento'),
    );

    await act(async () => atendimento?.click());
    expect(container.textContent).not.toContain('Garçom chamado com sucesso');

    await act(async () => confirmRequest?.());
    expect(container.textContent).toContain('Garçom chamado com sucesso');
  });

  it('não aceita callback vazio como confirmação do envio', async () => {
    const onCallWaiter = vi.fn(async () => undefined as never);
    await act(async () => root.render(<DigitalMenuPage data={data} onCallWaiter={onCallWaiter} />));
    const atendimento = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Atendimento'),
    );

    await act(async () => atendimento?.click());

    expect(container.textContent).toContain('solicitação não foi confirmada');
    expect(container.textContent).not.toContain('Garçom chamado com sucesso');
  });
});
