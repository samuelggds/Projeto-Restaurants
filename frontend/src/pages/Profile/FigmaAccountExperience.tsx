import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CircleCheck,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Headphones,
  Mail,
  MapPin,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  TicketPercent,
  Trash2,
  UserRound,
  WalletCards,
  Camera,
} from 'lucide-react';
import { buildLoyaltyWalletEntries } from './domain/loyaltyWallet';
import { FigmaCouponRedemption, FigmaLoyaltyProgram } from './FigmaLoyaltyViews';
import { useLoyaltyExpirationClock } from '../Home/hooks/useLoyaltyExpirationClock';
import { CustomerDesktopFooter } from '../Home/components/CustomerDesktopFooter';
import { PaymentCardVisual } from './components/PaymentCardVisual';
import { CardBrandLogo } from './components/CardBrandLogo';
import { getCardBrandDetails } from './domain/cardBrand';
import { useAppDialog } from '../../components/AppDialog/context';
import type {
  ActiveProfileOrder,
  ProfileData,
  ProfileOrder,
  ProfilePageProps,
  ProfileView,
} from './types';
import * as S from './FigmaAccountExperience.styles';

type AccountOrder = ProfileOrder | ActiveProfileOrder;

type Stage3View =
  | 'account'
  | 'orders'
  | 'addresses'
  | 'paymentMethods'
  | 'paymentMethodDetails'
  | 'coupons'
  | 'loyalty'
  | 'redeemCoupons'
  | 'help'
  | 'settings';

const currency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function initialStage3View(view: ProfileView): Stage3View {
  if (view === 'orders') return 'orders';
  if (view === 'addresses') return 'addresses';
  if (view === 'paymentMethods') return 'paymentMethods';
  if (view === 'coupons') return 'coupons';
  return 'account';
}

function orderStatus(order: AccountOrder) {
  if (order.paymentPending) return 'Pagamento pendente';
  if (order.status === 'preparing') return 'Em preparo';
  if (order.status === 'onTheWay') return 'A caminho';
  if (order.status === 'delivered') return 'Entregue';
  if (order.status === 'cancelled') return 'Cancelado';
  return 'Confirmado';
}

const ORDER_PROGRESS = [
  { id: 'confirmed', label: 'Confirmado' },
  { id: 'preparing', label: 'Em preparo' },
  { id: 'onTheWay', label: 'A caminho' },
  { id: 'delivered', label: 'Entregue' },
] as const;

function orderProgressIndex(order: AccountOrder) {
  if (order.status === 'delivered') return 3;
  if (order.status === 'onTheWay') return 2;
  if (order.status === 'preparing') return 1;
  return 0;
}

