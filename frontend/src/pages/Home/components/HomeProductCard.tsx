import { Heart, Plus, Tag } from 'lucide-react';
import { memo } from 'react';
import * as S from '../Home.styles';
import type { HomeProduct } from '../types';
import * as Promotion from './OfferBadge.styles';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type HomeProductCardProps = {
  product: HomeProduct;
  favorite: boolean;
  onOpen: (product: HomeProduct) => void;
  onToggleFavorite?: (productId: string) => void;
  featured?: boolean;
  orderingLocked?: boolean;
};

export const HomeProductCard = memo(function HomeProductCard({
  product,
  favorite,
  onOpen,
  onToggleFavorite,
  featured = false,
  orderingLocked = false,
}: HomeProductCardProps) {
  return (
    <S.ProductCard
      data-featured={featured || undefined}
      role="button"
      tabIndex={orderingLocked ? -1 : 0}
      aria-disabled={orderingLocked || undefined}
      aria-label={
        orderingLocked
          ? `${product.name}: novos pedidos bloqueados, conta solicitada`
          : `Ver detalhes de ${product.name}`
      }
      onClick={() => {
        if (!orderingLocked) onOpen(product);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!orderingLocked) onOpen(product);
        }
      }}
    >
      <S.ImageWrap data-featured={featured || undefined}>
        <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
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
            onToggleFavorite?.(product.id);
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
              orderingLocked
                ? `Não é possível adicionar ${product.name}: conta solicitada`
                : product.available
                  ? `Adicionar ${product.name}`
                  : `${product.name} esgotado`
            }
            disabled={!product.available || orderingLocked}
            onClick={(event) => {
              event.stopPropagation();
              if (!orderingLocked) onOpen(product);
            }}
          >
            {product.available && !orderingLocked ? (
              <Plus />
            ) : orderingLocked ? (
              'Bloqueado'
            ) : (
              'Esgotado'
            )}
          </button>
        </footer>
      </div>
    </S.ProductCard>
  );
});
