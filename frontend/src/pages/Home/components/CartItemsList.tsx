import { ArrowLeft, Minus, Plus, ShoppingBag } from 'lucide-react';
import styled, { createGlobalStyle } from 'styled-components';
import type { CartItem } from '../hooks/useCart';

type Props = {
  items: CartItem[];
  onIncrease: (cartId: string) => void;
  onDecrease: (cartId: string) => void;
  onContinueShopping?: () => void;
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=160&q=80';

export function CartItemsList({ items, onIncrease, onDecrease, onContinueShopping }: Props) {
  return (
    <Items>
      <CartChrome />
      {items.length ? (
        items.map((item) => (
          <ItemCard key={item.cartId || item.productId}>
            <img
              src={item.image || FALLBACK_IMAGE}
              alt={item.name}
              loading="lazy"
              decoding="async"
            />
            <ItemInfo>
              <div className="item-heading">
                <strong>{item.name}</strong>
                <span className="item-price">
                  {(item.price * item.quantity).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </div>

              {!!item.options?.length && (
                <div className="item-options">
                  {item.options.map((option) => (
                    <small key={`${option.groupId}-${option.id}`}>
                      <b>{option.groupName}:</b>{' '}
                      {option.quantity && option.quantity > 1 ? `${option.quantity}x ` : ''}
                      {option.name}
                    </small>
                  ))}
                </div>
              )}

              {!!item.portions?.length && (
                <div className="item-options">
                  {item.portions.map((portion, index) => (
                    <small key={`portion-${index}-${portion.optionId}`}>
                      <b>Porção {index + 1}:</b> {portion.name || 'Opção selecionada'}
                      {portion.observation ? ` · ${portion.observation}` : ''}
                    </small>
                  ))}
                </div>
              )}

              {!!item.removedCompositionItems?.length && (
                <small className="item-observation">
                  Retirar: {item.removedCompositionItems.map((entry) => entry.name).join(', ')}
                </small>
              )}

              {item.observation && (
                <small className="item-observation">Obs.: {item.observation}</small>
              )}

              <div className="item-controls">
                <Qty aria-label={`Quantidade de ${item.name}`}>
                  <button
                    type="button"
                    aria-label={`Diminuir ${item.name}`}
                    onClick={() => onDecrease(item.cartId || item.productId)}
                  >
                    <Minus aria-hidden="true" />
                  </button>
                  <b>{item.quantity}</b>
                  <button
                    type="button"
                    aria-label={`Aumentar ${item.name}`}
                    onClick={() => onIncrease(item.cartId || item.productId)}
                  >
                    <Plus aria-hidden="true" />
                  </button>
                </Qty>
              </div>
            </ItemInfo>
          </ItemCard>
        ))
      ) : (
        <Empty>
          <div className="icon">
            <ShoppingBag aria-hidden="true" />
          </div>
          <strong>Sacola vazia</strong>
          <p>Adicione itens do cardápio para começar seu pedido.</p>
          {onContinueShopping && (
            <button type="button" onClick={onContinueShopping}>
              <ArrowLeft aria-hidden="true" />
              Ver cardápio
            </button>
          )}
        </Empty>
      )}
    </Items>
  );
}

const CartChrome = createGlobalStyle`
  [aria-labelledby='home-cart-title'] {
    width: min(610px, 100%);
    background: #fbfaf8;
    box-shadow: -26px 0 80px rgba(22, 18, 15, 0.24);
  }

  [aria-labelledby='home-cart-title'] > :first-child {
    padding: 19px 22px;
    border-bottom-color: #ece7e2;
    background: rgba(255, 255, 255, 0.98);
  }

  [aria-labelledby='home-cart-title'] .cart-heading {
    gap: 13px;
  }

  [aria-labelledby='home-cart-title'] .cart-mark {
    width: 46px;
    height: 46px;
    border-radius: 14px;
    box-shadow: 0 8px 18px color-mix(in srgb, var(--home-primary) 20%, transparent);
  }

  [aria-labelledby='home-cart-title'] .cart-title h2 {
    font-family: inherit;
    font-size: 23px;
    font-weight: 900;
    letter-spacing: -0.02em;
  }

  [aria-labelledby='home-cart-title'] .cart-title small {
    color: #7d756e;
    font-size: 9px;
    letter-spacing: 0.08em;
  }

  [aria-labelledby='home-cart-title'] .cart-count {
    padding: 7px 11px;
    border-radius: 999px;
    background: #f2f0ed;
    color: #4c4742;
  }

  [aria-labelledby='home-cart-title'] > :first-child > button {
    width: 40px;
    height: 40px;
    border: 0;
    background: #f4f2ef;
  }

  [aria-labelledby='home-cart-title'] > :nth-child(2) {
    background: #fbfaf8;
  }

  [aria-labelledby='home-cart-title'] > :last-child {
    padding: 15px 20px max(17px, env(safe-area-inset-bottom));
    border-top-color: #ece7e2;
    box-shadow: 0 -14px 34px rgba(32, 26, 21, 0.07);
  }

  [aria-labelledby='home-cart-title'] .checkout-summary-row {
    color: #5f5954;
    font-size: 12px;
  }

  [aria-labelledby='home-cart-title'] .checkout-total-highlight {
    margin: 10px 0 13px;
    padding: 13px 14px;
    border: 0;
    border-radius: 13px;
    background: color-mix(in srgb, var(--home-primary) 7%, #fff);
    font-size: 21px;
  }

  [aria-labelledby='home-cart-title'] .checkout-total-highlight span:last-child {
    color: var(--home-primary);
    font-size: 22px;
  }

  [aria-labelledby='home-cart-title'] .checkout-primary {
    min-height: 58px;
    height: auto;
    border-radius: 14px;
    box-shadow: 0 12px 24px color-mix(in srgb, var(--home-primary) 22%, transparent);
  }

  @media (max-width: 620px) {
    [aria-labelledby='home-cart-title'] {
      width: 100%;
    }

    [aria-labelledby='home-cart-title'] > :first-child {
      padding: 14px 14px;
    }

    [aria-labelledby='home-cart-title'] > :last-child {
      padding-inline: 14px;
    }
  }
`;

const Items = styled.div`
  width: 100%;
  padding: 16px 20px 8px;
  display: grid;
  gap: 10px;

  @media (max-width: 620px) {
    padding: 14px 14px 8px;
  }
`;

const ItemCard = styled.article`
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 13px;
  padding: 11px;
  border: 1px solid #e7e2dd;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(34, 28, 23, 0.04);

  > img {
    width: 92px;
    height: 92px;
    border-radius: 12px;
    object-fit: cover;
  }

  @media (max-width: 390px) {
    grid-template-columns: 78px minmax(0, 1fr);

    > img {
      width: 78px;
      height: 78px;
    }
  }
`;

const ItemInfo = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;

  .item-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .item-heading strong {
    min-width: 0;
    color: #211e1b;
    font-size: 14px;
    font-weight: 900;
    line-height: 1.3;
  }

  .item-price {
    flex: 0 0 auto;
    color: var(--home-primary);
    font-size: 14px;
    font-weight: 900;
    white-space: nowrap;
  }

  .item-options {
    display: grid;
    gap: 2px;
    margin-top: 5px;
  }

  .item-options small,
  .item-observation {
    color: #777069;
    font-size: 10px;
    line-height: 1.4;
  }

  .item-options b {
    color: #4d4741;
  }

  .item-observation {
    margin-top: 5px;
  }

  .item-controls {
    margin-top: auto;
    padding-top: 9px;
    display: flex;
    align-items: center;
  }
`;

const Qty = styled.div`
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid #e2dcd6;
  border-radius: 10px;
  background: #faf8f5;

  button {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    color: #25211e;
    cursor: pointer;
  }

  button:hover {
    background: #f1ece7;
  }

  button svg {
    width: 15px;
    height: 15px;
  }

  b {
    min-width: 30px;
    color: #25211e;
    font-size: 13px;
    text-align: center;
  }
`;

const Empty = styled.div`
  min-height: min(430px, 58dvh);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 11px;
  color: #756f69;
  text-align: center;

  .icon {
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    border-radius: 17px;
    background: color-mix(in srgb, var(--home-primary) 9%, #fff);
    color: var(--home-primary);
  }

  .icon svg {
    width: 25px;
    height: 25px;
  }

  strong {
    color: #24201d;
    font-size: 17px;
  }

  p {
    max-width: 250px;
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
  }

  button {
    min-height: 42px;
    margin-top: 4px;
    padding: 0 15px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #e0dad4;
    border-radius: 11px;
    background: #fff;
    color: #27231f;
    font: inherit;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
  }

  button svg {
    width: 16px;
    height: 16px;
  }
`;
