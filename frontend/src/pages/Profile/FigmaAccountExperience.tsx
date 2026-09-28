import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  Settings,
  ShoppingBag,
  Star,
  TicketPercent,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { buildLoyaltyWalletEntries } from './domain/loyaltyWallet';
import { FigmaCouponRedemption, FigmaLoyaltyProgram } from './FigmaLoyaltyViews';
import { useLoyaltyExpirationClock } from '../Home/hooks/useLoyaltyExpirationClock';
import { buildWhatsAppUrl } from '../Home/domain/publicSettings';
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

function orderAction(
  order: AccountOrder,
  props: Pick<ProfilePageProps, 'onContinuePayment' | 'onViewOrder' | 'onReorder'>,
) {
  if (order.paymentPending && order.publicId) {
    return (
      <button type="button" onClick={() => props.onContinuePayment?.(order.publicId!)}>
        Continuar pagamento
      </button>
    );
  }
  if (order.status === 'delivered') {
    return (
      <button type="button" onClick={() => props.onReorder?.(order.id)}>
        Pedir novamente
      </button>
    );
  }
  if (order.status !== 'cancelled') {
    return (
      <button type="button" onClick={() => props.onViewOrder?.(order.id)}>
        Acompanhar
      </button>
    );
  }
  return null;
}

