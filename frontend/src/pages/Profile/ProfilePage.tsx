import {
  Camera,
  ChevronRight,
  Clock3,
  Grid2X2,
  Heart,
  Headphones,
  KeyRound,
  LockKeyhole,
  LogOut,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { ProfileHeader } from "./components/ProfileHeader";
import { profileMockData } from "./data";
import * as S from "./Profile.styles";
import type {
  ProfileOrderStatus,
  ProfilePageProps,
  ProfileView,
} from "./types";

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const rank: Record<ProfileOrderStatus, number> = {
  confirmed: 0,
  preparing: 1,
  onTheWay: 2,
  delivered: 3,
};
const statusLabel: Record<ProfileOrderStatus, string> = {
  confirmed: "Confirmado",
  preparing: "Em preparo",
  onTheWay: "Saiu para entrega",
  delivered: "Entregue",
};
const tabs: [ProfileView, string][] = [
  ["overview", "Visão geral"],
  ["orders", "Meus pedidos"],
  ["addresses", "Endereços"],
  ["favorites", "Favoritos"],
  ["personalData", "Dados pessoais"],
  ["security", "Segurança"],
];

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
  const [view, setView] = useState<ProfileView>("overview");
  const { brand, user } = data;
  return (
    <S.Root $primary={brand.primaryColor ?? "#d64d08"}>
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
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
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
            {view === "overview" && (
              <Overview
                {...props}
                onViewAllOrders={() => setView("orders")}
                onOpenFavorites={() => setView("favorites")}
                data={data}
              />
            )}
            {view === "orders" && <Orders {...props} data={data} />}
            {view === "addresses" && <Addresses {...props} data={data} />}
            {view === "favorites" && <Favorites {...props} data={data} />}
            {view === "personalData" && <PersonalData {...props} data={data} />}
            {view === "security" && <Security {...props} />}
          </S.Main>
        </S.Layout>
      </S.Page>
    </S.Root>
  );
}

function ProfileNavigation({
  view,
  setView,
  data,
  onLogout,
  onUploadAvatar,
}: {
  view: ProfileView;
  setView: (view: ProfileView) => void;
  data: NonNullable<ProfilePageProps["data"]>;
  onLogout?: () => void;
  onUploadAvatar?: (file: File) => Promise<void>;
}) {
  const { user } = data;
  const initials = user.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const icons = {
    overview: Grid2X2,
    orders: ShoppingBag,
    addresses: MapPin,
    favorites: Heart,
    personalData: UserRound,
    security: LockKeyhole,
  };
  return (
    <S.Side>
      <S.AvatarWrap title="Alterar foto de perfil">
        {user.avatarUrl ? (
          <S.AvatarImg src={user.avatarUrl} alt="" />
        ) : (
          <S.AvatarInitials>{initials}</S.AvatarInitials>
        )}
        <S.AvatarOverlay>
          <Camera size={18} />
          <span>Alterar foto</span>
        </S.AvatarOverlay>
        <input
          type="file"
          accept="image/*"
          title=""
          aria-label="Carregar foto de perfil"
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            cursor: "pointer",
            width: "100%",
            height: "100%",
          }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadAvatar?.(file);
            e.target.value = "";
          }}
        />
      </S.AvatarWrap>
      <h2>{user.fullName}</h2>
      <p>{user.email}</p>
      <nav>
        {tabs.map(([id, label]) => {
          const Icon = icons[id];
          return (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              <Icon />
              {label}
            </button>
          );
        })}
      </nav>
      <button className="logout" onClick={onLogout}>
        <LogOut />
        Sair da conta
      </button>
    </S.Side>
  );
}

