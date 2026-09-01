import {
  ChevronRight,
  CreditCard,
  LogIn,
  QrCode,
  ShieldCheck,
  UserPlus,
  WalletCards,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import customerPaymentMethodService, {
  type CustomerPaymentMethod,
} from '../../../Services/customerPaymentMethodService';
import type { CheckoutPaymentMethod } from '../domain/checkout';
import { shouldShowSavedCardAccountNotice } from '../domain/paymentAccountNotice';
import { getAvailablePaymentMethods } from '../domain/publicSettings';
import * as S from '../../Home/Home.styles';
import { buildLoginUrl } from '../../../shared/navigation/authNavigation';

type Props = {
  paymentMethod: CheckoutPaymentMethod;
  allowPayOnDelivery: boolean;
  allowPix?: boolean;
  allowCard?: boolean;
  onChange: (method: CheckoutPaymentMethod) => void;
  restaurantId?: number | null;
  loggedIn?: boolean;
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
    description: 'Ambiente seguro',
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

function filterOptions(options: Option[], allowPix: boolean, allowCard: boolean) {
  return options.filter((option) => (option.icon === 'pix' ? allowPix : allowCard));
}

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

export function PaymentOptions({
  paymentMethod,
  allowPayOnDelivery,
  allowPix = true,
  allowCard = true,
  onChange,
  restaurantId,
  loggedIn = false,
}: Props) {
  const [savedCards, setSavedCards] = useState<CustomerPaymentMethod[]>([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [showCardAccountNotice, setShowCardAccountNotice] = useState(false);
  const handlePaymentChange = (method: CheckoutPaymentMethod) => {
    onChange(method);
    setShowCardAccountNotice(shouldShowSavedCardAccountNotice(loggedIn, method));
  };
  useEffect(() => {
    if (!loggedIn || !restaurantId || paymentMethod !== 'card') return;
    let active = true;
    customerPaymentMethodService
      .list(restaurantId)
      .then((cards) => {
        if (!active) return;
        setSavedCards(cards);
        const key = `selectedCustomerPaymentMethodId:${restaurantId}`;
        const preferred =
          cards.find((card) => card.publicId === localStorage.getItem(key)) ||
          cards.find((card) => card.isDefault) ||
          cards[0];
        if (preferred) {
          setSelectedCardId(preferred.publicId);
          localStorage.setItem(key, preferred.publicId);
        }
      })
      .catch(() => setSavedCards([]));
    return () => {
      active = false;
    };
  }, [loggedIn, paymentMethod, restaurantId]);
  const onlineOptions = filterOptions(ONLINE_OPTIONS, allowPix, allowCard);
  const deliveryOptions = filterOptions(DELIVERY_OPTIONS, allowPix, allowCard);
  const availableMethods = getAvailablePaymentMethods({
    allowPayOnDelivery,
    allowPix,
    allowCard,
  });
  if (availableMethods.length === 0) {
    return (
      <>
        <S.CartSectionLabel>Forma de pagamento</S.CartSectionLabel>
        <S.CheckoutUnavailable role="status">
          Serviço indisponível. O restaurante ainda não configurou os pagamentos para novos pedidos.
        </S.CheckoutUnavailable>
      </>
    );
  }
  return (
    <>
      <S.CartSectionLabel>Forma de pagamento</S.CartSectionLabel>
      <OptionsGrid
        options={onlineOptions}
        selected={paymentMethod}
        onChange={handlePaymentChange}
      />
      {showCardAccountNotice && (
        <S.CardAccountNotice role="status" aria-live="polite">
          <div className="notice-icon">
            <ShieldCheck size={21} />
          </div>
          <div className="notice-copy">
            <b>Você pode pagar sem criar conta</b>
            <span>
              Como visitante, informe o cartão no ambiente seguro do provedor a cada compra. Crie
              uma conta somente se quiser salvar e reutilizar o cartão.
            </span>
          </div>
          <div className="notice-actions">
            <button type="button" className="guest" onClick={() => setShowCardAccountNotice(false)}>
              <X size={16} /> Continuar como visitante
            </button>
            <button
              type="button"
              className="primary"
              onClick={() =>
                window.location.assign(
                  `/register?next=${encodeURIComponent(window.location.pathname)}`,
                )
              }
            >
              <UserPlus size={16} /> Criar conta para salvar
            </button>
            <button
              type="button"
              onClick={() => window.location.assign(buildLoginUrl(window.location))}
            >
              <LogIn size={16} /> Já tenho conta
            </button>
          </div>
        </S.CardAccountNotice>
      )}
      {loggedIn && paymentMethod === 'card' && restaurantId && (
        <S.SavedPaymentChooser>
          {savedCards.map((card) => (
            <button
              key={card.publicId}
              type="button"
              className={selectedCardId === card.publicId ? 'active' : ''}
              onClick={() => {
                setSelectedCardId(card.publicId);
                localStorage.setItem(
                  `selectedCustomerPaymentMethodId:${restaurantId}`,
                  card.publicId,
                );
              }}
            >
              <CreditCard size={18} />
              <span>
                <b>
                  {card.brand.toUpperCase()} •••• {card.last4}
                </b>
                <small>
                  Validade {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}
                </small>
                {card.provider === 'MERCADO_PAGO' && (
                  <small>O Mercado Pago confirmará o CVV no ambiente seguro.</small>
                )}
              </span>
            </button>
          ))}
          <a
            className="add"
            href="/profile?view=paymentMethods"
            aria-label="Cadastrar cartão em Meus cartões"
          >
            <span className="add-icon">
              <WalletCards size={19} />
            </span>
            <span className="add-copy">
              <b>Cadastrar novo cartão</b>
              <small>Abra “Meus cartões” no seu perfil</small>
            </span>
            <ChevronRight className="add-arrow" size={18} />
          </a>
        </S.SavedPaymentChooser>
      )}
      {allowPayOnDelivery && deliveryOptions.length > 0 && (
        <>
          <S.CartSectionLabel>Pagar na entrega</S.CartSectionLabel>
          <OptionsGrid
            options={deliveryOptions}
            selected={paymentMethod}
            onChange={handlePaymentChange}
          />
        </>
      )}
    </>
  );
}
