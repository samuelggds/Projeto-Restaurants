import { ShoppingBag, Truck } from 'lucide-react';
import * as S from '../../Home/Home.styles';

type Props = {
  value: 'delivery' | 'pickup';
  allowDelivery?: boolean;
  allowPickup?: boolean;
  onChange: (value: 'delivery' | 'pickup') => void;
};

export function DeliveryMethodSelector({
  value,
  allowDelivery = true,
  allowPickup = true,
  onChange,
}: Props) {
  const availableCount = Number(allowDelivery) + Number(allowPickup);
  return (
    <>
      <S.CartSectionLabel>Como deseja receber?</S.CartSectionLabel>
      {availableCount === 0 ? (
        <S.CheckoutUnavailable role="status">
          O restaurante não está aceitando delivery ou retirada neste momento.
        </S.CheckoutUnavailable>
      ) : (
        <S.DeliveryToggle $single={availableCount === 1}>
          {allowDelivery && (
            <S.DeliveryBtn
              type="button"
              $active={value === 'delivery'}
              onClick={() => onChange('delivery')}
              aria-pressed={value === 'delivery'}
            >
              <span className="btn-icon">
                <Truck size={16} aria-hidden="true" />
              </span>
              Delivery
            </S.DeliveryBtn>
          )}
          {allowPickup && (
            <S.DeliveryBtn
              type="button"
              $active={value === 'pickup'}
              onClick={() => onChange('pickup')}
              aria-pressed={value === 'pickup'}
            >
              <span className="btn-icon">
                <ShoppingBag size={16} aria-hidden="true" />
              </span>
              Retirada
            </S.DeliveryBtn>
          )}
        </S.DeliveryToggle>
      )}
    </>
  );
}
