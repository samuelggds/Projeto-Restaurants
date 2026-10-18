import { useRef, useState } from 'react';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { CHECKOUT_RECOMMENDATION_GROUPS, getCheckoutRecommendationGroup, type CheckoutRecommendationGroupId } from '../domain/homePageHelpers';
import type { HomeProduct } from '../types';
import * as S from './CartCrossSell.styles';

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Props = {
  products: HomeProduct[];
  onAdd: (product: HomeProduct, sourceElement?: HTMLElement | null) => void;
};

export function CartCrossSell({ products, onAdd }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<CheckoutRecommendationGroupId | null>(null);
  const [showAll, setShowAll] = useState(false);
  const groups = CHECKOUT_RECOMMENDATION_GROUPS.map(({ id, label }) => ({
    id, label, items: products.filter((product) => getCheckoutRecommendationGroup(product) === id),
  })).filter((group) => group.items.length > 0);
  const activeGroup = groups.find((group) => group.id === selectedGroup) || groups[0];
  const activeProducts = activeGroup?.items || [];
  const displayedProducts = showAll ? activeProducts : activeProducts.slice(0, 4);

  const syncActiveIndex = () => {
    const row = rowRef.current;
    if (!row || displayedProducts.length < 2) return;

    const cards = Array.from(row.children) as HTMLElement[];
    const viewportLeft = row.getBoundingClientRect().left;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - viewportLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActiveIndex(nearestIndex);
  };

  const goToProduct = (index: number) => {
    const row = rowRef.current;
    const card = row?.children[index] as HTMLElement | undefined;
    if (!row || !card) return;
    if (typeof row.scrollTo === 'function') row.scrollTo({ left: card.offsetLeft - row.offsetLeft, behavior: 'smooth' });
    setActiveIndex(index);
  };

  if (!activeGroup) return null;

  const selectCategory = (id: CheckoutRecommendationGroupId) => {
    setSelectedGroup(id);
    setShowAll(false);
    setActiveIndex(0);
  };

  return (
    <S.Section aria-label="Sugestões para completar o pedido">
      <S.Header>
        <strong>Complete seu pedido</strong>
        <span aria-hidden="true">✨</span>
      </S.Header>
      {groups.length > 1 ? (
        <S.CategoryTabs aria-label="Categorias de recomendações">
          {groups.map((group) => (
            <S.CategoryButton key={group.id} type="button" aria-pressed={activeGroup.id === group.id}
              className={activeGroup.id === group.id ? 'active' : ''}
              onClick={() => selectCategory(group.id)}>
              {group.label} <small>{group.items.length}</small>
            </S.CategoryButton>
          ))}
        </S.CategoryTabs>
      ) : <S.CategoryLabel>{activeGroup.label}</S.CategoryLabel>}
      {activeProducts.length > 4 ? (
        <S.ShowAll type="button" aria-expanded={showAll} onClick={() => { setShowAll(!showAll); setActiveIndex(0); }}>
          {showAll ? 'Ver menos' : 'Ver todos'}
        </S.ShowAll>
      ) : null}
      <S.Row key={activeGroup.id + String(showAll)} ref={rowRef} onScroll={syncActiveIndex}>
        {displayedProducts.map((product) => (
          <S.Card key={product.id} data-cross-sell-card>
            <S.Image>
              {product.image ? (
                <img src={product.image} alt="" loading="lazy" decoding="async" />
              ) : (
                <UtensilsCrossed aria-hidden="true" />
              )}
            </S.Image>

            <S.Copy>
              <b title={product.name}>{product.name}</b>
              {product.description ? <small>{product.description}</small> : null}
              <strong>{product.pricingMode === 'HIGHEST_OPTION' ? `A partir de ${money(product.price)}` : money(product.price)}</strong>
            </S.Copy>

            <S.AddButton
              type="button"
              aria-label={`Adicionar ${product.name}`}
              onClick={(event) =>
                onAdd(
                  product,
                  event.currentTarget.closest('[data-cross-sell-card]') as HTMLElement | null,
                )
              }
            >
              <Plus className="mobile-plus" aria-hidden="true" />
              <span className="desktop-label">+ Adicionar</span>
            </S.AddButton>
          </S.Card>
        ))}
      </S.Row>

      {displayedProducts.length > 1 ? (
        <S.Dots aria-label="Posição do carrossel">
          {displayedProducts.map((product, index) => (
            <button
              key={product.id}
              type="button"
              className={index === Math.min(activeIndex, displayedProducts.length - 1) ? 'active' : ''}
              aria-label={`Mostrar recomendação ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => goToProduct(index)}
            />
          ))}
        </S.Dots>
      ) : null}
    </S.Section>
  );
}