function FigmaAccountExperienceReady(props: ProfilePageProps & { data: ProfileData }) {
  const { confirmDialog } = useAppDialog();
  const {
    data,
    initialView = 'overview',
    cartCount = 0,
    paymentMethods = [],
    onGoHome,
    onOpenMenu,
    onOpenCart,
    onOpenSearch,
    onLogout,
    onSupport,
    onNewAddress,
    onSelectAddress,
    onAddPaymentMethod,
    onSelectPaymentMethod,
    onRemovePaymentMethod,
    onUseCoupon,
    onDeactivateAccount,
  } = props;

  const [view, setView] = useState<Stage3View>(() => initialStage3View(initialView));
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [ordersTab, setOrdersTab] = useState<'active' | 'history'>('active');
  const [pushEnabled, setPushEnabled] = useState(
    () => localStorage.getItem('customerPushNotifications') !== 'off',
  );
  const [emailEnabled, setEmailEnabled] = useState(
    () => localStorage.getItem('customerEmailNotifications') !== 'off',
  );
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('customerDarkMode') === 'on',
  );
  const [mfaPasswordOpen, setMfaPasswordOpen] = useState(false);
  const [mfaPassword, setMfaPassword] = useState('');
  const [mfaSaving, setMfaSaving] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [mobileLayout, setMobileLayout] = useState(() =>
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 760px)').matches
      : window.innerWidth <= 760,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      const syncLayout = () => setMobileLayout(window.innerWidth <= 760);
      syncLayout();
      window.addEventListener('resize', syncLayout);
      return () => window.removeEventListener('resize', syncLayout);
    }

    const media = window.matchMedia('(max-width: 760px)');
    const syncLayout = () => setMobileLayout(media.matches);
    syncLayout();
    media.addEventListener('change', syncLayout);
    return () => media.removeEventListener('change', syncLayout);
  }, []);

  const loyaltyClock = useLoyaltyExpirationClock(props.loyaltySummary || null);
  const coupons = useMemo(
    () => buildLoyaltyWalletEntries(props.loyaltySummary, data.brand.name, loyaltyClock),
    [data.brand.name, loyaltyClock, props.loyaltySummary],
  );
  const activeCoupons = coupons.filter((entry) => entry.status === 'available' || entry.status === 'reserved');
  const historyCoupons = coupons.filter((entry) => entry.status === 'used' || entry.status === 'expired');
  const activeOrders = data.activeOrders || (data.activeOrder ? [data.activeOrder] : []);
  const activeOrderCount = Math.max(
    activeOrders.length,
    Number(data.activeOrderCount || 0),
  );
  const savedAddressCount = (data.addresses || []).length;
  const activePaymentMethodCount = paymentMethods.length;
  const activeCouponCount = activeCoupons.length;
  const orderHistory = data.recentOrders;
  const primary = data.brand.primaryColor || '#e85a2b';
  const initials = data.user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const setPreference = (
    key: 'customerPushNotifications' | 'customerEmailNotifications' | 'customerDarkMode',
    enabled: boolean,
  ) => {
    localStorage.setItem(key, enabled ? 'on' : 'off');
  };

  const confirmAccountDeactivation = async () => {
    const confirmed = await confirmDialog({
      title: 'Desativar sua conta?',
      description:
        'Você perderá o acesso à conta até que ela seja reativada pelos fluxos disponíveis. Seus pedidos e registros necessários para a operação não serão apagados por esta ação.',
      confirmLabel: 'Desativar conta',
      cancelLabel: 'Manter minha conta',
      tone: 'danger',
    });
    if (confirmed) await onDeactivateAccount?.();
  };

  const goBack = () => {
    if (view === 'paymentMethodDetails') {
      setSelectedPaymentMethodId(null);
      setView('paymentMethods');
      return;
    }
    setView('account');
  };

  const toggleCustomerMfa = async () => {
    if (!mfaPasswordOpen) {
      setMfaPasswordOpen(true);
      setMfaError('');
      return;
    }
    if (!mfaPassword.trim()) {
      setMfaError('Digite sua senha atual para confirmar esta alteração.');
      return;
    }
    setMfaSaving(true);
    setMfaError('');
    try {
      await props.onToggleTwoFactor?.(!props.twoFactorEnabled, mfaPassword);
    } catch (error: unknown) {
      const typed = error as { response?: { data?: { error?: unknown } } };
      setMfaError(
        String(
          typed.response?.data?.error ||
            'Não foi possível atualizar a verificação em duas etapas. Confira sua senha e tente novamente.',
        ),
      );
      setMfaSaving(false);
    }
  };

  const renderOrders = (orders: AccountOrder[]) =>
    orders.length ? (
      <S.OrderList>
        {orders.map((order) => {
          const status = orderStatus(order);
          const progressIndex = orderProgressIndex(order);
          const statusClass =
            order.status === 'onTheWay'
              ? 'on-the-way'
              : order.status === 'delivered'
                ? 'delivered'
                : order.status === 'cancelled'
                  ? 'cancelled'
                  : order.paymentPending
                    ? 'payment-pending'
                    : 'preparing';
          const canTrack =
            !order.paymentPending &&
            order.channel === 'Delivery' &&
            order.status !== 'cancelled' &&
            order.status !== 'delivered';

          return (
            <S.OrderCard key={order.id}>
              <div className="order-header">
                <div className="restaurant">
                  <span className="thumb">
                    {order.image ? (
                      <img src={order.image} alt="" />
                    ) : (
                      data.brand.monogram || data.brand.name.slice(0, 1)
                    )}
                  </span>
                  <div className="restaurant-copy">
                    <b>{data.brand.name}</b>
                    <span>
                      Pedido {order.id}
                      {('date' in order && order.date) ? ' · ' + order.date : ''}
                    </span>
                  </div>
                </div>
                <span className={'status ' + statusClass}>{status}</span>
              </div>

              <div className="divider" />

              <div className="order-body">
                <p>{order.summary}</p>
                <strong>{currency(order.total)}</strong>
              </div>

              {order.status !== 'cancelled' ? (
                <div className="order-progress" aria-label={`Status do pedido: ${status}`}>
                  <div className="progress-line" aria-hidden="true">
                    {ORDER_PROGRESS.map((stage, index) => (
                      <span className="progress-segment" key={stage.id}>
                        <i className={index <= progressIndex ? 'done' : ''} />
                        {index < ORDER_PROGRESS.length - 1 ? (
                          <em className={index < progressIndex ? 'done' : ''} />
                        ) : null}
                      </span>
                    ))}
                  </div>
                  <div className="progress-labels">
                    {ORDER_PROGRESS.map((stage, index) => (
                      <span
                        key={stage.id}
                        className={index === progressIndex ? 'current' : ''}
                      >
                        {stage.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {order.paymentPending && order.publicId ? (
                <button
                  className="track-order"
                  type="button"
                  onClick={() => props.onContinuePayment?.(order.publicId!)}
                >
                  <CreditCard aria-hidden="true" />
                  <span>Continuar pagamento</span>
                </button>
              ) : canTrack ? (
                <button
                  className="track-order"
                  type="button"
                  onClick={() => props.onTrackOrder?.(order.id)}
                >
                  <MapPin aria-hidden="true" />
                  <span>Acompanhar em tempo real</span>
                </button>
              ) : null}

              <button
                className="support-order"
                type="button"
                onClick={() => props.onSupportOrder?.(order.id)}
              >
                <Headphones aria-hidden="true" />
                <span>Precisa de ajuda?</span>
              </button>
            </S.OrderCard>
          );
        })}
      </S.OrderList>
    ) : (
      <S.Empty>Nenhum pedido nesta seção.</S.Empty>
    );

  const settingsContent = (
    <S.Stack>
      <S.SectionLabel>Preferências</S.SectionLabel>
      <S.SettingsCard>
        <div className="row">
          <span>Notificações push</span>
          <S.Toggle
            $on={pushEnabled}
            type="button"
            aria-pressed={pushEnabled}
            onClick={() => {
              const next = !pushEnabled;
              setPushEnabled(next);
              setPreference('customerPushNotifications', next);
            }}
          />
        </div>
        <div className="row">
          <span>Notificações por e-mail</span>
          <S.Toggle
            $on={emailEnabled}
            type="button"
            aria-pressed={emailEnabled}
            onClick={() => {
              const next = !emailEnabled;
              setEmailEnabled(next);
              setPreference('customerEmailNotifications', next);
            }}
          />
        </div>
        <div className="row">
          <span>Modo escuro</span>
          <S.Toggle
            $on={darkMode}
            type="button"
            aria-pressed={darkMode}
            onClick={() => {
              const next = !darkMode;
              setDarkMode(next);
              setPreference('customerDarkMode', next);
            }}
          />
        </div>
      </S.SettingsCard>

      <S.SectionLabel>Segurança</S.SectionLabel>
      <S.SettingsCard>
        <div className="row security-row">
          <span className="security-copy">
            <i className="security-icon"><ShieldCheck size={18} /></i>
            <span>
              <b>Verificação em duas etapas (MFA)</b>
              <small>
                {props.twoFactorEnabled
                  ? 'Ativada. Um código adicional será solicitado ao entrar na conta.'
                  : 'Proteja sua conta exigindo um código adicional durante o login.'}
              </small>
            </span>
          </span>
          <S.Toggle
            $on={Boolean(props.twoFactorEnabled)}
            type="button"
            aria-label={props.twoFactorEnabled ? 'Desativar MFA' : 'Ativar MFA'}
            aria-pressed={Boolean(props.twoFactorEnabled)}
            disabled={mfaSaving}
            onClick={() => void toggleCustomerMfa()}
          />
        </div>
        {mfaPasswordOpen ? (
          <form
            className="mfa-confirm"
            onSubmit={(event) => {
              event.preventDefault();
              void toggleCustomerMfa();
            }}
          >
            <div className="mfa-copy">
              <b>{props.twoFactorEnabled ? 'Desativar MFA' : 'Ativar MFA'}</b>
              <span>
                Por segurança, confirme sua senha atual. Depois da alteração será necessário entrar novamente.
              </span>
            </div>
            <label>
              Senha atual
              <input
                type="password"
                autoComplete="current-password"
                maxLength={128}
                value={mfaPassword}
                disabled={mfaSaving}
                aria-invalid={Boolean(mfaError)}
                onChange={(event) => {
                  setMfaPassword(event.target.value);
                  if (mfaError) setMfaError('');
                }}
                autoFocus
              />
            </label>
            {mfaError ? <div className="mfa-error" role="alert">{mfaError}</div> : null}
            <div className="mfa-actions">
              <button
                className="secondary"
                type="button"
                disabled={mfaSaving}
                onClick={() => {
                  setMfaPasswordOpen(false);
                  setMfaPassword('');
                  setMfaError('');
                }}
              >
                Cancelar
              </button>
              <button className="primary" type="submit" disabled={mfaSaving}>
                {mfaSaving ? 'Atualizando...' : props.twoFactorEnabled ? 'Confirmar desativação' : 'Confirmar ativação'}
              </button>
            </div>
          </form>
        ) : null}
      </S.SettingsCard>

      <S.SectionLabel>Sobre</S.SectionLabel>
      <S.SettingsCard>
        <div className="row">
          <a href="/termos/" className="link">Termos de uso <ChevronRight size={16} /></a>
        </div>
        <div className="row">
          <a href="/privacidade/" className="link">Política de privacidade <ChevronRight size={16} /></a>
        </div>
        <div className="row">
          <a href="/cookies/" className="link">Cookies <ChevronRight size={16} /></a>
        </div>
      </S.SettingsCard>

      <S.SectionLabel>Conta</S.SectionLabel>
      <S.SettingsCard>
        <div className="row danger">
          <button
            className="link"
            type="button"
            onClick={() => void confirmAccountDeactivation()}
          >
            Desativar minha conta <AlertTriangle size={17} />
          </button>
        </div>
      </S.SettingsCard>

      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        GastroNexa
      </div>
    </S.Stack>
  );

  const helpContent = (
    <S.Stack>
      <S.SectionLabel>Fale Conosco</S.SectionLabel>
      <S.HelpGrid>
        {data.brand.email ? (
          <a href={`mailto:${data.brand.email}`}>
            <Mail />
            <b>E-mail</b>
            <span>{data.brand.email}</span>
          </a>
        ) : null}
        <button type="button" onClick={onSupport}>
          <Headphones />
          <b>Suporte Geral</b>
          <span>Abra um atendimento sobre seus pedidos.</span>
        </button>
      </S.HelpGrid>

      <S.SectionLabel>Perguntas Frequentes</S.SectionLabel>
      <S.Faq>
        <details>
          <summary>Como posso rastrear meu pedido?</summary>
          <p>Abra “Meus pedidos” e use “Acompanhar” em um pedido ativo.</p>
        </details>
        <details>
          <summary>Como solicitar ajuda com um pedido?</summary>
          <p>Use o canal de suporte para selecionar o pedido e abrir o atendimento.</p>
        </details>
        <details>
          <summary>Como altero meu endereço de entrega?</summary>
          <p>Abra “Endereços salvos” e escolha ou cadastre um novo endereço.</p>
        </details>
      </S.Faq>
    </S.Stack>
  );

  const pageContent = () => {
    if (view === 'orders') {
      return (
        <S.OrdersView>
          <S.Tabs>
            <button className={ordersTab === 'active' ? 'active' : ''} type="button" onClick={() => setOrdersTab('active')}>
              Ativos{activeOrderCount ? ` (${activeOrderCount})` : ''}
            </button>
            <button className={ordersTab === 'history' ? 'active' : ''} type="button" onClick={() => setOrdersTab('history')}>
              <span className="mobile-label">Histórico</span>
              <span className="desktop-label">Histórico de Pedidos</span>
            </button>
          </S.Tabs>
          {ordersTab === 'active' ? renderOrders(activeOrders) : renderOrders(orderHistory)}
        </S.OrdersView>
      );
    }

    if (view === 'addresses') {
      return (
        <S.Stack>
          {(data.addresses || []).map((address) => (
            <S.ItemCard key={address.id}>
              <span className="icon"><MapPin /></span>
              <div className="copy">
                <b>{address.label}</b>
                <span>{address.address}{address.complement ? ` · ${address.complement}` : ''}</span>
                <span>{[address.district, address.city, address.state].filter(Boolean).join(', ')}</span>
                {address.isDefault ? <span className="default">Padrão</span> : null}
              </div>
              {!address.isDefault ? (
                <div className="actions">
                  <button type="button" onClick={() => void onSelectAddress?.(address.id)}>Usar</button>
                </div>
              ) : null}
            </S.ItemCard>
          ))}
          {!(data.addresses || []).length ? <S.Empty>Nenhum endereço salvo.</S.Empty> : null}
          <S.AddButton type="button" onClick={onNewAddress}>+ Adicionar novo endereço</S.AddButton>
        </S.Stack>
      );
    }

    if (view === 'paymentMethods') {
      return (
        <S.SavedPaymentsList aria-label="Cartões salvos">
          <div className="saved-card-list">
            {paymentMethods.map((method) => {
              const brand = getCardBrandDetails(method.brand);
              return (
                <button
                  key={method.publicId}
                  type="button"
                  className="saved-card-row"
                  aria-label={`Ver detalhes do cartão final ${method.last4}`}
                  onClick={() => {
                    setSelectedPaymentMethodId(method.publicId);
                    setView('paymentMethodDetails');
                  }}
                >
                  <span className="brand-box" aria-hidden="true">
                    <CardBrandLogo brand={brand.id} />
                  </span>
                  <span className="saved-card-copy">
                    <span className="brand-line">
                      <strong>{brand.label}</strong>
                      {method.isDefault ? <em>Principal</em> : null}
                    </span>
                    <span className="masked-number">•••• •••• •••• {method.last4}</span>
                  </span>
                  <ChevronRight className="row-chevron" aria-hidden="true" />
                </button>
              );
            })}
            {!paymentMethods.length ? (
              <S.Empty>Nenhum cartão salvo. Adicione um cartão para começar.</S.Empty>
            ) : null}
          </div>

          <div className="saved-card-actions">
            <p>Gerencie seus métodos de pagamento favoritos.</p>
            <button type="button" className="add-saved-card" onClick={onAddPaymentMethod}>
              <Plus />
              Adicionar novo cartão
            </button>
          </div>
        </S.SavedPaymentsList>
      );
    }

    if (view === 'paymentMethodDetails') {
      const method = paymentMethods.find((item) => item.publicId === selectedPaymentMethodId);
      if (!method) {
        return (
          <S.Empty>
            Este cartão não está mais disponível.
          </S.Empty>
        );
      }

      const brand = getCardBrandDetails(method.brand);
      const holder = method.holderName || data.user.fullName || data.user.firstName || 'Titular do cartão';
      const expiry = `${String(method.expMonth).padStart(2, '0')}/${String(method.expYear).slice(-2)}`;
      const addedAt = method.createdAt
        ? (() => {
            const date = new Date(method.createdAt);
            if (Number.isNaN(date.getTime())) return 'Data não informada';
            const months = [
              'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
              'jul', 'ago', 'set', 'out', 'nov', 'dez',
            ];
            return `${String(date.getUTCDate()).padStart(2, '0')} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
          })()
        : 'Data não informada';

      return (
        <S.SavedPaymentDetails aria-label="Detalhes do cartão salvo">
          <div className="details-grid">
            <div className="visual-side">
              <PaymentCardVisual
                compact
                brand={brand.id}
                numberLabel={`•••• •••• •••• ${method.last4}`}
                holderName={holder}
                expiryLabel={expiry}
              />
              <p className="protected">
                <ShieldCheck />
                <span>Dados protegidos com criptografia</span>
              </p>
            </div>

            <div className="info-side">
              {method.isDefault ? (
                <div className="primary-badge">
                  <CircleCheck />
                  <span>Método de pagamento principal</span>
                </div>
              ) : null}

              <dl>
                <div><dt>Bandeira</dt><dd>{brand.label}</dd></div>
                <div><dt>Últimos dígitos</dt><dd>{method.last4}</dd></div>
                <div><dt>Titular do Cartão</dt><dd>{holder}</dd></div>
                <div><dt>Validade</dt><dd>{expiry}</dd></div>
                <div><dt>Adicionado em</dt><dd>{addedAt}</dd></div>
              </dl>
            </div>
          </div>

          <div className="detail-actions">
            <button
              type="button"
              className="remove"
              onClick={async () => {
                await onRemovePaymentMethod?.(method.publicId);
                setSelectedPaymentMethodId(null);
                setView('paymentMethods');
              }}
            >
              <Trash2 />
              Remover cartão
            </button>
            <button
              type="button"
              className="primary"
              disabled={method.isDefault}
              onClick={() => void onSelectPaymentMethod?.(method.publicId)}
            >
              Definir como principal
            </button>
          </div>
        </S.SavedPaymentDetails>
      );
    }

    if (view === 'coupons') {
      if (props.loyaltyLoading) return <S.Empty>Carregando seus cupons...</S.Empty>;
      if (props.loyaltyError) return <S.Empty>{props.loyaltyError}</S.Empty>;
      return (
        <S.Stack>
          {[...activeCoupons, ...historyCoupons].map((entry) => {
            const muted = entry.status === 'expired' || entry.status === 'used';
            return (
              <S.Coupon key={entry.id} $muted={muted}>
                <div className="top">
                  <code>{entry.code}</code>
                  <span className="state">
                    {entry.status === 'available'
                      ? 'Disponível'
                      : entry.status === 'reserved'
                        ? 'Em uso'
                        : entry.status === 'used'
                          ? 'Utilizado'
                          : 'Expirado'}
                  </span>
                </div>
                <h3>{entry.title}</h3>
                <span className="discount">{entry.discountLabel}</span>
                {entry.description ? <p>{entry.description}</p> : null}
                <small>
                  {entry.minimumSubtotal > 0
                    ? `Pedido mínimo de ${currency(entry.minimumSubtotal)}`
                    : 'Sem pedido mínimo'}
                </small>
                {!muted ? (
                  <button
                    type="button"
                    disabled={entry.status === 'reserved'}
                    onClick={() => onUseCoupon?.(entry.id)}
                  >
                    {entry.status === 'reserved' ? 'Cupom aplicado' : 'Usar Cupom'}
                  </button>
                ) : null}
              </S.Coupon>
            );
          })}
          {!coupons.length ? <S.Empty>Nenhum cupom disponível no momento.</S.Empty> : null}
        </S.Stack>
      );
    }

    if (view === 'loyalty') {
      return (
        <FigmaLoyaltyProgram
          summary={props.loyaltySummary || null}
          loading={props.loyaltyLoading}
          error={props.loyaltyError}
          recentOrders={data.recentOrders}
          redeemingCouponId={props.loyaltyRedeemingCouponId}
          onRetry={props.onRetryLoyalty}
          onRedeem={async (couponId) => {
            await props.onRedeemLoyaltyCoupon?.(couponId);
          }}
          onOpenCoupons={() => setView('redeemCoupons')}
        />
      );
    }

    if (view === 'redeemCoupons') {
      return (
        <FigmaCouponRedemption
          summary={props.loyaltySummary || null}
          loading={props.loyaltyLoading}
          error={props.loyaltyError}
          redeemingCouponId={props.loyaltyRedeemingCouponId}
          onRetry={props.onRetryLoyalty}
          onRedeem={async (couponId) => {
            await props.onRedeemLoyaltyCoupon?.(couponId);
          }}
          onUseCoupon={onUseCoupon}
        />
      );
    }

    if (view === 'help') return helpContent;
    if (view === 'settings') return settingsContent;
    return null;
  };

  const menu = (
    <>
      <S.ProfileCard>
        <button
          className="avatar avatar-button"
          type="button"
          aria-label="Alterar foto de perfil"
          disabled={avatarUploading || !props.onUploadAvatar}
          onClick={() => avatarInputRef.current?.click()}
        >
          {data.user.avatarUrl ? <img src={data.user.avatarUrl} alt={data.user.fullName} /> : initials}
          <span className="avatar-edit" aria-hidden="true">
            <Camera />
          </span>
          {avatarUploading ? <span className="avatar-loading">Salvando...</span> : null}
        </button>
        <input
          ref={avatarInputRef}
          className="avatar-input"
          type="file"
          accept="image/*"
          aria-label="Selecionar nova foto de perfil"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file || !props.onUploadAvatar) return;
            setAvatarUploading(true);
            void props
              .onUploadAvatar(file)
              .finally(() => setAvatarUploading(false));
          }}
        />
        <div className="copy">
          <b>{data.user.fullName}</b>
          <span className="mobile-contact">{data.user.phone || data.user.email}</span>
          <span className="desktop-contact">
            {[data.user.phone, data.user.email].filter(Boolean).join(' · ')}
          </span>
        </div>
      </S.ProfileCard>

      <S.MenuCard>
        <button type="button" onClick={() => setView('orders')}>
          <ShoppingBag /><span>Meus pedidos</span>
          <span className="badge">
            {activeOrderCount} {activeOrderCount === 1 ? 'ativo' : 'ativos'}
          </span>
          <ChevronRight className="chev" />
        </button>
        <button type="button" onClick={() => setView('addresses')}>
          <MapPin /><span>Endereços salvos</span>
          <span className="badge">
            {savedAddressCount} {savedAddressCount === 1 ? 'ativo' : 'ativos'}
          </span>
          <ChevronRight className="chev" />
        </button>
        <button type="button" onClick={() => setView('paymentMethods')}>
          <WalletCards /><span>Métodos de pagamento</span>
          <span className="badge">
            {activePaymentMethodCount} {activePaymentMethodCount === 1 ? 'ativo' : 'ativos'}
          </span>
          <ChevronRight className="chev" />
        </button>
        <button type="button" onClick={() => setView('coupons')}>
          <TicketPercent /><span>Meus Cupons</span>
          <span className="badge">
            {activeCouponCount} {activeCouponCount === 1 ? 'ativo' : 'ativos'}
          </span>
          <ChevronRight className="chev" />
        </button>
        <button type="button" onClick={() => setView('loyalty')}>
          <Star /><span>Programa de Fidelidade</span><ChevronRight className="chev" />
        </button>
        <button type="button" onClick={() => setView('help')}>
          <CircleHelp /><span>Ajuda e suporte</span><ChevronRight className="chev" />
        </button>
        <button type="button" onClick={() => setView('settings')}>
          <Settings /><span>Configurações</span><ChevronRight className="chev" />
        </button>
      </S.MenuCard>

      <S.Logout type="button" onClick={onLogout}>Sair da conta</S.Logout>
    </>
  );

  const title =
    view === 'account'
      ? 'Minha conta'
      : view === 'orders'
        ? 'Meus Pedidos'
        : view === 'addresses'
          ? 'Endereços Salvos'
          : view === 'paymentMethods'
            ? 'Cartões Salvos'
            : view === 'paymentMethodDetails'
              ? 'Detalhes do Cartão'
            : view === 'coupons'
              ? 'Meus Cupons'
              : view === 'loyalty'
                ? 'Programa de Fidelidade'
                : view === 'redeemCoupons'
                  ? 'Cupons de Resgate'
                  : view === 'help'
                ? 'Fale Conosco'
                : 'Configurações';

  return (
    <S.Root $primary={primary} $dark={darkMode}>
      <S.Header>
        <button
          className="brand"
          type="button"
          aria-label={`Ir para a página inicial de ${data.brand.name}`}
          onClick={onGoHome}
        >
          <span className="logo">{data.brand.logoUrl ? <img src={data.brand.logoUrl} alt="" /> : data.brand.monogram || data.brand.name.slice(0, 1)}</span>
          <span className="brand-copy">
            <b>{data.brand.name}</b>
            {data.brand.status ? (
              <span className="status">
                <i className={/fechado/i.test(data.brand.status) ? 'closed' : 'open'} />
                {data.brand.status}
              </span>
            ) : null}
          </span>
        </button>
        <div className="actions">
          <button
            className="search"
            type="button"
            aria-label="Buscar"
            onClick={onOpenSearch}
          >
            Buscar
          </button>
          <button className="account" type="button" onClick={() => setView('account')}>
            <UserRound size={20} /> Olá, {data.user.firstName || data.user.fullName}
          </button>
          <button
            className="cart"
            type="button"
            aria-label={`Sacola com ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
            onClick={onOpenCart}
          >
            <ShoppingBag size={18} /> Meu Carrinho
            {cartCount > 0 ? <i>{cartCount}</i> : null}
          </button>
        </div>
      </S.Header>

      {mobileLayout ? (
      <S.Mobile className={view === 'orders' ? 'orders-view' : ''}>
        {view === 'account' ? (
          <S.Stack>
            <S.PageTitle>
              <button
                className="back"
                type="button"
                aria-label="Voltar para o restaurante"
                onClick={onGoHome}
              >
                <ArrowLeft />
              </button>
              <h1>{title}</h1>
            </S.PageTitle>
            {menu}
          </S.Stack>
        ) : (
          <S.Stack>
            <S.PageTitle className={view === 'orders' ? 'orders-page-title' : ''}>
              <button className="back" type="button" aria-label="Voltar para minha conta" onClick={goBack}><ArrowLeft /></button>
              <h1>{title}</h1>
            </S.PageTitle>
            {pageContent()}
          </S.Stack>
        )}
        <S.MobileHomeIndicator />
      </S.Mobile>
      ) : (
      <S.Desktop>
        <S.Center
          className={view === 'orders' ? 'orders-center' : ''}
          $wide={
            view === 'orders' ||
            view === 'coupons' ||
            view === 'loyalty' ||
            view === 'redeemCoupons' ||
            view === 'help'
          }
        >
          <S.PageTitle className={view === 'orders' ? 'orders-page-title' : ''}>
            <button
              className="back"
              type="button"
              aria-label={view === 'account' ? 'Voltar para o restaurante' : 'Voltar para minha conta'}
              onClick={view === 'account' ? onGoHome : goBack}
            >
              <ArrowLeft />
            </button>
            <h1>{title}</h1>
          </S.PageTitle>
          {view === 'account' ? menu : pageContent()}
        </S.Center>
      </S.Desktop>
      )}

      <CustomerDesktopFooter
        restaurantName={data.brand.name}
        restaurantLogoUrl={data.brand.logoUrl}
        description={data.brand.description}
        primaryColor={primary}
        phone={data.brand.phone}
        email={data.brand.email}
        onMenu={onOpenMenu}
        onCoupons={() => setView('coupons')}
        onHelp={() => setView('help')}
        onSupport={onSupport}
      />
    </S.Root>
  );
}


export function FigmaAccountExperience(props: ProfilePageProps) {
  if (!props.data) return null;
  return <FigmaAccountExperienceReady {...props} data={props.data} />;
}
