import { useState } from 'react';
import { FigmaCheckoutFlow } from '../../../Home/FigmaCheckoutFlow';
import { HomePaymentScreen } from '../../../Home/components/HomePaymentScreen';
import { CheckoutPromotionalCouponPicker } from '../../../Home/components/CheckoutPromotionalCouponPicker';
import type { CheckoutPaymentMethod } from '../../../Home/domain/checkout';
import type { CartItem } from '../../../Home/hooks/useCart';
import type { OrderQuote } from '../../../Home/hooks/useOrderQuote';
import PixPaymentPanel from '../../../Cart/components/PixPaymentPanel';
import { demoPhotoPath, demoStores, type DemoSlug } from './catalog';
import { demoPromotionalCoupon } from './demoHomeData';
import { couponCode } from './demoSession';
import { DemoCheckoutAddress } from './DemoCheckoutAddress';

export type DemoAddress = {
  street: string;
  number: string;
  district: string;
  city: string;
  zipCode?: string;
  state?: string;
  complement?: string;
};
export type DemoBagLine = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  observation?: string;
};
export type DemoPayment = 'Pix' | 'Dinheiro' | 'Cartão na entrega';
type CheckoutView = 'bag' | 'address' | 'payment';
type Totals = { subtotal: number; discount: number; delivery: number; total: number };

type Props = {
  slug: DemoSlug;
  screen: CheckoutView;
  loggedIn: boolean;
  lines: DemoBagLine[];
  address: DemoAddress | null;
  addressOrigin: 'menu' | 'bag' | 'payment';
  fulfillmentMethod: 'delivery' | 'pickup';
  coupon: boolean;
  totals: Totals;
  onQuantity: (id: string, quantity: number) => void;
  onAddress: (address: DemoAddress) => void;
  onNavigate: (screen: 'menu' | CheckoutView | 'coupons') => void;
  onPay: (method: DemoPayment, showTracking?: boolean) => void;
  onTrackPaid: () => void;
  onLogin: () => void;
  onCouponChange: (enabled: boolean) => void;
  onFulfillmentMethodChange: (method: 'delivery' | 'pickup') => void;
};

