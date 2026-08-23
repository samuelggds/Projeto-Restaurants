import {
  Bike,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  Clock3,
  Heart,
  Headphones,
  KeyRound,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  ShieldCheck,
  TicketPercent,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { useState } from 'react';
import { ProfileHeader } from './components/ProfileHeader';
import { ProfileNavigation } from './components/ProfileNavigation';
import { LoyaltyWallet } from './components/LoyaltyWallet';
import { profileTabs as tabs } from './config/profileTabs';
import { profileMockData } from './data';
import * as S from './Profile.styles';
import type { ProfileOrder, ProfileOrderStatus, ProfilePageProps, ProfileView } from './types';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
    return <button onClick={() => onReorder?.(order.id)}>Pedir novamente</button>;
  }

  if (order.status !== 'cancelled') {
    return <button onClick={() => onViewOrder?.(order.id)}>Acompanhar</button>;
  }

  return null;
}
const trackingSteps = [
  { label: 'Confirmado', icon: CheckCircle2 },
  { label: 'Em preparo', icon: ChefHat },
  { label: 'Saiu para entrega', icon: Bike },
  { label: 'Entregue', icon: PackageCheck },
] as const;
export function ProfilePage(props: ProfilePageProps) {
  const {
    data = profileMockData,
    cartCount = 2,
    onGoHome,
    onOpenMenu,
    onOpenCart,
    onOpenSearch,
    onLogout,
  } = props;
  const [view, setView] = useState<ProfileView>('overview');
  const { brand, user } = data;
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
        <small>Início &nbsp;/&nbsp; Minha conta</small>
        <h1>
          Olá, <em>{user.firstName}</em>
        </h1>
        <S.Subtitle>Gerencie seus pedidos e suas informações</S.Subtitle>
        <S.MobileTabs>
          {tabs.map(([id, label]) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </S.MobileTabs>
        <S.Layout>
          <ProfileNavigation
            view={view}
            setView={setView}
            data={data}
            onLogout={onLogout}
            onUploadAvatar={props.onUploadAvatar}
          />
          <S.Main>
            <S.ViewTransition key={view}>
              {view === 'overview' && (
                <Overview
                  {...props}
                  onViewAllOrders={() => setView('orders')}
                  onOpenFavorites={() => setView('favorites')}
                  onOpenCoupons={() => setView('coupons')}
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
  } = props;
  const { brand, user, activeOrder, recentOrders } = data;
  const step = activeOrder ? rank[activeOrder.status] : 0;
  return (
    <>
      {activeOrder ? (
        <S.Active>
          <div>
            <S.Heading>
              <h2>Pedido em andamento</h2>
              <S.Status>
                <Package size={17} />
                {statusLabel[activeOrder.status]}
              </S.Status>
              <span>{activeOrder.id}</span>
            </S.Heading>
            <S.Tracking>
              {trackingSteps.map(({ label, icon: Icon }, index) => (
                <span key={label} style={{ display: 'contents' }}>
                  <S.Step $done={index < step} $active={index === step}>
                    <i aria-hidden="true">
                      <Icon size={18} strokeWidth={2.25} />
                    </i>
                  </S.Step>
                  {index < 3 && <S.Line $done={index < step} />}
                </span>
              ))}
            </S.Tracking>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4,1fr)',
                textAlign: 'center',
                fontSize: 12,
                marginTop: -18,
              }}
            >
              {trackingSteps.map(({ label }) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <S.Eta>
              <Clock3 />
              Previsão de chegada: {activeOrder.estimatedArrival}
            </S.Eta>
            <S.Actions>
              <button onClick={() => onTrackOrder?.(activeOrder.id)}>
                Acompanhar em tempo real <MapPin size={16} />
              </button>
              <button onClick={() => onViewOrder?.(activeOrder.id)}>Ver detalhes</button>
            </S.Actions>
          </div>
          <S.Map>
            <span className="store">⌂</span>
            <div />
            <span className="driver">●</span>
          </S.Map>
        </S.Active>
      ) : (
        <S.Empty>Nenhum pedido em andamento.</S.Empty>
      )}
      <S.Bottom>
        <S.Card>
          <h2>Últimos pedidos</h2>
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
          <S.All onClick={onViewAllOrders}>
            Ver todos os pedidos <ChevronRight size={17} />
          </S.All>
        </S.Card>
        <S.Card>
          <h2>Minha conta</h2>
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
        <Headphones />
        <span>Precisa de ajuda com um pedido?</span>
        <button onClick={onSupport}>Falar com o suporte</button>
      </S.Support>
    </>
  );
}

function Orders({ data = profileMockData, onReorder, onViewOrder }: ProfilePageProps) {
  const [ordersOffset, setOrdersOffset] = useState(0);
  const pageSize = 5;
  const visibleOrders = data.recentOrders.slice(ordersOffset, ordersOffset + pageSize);
  const lastVisibleOrder = Math.min(ordersOffset + visibleOrders.length, data.recentOrders.length);

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
        <S.OrderPage key={ordersOffset}>
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
        {data.recentOrders.length > pageSize && (
          <S.OrderPagination>
            <span>
              Mostrando {ordersOffset + 1}–{lastVisibleOrder} de {data.recentOrders.length}
            </span>
            <div>
              <button
                type="button"
                disabled={ordersOffset === 0}
                onClick={() => setOrdersOffset((current) => Math.max(0, current - pageSize))}
              >
                ← Voltar 5
              </button>
              <button
                type="button"
                disabled={ordersOffset + pageSize >= data.recentOrders.length}
                onClick={() => setOrdersOffset((current) => current + pageSize)}
              >
                Próximos 5 →
              </button>
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
      </S.AddressGrid>
    </>
  );
}

function Favorites({
  data = profileMockData,
  onAddFavoriteToCart,
  onToggleFavorite,
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
                    aria-label={`Adicionar ${item.name} à sacola`}
                    onClick={() => onAddFavoriteToCart?.(item)}
                    style={{
                      border: 0,
                      borderRadius: 8,
                      background: 'var(--p)',
                      color: '#fff',
                      width: 34,
                      height: 34,
                    }}
                  >
                    <Plus />
                  </button>
                </footer>
              </div>
            </S.FavoriteCard>
          ))}
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
            <span style={{ color: '#c94040', fontSize: 13, gridColumn: '1 / -1' }}>
              {saveError}
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

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('A nova senha deve ter pelo menos 6 caracteres.');
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
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </label>
              <label>
                Nova senha
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </label>
              <label>
                Confirmar nova senha
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </label>
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
                <button type="submit" disabled={saving}>
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
              <span>Você perderá o acesso até que a conta seja reativada.</span>
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
