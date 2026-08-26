import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { HomeProduct } from '../types';
import { HomeProductCard } from './HomeProductCard';

const discountedProduct: HomeProduct = {
  id: '101',
  categoryId: 'principais',
  name: 'Prato artesanal',
  description: 'Prepare do seu jeito.',
  price: 40,
  originalPrice: 50,
  image: '/prato.jpg',
  rating: 0,
  available: true,
  promotion: {
    active: true,
    discountAmount: 10,
    discountPercentage: 20,
    badgeLabel: '20% de desconto',
  },
};

describe('card de produto da Home', () => {
  it('mostra o selo, o preço anterior e mantém a ação de abrir a montagem', () => {
    const html = renderToStaticMarkup(
      <HomeProductCard product={discountedProduct} favorite={false} onOpen={vi.fn()} />,
    );

    expect(html).toContain('20% de desconto');
    expect(html).toContain('<del>R$\u00a050,00</del>');
    expect(html).toContain('<strong>R$\u00a040,00</strong>');
    expect(html).toContain('aria-label="Ver detalhes de Prato artesanal"');
    expect(html).toContain('aria-label="Adicionar Prato artesanal"');
  });

  it('usa uma etiqueta simples no conteúdo quando o produto está em destaque', () => {
    const html = renderToStaticMarkup(
      <HomeProductCard product={discountedProduct} favorite={false} featured onOpen={vi.fn()} />,
    );

    expect(html).toContain('data-featured="true"');
    expect(html).toContain('data-offer-label="inline"');
    expect(html).not.toContain('data-offer-label="overlay"');
  });

  it('bloqueia a montagem e a adição de produtos durante o fechamento da mesa', () => {
    const html = renderToStaticMarkup(
      <HomeProductCard
        product={discountedProduct}
        favorite={false}
        orderingLocked
        onOpen={vi.fn()}
      />,
    );

    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('novos pedidos bloqueados, conta solicitada');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Bloqueado');
  });
});