const pixCode = 'GASTRONEXA DEMONSTRACAO - SEM VALOR PARA PAGAMENTO';
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function DemoCheckout({
  slug,
  screen,
  loggedIn,
  lines,
  address,
  addressOrigin,
  coupon,
  fulfillmentMethod,
  totals,
  onQuantity,
  onAddress,
  onNavigate,
  onPay,
  onTrackPaid,
  onLogin,
  onCouponChange,
  onFulfillmentMethodChange,
}: Props) {
  const [couponError, setCouponError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('pix');
  const [pix, setPix] = useState<{
    items: CartItem[];
    quote: OrderQuote;
    confirmed: boolean;
  } | null>(null);
  const store = demoStores[slug];
  const brand = {
    primaryColor: store.color,
    brandName: store.name,
    logoUrl: `${demoPhotoPath}/logo-${slug}.svg`,
  };
  const cart: CartItem[] = lines.map((line) => ({
    productId: line.id,
    cartId: line.id,
    name: line.name,
    quantity: line.quantity,
    price: line.price / 100,
    image: line.image,
    observation: line.observation,
  }));
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const quote: OrderQuote = {
    itemsSubtotal: totals.subtotal / 100,
    productDiscountTotal: 0,
    couponDiscount: totals.discount / 100,
    deliveryFeeAmount: totals.delivery / 100,
    total: totals.total / 100,
    deliveryDistanceMeters: null,
    deliveryFeeFallbackApplied: false,
    couponCode: coupon ? couponCode : null,
    couponDiscountValue: coupon ? 10 : null,
    couponDiscountType: coupon ? 'PERCENTAGE' : null,
  };

  function applyCoupon(code: string) {
    if (code.trim().toUpperCase() !== couponCode) {
      setCouponError(`Use o cupom ${couponCode} nesta demonstração.`);
      return;
    }
    setCouponError('');
    onCouponChange(true);
  }

  function nextFromBag() {
    onNavigate(fulfillmentMethod === 'pickup' ? 'payment' : 'address');
  }
  function startPayment() {
    if (!count || (fulfillmentMethod === 'delivery' && !address)) return;
    if (paymentMethod === 'pix') setPix({ items: cart, quote, confirmed: false });
    else onPay('Dinheiro');
  }
  function adjust(id: string, change: number) {
    const line = lines.find((item) => item.id === id);
    if (line) onQuantity(id, Math.max(0, Math.min(99, line.quantity + change)));
  }

  if (screen === 'payment' && pix) {
    return (
      <PixPaymentPanel
        simulation
        pixPaymentData={{
          orderId: null,
          provider: 'demo',
          total: pix.quote.total,
          pixCode,
          qrCodeBase64: null,
        }}
        paymentStatus={pix.confirmed ? 'PAID' : 'WAITING'}
        paymentError={null}
        primaryColor={store.color}
        restaurantName={store.name}
        restaurantLogoUrl={brand.logoUrl}
        deliveryTime="30-40"
        deliveryAddress={
          fulfillmentMethod === 'pickup'
            ? 'Retirada no balcão'
            : address && `${address.street}, ${address.number}`
        }
        orderItems={pix.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          total: item.price * item.quantity,
        }))}
        deliveryFee={pix.quote.deliveryFeeAmount}
        couponDiscount={pix.quote.couponDiscount}
        cartCount={pix.items.reduce((sum, item) => sum + item.quantity, 0)}
        formatCurrency={(value) => money.format(value)}
        onCopyPixKey={() => navigator.clipboard.writeText(pixCode)}
        onBackToCart={() => setPix(null)}
        onVerify={() => {
          if (pix.confirmed) return;
          setPix({ ...pix, confirmed: true });
          onPay('Pix', false);
        }}
        onTrackOrder={onTrackPaid}
      />
    );
  }

  return (
    <FigmaCheckoutFlow
      {...brand}
      userName={loggedIn ? 'Marina Costa' : undefined}
      step={screen === 'bag' ? 'cart' : screen}
      cart={cart}
      cartCount={count}
      cartTotal={quote.itemsSubtotal}
      quote={quote}
      onIncrease={(id) => adjust(id, 1)}
      onDecrease={(id) => adjust(id, -1)}
      onRemove={(id) => onQuantity(id, 0)}
      onClear={() => lines.forEach((line) => onQuantity(line.id, 0))}
      onClose={() => onNavigate('menu')}
      onLogin={onLogin}
      onSubmit={startPayment}
      onStepChange={(next) => {
        if (next === 'address') nextFromBag();
        else onNavigate(next === 'cart' ? 'bag' : 'payment');
      }}
      couponContent={
        <CheckoutPromotionalCouponPicker
          coupons={[demoPromotionalCoupon]}
          appliedCode={quote.couponCode}
          onApply={applyCoupon}
        />
      }
      requestedCouponCode={coupon ? couponCode : ''}
      couponError={couponError}
      onRemoveCoupon={() => {
        onCouponChange(false);
        setCouponError('');
      }}
      onApplyCouponCode={applyCoupon}
      guestAddressScreen={
        <DemoCheckoutAddress
          {...brand}
          cart={cart}
          cartCount={count}
          subtotal={quote.itemsSubtotal}
          total={quote.total}
          deliveryFee={quote.deliveryFeeAmount}
          address={address}
          loggedIn={loggedIn}
          fulfillmentMethod={fulfillmentMethod}
          onMethodChange={onFulfillmentMethodChange}
          onLogin={onLogin}
          onSave={onAddress}
          onBack={() => onNavigate(addressOrigin)}
          onPickup={() => onNavigate(addressOrigin === 'menu' ? 'menu' : 'payment')}
        />
      }
      paymentScreen={
        <HomePaymentScreen
          {...brand}
          loggedIn={loggedIn}
          cart={cart}
          cartCount={count}
          subtotal={quote.itemsSubtotal}
          total={quote.total}
          couponDiscount={quote.couponDiscount}
          couponLabel={coupon ? `Cupom 10% · ${couponCode}` : undefined}
          deliveryFee={quote.deliveryFeeAmount}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          allowPayOnDelivery={fulfillmentMethod === 'delivery'}
          allowPix
          allowOpenFinancePix={false}
          allowCard={false}
          allowDebitCard={false}
          onBack={() => onNavigate(fulfillmentMethod === 'pickup' ? 'bag' : 'address')}
          onContinue={startPayment}
          disabled={!count || (fulfillmentMethod === 'delivery' && !address)}
          loading={false}
        />
      }
    />
  );
}
