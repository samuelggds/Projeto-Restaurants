import {
  Banknote,
  Check,
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

type PaymentMoment = 'NOW' | 'LATER';

const ONLINE_OPTIONS: Option[] = [
  {
    method: 'pix',
    name: 'Pix',
    description: 'Confirmação automática',
    color: '#32BCAD',
    icon: 'pix',
  },
  {
    method: 'card',
    name: 'Cartão',
    description: 'Pagamento online seguro',
    color: '#3b6cf6',
    icon: 'card',
  },
];

const DELIVERY_OPTIONS: Option[] = [
  {
    method: 'delivery_pix',
    name: 'Pix na entrega',
    description: 'QR Code ao receber',
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

const PICKUP_OPTIONS: Option[] = [
  {
    method: 'pickup_pix',
    name: 'Pix no restaurante',
    description: 'Pague no balcão',
    color: '#32BCAD',
    icon: 'pix',
  },
  {
    method: 'pickup_card',
    name: 'Cartão no restaurante',
    description: 'Maquininha ao retirar',
    color: '#3b6cf6',
    icon: 'card',
  },
  {
    method: 'pickup_cash',
    name: 'Dinheiro',
    description: 'Pagamento no local',
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

function isLaterMethod(method: CheckoutPaymentMethod) {
  return method.startsWith('delivery_') || method.startsWith('pickup_');
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
  const [paymentMoment, setPaymentMoment] = useState<PaymentMoment>(() =>
    isLaterMethod(paymentMethod) ? 'LATER' : 'NOW',
  );
  const registerCardPreparer = useCallback(
    (preparer: CardPaymentPreparer | null) => {
      setCardPaymentPreparer(preparer);
      onCardPreparerChange?.(preparer);
    },
    [onCardPreparerChange],
  );

  const handlePaymentChange = (method: CheckoutPaymentMethod) => {
    onChange(method);
    setPaymentMoment(isLaterMethod(method) ? 'LATER' : 'NOW');
    setShowCardAccountNotice(shouldShowSavedCardAccountNotice(loggedIn, method));
  };

  useEffect(() => {
    setPaymentMoment(isLaterMethod(paymentMethod) ? 'LATER' : 'NOW');
  }, [paymentMethod]);

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
  const laterOptions = allowPayOnDelivery ? deliveryOptions : allowPayAtPickup ? pickupOptions : [];
  const availableMethods = getAvailablePaymentMethods({
    allowPayOnDelivery,
    allowPayAtPickup,
    allowPix,
    allowCard,
  });
  const canPayNow = onlineOptions.length > 0;
  const canPayLater = laterOptions.length > 0;
  const laterTitle = allowPayOnDelivery ? 'Pagar na entrega' : 'Pagar no restaurante';
  const laterDescription = allowPayOnDelivery
    ? 'Escolha a forma de pagamento ao receber o pedido'
    : 'Escolha como deseja pagar quando retirar o pedido';

  const chooseMoment = (moment: PaymentMoment) => {
    setPaymentMoment(moment);
    setShowCardAccountNotice(false);
    const candidates = moment === 'NOW' ? onlineOptions : laterOptions;
    const currentStillValid = candidates.some((option) => option.method === paymentMethod);
    if (!currentStillValid && candidates[0]) handlePaymentChange(candidates[0].method);
  };

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

      <S.CartSectionLabel>Quando você quer pagar?</S.CartSectionLabel>
      <S.PaymentMomentGrid>
        {canPayNow ? (
          <S.PaymentMomentCard
            type="button"
            $active={paymentMoment === 'NOW'}
            onClick={() => chooseMoment('NOW')}
            aria-pressed={paymentMoment === 'NOW'}
          >
            <span className="moment-icon">
              <QrCode size={22} />
            </span>
            <span className="moment-copy">
              <b>Pagar agora</b>
              <small>Pix ou cartão online com confirmação automática</small>
            </span>
            <span className="moment-check">{paymentMoment === 'NOW' ? <Check size={16} /> : null}</span>
          </S.PaymentMomentCard>
        ) : null}

        {canPayLater ? (
          <S.PaymentMomentCard
            type="button"
            $active={paymentMoment === 'LATER'}
            onClick={() => chooseMoment('LATER')}
            aria-pressed={paymentMoment === 'LATER'}
          >
            <span className="moment-icon later">
              <Store size={22} />
            </span>
            <span className="moment-copy">
              <b>{laterTitle}</b>
              <small>{laterDescription}</small>
            </span>
            <span className="moment-check">{paymentMoment === 'LATER' ? <Check size={16} /> : null}</span>
          </S.PaymentMomentCard>
        ) : null}
      </S.PaymentMomentGrid>

      <S.PaymentMethodPanel>
        <div className="payment-method-heading">
          <b>{paymentMoment === 'NOW' ? 'Como deseja pagar agora?' : 'Como deseja pagar?'}</b>
          <small>
            {paymentMoment === 'NOW'
              ? 'Escolha Pix ou cartão para continuar'
              : allowPayOnDelivery
                ? 'A cobrança será feita quando o pedido chegar'
                : 'A cobrança será feita no restaurante'}
          </small>
        </div>
        <OptionsGrid
          options={paymentMoment === 'NOW' ? onlineOptions : laterOptions}
          selected={paymentMethod}
          onChange={handlePaymentChange}
        />
      </S.PaymentMethodPanel>

      {paymentMoment === 'NOW' && showCardAccountNotice && (
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

      {paymentMoment === 'NOW' && paymentMethod === 'card' && restaurantId && !loggedIn && (
        <OnlineCardPaymentForm restaurantId={restaurantId} onPreparerChange={registerCardPreparer} />
      )}

      {paymentMoment === 'NOW' && loggedIn && paymentMethod === 'card' && restaurantId && (
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

      {paymentMoment === 'LATER' && paymentMethod.startsWith('pickup_') && (
        <S.CheckoutUnavailable role="status">
          O pedido entra na fila da cozinha como não pago. A equipe verá a forma escolhida e fará a
          confirmação no atendimento.
        </S.CheckoutUnavailable>
      )}
    </>
  );
}
