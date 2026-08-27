import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TableOrderStatusNotice } from './TableOrderStatusNotice';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('TableOrderStatusNotice', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('mostra o fluxo do salão sem GPS ou confirmação de delivery', async () => {
    await act(async () =>
      root.render(
        <TableOrderStatusNotice
          primaryColor="#d64d08"
          tableLabel="1"
          order={{
            publicId: 'public-order-id',
            status: 'ENTREGUE',
            summary: 'Pizza Calabresa',
            items: [
              {
                name: 'Pizza Calabresa',
                quantity: 2,
                observation: 'Bem assada',
                customizations: [
                  { groupName: 'Massa', options: ['Massa fina'] },
                  { groupName: 'Adicionais', options: ['Bacon', 'Queijo'] },
                ],
              },
              {
                name: 'Suco de laranja',
                quantity: 1,
                customizations: [],
              },
            ],
            statusLabel: 'Servido na mesa',
            progress: 4,
            cancelled: false,
          }}
        />,
      ),
    );

    const openButton = container.querySelector('button');
    await act(async () => openButton?.click());

    expect(document.body.textContent).toContain('Cardápio digital · acompanhamento');
    expect(document.body.textContent).toContain('Pedido da mesa 1');
    expect(document.body.textContent).toContain('Pronto para servir');
    expect(document.body.textContent).toContain('Servido na mesa');
    expect(document.body.textContent).toContain('Todos os itens deste pedido');
    expect(document.body.textContent).toContain('3 itens');
    expect(document.body.textContent).toContain('2×Pizza Calabresa');
    expect(document.body.textContent).toContain('Massa fina');
    expect(document.body.textContent).toContain('Bacon, Queijo');
    expect(document.body.textContent).toContain('Obs.: Bem assada');
    expect(document.body.textContent).toContain('1×Suco de laranja');
    expect(document.body.textContent).toContain('Não é necessário confirmar o recebimento');
    expect(document.body.textContent).not.toContain('Confirmar recebimento');
    expect(document.body.textContent).not.toContain('Acompanhar entrega no GPS');
    expect(document.body.textContent).not.toContain('Entrega realizada');
  });
});
