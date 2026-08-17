import type { CartItem } from '../hooks/useCart';
import * as S from '../../Home/Home.styles';

type Props = {
  items: CartItem[];
  onIncrease: (productId: string) => void;
  onDecrease: (productId: string) => void;
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=80&q=80';

export function CartItemsList({ items, onIncrease, onDecrease }: Props) {
  return (
    <S.CartItems>
      {items.length ? (
        items.map((item) => (
          <S.CartItemRow key={item.productId}>
            <img src={item.image || FALLBACK_IMAGE} alt={item.name} />
            <S.CartItemInfo>
              <strong>{item.name}</strong>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <S.CartQty>
                  <button
                    type="button"
                    aria-label={`Diminuir ${item.name}`}
                    onClick={() => onDecrease(item.productId)}
                  >
                    −
                  </button>
                  <b>{item.quantity}</b>
                  <button
                    type="button"
                    aria-label={`Aumentar ${item.name}`}
                    onClick={() => onIncrease(item.productId)}
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
