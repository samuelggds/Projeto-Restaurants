import { ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react';
import type { HomeProduct } from '../types';
import { useHorizontalProductCarousel } from '../hooks/useHorizontalProductCarousel';
import * as S from '../FigmaDeliveryExperience.styles';

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function productImage(product: HomeProduct) {
  return product.image ? (
    <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
  ) : (
    <UtensilsCrossed />
  );
}

export function HomeProductCarouselSection({
  title,
  description,
  products,
  onOpenProduct,
  onAddProduct,
  className = '',
  sectionId,
  ariaLabel,
  itemLabel,
  onViewAll,
}: {
  title: string;
  description?: string;
  products: HomeProduct[];
  onOpenProduct: (product: HomeProduct, sourceElement?: HTMLElement | null) => void;
  onAddProduct: (product: HomeProduct, sourceElement?: HTMLElement | null) => void;
  className?: string;
  sectionId?: string;
  ariaLabel?: string;
  itemLabel?: string | ((product: HomeProduct) => string);
  onViewAll?: () => void;
}) {
  const {
    trackRef,
    hasOverflow,
    canPrevious: canScrollPrevious,
    canNext: canScrollNext,
    scroll,
  } = useHorizontalProductCarousel({
    itemSelector: '[data-product-carousel-card]',
    itemsKey: products.map((product) => product.id).join('|'),
  });

  if (!products.length) return null;

  return (
    <S.Section
      id={sectionId}
      className={`products-section product-carousel-section mobile-separated ${className}`.trim()}
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
    >
      <S.SectionHead>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <S.SectionHeadActions>
          {onViewAll ? (
            <button className="view-all" type="button" onClick={onViewAll}>
              Ver todos →
            </button>
          ) : null}
          {hasOverflow ? (
            <S.CarouselControls aria-label={`Navegar em ${title}`}>
              <button
                type="button"
                aria-label={`Ver itens anteriores de ${title}`}
                onClick={() => scroll(-1)}
                disabled={!canScrollPrevious}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Ver próximos itens de ${title}`}
                onClick={() => scroll(1)}
                disabled={!canScrollNext}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </S.CarouselControls>
          ) : null}
        </S.SectionHeadActions>
      </S.SectionHead>

      <S.ProductGrid
        ref={trackRef}
        className={className.includes('featured-carousel') ? 'featured-product-grid' : undefined}
      >
        {products.map((product) => {
          const label =
            typeof itemLabel === 'function'
              ? itemLabel(product)
              : itemLabel || (product.kind === 'COMBO' ? 'Combo' : '');

          return (
            <S.ProductCard key={product.id} data-product-carousel-card>
              <button
                className="open"
                type="button"
                aria-label={`Ver detalhes de ${product.name}`}
                onClick={(event) =>
                  onOpenProduct(
                    product,
                    event.currentTarget.closest<HTMLElement>('[data-product-carousel-card]'),
                  )
                }
              />
              <div className="image">{productImage(product)}</div>
              <div className="copy">
                <div className="product-copy">
                  {label ? <span className="product-label">{label}</span> : null}
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                </div>
                <div className="foot">
                  <span className="price">
                    {product.promotion?.active &&
                    Number(product.originalPrice) > Number(product.price) ? (
                      <del>{money(product.originalPrice)}</del>
                    ) : null}
                    <strong>{money(product.price)}</strong>
                  </span>
                  <button
                    className="add"
                    type="button"
                    aria-label={`Adicionar ${product.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddProduct(
                        product,
                        event.currentTarget.closest<HTMLElement>('[data-product-carousel-card]'),
                      );
                    }}
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            </S.ProductCard>
          );
        })}
      </S.ProductGrid>
    </S.Section>
  );
}
