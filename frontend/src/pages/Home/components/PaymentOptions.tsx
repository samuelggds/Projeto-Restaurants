import {
  Banknote,
  Check,
  ChevronRight,
  CreditCard,
  LogIn,
  Landmark,
  QrCode,
  ShieldCheck,
  Store,
  UserPlus,
  WalletCards,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ordersService from '../../../Services/ordersService';
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
import * as P from './PaymentOptions.styles';

type Props = {
  paymentMethod: CheckoutPaymentMethod;
  allowPayOnDelivery: boolean;
  allowPayAtPickup?: boolean;
  allowPix?: boolean;
  allowOpenFinancePix?: boolean;
  allowCard?: boolean;
  onChange: (method: CheckoutPaymentMethod) => void;
  restaurantId?: number | null;
  loggedIn?: boolean;
  userEmail?: string;
  onCardPreparerChange?: (preparer: CardPaymentPreparer | null) => void;
};

type Option = {
  method: CheckoutPaymentMethod;
  name: string;
  description: string;
  color: string;
  icon: 'pix' | 'bank' | 'card' | 'store' | 'cash';
};

const ONLINE_OPTIONS: Option[] = [
  {
    method: 'pix',
    name: 'Pix QR Code',
    description: 'QR Code ou copia e cola',
    color: '#32BCAD',
    icon: 'pix',
  },
  {
    method: 'card',
    name: 'Cartão',
    description: 'Crédito ou débito online',
    color: '#3b6cf6',
    icon: 'card',
  },
];

const DELIVERY_OPTIONS: Option[] = [
  {
    method: 'delivery_pix',
    name: 'Pix na entrega',
    description: 'Pague com Pix ao receber',
    color: '#32BCAD',
    icon: 'pix',
  },
  {
    method: 'delivery_card',
    name: 'Cartão / maquininha',
    description: 'Pague no cartão ao receber',
    color: '#3b6cf6',
    icon: 'card',
  },
];

const PICKUP_OPTIONS: Option[] = [
  {
    method: 'pickup_pix',
    name: 'Pix na retirada',
    description: 'Pague com Pix ao buscar',
    color: '#32BCAD',
    icon: 'pix',
  },
  {
    method: 'pickup_card',
    name: 'Cartão / maquininha',
    description: 'Pague no cartão ao retirar',
    color: '#3b6cf6',
    icon: 'card',
  },
  {
    method: 'pickup_cash',
    name: 'Dinheiro',
    description: 'Pagamento no restaurante',
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

function getPaymentMode(method: CheckoutPaymentMethod): 'now' | 'later' {
  return method.startsWith('delivery_') || method.startsWith('pickup_') ? 'later' : 'now';
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
      : option.icon === 'bank'
        ? Landmark
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
  allowOpenFinancePix = false,
  allowCard = true,
  onChange,
  restaurantId,
  loggedIn = false,
  userEmail = '',
  onCardPreparerChange,
}: Props) {
  const [savedCards, setSavedCards] = useState<CustomerPaymentMethod[]>([]);
  const [savedCardsLoading, setSavedCardsLoading] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [showCardAccountNotice, setShowCardAccountNotice] = useState(false);
  const [openFinanceInstitutions, setOpenFinanceInstitutions] = useState<
    Array<{ id: string; name: string; logo?: string | null }>
  >([]);
  const [openFinanceBanksLoading, setOpenFinanceBanksLoading] = useState(false);
  const [openFinanceBanksError, setOpenFinanceBanksError] = useState('');
  const [selectedOpenFinanceInstitution, setSelectedOpenFinanceInstitution] = useState(() => {
    if (!restaurantId || typeof window === 'undefined') return '';
    return localStorage.getItem(`gastronexa:open-finance-institution:${restaurantId}`) || '';
  });
  const openMode = getPaymentMode(paymentMethod);
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

  useEffect(() => {
    if (
      paymentMethod !== 'open_finance_pix' ||
      !allowOpenFinancePix ||
      !restaurantId ||
      openFinanceInstitutions.length > 0
    ) {
      return;
    }

    let active = true;
    setOpenFinanceBanksLoading(true);
    setOpenFinanceBanksError('');
    ordersService
      .listOpenFinanceInstitutions()
      .then((institutions) => {
        if (!active) return;
        setOpenFinanceInstitutions(institutions);
        const stored =
          localStorage.getItem(`gastronexa:open-finance-institution:${restaurantId}`) || '';
        const selected =
          institutions.find((institution) => institution.id === stored)?.id ||
          institutions[0]?.id ||
          '';
        setSelectedOpenFinanceInstitution(selected);
        if (selected) {
          localStorage.setItem(`gastronexa:open-finance-institution:${restaurantId}`, selected);
        }
      })
      .catch(() => {
        if (active) setOpenFinanceBanksError('Não foi possível carregar os bancos agora.');
      })
      .finally(() => {
        if (active) setOpenFinanceBanksLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    allowOpenFinancePix,
    openFinanceInstitutions.length,
    paymentMethod,
    restaurantId,
  ]);

  const selectedSavedCard = useMemo(
    () => savedCards.find((card) => card.publicId === selectedCardId) || savedCards[0] || null,
    [savedCards, selectedCardId],
  );

  const onlineOptions = filterOptions(ONLINE_OPTIONS, allowPix, allowCard);
  if (allowOpenFinancePix) {
    onlineOptions.splice(Math.min(1, onlineOptions.length), 0, {
      method: 'open_finance_pix',
      name: 'Pix pelo app do banco',
      description: 'Escolha o banco e autorize no app',
      color: '#245f79',
      icon: 'bank',
    });
  }
  const deliveryOptions = filterOptions(DELIVERY_OPTIONS, allowPix, allowCard);
  const pickupOptions = filterOptions(PICKUP_OPTIONS, allowPix, allowCard);
  const availableMethods = getAvailablePaymentMethods({
    allowPayOnDelivery,
    allowPayAtPickup,
    allowPix,
    allowOpenFinancePix,
    allowCard,
  });
  const laterOptions = allowPayAtPickup ? pickupOptions : deliveryOptions;
  const laterTitle = allowPayAtPickup ? 'Pagar na retirada' : 'Pagar na entrega';
  const laterDescription = allowPayAtPickup
    ? 'Acerte o pagamento quando buscar o pedido.'
    : allowPix && allowCard
      ? 'Pix ou cartão / maquininha quando receber.'
      : allowPix
        ? 'Pix quando receber.'
        : 'Cartão / maquininha quando receber.';
  const onlineDescription =
    allowPix && allowCard
      ? 'Pix ou cartão online.'
      : allowPix
        ? 'Pix online com confirmação segura.'
        : 'Cartão online com pagamento seguro.';
  const hasLaterMode = (allowPayAtPickup || allowPayOnDelivery) && laterOptions.length > 0;
  const selectedOptions = openMode === 'now' ? onlineOptions : laterOptions;
  const paymentMethodsHref = restaurantId
    ? `/profile?view=paymentMethods&restaurantId=${encodeURIComponent(String(restaurantId))}`
    : '/profile?view=paymentMethods';
  const rememberPaymentRestaurant = () => {
    if (restaurantId) localStorage.setItem('menuRestaurantId', String(restaurantId));
  };

  const selectMode = (mode: 'now' | 'later') => {
    const options = mode === 'now' ? onlineOptions : laterOptions;
    if (!options.some((option) => option.method === paymentMethod) && options[0]) {
      handlePaymentChange(options[0].method);
    }
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
      {loggedIn && allowCard && (
        <P.AccountShortcut
          href={paymentMethodsHref}
          onClick={rememberPaymentRestaurant}
          aria-label="Cadastrar ou gerenciar cartão em Meus cartões"
        >
          <span className="shortcut-icon" aria-hidden="true">
            <WalletCards size={20} />
          </span>
          <span className="shortcut-copy">
            <b>Cadastrar cartão</b>
            <small>Salve e gerencie cartões para próximas compras</small>
          </span>
          <ChevronRight className="shortcut-arrow" size={18} aria-hidden="true" />
        </P.AccountShortcut>
      )}

      <WhatsAppOrderNotifications restaurantId={restaurantId} />

      <P.PaymentIntro>
        <strong>Forma de pagamento</strong>
        <span>Escolha quando deseja pagar e depois selecione a forma disponível.</span>
      </P.PaymentIntro>

      <S.PaymentMomentGrid>
        {onlineOptions.length > 0 && (
          <S.PaymentMomentCard
            type="button"
            $active={openMode === 'now'}
            onClick={() => selectMode('now')}
            aria-pressed={openMode === 'now'}
          >
            <span className="moment-icon">
              <ShieldCheck size={19} />
            </span>
            <span className="moment-copy">
              <b>Pagar agora</b>
              <small>{onlineDescription}</small>
            </span>
            <span className="moment-check" aria-hidden="true">
              {openMode === 'now' ? <Check size={12} strokeWidth={3} /> : null}
            </span>
          </S.PaymentMomentCard>
        )}

        {hasLaterMode && (
          <S.PaymentMomentCard
            type="button"
            $active={openMode === 'later'}
            onClick={() => selectMode('later')}
            aria-pressed={openMode === 'later'}
          >
            <span className="moment-icon later">
              {allowPayAtPickup ? <Store size={19} /> : <Banknote size={19} />}
            </span>
            <span className="moment-copy">
              <b>{laterTitle}</b>
              <small>{laterDescription}</small>
            </span>
            <span className="moment-check" aria-hidden="true">
              {openMode === 'later' ? <Check size={12} strokeWidth={3} /> : null}
            </span>
          </S.PaymentMomentCard>
        )}
      </S.PaymentMomentGrid>

      <S.PaymentMethodPanel>
        <P.PaymentMethodHeading>
          <b>{openMode === 'now' ? 'Pague agora' : laterTitle}</b>
          <small>
            {openMode === 'now'
              ? 'Pagamento online protegido e confirmação automática quando disponível.'
              : allowPayAtPickup
                ? 'O pedido é enviado agora e o pagamento acontece na retirada.'
                : 'O pedido é enviado agora e o pagamento acontece na entrega.'}
          </small>
        </P.PaymentMethodHeading>

        <OptionsGrid
          options={selectedOptions}
          selected={paymentMethod}
          onChange={handlePaymentChange}
        />

        {openMode === 'now' && paymentMethod === 'open_finance_pix' && (
          <P.OpenFinanceBankPicker>
            <span>Escolha o banco para autorizar o Pix</span>
            <small>
              Você será levado ao ambiente seguro do seu banco e voltará ao GastroNexa após a autorização.
            </small>
            <select
              value={selectedOpenFinanceInstitution}
              disabled={openFinanceBanksLoading}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedOpenFinanceInstitution(value);
                if (restaurantId) {
                  localStorage.setItem(
                    `gastronexa:open-finance-institution:${restaurantId}`,
                    value,
                  );
                }
              }}
              aria-label="Banco para Pix pelo app"
            >
              <option value="">
                {openFinanceBanksLoading ? 'Carregando bancos…' : 'Selecione seu banco'}
              </option>
              {openFinanceInstitutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </select>
            {openFinanceBanksError && (
              <P.OpenFinanceNotice role="alert">{openFinanceBanksError}</P.OpenFinanceNotice>
            )}
          </P.OpenFinanceBankPicker>
        )}

        {openMode === 'now' && showCardAccountNotice && (
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
              <button
                type="button"
                className="guest"
                onClick={() => setShowCardAccountNotice(false)}
              >
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

        {openMode === 'now' && paymentMethod === 'card' && restaurantId && !loggedIn && (
          <OnlineCardPaymentForm
            restaurantId={restaurantId}
            payerEmail={userEmail}
            onPreparerChange={registerCardPreparer}
          />
        )}

        {openMode === 'now' && loggedIn && paymentMethod === 'card' && restaurantId && (
          <>
            {savedCardsLoading ? (
              <S.CheckoutUnavailable role="status">
                Carregando seus cartões salvos…
              </S.CheckoutUnavailable>
            ) : savedCards.length === 0 ? (
              <>
                <S.CardAccountNotice role="status" aria-live="polite">
                  <div className="notice-icon">
                    <WalletCards size={21} />
                  </div>
                  <div className="notice-copy">
                    <b>Você ainda não tem cartão salvo</b>
                    <span>
                      Você pode pagar com um cartão novo agora sem salvá-lo, ou cadastrá-lo em “Meus
                      cartões” para reutilizar nas próximas compras.
                    </span>
                  </div>
                </S.CardAccountNotice>
                <S.SavedPaymentChooser>
                  <a
                    className="add"
                    href={paymentMethodsHref}
                    onClick={rememberPaymentRestaurant}
                    aria-label="Cadastrar cartão em Meus cartões"
                  >
                    <span className="add-icon">
                      <WalletCards size={19} />
                    </span>
                    <span className="add-copy">
                      <b>Cadastrar cartão para próximas compras</b>
                      <small>Abra “Meus cartões” no seu perfil</small>
                    </span>
                    <ChevronRight className="add-arrow" size={18} />
                  </a>
                </S.SavedPaymentChooser>
                <OnlineCardPaymentForm
                  restaurantId={restaurantId}
                  payerEmail={userEmail}
                  onPreparerChange={registerCardPreparer}
                />
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
                        Validade {String(card.expMonth).padStart(2, '0')}/
                        {String(card.expYear).slice(-2)}
                      </small>
                      {card.provider === 'MERCADO_PAGO' && (
                        <small>Por segurança, informe apenas o CVV abaixo antes de pagar.</small>
                      )}
                    </span>
                  </button>
                ))}
                <a
                  className="add"
                  href={paymentMethodsHref}
                  onClick={rememberPaymentRestaurant}
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

        {openMode === 'later' && allowPayAtPickup && paymentMethod.startsWith('pickup_') && (
          <P.PaymentModeHint>
            O pedido entra na fila da cozinha como não pago. A equipe verá a forma escolhida;
            pagamentos integrados podem ser confirmados automaticamente e dinheiro é confirmado
            pelo funcionário.
          </P.PaymentModeHint>
        )}
      </S.PaymentMethodPanel>

      {openMode === 'now' && (
        <P.SecurePaymentNote>
          <ShieldCheck size={16} aria-hidden="true" />
          Pagamento online protegido pelo provedor. O GastroNexa não armazena os dados brutos do
          cartão do visitante.
        </P.SecurePaymentNote>
      )}
    </>
  );
}
