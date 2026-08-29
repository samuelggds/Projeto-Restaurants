import type { CartItem } from '../hooks/useCart';
import * as S from '../../Home/Home.styles';

type Props = {
  items: CartItem[];
  onIncrease: (cartId: string) => void;
  onDecrease: (cartId: string) => void;
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=80&q=80';

export function CartItemsList({ items, onIncrease, onDecrease }: Props) {
  return (
    <S.CartItems>
      {items.length ? (
        items.map((item) => (
          <S.CartItemRow key={item.cartId || item.productId}>
            <img src={item.image || FALLBACK_IMAGE} alt={item.name} />
            <S.CartItemInfo>
              <strong>{item.name}</strong>
              <div className="item-controls">
                <S.CartQty>
                  <button
                    type="button"
                    aria-label={`Diminuir ${item.name}`}
                    onClick={() => onDecrease(item.cartId || item.productId)}
                  >
                    −
                  </button>
                  <b>{item.quantity}</b>
                  <button
                    type="button"
                    aria-label={`Aumentar ${item.name}`}
                    onClick={() => onIncrease(item.cartId || item.productId)}
                  >
                    +
                  </button>
                </S.CartQty>
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
                      <b>{option.groupName}:</b> {option.name}
                    </small>
                  ))}
                </div>
              )}
              {item.observation && (
                <small className="item-observation">Obs.: {item.observation}</small>
              )}
            </S.CartItemInfo>
          </S.CartItemRow>
        ))
      ) : (
        <S.CartEmpty>
          <div className="icon">🛒</div>
          <strong>Sacola vazia</strong>
          <p>Adicione itens do cardápio para começar seu pedido.</p>
        </S.CartEmpty>
      )}
    </S.CartItems>
  );
}
