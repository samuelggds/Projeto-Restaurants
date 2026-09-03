import {
  Bike,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  Grid2X2,
  Heart,
  Headphones,
  KeyRound,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  RotateCcw,
  ShoppingBag,
  ShieldCheck,
  TicketPercent,
  Trash2,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  evaluatePassword,
  PasswordRequirements,
  STANDARD_PASSWORD_POLICY,
} from '../../features/password-policy';
import { ProfileHeader } from './components/ProfileHeader';
import { ProfileNavigation } from './components/ProfileNavigation';
import { LoyaltyWallet } from './components/LoyaltyWallet';
import { profileTabs as tabs } from './config/profileTabs';
import { profileMockData } from './data';
import { getCardBrandDetails } from './domain/cardBrand';
import { CardBrandLogo } from './components/CardBrandLogo';
import * as S from './Profile.styles';
import type { ProfileOrder, ProfileOrderStatus, ProfilePageProps, ProfileView } from './types';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const ORDER_LIST_BATCH_SIZE = 10;
const rank: Record<ProfileOrderStatus, number> = {
  confirmed: 0,
  preparing: 1,
  onTheWay: 2,
  delivered: 3,
  cancelled: 0,
};
const statusLabel: Record<ProfileOrderStatus, string> = {
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  onTheWay: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

function OrderAction({
  order,
  onReorder,
  onViewOrder,
}: Pick<ProfilePageProps, 'onReorder' | 'onViewOrder'> & {
  order: ProfileOrder;
}) {
  if (order.status === 'delivered') {
    return (
      <button type="button" onClick={() => onReorder?.(order.id)}>
        Pedir novamente
      </button>
    );
  }

  if (order.status !== 'cancelled') {
    return (
      <button type="button" onClick={() => onViewOrder?.(order.id)}>
        Acompanhar
      </button>
    );
  }

  return null;
}
const trackingSteps = [
  { label: 'Confirmado', icon: CheckCircle2 },
  { label: 'Em preparo', icon: ChefHat },
  { label: 'Saiu para entrega', icon: Bike },
  { label: 'Entregue', icon: PackageCheck },
] as const;
const profileTabIcons = {
  overview: Grid2X2,
  orders: ShoppingBag,
  coupons: TicketPercent,
  addresses: MapPin,
  paymentMethods: CreditCard,
  favorites: Heart,
  personalData: UserRound,
  security: ShieldCheck,
};
export function ProfilePage(props: ProfilePageProps) {
  const {
    data = profileMockData,
    initialView = 'overview',
    cartCount = 2,
    onGoHome,
    onOpenMenu,
    onOpenCart,
    onOpenSearch,
    onLogout,
  } = props;
  const [view, setView] = useState<ProfileView>(initialView);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const mobileNavigationRef = useRef<HTMLElement>(null);
  const mobileNavigationTriggerRef = useRef<HTMLButtonElement>(null);
  const { brand, user } = data;
  const activeTabLabel = tabs.find(([id]) => id === view)?.[1] ?? 'Visão geral';
  const ActiveTabIcon = profileTabIcons[view];

  useEffect(() => {
    if (!mobileNavigationOpen) return undefined;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!mobileNavigationRef.current?.contains(event.target as Node)) {
        setMobileNavigationOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileNavigationOpen(false);
      mobileNavigationTriggerRef.current?.focus();
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileNavigationOpen]);

  const selectView = (nextView: ProfileView, restoreMobileFocus = false) => {
    setView(nextView);
    setMobileNavigationOpen(false);
    if (restoreMobileFocus) {
      window.requestAnimationFrame(() => mobileNavigationTriggerRef.current?.focus());
    }
  };

  return (
    <S.Root $primary={brand.primaryColor ?? '#d64d08'}>
      <ProfileHeader
        brand={brand}
        user={user}
        cartCount={cartCount}
        onGoHome={onGoHome}
        onOpenMenu={onOpenMenu}
        onOpenCart={onOpenCart}
        onOpenSearch={onOpenSearch}
        onLogout={onLogout}
      />
      <S.Page>
        <S.ProfileIntro>
          <div>
            <span>Minha conta</span>
            <h1>
              Olá, <em>{user.firstName}</em>
            </h1>
          </div>
          <S.ProfileSummary aria-label="Resumo da conta">
            <div>
              <strong>{data.recentOrders.length}</strong>
              <span>pedidos recentes</span>
            </div>
            <div>
              <strong>{user.favoriteCount}</strong>
              <span>favoritos</span>
            </div>
            <div>
              <strong>{data.addresses?.length ?? 0}</strong>
              <span>endereços</span>
            </div>
          </S.ProfileSummary>
        </S.ProfileIntro>
        <S.MobileTabs ref={mobileNavigationRef} aria-label="Navegação móvel do perfil">
          <button
            ref={mobileNavigationTriggerRef}
            type="button"
            className="mobile-tabs-trigger"
            aria-haspopup="menu"
            aria-expanded={mobileNavigationOpen}
            aria-controls="profile-mobile-sections"
            aria-current="page"
            onClick={() => setMobileNavigationOpen((open) => !open)}
          >
            <span className="current-icon">
              <ActiveTabIcon aria-hidden="true" />
            </span>
            <span className="current-copy">
              <small>Seção atual</small>
              <strong>{activeTabLabel}</strong>
            </span>
            <ChevronDown
              className="current-chevron"
              data-open={mobileNavigationOpen ? 'true' : 'false'}
              aria-hidden="true"
            />
          </button>
          {mobileNavigationOpen && (
            <div id="profile-mobile-sections" className="mobile-tabs-menu" role="menu">
              {tabs.map(([id, label]) => {
                const Icon = profileTabIcons[id];
                return (
                  <button
                    key={id}
                    type="button"
                    role="menuitem"
                    className={view === id ? 'active' : ''}
                    aria-current={view === id ? 'page' : undefined}
                    onClick={() => selectView(id, true)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </S.MobileTabs>
        <S.Layout>
          <ProfileNavigation
            view={view}
            setView={selectView}
            data={data}
            onLogout={onLogout}
            onUploadAvatar={props.onUploadAvatar}
          />
          <S.Main>
            <S.ViewTransition key={view}>
              {view === 'overview' && (
                <Overview
                  {...props}
                  onViewAllOrders={() => selectView('orders')}
                  onOpenFavorites={() => selectView('favorites')}
                  onOpenCoupons={() => selectView('coupons')}
                  onEditPayment={() => selectView('paymentMethods')}
                  data={data}
                />
              )}
              {view === 'orders' && <Orders {...props} data={data} />}
              {view === 'coupons' && (
                <LoyaltyWallet
                  summary={props.loyaltySummary}
                  restaurantName={brand.name}
                  loading={props.loyaltyLoading}
                  error={props.loyaltyError}
                  onRetry={props.onRetryLoyalty}
                  onUseCoupon={props.onUseCoupon}
                />
              )}
              {view === 'addresses' && <Addresses {...props} data={data} />}
              {view === 'paymentMethods' && <PaymentMethods {...props} />}
              {view === 'favorites' && <Favorites {...props} data={data} />}
              {view === 'personalData' && <PersonalData {...props} data={data} />}
              {view === 'security' && <Security {...props} />}
            </S.ViewTransition>
          </S.Main>
        </S.Layout>
      </S.Page>
    </S.Root>
  );
}

function PaymentMethods({
  paymentMethods = [],
  onAddPaymentMethod,
  onSelectPaymentMethod,
  onRemovePaymentMethod,
}: ProfilePageProps) {
  return (
    <>
      <S.ViewHeader>
        <div>
          <h2>Meus cartões</h2>
          <p>Escolha o cartão principal usado para pagamentos rápidos e seguros.</p>
        </div>
        <button type="button" onClick={onAddPaymentMethod}>
          <Plus size={17} /> Adicionar cartão
        </button>
      </S.ViewHeader>
      <S.PaymentMethodGrid>
        {paymentMethods.map((method) => {
          const brand = getCardBrandDetails(method.brand);
          return (
            <S.SavedCard key={method.publicId} $default={method.isDefault} $brand={brand.id}>
              <header>
                <span className="saved-card-chip" aria-hidden="true" />
                <span className="saved-card-brand">
                  {method.isDefault && <b>Principal</b>}
                  <CardBrandLogo brand={brand.id} />
                </span>
              </header>
              <strong>•••• •••• •••• {method.last4}</strong>
              <div className="saved-card-details">
                <span>
                  <small>Titular</small>
                  <b>{method.holderName || 'Cartão salvo'}</b>
                </span>
                <span>
                  <small>Validade</small>
                  <b>
                    {String(method.expMonth).padStart(2, '0')}/{String(method.expYear).slice(-2)}
                  </b>
                </span>
              </div>
              <footer>
                {!method.isDefault && (
                  <button
                    type="button"
                    aria-label={`Usar cartão final ${method.last4} como principal`}
                    onClick={() => onSelectPaymentMethod?.(method.publicId)}
                  >
                    Usar como principal
                  </button>
                )}
                <button
                  type="button"
                  className="danger"
                  aria-label={`Remover cartão final ${method.last4}`}
                  onClick={() => onRemovePaymentMethod?.(method.publicId)}
                >
                  <Trash2 size={15} /> Remover
                </button>
              </footer>
            </S.SavedCard>
          );
        })}
        {!paymentMethods.length && (
          <S.Empty>
            Nenhum cartão cadastrado. Adicione um cartão para pagar sem digitar os dados a cada
            pedido.
          </S.Empty>
        )}
      </S.PaymentMethodGrid>
      <S.PaymentProtection>
        <ShieldCheck />{' '}
        <span>
          <b>Pagamento protegido</b>O provedor de pagamento protege os dados sensíveis. Este site
          armazena somente o token seguro e os quatro últimos dígitos.
        </span>
      </S.PaymentProtection>
    </>
  );
}

function Overview(props: ProfilePageProps) {
  const {
    data = profileMockData,
    onTrackOrder,
    onViewOrder,
    onReorder,
    onViewAllOrders,
    onNewAddress,
    onEditPayment,
    onOpenFavorites,
    onOpenCoupons,
    onSupport,
    onOpenMenu,
  } = props;
  const { brand, user, activeOrder, recentOrders } = data;
  const step = activeOrder ? rank[activeOrder.status] : 0;
  return (
    <>
      {activeOrder ? (
        <S.Active>
          <div className="active-content">
            <S.Heading>
              <div>
                <small>Pedido {activeOrder.id}</small>
                <h2>Pedido em andamento</h2>
              </div>
              <S.Status>
                <Package size={17} />
                {statusLabel[activeOrder.status]}
              </S.Status>
            </S.Heading>
            <S.Tracking aria-label="Progresso do pedido">
              {trackingSteps.map(({ label, icon: Icon }, index) => (
                <S.Step
                  key={label}
                  $done={index < step}
                  $active={index === step}
                  aria-current={index === step ? 'step' : undefined}
                  aria-label={`${label}: ${index < step ? 'concluído' : index === step ? 'etapa atual' : 'aguardando'}`}
                >
                  <i aria-hidden="true">
                    <Icon size={18} strokeWidth={2.25} />
                  </i>
                  <span aria-hidden="true">{label}</span>
                </S.Step>
              ))}
            </S.Tracking>
            <S.Eta>
              <Clock3 />
              Previsão de chegada: {activeOrder.estimatedArrival}
            </S.Eta>
            <S.Actions>
              <button type="button" onClick={() => onTrackOrder?.(activeOrder.id)}>
                Acompanhar em tempo real <MapPin size={16} />
              </button>
              <button type="button" onClick={() => onViewOrder?.(activeOrder.id)}>
                Ver detalhes
              </button>
            </S.Actions>
          </div>
          <S.ActiveVisual>
            <img src={activeOrder.image} alt="" />
            <div>
              <span>Seu pedido</span>
              <strong>{activeOrder.summary}</strong>
              <b>{brl(activeOrder.total)}</b>
            </div>
          </S.ActiveVisual>
        </S.Active>
      ) : (
        <S.Empty>
          <Package aria-hidden="true" />
          <div>
            <b>Nenhum pedido em andamento</b>
            <span>Seu próximo pedido aparecerá aqui.</span>
          </div>
          <button type="button" onClick={onOpenMenu}>
            Ver cardápio
          </button>
        </S.Empty>
      )}
      <S.Bottom>
        <S.Card>
          <header className="section-heading">
            <div>
              <span>Histórico</span>
              <h2>Últimos pedidos</h2>
            </div>
          </header>
          {recentOrders.slice(0, 2).map((order) => (
            <S.Order key={order.id}>
              <img src={order.image} alt="" />
              <div>
                <small>{order.date}</small>
                <b>{order.summary}</b>
                <span>
                  {brand.name} • {order.id}
                </span>
              </div>
              <aside>
                <strong>{brl(order.total)}</strong>
                <small>✓ {statusLabel[order.status]}</small>
                <OrderAction order={order} onReorder={onReorder} onViewOrder={onViewOrder} />
              </aside>
            </S.Order>
          ))}
          {!recentOrders.length && <p className="section-empty">Você ainda não fez pedidos.</p>}
          <S.All onClick={onViewAllOrders}>
            Ver todos os pedidos <ChevronRight size={17} />
          </S.All>
        </S.Card>
        <S.Card>
          <header className="section-heading">
            <div>
              <span>Acesso rápido</span>
              <h2>Minha conta</h2>
            </div>
          </header>
          <S.Account>
            <i>
              <TicketPercent />
            </i>
            <div>
              <b>Meus cupons</b>
              <span>Benefícios resgatados e histórico</span>
            </div>
            <button onClick={onOpenCoupons} aria-label="Abrir meus cupons">
              <ChevronRight size={17} />
            </button>
          </S.Account>
          <S.Account>
            <i>
              <MapPin />
            </i>
            <div>
              <b>Endereço principal</b>
              <span>{user.mainAddress}</span>
            </div>
            <button onClick={onNewAddress}>Gerenciar</button>
          </S.Account>
          <S.Account>
            <i>
              <WalletCards />
            </i>
            <div>
              <b>Forma de pagamento</b>
              <span>
                {user.paymentLastDigits ? `•••• ${user.paymentLastDigits}` : 'Não cadastrada'}
              </span>
            </div>
            <button onClick={onEditPayment}>Editar</button>
          </S.Account>
          <S.Account>
            <i>
              <Heart />
            </i>
            <div>
              <b>Favoritos</b>
              <span>{user.favoriteCount} produtos salvos</span>
            </div>
            <button onClick={onOpenFavorites}>
              <ChevronRight size={17} />
            </button>
          </S.Account>
        </S.Card>
      </S.Bottom>
      <S.Support>
        <i>
          <Headphones aria-hidden="true" />
        </i>
        <span>
          <b>Precisa de ajuda?</b>
          <small>Fale com a equipe sobre um pedido.</small>
        </span>
        <button type="button" onClick={onSupport}>
          Falar com o suporte
        </button>
      </S.Support>
    </>
  );
}

function Orders({ data = profileMockData, onReorder, onViewOrder }: ProfilePageProps) {
  const [visibleOrderLimit, setVisibleOrderLimit] = useState(ORDER_LIST_BATCH_SIZE);
  const visibleOrders = data.recentOrders.slice(0, visibleOrderLimit);

  return (
    <>
      <S.ViewHeader>
        <div>
          <h2>Meus pedidos</h2>
          <p>Acompanhe pedidos atuais e consulte seu histórico.</p>
        </div>
      </S.ViewHeader>
      <S.PageCard>
        {data.activeOrder && (
          <S.FullOrder>
            <img src={data.activeOrder.image} alt={data.activeOrder.summary} />
            <div className="info">
              <small>AGORA</small>
              <b>{data.activeOrder.summary}</b>
              <span>
                Pedido {data.activeOrder.id} • {statusLabel[data.activeOrder.status]}
              </span>
            </div>
            <aside>
              <small>● Em andamento</small>
              <strong>{brl(data.activeOrder.total)}</strong>
              <button onClick={() => onViewOrder?.(data.activeOrder!.id)}>Acompanhar</button>
            </aside>
          </S.FullOrder>
        )}
        <S.OrderPage aria-label="Histórico de pedidos">
          {visibleOrders.map((order) => (
            <S.FullOrder key={order.id}>
              <img src={order.image} alt="" />
              <div className="info">
                <small>{order.date}</small>
                <b>{order.summary}</b>
                <span>
                  {order.id} • {statusLabel[order.status]}
                </span>
              </div>
              <aside>
                <strong>{brl(order.total)}</strong>
                <OrderAction order={order} onReorder={onReorder} onViewOrder={onViewOrder} />
              </aside>
            </S.FullOrder>
          ))}
        </S.OrderPage>
        {!data.activeOrder && !visibleOrders.length && (
          <S.Empty>
            <ShoppingBag aria-hidden="true" />
            <div>
              <b>Nenhum pedido encontrado</b>
              <span>Assim que você pedir, o histórico ficará disponível aqui.</span>
            </div>
          </S.Empty>
        )}
        {data.recentOrders.length > ORDER_LIST_BATCH_SIZE && (
          <S.OrderPagination aria-label="Controles do histórico de pedidos">
            <span>
              Exibindo {visibleOrders.length} de {data.recentOrders.length} pedidos
            </span>
            <div>
              {visibleOrderLimit > ORDER_LIST_BATCH_SIZE ? (
                <button
                  type="button"
                  aria-label="Voltar aos 10 pedidos iniciais"
                  onClick={() => setVisibleOrderLimit(ORDER_LIST_BATCH_SIZE)}
                >
                  <RotateCcw size={15} aria-hidden="true" /> Voltar aos 10
                </button>
              ) : null}
              {visibleOrders.length < data.recentOrders.length ? (
                <button
                  type="button"
                  aria-label="Mostrar mais 10 pedidos do histórico"
                  onClick={() =>
                    setVisibleOrderLimit((current) =>
                      Math.min(current + ORDER_LIST_BATCH_SIZE, data.recentOrders.length),
                    )
                  }
                >
                  Mostrar mais 10 <ChevronDown size={15} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </S.OrderPagination>
        )}
      </S.PageCard>
    </>
  );
}

function Addresses({ data = profileMockData, onNewAddress, onSelectAddress }: ProfilePageProps) {
  const addresses = data.addresses ?? [];
  return (
    <>
      <S.ViewHeader>
        <div>
          <h2>Meus endereços</h2>
          <p>Gerencie os locais usados para suas entregas.</p>
        </div>
        <button onClick={onNewAddress}>
          <Plus size={17} /> Novo endereço
        </button>
      </S.ViewHeader>
      <S.AddressGrid>
        {addresses.map((address) => (
          <S.AddressCard key={address.id}>
            <i>
              <MapPin />
            </i>
            <div>
              <b>{address.label}</b>
              <span>{address.address}</span>
              <span>{address.complement}</span>
              {address.isDefault && <small>Endereço principal</small>}
            </div>
            <button disabled={address.isDefault} onClick={() => onSelectAddress?.(address.id)}>
              {address.isDefault ? 'Selecionado' : 'Usar endereço'}
            </button>
          </S.AddressCard>
        ))}
        {!addresses.length && (
          <S.Empty>
            <MapPin aria-hidden="true" />
            <div>
              <b>Nenhum endereço salvo</b>
              <span>Cadastre um local para agilizar suas próximas entregas.</span>
            </div>
            <button type="button" onClick={onNewAddress}>
              Cadastrar endereço
            </button>
          </S.Empty>
        )}
      </S.AddressGrid>
    </>
  );
}

function Favorites({
  data = profileMockData,
  onAddFavoriteToCart,
  onToggleFavorite,
  onOpenMenu,
}: ProfilePageProps) {
  const favorites = data.favorites ?? [];
  return (
    <>
      <S.ViewHeader>
        <div>
          <h2>Favoritos</h2>
          <p>Seus pratos preferidos para pedir mais rápido.</p>
        </div>
      </S.ViewHeader>
      <S.PageCard>
        <S.FavoriteGrid>
          {favorites.map((item) => (
            <S.FavoriteCard key={item.id}>
              <img src={item.image} alt={item.name} />
              <button
                className="heart"
                aria-label="Remover favorito"
                onClick={() => onToggleFavorite?.(item.id)}
              >
                <Heart fill="currentColor" size={19} />
              </button>
              <div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <footer>
                  <strong>{brl(item.price)}</strong>
                  <button
                    type="button"
                    className="add-favorite"
                    aria-label={`Adicionar ${item.name} à sacola`}
                    onClick={() => onAddFavoriteToCart?.(item)}
                  >
                    <Plus aria-hidden="true" />
                  </button>
                </footer>
              </div>
            </S.FavoriteCard>
          ))}
          {!favorites.length && (
            <S.Empty>
              <Heart aria-hidden="true" />
              <div>
                <b>Nenhum favorito salvo</b>
                <span>Marque seus produtos preferidos para encontrá-los mais rápido.</span>
              </div>
              <button type="button" onClick={onOpenMenu}>
                Ver cardápio
              </button>
            </S.Empty>
          )}
        </S.FavoriteGrid>
      </S.PageCard>
    </>
  );
}

function PersonalData({ data = profileMockData, onSavePersonalData }: ProfilePageProps) {
  const { user } = data;
  const [name, setName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      await onSavePersonalData?.({ name, email, phone });
      setSaved(true);
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <S.ViewHeader>
        <div>
          <h2>Dados pessoais</h2>
          <p>Mantenha suas informações de contato atualizadas.</p>
        </div>
      </S.ViewHeader>
      <S.PageCard>
        <S.SettingsForm onSubmit={handleSubmit}>
          <label>
            Nome completo
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Telefone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="full">
            CPF
            <input placeholder="Não informado" disabled />
          </label>
          {saveError && (
            <span className="form-message error" role="alert">
              {saveError}
            </span>
          )}
          {saved && (
            <span className="form-message success" role="status">
              Alterações salvas com sucesso.
            </span>
          )}
          <footer>
            <button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : saved ? '✓ Alterações salvas' : 'Salvar alterações'}
            </button>
          </footer>
        </S.SettingsForm>
      </S.PageCard>
    </>
  );
}

function Security({
  onChangePassword,
  twoFactorEnabled = false,
  onToggleTwoFactor,
  onDeactivateAccount,
}: ProfilePageProps) {
  const [showForm, setShowForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [updatingTwoFactor, setUpdatingTwoFactor] = useState(false);
  const [showDeactivateConfirmation, setShowDeactivateConfirmation] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const passwordEvaluation = useMemo(
    () => evaluatePassword(newPassword, confirmPassword, STANDARD_PASSWORD_POLICY),
    [confirmPassword, newPassword],
  );

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      setPwError('Informe a senha atual.');
      return;
    }
    if (!passwordEvaluation.isValid) {
      setPwError(passwordEvaluation.errors.join(' '));
      return;
    }
    setSaving(true);
    setPwError('');
    try {
      await onChangePassword?.({ currentPassword, newPassword });
      setPwSuccess(true);
      setShowForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPwError('Senha atual incorreta ou erro ao alterar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleTwoFactor() {
    setUpdatingTwoFactor(true);
    setSecurityError('');
    try {
      await onToggleTwoFactor?.(!twoFactorEnabled);
    } catch {
      setSecurityError('Não foi possível atualizar a verificação em duas etapas.');
    } finally {
      setUpdatingTwoFactor(false);
    }
  }

  async function handleDeactivate() {
    setDeactivating(true);
    setSecurityError('');
    try {
      await onDeactivateAccount?.();
    } catch {
      setSecurityError('Não foi possível solicitar a exclusão da conta agora.');
      setDeactivating(false);
    }
  }

  return (
    <>
      <S.ViewHeader>
        <div>
          <h2>Segurança</h2>
          <p>Proteja sua conta e controle seus acessos.</p>
        </div>
      </S.ViewHeader>
      <S.PageCard>
        <S.SecurityList>
          <div className="security-row">
            <i>
              <KeyRound />
            </i>
            <div>
              <b>Senha de acesso</b>
              <span>
                {pwSuccess ? '✓ Senha alterada com sucesso' : 'Mantenha sua senha segura e única'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm((v) => !v);
                setPwError('');
              }}
            >
              {showForm ? 'Cancelar' : 'Alterar senha'}
            </button>
          </div>
          {showForm && (
            <S.SettingsForm onSubmit={handlePasswordSubmit} style={{ marginTop: 8 }}>
              <label>
                Senha atual
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </label>
              <label>
                Nova senha
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={STANDARD_PASSWORD_POLICY.minLength}
                  maxLength={STANDARD_PASSWORD_POLICY.maxLength}
                  aria-describedby="profile-password-requirements"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </label>
              <label>
                Confirmar nova senha
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={STANDARD_PASSWORD_POLICY.minLength}
                  maxLength={STANDARD_PASSWORD_POLICY.maxLength}
                  aria-describedby="profile-password-requirements"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </label>
              <div className="password-requirements">
                <PasswordRequirements
                  id="profile-password-requirements"
                  password={newPassword}
                  confirmation={confirmPassword}
                  policy={STANDARD_PASSWORD_POLICY}
                />
              </div>
              {pwError && (
                <span
                  style={{
                    color: '#c94040',
                    fontSize: 13,
                    gridColumn: '1 / -1',
                  }}
                >
                  {pwError}
                </span>
              )}
              <footer>
                <button
                  type="submit"
                  disabled={saving || !currentPassword || !passwordEvaluation.isValid}
                >
                  {saving ? 'Salvando…' : 'Confirmar nova senha'}
                </button>
              </footer>
            </S.SettingsForm>
          )}
          <div className="security-row">
            <i>
              <ShieldCheck />
            </i>
            <div>
              <b>Verificação em duas etapas</b>
              <span>
                {twoFactorEnabled
                  ? 'Ativa: será enviado um código ao seu e-mail no login'
                  : 'Receba um código no e-mail ao entrar na conta'}
              </span>
            </div>
            <button type="button" onClick={handleToggleTwoFactor} disabled={updatingTwoFactor}>
              {updatingTwoFactor ? 'Atualizando...' : twoFactorEnabled ? 'Desativar' : 'Ativar'}
            </button>
          </div>
          <div className="security-row">
            <i>
              <Trash2 />
            </i>
            <div>
              <b>Excluir minha conta</b>
              <span>A solicitação desativa o acesso, sem apagar seus dados</span>
            </div>
            <button type="button" onClick={() => setShowDeactivateConfirmation(true)}>
              Solicitar exclusão
            </button>
          </div>
          {showDeactivateConfirmation && (
            <div className="security-confirmation" role="alert">
              <b>Deseja desativar sua conta?</b>
              <span>
                Você perderá o acesso. Para reativar com segurança, use a recuperação de senha.
              </span>
              <div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowDeactivateConfirmation(false)}
                  disabled={deactivating}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={handleDeactivate}
                  disabled={deactivating}
                >
                  {deactivating ? 'Desativando...' : 'Confirmar exclusão'}
                </button>
              </div>
            </div>
          )}
          {securityError && <span className="security-error">{securityError}</span>}
        </S.SecurityList>
      </S.PageCard>
    </>
  );
}
