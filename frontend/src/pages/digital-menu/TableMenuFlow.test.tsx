import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { homeMockData } from '../Home/data';
import { FlowHeader } from './TableMenuFlow';

describe('FlowHeader tenant branding', () => {
  it('keeps restaurant logo and name in the table cart header', () => {
    const markup = renderToStaticMarkup(
      <FlowHeader
        data={{
          ...homeMockData,
          brand: {
            ...homeMockData.brand,
            name: 'North Pizza',
            logoUrl: 'https://cdn.example.test/north-pizza.png',
          },
        }}
        tableLabel="12"
        title="Meu Pedido"
        onBack={vi.fn()}
        onHome={vi.fn()}
        onMenu={vi.fn()}
        onOrders={vi.fn()}
      />,
    );

    expect(markup).toContain('North Pizza');
    expect(markup).toContain('https://cdn.example.test/north-pizza.png');
    expect(markup).not.toContain('>GastroNexa<');
  });
});
