import {
  Banknote,
  ChevronRight,
  CreditCard,
  LogIn,
  QrCode,
  ShieldCheck,
  Store,
  UserPlus,
  WalletCards,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import customerPaymentMethodService, {
  type CustomerPaymentMethod,
} from '../../../Services/customerPaymentMethodService';
import { type CheckoutPaymentMethod } from '../domain/checkout';
import { shouldShowSavedCardAccountNotice } from '../domain/paymentAccountNotice';
import { getAvailablePaymentMethods } from '../domain/publicSettings';
import { setCardPaymentPreparer } from '../domain/cardPaymentPreparation';
import * as S from '../../Home/Home.styles';
import {
  buildAuthEntryUrlForLocation,
  buildLoginUrl,
} from '../../../shared/navigation/authNavigation';
import { WhatsAppOrderNotifications } from './WhatsAppOrderNotifications';
import {
  OnlineCardPaymentForm,
  type CardPaymentPreparer,
} from './OnlineCardPaymentForm';

type Props = {
  paymentMethod: CheckoutPaymentMethod;
  allowPayOnDelivery: boolean;
  allowPayAtPickup?: boolean;
  allowPix?: boolean;
  allowCard?: boolean;
  onChange: (method: CheckoutPaymentMethod) => void;
  restaurantId?: number | null;
  loggedIn?: boolean;
  onCardPreparerChange?: (preparer: CardPaymentPreparer | null) => void;
};

type Option = {
  method: CheckoutPaymentMethod;
  name: string;
  description: string;
  color: string;
  icon: 'pix' | 'card' | 'store' | 'cash';
};

const ONLINE_OPTIONS: Option[] = [
  {
    method: 'pix',
    name: 'Pix',
    description: 'Pague agora com confirmação automática',
    color: '#32BCAD',
    icon: 'pix',
  },
  {
    method: 'card',
    name: 'Cartão',
    description: 'Pague agora online com segurança',
    color: '#3b6cf6',
    icon: 'card',
  },
];

const DELIVERY_OPTIONS: Option[] = [
  {
    method: 'delivery_pix',
    name: 'Pix na entrega',
    description: 'QR Code ao receber com confirmação automática',
    color: '#32BCAD',
    icon: 'pix',
  },
  {
    method: 'delivery_card',
    name: 'Cartão na entrega',
    description: 'Maquininha integrada ao receber',
    color: '#3b6cf6',
    icon: 'card',
  },
];

const PICKUP_OPTIONS: Option[] = [
  {
    method: 'pickup_pix',
    name: 'Pix no restaurante',
    description: 'Pague no balcão com confirmação automática',
    color: '#32BCAD',
    icon: 'pix',
  },
  {
    method: 'pickup_card',
    name: 'Cartão no restaurante',
    description: 'Pague na maquininha ao retirar',
    color: '#3b6cf6',
    icon: 'card',
  },
  {
    method: 'pickup_cash',
    name: 'Dinheiro',
    description: 'Pagamento confirmado pelo funcionário',
    color: '#8b5e3c',
    icon: 'cash',
  },
];

function filterOptions(options: Option[], allowPix: boolean, allowCard: boolean) {
  return options.filter((option) => {
    if (option.icon === 'pix') return allowPix;
    if (option.icon === 'card') return allowCard;
    return true;
  });
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
  const Icon =
    option.icon === 'pix'
      ? QrCode
      : option.icon === 'card'
        ? CreditCard
        : option.icon === 'cash'
          ? Banknote
          : Store;
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
  allowPayAtPickup = !allowPayOnDelivery,
  allowPix = true,
  allowCard = true,
  onChange,
  restaurantId,
  loggedIn = false,
  onCardPreparerChange,
}: Props) {
  const [savedCards, setSavedCards] = useState<CustomerPaymentMethod[]>([]);
  const [savedCardsLoading, setSavedCardsLoading] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [showCardAccountNotice, setShowCardAccountNotice] = useState(false);
  const registerCardPreparer = useCallback(
    (preparer: CardPaymentPreparer | null) => {
      setCardPaymentPreparer(preparer);
      onCardPreparerChange?.(preparer);
    },
    [onCardPreparerChange],
  );

  const handlePaymentChange = (method: CheckoutPaymentMethod) => {
    onChange(method);
    setShowCardAccountNotice(shouldShowSavedCardAccountNotice(loggedIn, method));
  };

  useEffect(() => {
    if (!loggedIn || !restaurantId || paymentMethod !== 'card') return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) setSavedCardsLoading(true);
    });
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
        setSelectedCardId(preferred?.publicId || '');
        if (preferred) localStorage.setItem(key, preferred.publicId);
      })
      .catch(() => {
        if (active) {
          setSavedCards([]);
          setSelectedCardId('');
        }
      })
      .finally(() => active && setSavedCardsLoading(false));
    return () => {
      active = false;
    };
  }, [loggedIn, paymentMethod, restaurantId]);

  useEffect(() => {
    if (paymentMethod !== 'card') registerCardPreparer(null);
    return () => registerCardPreparer(null);
  }, [paymentMethod, registerCardPreparer]);

  const selectedSavedCard = useMemo(
    () => savedCards.find((card) => card.publicId === selectedCardId) || savedCards[0] || null,
    [savedCards, selectedCardId],
  );

  const onlineOptions = filterOptions(ONLINE_OPTIONS, allowPix, allowCard);
  const deliveryOptions = filterOptions(DELIVERY_OPTIONS, allowPix, allowCard);
  const pickupOptions = filterOptions(PICKUP_OPTIONS, allowPix, allowCard);
  const availableMethods = getAvailablePaymentMethods({
    allowPayOnDelivery,
    allowPayAtPickup,
    allowPix,
    allowCard,
  });

  if (availableMethods.length === 0) {
    return (
      <>
        <WhatsAppOrderNotifications restaurantId={restaurantId} />
        <S.CartSectionLabel>Forma de pagamento</S.CartSectionLabel>
        <S.CheckoutUnavailable role="status">
          Serviço indisponível. Este restaurante ainda não aceita esta forma de pagamento no
          momento.
        </S.CheckoutUnavailable>
      </>
    );
  }

  return (
    <>
      <WhatsAppOrderNotifications restaurantId={restaurantId} />

      <S.CartSectionLabel>Pagar agora</S.CartSectionLabel>
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
            <b>Você pode pagar como visitante</b>
            <span>
              Preencha os dados do cartão abaixo. Eles serão protegidos pelo provedor e não serão
              salvos no GastroNexa.
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
                window.location.assign(buildAuthEntryUrlForLocation('/register', window.location))
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

      {paymentMethod === 'card' && restaurantId && !loggedIn && (
        <OnlineCardPaymentForm restaurantId={restaurantId} onPreparerChange={registerCardPreparer} />
      )}

      {loggedIn && paymentMethod === 'card' && restaurantId && (
        <>
          {savedCardsLoading ? (
            <S.CheckoutUnavailable role="status">Carregando seus cartões salvos…</S.CheckoutUnavailable>
          ) : savedCards.length === 0 ? (
            <>
              <S.CardAccountNotice role="status" aria-live="polite">
                <div className="notice-icon">
                  <WalletCards size={21} />
                </div>
                <div className="notice-copy">
                  <b>Cadastre um cartão para pagar online</b>
                  <span>
                    Sua conta ainda não tem cartão salvo. Cadastre uma vez no perfil e, nas próximas
                    compras, basta selecionar o cartão para pagar.
                  </span>
                </div>
              </S.CardAccountNotice>
              <S.SavedPaymentChooser>
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
            </>
          ) : (
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
                      <small>Por segurança, informe apenas o CVV abaixo antes de pagar.</small>
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
                  <b>Cadastrar outro cartão</b>
                  <small>Abra “Meus cartões” no seu perfil</small>
                </span>
                <ChevronRight className="add-arrow" size={18} />
              </a>
            </S.SavedPaymentChooser>
          )}

          {selectedSavedCard && (
            <OnlineCardPaymentForm
              restaurantId={restaurantId}
              savedCard={selectedSavedCard}
              onPreparerChange={registerCardPreparer}
            />
          )}
        </>
      )}

      {allowPayAtPickup && (
        <>
          <S.CartSectionLabel>Pagar no restaurante</S.CartSectionLabel>
          <OptionsGrid
            options={pickupOptions}
            selected={paymentMethod}
            onChange={handlePaymentChange}
          />
          {paymentMethod.startsWith('pickup_') && (
            <S.CheckoutUnavailable role="status">
              O pedido entra na fila da cozinha como não pago. A equipe verá a forma escolhida;
              Pix e cartão podem ser confirmados automaticamente pela integração e dinheiro é
              confirmado pelo funcionário.
            </S.CheckoutUnavailable>
          )}
        </>
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