function Overview(props: ProfilePageProps) {
  const {
    data = profileMockData,
    onTrackOrder,
    onViewOrder,
    onReorder,
    onViewAllOrders,
    onEditAddress,
    onEditPayment,
    onOpenFavorites,
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
              {[
                "Confirmado",
                "Em preparo",
                "Saiu para entrega",
                "Entregue",
              ].map((label, index) => (
                <span key={label} style={{ display: "contents" }}>
                  <S.Step $done={index < step} $active={index === step}>
                    <i />
                  </S.Step>
                  {index < 3 && <S.Line $done={index < step} />}
                </span>
              ))}
            </S.Tracking>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                textAlign: "center",
                fontSize: 12,
                marginTop: -18,
              }}
            >
              {[
                "Confirmado",
                "Em preparo",
                "Saiu para entrega",
                "Entregue",
              ].map((x) => (
                <span key={x}>{x}</span>
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
              <button onClick={() => onViewOrder?.(activeOrder.id)}>
                Ver detalhes
              </button>
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
                <button onClick={() => onReorder?.(order.id)}>
                  Pedir novamente
                </button>
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
              <MapPin />
            </i>
            <div>
              <b>Endereço principal</b>
              <span>{user.mainAddress}</span>
            </div>
            <button onClick={onEditAddress}>Editar</button>
          </S.Account>
          <S.Account>
            <i>
              <WalletCards />
            </i>
            <div>
              <b>Forma de pagamento</b>
              <span>
                {user.paymentLastDigits
                  ? `•••• ${user.paymentLastDigits}`
                  : "Não cadastrada"}
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

function Orders({
  data = profileMockData,
  onReorder,
  onViewOrder,
}: ProfilePageProps) {
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
            <div
              style={{
                width: 82,
                height: 72,
                borderRadius: 10,
                background: "#f8e9df",
                display: "grid",
                placeItems: "center",
                color: "var(--p)",
              }}
            >
              <Package />
            </div>
            <div className="info">
              <small>AGORA</small>
              <b>Pedido {data.activeOrder.id}</b>
              <span>
                {statusLabel[data.activeOrder.status]} • previsão{" "}
                {data.activeOrder.estimatedArrival}
              </span>
            </div>
            <aside>
              <small>● Em andamento</small>
              <button onClick={() => onViewOrder?.(data.activeOrder!.id)}>
                Acompanhar
              </button>
            </aside>
          </S.FullOrder>
        )}
        {data.recentOrders.map((order) => (
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
              <button onClick={() => onReorder?.(order.id)}>
                Pedir novamente
              </button>
            </aside>
          </S.FullOrder>
        ))}
      </S.PageCard>
    </>
  );
}

function Addresses({
  data = profileMockData,
  onEditAddress,
}: ProfilePageProps) {
  const addresses = data.addresses ?? [];
  return (
    <>
      <S.ViewHeader>
        <div>
          <h2>Meus endereços</h2>
          <p>Gerencie os locais usados para suas entregas.</p>
        </div>
        <button onClick={onEditAddress}>
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
            <button onClick={onEditAddress}>Editar</button>
          </S.AddressCard>
        ))}
      </S.AddressGrid>
    </>
  );
}

function Favorites({ data = profileMockData, onReorder, onToggleFavorite }: ProfilePageProps) {
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
                  <span>⭐ {item.rating}</span>
                  <strong>{brl(item.price)}</strong>
                  <button
                    onClick={() => onReorder?.(item.id)}
                    style={{
                      border: 0,
                      borderRadius: 8,
                      background: "var(--p)",
                      color: "#fff",
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

function PersonalData({
  data = profileMockData,
  onSavePersonalData,
}: ProfilePageProps) {
  const { user } = data;
  const [name, setName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      await onSavePersonalData?.({ name, email, phone });
      setSaved(true);
    } catch {
      setSaveError("Erro ao salvar. Tente novamente.");
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
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
            <span
              style={{ color: "#c94040", fontSize: 13, gridColumn: "1 / -1" }}
            >
              {saveError}
            </span>
          )}
          <footer>
            <button type="submit" disabled={saving}>
              {saving
                ? "Salvando…"
                : saved
                  ? "✓ Alterações salvas"
                  : "Salvar alterações"}
            </button>
          </footer>
        </S.SettingsForm>
      </S.PageCard>
    </>
  );
}

function Security({ onChangePassword }: ProfilePageProps) {
  const [showForm, setShowForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwError("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSaving(true);
    setPwError("");
    try {
      await onChangePassword?.({ currentPassword, newPassword });
      setPwSuccess(true);
      setShowForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwError("Senha atual incorreta ou erro ao alterar.");
    } finally {
      setSaving(false);
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
                {pwSuccess
                  ? "✓ Senha alterada com sucesso"
                  : "Mantenha sua senha segura e única"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm((v) => !v);
                setPwError("");
              }}
            >
              {showForm ? "Cancelar" : "Alterar senha"}
            </button>
          </div>
          {showForm && (
            <S.SettingsForm
              onSubmit={handlePasswordSubmit}
              style={{ marginTop: 8 }}
            >
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
                    color: "#c94040",
                    fontSize: 13,
                    gridColumn: "1 / -1",
                  }}
                >
                  {pwError}
                </span>
              )}
              <footer>
                <button type="submit" disabled={saving}>
                  {saving ? "Salvando…" : "Confirmar nova senha"}
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
              <span>Adicione uma camada extra de proteção</span>
            </div>
            <button type="button">Ativar</button>
          </div>
          <div className="security-row">
            <i>
              <Trash2 />
            </i>
            <div>
              <b>Excluir minha conta</b>
              <span>Apaga permanentemente seus dados e histórico</span>
            </div>
            <button type="button">Solicitar exclusão</button>
          </div>
        </S.SecurityList>
      </S.PageCard>
    </>
  );
}
