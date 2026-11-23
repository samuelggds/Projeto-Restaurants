import { useMemo, useState } from 'react';
import { FigmaDeliveryExperience } from '../../../Home/FigmaDeliveryExperience';
import type { HomeProfileView } from '../../../Home/types';
import { demoStores, type DemoProduct, type DemoSlug } from './catalog';
import type { DemoAddress } from './DemoCheckout';
import { demoPromotionalCoupon, getDemoHomeData } from './demoHomeData';

type Props = {
  slug: DemoSlug;
  bagCount: number;
  address: DemoAddress | null;
  coupon: boolean;
  subtotal: number;
  loggedIn: boolean;
  fulfillmentMethod: 'delivery' | 'pickup';
  initialCouponsOpen?: boolean;
  darkMode?: boolean;
  onDarkModeChange?: (dark: boolean) => void;
  onFulfillmentMethodChange: (method: 'delivery' | 'pickup') => void;
  onAdd: (product: DemoProduct, quantity: number, observation?: string) => void;
  onBag: () => void;
  onAddress: () => void;
  onProfileView: (view: HomeProfileView) => void;
  onOrders: () => void;
  onAccount: () => void;
  onSetCoupon: (enabled: boolean) => void;
};

const coupons = [demoPromotionalCoupon];

export function DemoMenu({
  slug,
  bagCount,
  address,
  coupon,
  loggedIn,
  subtotal,
  initialCouponsOpen,
  darkMode,
  onDarkModeChange,
  fulfillmentMethod,
  onFulfillmentMethodChange,
  onAdd,
  onBag,
  onAddress,
  onProfileView,
  onOrders,
  onAccount,
  onSetCoupon,
}: Props) {
  const data = useMemo(() => getDemoHomeData(slug), [slug]);
  const [couponError, setCouponError] = useState('');
  const activeCoupon = coupon ? demoPromotionalCoupon.code : undefined;

  return (
    <FigmaDeliveryExperience
      data={data}
      cartCount={bagCount}
      darkMode={darkMode}
      onDarkModeChange={onDarkModeChange}
      initialCouponsOpen={initialCouponsOpen}
      promotionalCoupons={coupons}
      selectedPromotionalCode={activeCoupon}
      confirmedPromotionalCode={bagCount ? activeCoupon : undefined}
      promotionalCouponError={couponError || undefined}
      couponSubtotal={subtotal / 100}
      onSelectPromotionalCoupon={(code) => {
        if (code !== demoPromotionalCoupon.code) {
          setCouponError('Cupom indisponível nesta vitrine.');
          return;
        }
        setCouponError('');
        onSetCoupon(true);
      }}
      onRemovePromotionalCoupon={() => {
        setCouponError('');
        onSetCoupon(false);
      }}
      userLoggedIn={loggedIn}
      userName={loggedIn ? 'Marina Costa' : undefined}
      deliveryAddressPreview={
        address
          ? {
              address: address.street,
              number: address.number,
              district: address.district,
              city: address.city,
              state: address.state ?? '',
              zipCode: address.zipCode ?? '',
            }
          : null
      }
      fulfillmentMethod={fulfillmentMethod}
      onFulfillmentMethodChange={onFulfillmentMethodChange}
      savedAddresses={
        loggedIn && address
          ? [
              {
                id: 1,
                label: 'Casa',
                address: address.street,
                number: address.number,
                district: address.district,
                city: address.city,
                state: address.state ?? '',
                zipCode: address.zipCode ?? '',
                complement: address.complement,
                isDefault: true,
              },
            ]
          : []
      }
      selectedAddressId={loggedIn && address ? '1' : undefined}
      onSelectAddress={
        loggedIn && address ? () => onFulfillmentMethodChange('delivery') : undefined
      }
      onManageAddresses={onAddress}
      onOpenProfile={onAccount}
      onOpenProfileView={onProfileView}
      onOpenOrders={onOrders}
      onOpenCart={onBag}
      onAddProduct={(id, configuration, quantity = 1) => {
        const product = demoStores[slug].products.find((item) => item.id === id);
        if (!product) return;
        const groups = data.products.find((item) => item.id === id)?.optionGroups ?? [];
        const choices = groups.flatMap((group) =>
          group.options
            .filter((option) => configuration.selectedOptionIds.includes(option.id))
            .map((option) => `${group.name}: ${option.name}`),
        );
        const observation = [...choices, configuration.observation.trim()]
          .filter(Boolean)
          .join(' · ');
        onAdd(product, quantity, observation);
      }}
    />
  );
}
