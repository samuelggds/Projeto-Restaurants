import type { CartItem } from '../hooks/useCart';
import type { CheckoutPaymentMethod } from '../domain/checkout';
import { FigmaPaymentCheckout } from './FigmaPaymentCheckout';
import { PaymentOptions } from './PaymentOptions';

type Props = {
  primaryColor: string;
  loggedIn: boolean;
  brandName: string;
  restaurantSlug?: string;
  logoUrl?: string;
  cart: CartItem[];
  cartCount: number;
  subtotal: number;
  couponDiscount: number;
  couponLabel?: string;
  deliveryFee: number;
  total: number;
  paymentMethod: CheckoutPaymentMethod;
  allowPayOnDelivery: boolean;
  allowPix: boolean;
  allowOpenFinancePix: boolean;
  allowCard: boolean;
  allowDebitCard: boolean;
  restaurantId?: number | null;
  userEmail?: string;
  onPaymentMethodChange: (method: CheckoutPaymentMethod) => void;
  onBack: () => void;
  onContinue: () => void;
  disabled: boolean;
  loading: boolean;
};

export function HomePaymentScreen({
  primaryColor,
  loggedIn,
  brandName,
  restaurantSlug,
  logoUrl,
  cart,
  cartCount,
  subtotal,
  couponDiscount,
  couponLabel,
  deliveryFee,
  total,
  paymentMethod,
  allowPayOnDelivery,
  allowPix,
  allowOpenFinancePix,
  allowCard,
  allowDebitCard,
  restaurantId,
  userEmail,
  onPaymentMethodChange,
  onBack,
  onContinue,
  disabled,
  loading,
}: Props) {
  return (
    <FigmaPaymentCheckout
      primaryColor={primaryColor}
      loggedIn={loggedIn}
      brandName={brandName}
      restaurantSlug={restaurantSlug}
      logoUrl={logoUrl}
      cart={cart}
      cartCount={cartCount}
      subtotal={subtotal}
      couponDiscount={couponDiscount}
      couponLabel={couponLabel}
      deliveryFee={deliveryFee}
      total={total}
      paymentMethods={
        <PaymentOptions
          paymentMethod={paymentMethod}
          allowPayOnDelivery={allowPayOnDelivery}
          allowPix={allowPix}
          allowOpenFinancePix={allowOpenFinancePix}
          allowCard={allowCard}
          allowDebitCard={allowDebitCard}
          restaurantId={restaurantId}
          loggedIn={loggedIn}
          userEmail={userEmail}
          onChange={onPaymentMethodChange}
          figmaCheckout
        />
      }
      onBack={onBack}
      onContinue={onContinue}
      disabled={disabled}
      loading={loading}
    />
  );
}
