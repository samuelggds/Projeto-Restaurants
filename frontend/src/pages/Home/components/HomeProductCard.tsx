import { Heart, Plus, Tag } from 'lucide-react';
import * as S from '../Home.styles';
import type { HomeProduct } from '../types';
import * as Promotion from './OfferBadge.styles';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type HomeProductCardProps = {
  product: HomeProduct;
  favorite: boolean;
  onOpen: () => void;
  onToggleFavorite?: () => void;
  featured?: boolean;
};

export function HomeProductCard({
  product,
  favorite,
  onOpen,
  onToggleFavorite,
  featured = false,
}: HomeProductCardProps) {
  return (
    <S.ProductCard
      data-featured={featured || undefined}
      role="button"
      tabIndex={0}
      aria-label={`Ver detalhes de ${product.name}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <S.ImageWrap data-featured={featured || undefined}>
        <img src={product.image} alt={product.name} />
        {product.promotion?.active && !featured && (
          <Promotion.Badge data-offer-label="overlay">
            <Tag size={14} /> {product.promotion.badgeLabel || 'Oferta'}
          </Promotion.Badge>
        )}
        <button
          className={favorite ? 'favorite' : undefined}
          aria-label={`Favoritar ${product.name}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite?.();
          }}
        >
          <Heart size={21} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </S.ImageWrap>
      <div>
        {product.promotion?.active && featured && (
          <Promotion.InlineBadge data-offer-label="inline">
            <Tag size={12} /> {product.promotion.badgeLabel || 'Oferta'}
          </Promotion.InlineBadge>
        )}
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <footer>
          {product.rating > 0 && <span>⭐ {product.rating}</span>}
          <Promotion.Price>
            {product.promotion?.active && product.originalPrice > product.price && (
              <del>{brl(product.originalPrice)}</del>
            )}
            <strong>{brl(product.price)}</strong>
          </Promotion.Price>
          <button
            aria-label={
              product.available ? `Adicionar ${product.name}` : `${product.name} esgotado`
            }
            disabled={!product.available}
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
          >
            {product.available ? <Plus /> : 'Esgotado'}
          </button>
        </footer>
      </div>
    </S.ProductCard>
  );
}