function FigmaAccountExperienceReady(props: ProfilePageProps & { data: ProfileData }) {
  const {
    data,
    initialView = 'overview',
    cartCount = 0,
    paymentMethods = [],
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

  const loyaltyClock = useLoyaltyExpirationClock(props.loyaltySummary || null);
  const coupons = useMemo(
    () => buildLoyaltyWalletEntries(props.loyaltySummary, data.brand.name, loyaltyClock),
    [data.brand.name, loyaltyClock, props.loyaltySummary],
  );
  const activeCoupons = coupons.filter((entry) => entry.status === 'available' || entry.status === 'reserved');
  const historyCoupons = coupons.filter((entry) => entry.status === 'used' || entry.status === 'expired');
  const activeOrders = data.activeOrder ? [data.activeOrder] : [];
  const orderHistory = data.recentOrders;
  const whatsappUrl = buildWhatsAppUrl(data.brand.whatsapp || data.brand.phone);
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

  const goBack = () => setView('account');

  const renderOrders = (orders: AccountOrder[]) =>
    orders.length ? (
      <S.Stack>
        {orders.map((order) => (
          <S.OrderCard key={order.id}>
            <div className="top">
              <div className="meta">
                <b>Pedido {order.id}</b>
                <span>{('date' in order ? order.date : '') || order.channel || 'Pedido'}</span>
              </div>
              <span className="status">{orderStatus(order)}</span>
            </div>
            <p>{order.summary}</p>
            <div className="bottom">
              <strong>{currency(order.total)}</strong>
              {orderAction(order, props)}
            </div>
          </S.OrderCard>
        ))}
      </S.Stack>
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

      <S.SectionLabel>Sobre</S.SectionLabel>
      <S.SettingsCard>
        <div className="row">
          <a href="/termos/" className="link">Termos de uso <ChevronRight size={16} /></a>
        </div>
        <div className="row">
          <a href="/privacidade/" className="link">Política de privacidade <ChevronRight size={16} /></a>
        </div>
      </S.SettingsCard>

      <S.SectionLabel>Conta</S.SectionLabel>
      <S.SettingsCard>
        <div className="row danger">
          <button
            className="link"
            type="button"
            onClick={() => {
              if (window.confirm('Deseja realmente desativar sua conta?')) {
                void onDeactivateAccount?.();
              }
            }}
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
        {whatsappUrl ? (
          <a href={whatsappUrl} target="_blank" rel="noreferrer">
            <MessageCircle />
            <b>WhatsApp</b>
            <span>Fale diretamente com o restaurante.</span>
          </a>
        ) : null}
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
        <S.Stack>
          <S.Tabs>
            <button className={ordersTab === 'active' ? 'active' : ''} type="button" onClick={() => setOrdersTab('active')}>
              Ativos{activeOrders.length ? ` (${activeOrders.length})` : ''}
            </button>
            <button className={ordersTab === 'history' ? 'active' : ''} type="button" onClick={() => setOrdersTab('history')}>
              Histórico
            </button>
          </S.Tabs>
          {ordersTab === 'active' ? renderOrders(activeOrders) : renderOrders(orderHistory)}
        </S.Stack>
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
        <S.Stack>
          {paymentMethods.map((method) => (
            <S.ItemCard key={method.publicId}>
              <span className="icon"><CreditCard /></span>
              <div className="copy">
                <b>{method.brand} ···· {method.last4}</b>
                <span>Crédito · Expira em {String(method.expMonth).padStart(2, '0')}/{String(method.expYear).slice(-2)}</span>
                {method.isDefault ? <span className="default">Padrão</span> : null}
              </div>
              <div className="actions">
                {!method.isDefault ? (
                  <button type="button" onClick={() => void onSelectPaymentMethod?.(method.publicId)}>Usar</button>
                ) : null}
                <button type="button" onClick={() => void onRemovePaymentMethod?.(method.publicId)}>Remover</button>
              </div>
            </S.ItemCard>
          ))}
          {!paymentMethods.length ? <S.Empty>Nenhum método de pagamento salvo.</S.Empty> : null}
          <S.AddButton type="button" onClick={onAddPaymentMethod}>+ Adicionar método de pagamento</S.AddButton>
        </S.Stack>
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
        <span className="avatar">
          {data.user.avatarUrl ? <img src={data.user.avatarUrl} alt={data.user.fullName} /> : initials}
        </span>
        <div className="copy">
          <b>{data.user.fullName}</b>
          <span>{data.user.phone || data.user.email}</span>
        </div>
      </S.ProfileCard>

      <S.MenuCard>
        <button type="button" onClick={() => setView('orders')}>
          <ShoppingBag /><span>Meus pedidos</span>
          {activeOrders.length ? <span className="badge">{activeOrders.length} ativos</span> : null}
          <ChevronRight className="chev" />
        </button>
        <button type="button" onClick={() => setView('addresses')}>
          <MapPin /><span>Endereços salvos</span><ChevronRight className="chev" />
        </button>
        <button type="button" onClick={() => setView('paymentMethods')}>
          <WalletCards /><span>Métodos de pagamento</span><ChevronRight className="chev" />
        </button>
        <button type="button" onClick={() => setView('coupons')}>
          <TicketPercent /><span>Meus Cupons</span><ChevronRight className="chev" />
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
            ? 'Métodos de Pagamento'
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
        <div className="brand">
          <span className="logo">{data.brand.logoUrl ? <img src={data.brand.logoUrl} alt="" /> : data.brand.monogram || data.brand.name.slice(0, 1)}</span>
          <div className="brand-copy">
            <b>{data.brand.name}</b>
            {data.brand.status ? <span className="status"><i /> {data.brand.status}</span> : null}
          </div>
        </div>
        <button className="search" type="button" aria-label="Buscar" onClick={onOpenSearch}>
          <Search size={16} /> Buscar no cardápio...
        </button>
        <div className="actions">
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

      <S.Mobile>
        {view === 'account' ? (
          <S.Stack>
            <S.PageTitle><h1>{title}</h1></S.PageTitle>
            {menu}
          </S.Stack>
        ) : (
          <S.Stack>
            <S.PageTitle>
              <button className="back" type="button" aria-label="Voltar para minha conta" onClick={goBack}><ArrowLeft /></button>
              <h1>{title}</h1>
            </S.PageTitle>
            {pageContent()}
          </S.Stack>
        )}
        <S.MobileHomeIndicator />
      </S.Mobile>

      <S.Desktop>
        <S.Center
          $wide={
            view === 'orders' ||
            view === 'coupons' ||
            view === 'loyalty' ||
            view === 'redeemCoupons' ||
            view === 'help'
          }
        >
          <S.PageTitle>
            {view !== 'account' ? (
              <button className="back" type="button" aria-label="Voltar para minha conta" onClick={goBack}><ArrowLeft /></button>
            ) : null}
            <h1>{title}</h1>
          </S.PageTitle>
          {view === 'account' ? menu : pageContent()}
        </S.Center>
      </S.Desktop>

      <S.Footer>
        <div className="inner">
          <div>
            <div className="brand">{data.brand.name}</div>
            {data.brand.address ? <p>{data.brand.address}</p> : null}
          </div>
          <div><h3>Nossos Links</h3><p><button type="button" onClick={onOpenMenu}>Cardápio</button></p></div>
          <div><h3>Suporte</h3><p><button type="button" onClick={() => setView('help')}>Central de Ajuda</button></p></div>
          <div><h3>Sua Loja Segura</h3><p>Operação vinculada ao restaurante ativo desta conta.</p></div>
        </div>
        <div className="bottom"><span>© {new Date().getFullYear()} {data.brand.name}.</span><span>Privacidade · Cookies</span></div>
      </S.Footer>
    </S.Root>
  );
}


export function FigmaAccountExperience(props: ProfilePageProps) {
  if (!props.data) return null;
  return <FigmaAccountExperienceReady {...props} data={props.data} />;
}
