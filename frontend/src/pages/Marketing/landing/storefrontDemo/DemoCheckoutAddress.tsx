import { useRef, useState } from 'react';
import { AuthenticatedAddressCheckout } from '../../../Home/components/AuthenticatedAddressCheckout';
import { AuthenticatedEmptyAddressCheckout } from '../../../Home/components/AuthenticatedEmptyAddressCheckout';
import { GuestAddressCheckout } from '../../../Home/components/GuestAddressCheckout';
import { isValidWhatsappOrderPhone } from '../../../Home/domain/checkout';
import {
  formatCep,
  validateDeliveryAddress,
  type DeliveryAddressData,
} from '../../../Home/domain/deliveryAddress';
import type { CartItem } from '../../../Home/hooks/useCart';
import type { DemoAddress } from './DemoCheckout';

type Props = {
  primaryColor: string;
  brandName: string;
  logoUrl: string;
  loggedIn: boolean;
  cart: CartItem[];
  cartCount: number;
  total: number;
  subtotal: number;
  deliveryFee: number;
  address: DemoAddress | null;
  fulfillmentMethod: 'delivery' | 'pickup';
  onMethodChange: (value: 'delivery' | 'pickup') => void;
  onBack: () => void;
  onSave: (address: DemoAddress) => void;
  onLogin: () => void;
  onPickup: () => void;
};

function formAddress(saved: DemoAddress | null): DeliveryAddressData {
  return {
    address: saved?.street ?? 'Rua das Pitangueiras',
    number: saved?.number ?? '120',
    district: saved?.district ?? 'Jardim do Sol',
    city: saved?.city ?? 'Vila das Flores',
    zipCode: saved?.zipCode ?? '01000-000',
    state: saved?.state ?? 'SP',
    complement: saved?.complement ?? '',
  };
}

export function DemoCheckoutAddress({
  address: saved,
  loggedIn,
  fulfillmentMethod,
  onMethodChange,
  onSave,
  onLogin,
  onPickup,
  ...props
}: Props) {
  const [address, setAddress] = useState(() => formAddress(saved));
  const [name, setName] = useState('Marina Costa');
  const [phone, setPhone] = useState('(11) 90000-0000');
  const [editing, setEditing] = useState(!saved);
  const root = useRef<HTMLDivElement>(null);
  const pickup = fulfillmentMethod === 'pickup';
  const disabled =
    (!loggedIn && name.trim().length < 2) ||
    !isValidWhatsappOrderPhone(phone) ||
    (!pickup && Object.keys(validateDeliveryAddress(address)).length > 0);
  function editAddress() {
    setEditing(true);
    requestAnimationFrame(() =>
      root.current?.querySelector<HTMLInputElement>('input[aria-label="CEP"]')?.focus(),
    );
  }
  const shared = {
    ...props,
    restaurantId: null,
    isOpen: true,
    orderType: fulfillmentMethod,
    allowDelivery: true,
    allowPickup: true,
    onOrderTypeChange: onMethodChange,
    address,
    setAddress,
    cepStatus: 'success' as const,
    cepMessage: 'Endereço de demonstração. Os campos podem ser editados.',
    onCepChange: (value: string) =>
      setAddress((previous) => ({ ...previous, zipCode: formatCep(value) })),
    onCepLookup: async () => {},
    disabled,
    onContinue: () => {
      if (disabled) return;
      if (pickup) {
        onPickup();
        return;
      }
      onSave({
        street: address.address.trim(),
        number: address.number.trim(),
        district: address.district.trim(),
        city: address.city.trim(),
        zipCode: address.zipCode,
        state: address.state.trim().toUpperCase(),
        complement: address.complement.trim(),
      });
    },
  };
  const contact = {
    userName: 'Marina Costa',
    customerPhone: phone,
    onCustomerPhoneChange: setPhone,
  };
  return (
    <div ref={root}>
      {!loggedIn ? (
        <GuestAddressCheckout
          {...shared}
          guestName={name}
          onGuestNameChange={setName}
          guestPhone={phone}
          onGuestPhoneChange={setPhone}
          onLogin={onLogin}
        />
      ) : !editing && saved ? (
        <AuthenticatedAddressCheckout
          {...shared}
          {...contact}
          savedAddresses={[{ ...formAddress(saved), id: 1, label: 'Casa', isDefault: true }]}
          selectedAddressId="1"
          onSelectAddress={() => setAddress(formAddress(saved))}
          onManageAddresses={editAddress}
        />
      ) : (
        <AuthenticatedEmptyAddressCheckout
          {...shared}
          {...contact}
          onRegisterAddress={editAddress}
        />
      )}
    </div>
  );
}
