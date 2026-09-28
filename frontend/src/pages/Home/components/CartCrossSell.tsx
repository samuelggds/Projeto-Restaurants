import { useRef, useState } from 'react';
import { Plus, UtensilsCrossed } from 'lucide-react';
import type { HomeProduct } from '../types';
import * as S from './CartCrossSell.styles';

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Props = {
  products: HomeProduct[];
  onAdd: (product: HomeProduct) => void;
};

export function CartCrossSell({ products, onAdd }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncActiveIndex = () => {
    const row = rowRef.current;
    if (!row || products.length < 2) return;

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
    row.scrollTo({ left: card.offsetLeft - row.offsetLeft, behavior: 'smooth' });
    setActiveIndex(index);
  };

  if (!products.length) return null;

  return (
    <S.Section aria-label="Você também vai querer">
      <S.Header>
        <strong>Você também vai querer</strong>
        <span aria-hidden="true">✨</span>
      </S.Header>

      <S.Row ref={rowRef} onScroll={syncActiveIndex}>
        {products.map((product) => (
          <S.Card key={product.id} data-cross-sell-card>
            <S.Image>
              {product.image ? (
                <img src={product.image} alt="" loading="lazy" decoding="async" />
              ) : (
                <UtensilsCrossed aria-hidden="true" />
              )}
            </S.Image>

            <S.Copy>
              <b>{product.name}</b>
              {product.description ? <small>{product.description}</small> : null}
              <strong>{money(product.price)}</strong>
            </S.Copy>

            <S.AddButton
              type="button"
              aria-label={`Adicionar ${product.name}`}
              onClick={() => onAdd(product)}
            >
              <Plus className="mobile-plus" aria-hidden="true" />
              <span className="desktop-label">+ Adicionar</span>
            </S.AddButton>
          </S.Card>
        ))}
      </S.Row>

      {products.length > 1 ? (
        <S.Dots aria-label="Posição do carrossel">
          {products.map((product, index) => (
            <button
              key={product.id}
              type="button"
              className={index === activeIndex ? 'active' : ''}
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
