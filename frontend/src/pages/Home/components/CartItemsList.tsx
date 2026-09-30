import { ArrowLeft, ShoppingBag, Trash2, UtensilsCrossed } from 'lucide-react';
import styled from 'styled-components';
import type { CartItem } from '../hooks/useCart';
import { QuantityStepper } from '../../../components/QuantityStepper/QuantityStepper';

type Props = {
  items: CartItem[];
  onIncrease: (cartId: string) => void;
  onDecrease: (cartId: string) => void;
  onRemove?: (cartId: string) => void;
  onContinueShopping?: () => void;
};

const currency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function itemDetails(item: CartItem) {
  const details: string[] = [];

  for (const option of item.options || []) {
    const quantity = option.quantity && option.quantity > 1 ? `${option.quantity}x ` : '';
    details.push(`${option.groupName}: ${quantity}${option.name}`);
  }

  for (const [index, portion] of (item.portions || []).entries()) {
    const observation = portion.observation ? ` · ${portion.observation}` : '';
    details.push(`Porção ${index + 1}: ${portion.name || 'Opção selecionada'}${observation}`);
  }

  if (item.removedCompositionItems?.length) {
    details.push(`Retirar: ${item.removedCompositionItems.map((entry) => entry.name).join(', ')}`);
  }

  if (item.observation) details.push(`Obs.: ${item.observation}`);

  return details.join(' · ');
}

export function CartItemsList({
  items,
  onIncrease,
  onDecrease,
  onRemove,
  onContinueShopping,
}: Props) {
  return (
    <Items>
      {items.length ? (
        items.map((item) => {
          const cartId = item.cartId || item.productId;
          const details = itemDetails(item);

          return (
            <ItemCard key={cartId}>
              <div className="item-main">
                {item.image ? (
                  <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
                ) : (
                  <div className="item-image-placeholder" aria-hidden="true">
                    <UtensilsCrossed />
                  </div>
                )}

                <ItemInfo>
                  <div className="item-heading">
                    <strong>{item.name}</strong>
                    <button
                      className="remove"
                      type="button"
                      aria-label={`Remover ${item.name}`}
                      onClick={() => onRemove?.(cartId)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>

                  {details ? <p className="item-details">{details}</p> : null}

                  <div className="desktop-price-row">
                    <b className="item-price">{currency(item.price * item.quantity)}</b>
                    <Qty>
                      <QuantityStepper
                        value={item.quantity}
                        ariaLabel={`Quantidade de ${item.name}`}
                        decreaseLabel={`Diminuir ${item.name}`}
                        increaseLabel={`Aumentar ${item.name}`}
                        onDecrease={() => onDecrease(cartId)}
                        onIncrease={() => onIncrease(cartId)}
                      />
                    </Qty>
                  </div>
                </ItemInfo>
              </div>

              <div className="mobile-quantity-row">
                <span>Quantidade</span>
                <Qty>
                  <QuantityStepper
                    value={item.quantity}
                    ariaLabel={`Quantidade de ${item.name}`}
                    decreaseLabel={`Diminuir ${item.name}`}
                    increaseLabel={`Aumentar ${item.name}`}
                    onDecrease={() => onDecrease(cartId)}
                    onIncrease={() => onIncrease(cartId)}
                  />
                </Qty>
              </div>
            </ItemCard>
          );
        })
      ) : (
        <Empty>
          <div className="icon">
            <ShoppingBag aria-hidden="true" />
          </div>
          <strong>Sacola vazia</strong>
          <p>Adicione itens do cardápio para começar seu pedido.</p>
          {onContinueShopping ? (
            <button type="button" onClick={onContinueShopping}>
              <ArrowLeft aria-hidden="true" />
              Ver cardápio
            </button>
          ) : null}
        </Empty>
      )}
    </Items>
  );
}

const Items = styled.div`
  width: 100%;
  display: grid;
  gap: 16px;
`;

const ItemCard = styled.article`
  width: 100%;
  padding: 20px;
  border: 1px solid #efece6;
  border-radius: 16px;
  background: #fff;

  .item-main {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  .item-main > img,
  .item-image-placeholder {
    width: 80px;
    height: 80px;
    flex: 0 0 80px;
    border-radius: 12px;
  }

  .item-main > img {
    object-fit: cover;
  }

  .item-image-placeholder {
    display: grid;
    place-items: center;
    background: #f7f5f0;
    color: #aaa49b;
  }

  .item-image-placeholder svg {
    width: 24px;
    height: 24px;
  }

  .mobile-quantity-row {
    display: none;
  }

  @media (max-width: 760px) {
    padding: 16px;

    .item-main {
      gap: 12px;
    }

    .item-main > img,
    .item-image-placeholder {
      width: 64px;
      height: 64px;
      flex-basis: 64px;
      border-radius: 10px;
    }

    .mobile-quantity-row {
      margin-top: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      color: #72706b;
      font-size: 13px;
    }
  }
`;

const ItemInfo = styled.div`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .item-heading {
    width: 100%;
    min-width: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .item-heading > strong {
    min-width: 0;
    overflow: hidden;
    color: #1f1e1a;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #9b9892;
    cursor: pointer;
  }

  .remove svg {
    width: 16px;
    height: 16px;
  }

  .item-details {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: #72706b;
    font-size: 13px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .desktop-price-row {
    width: 100%;
    padding-top: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .item-price {
    color: #1f1e1a;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.2;
  }

  @media (max-width: 760px) {
    .item-heading > strong {
      max-width: calc(100% - 28px);
      font-size: 15px;
    }

    .item-details {
      font-size: 12px;
    }

    .desktop-price-row {
      padding-top: 0;
    }

    .desktop-price-row > div {
      display: none;
    }

    .item-price {
      font-size: 14px;
    }
  }
`;

const Qty = styled.div`
  display: inline-flex;
  align-items: center;
`;

const Empty = styled.div`
  min-height: 300px;
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
    background: color-mix(in srgb, var(--checkout-primary, #e85a2b) 9%, #fff);
    color: var(--checkout-primary, #e85a2b);
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

  > button {
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
    font-weight: 700;
    cursor: pointer;
  }

  > button svg {
    width: 16px;
    height: 16px;
  }

  @media (max-width: 760px) {
    min-height: 230px;
  }
`;
