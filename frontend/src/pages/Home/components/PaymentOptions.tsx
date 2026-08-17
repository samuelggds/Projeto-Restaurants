import { CreditCard, QrCode } from 'lucide-react';
import type { CheckoutPaymentMethod } from '../domain/checkout';
import * as S from '../../Home/Home.styles';

type Props = {
  paymentMethod: CheckoutPaymentMethod;
  allowPayOnDelivery: boolean;
  onChange: (method: CheckoutPaymentMethod) => void;
};

type Option = {
  method: CheckoutPaymentMethod;
  name: string;
  description: string;
  color: string;
  icon: 'pix' | 'card';
};

const ONLINE_OPTIONS: Option[] = [
  {
    method: 'pix',
    name: 'Pix',
    description: 'Aprovação instantânea',
    color: '#32BCAD',
    icon: 'pix',
  },
  {
    method: 'card',
    name: 'Cartão',
    description: 'Ambiente seguro do gateway',
    color: '#3b6cf6',
    icon: 'card',
  },
];

const DELIVERY_OPTIONS: Option[] = [
  {
    method: 'delivery_pix',
    name: 'Pix na entrega',
    description: 'Pago ao entregador',
    color: '#32BCAD',
    icon: 'pix',
  },
  {
    method: 'delivery_card',
    name: 'Cartão na entrega',
    description: 'Maquininha ao receber',
    color: '#3b6cf6',
    icon: 'card',
  },
];

function PaymentOption({
  option,
  active,
  onSelect,
}: {
  option: Option;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = option.icon === 'pix' ? QrCode : CreditCard;
  return (
    <S.PaymentCard
      type="button"
      $active={active}
      $color={option.color}
      onClick={onSelect}
      aria-pressed={active}
    >
      <div className="pm-badge">
        <Icon size={21} aria-hidden="true" />
      </div>
      <span className="pm-name">{option.name}</span>
      <span className="pm-desc">{option.description}</span>
    </S.PaymentCard>
  );
}

function OptionsGrid({
  options,
  selected,
  onChange,
}: {
  options: Option[];
  selected: CheckoutPaymentMethod;
  onChange: Props['onChange'];
}) {
  return (
    <S.PaymentGrid>
      {options.map((option) => (
        <PaymentOption
          key={option.method}
          option={option}
          active={selected === option.method}
          onSelect={() => onChange(option.method)}
        />
      ))}
    </S.PaymentGrid>
  );
}

export function PaymentOptions({ paymentMethod, allowPayOnDelivery, onChange }: Props) {
  return (
    <>
      <S.CartSectionLabel>Forma de pagamento</S.CartSectionLabel>
      <OptionsGrid options={ONLINE_OPTIONS} selected={paymentMethod} onChange={onChange} />
      {allowPayOnDelivery && (
        <>
          <S.CartSectionLabel>Pagar na entrega</S.CartSectionLabel>
          <OptionsGrid options={DELIVERY_OPTIONS} selected={paymentMethod} onChange={onChange} />
        </>
      )}
    </>
  );
}
