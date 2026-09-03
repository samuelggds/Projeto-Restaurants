import {
  Camera,
  ChevronRight,
  Grid2X2,
  Heart,
  LockKeyhole,
  LogOut,
  MapPin,
  ShoppingBag,
  TicketPercent,
  UserRound,
  WalletCards,
} from 'lucide-react';
import type { ProfilePageProps, ProfileView } from '../types';
import * as S from '../Profile.styles';
import { profileTabs } from '../config/profileTabs';

const icons = {
  overview: Grid2X2,
  orders: ShoppingBag,
  coupons: TicketPercent,
  addresses: MapPin,
  paymentMethods: WalletCards,
  favorites: Heart,
  personalData: UserRound,
  security: LockKeyhole,
};

type Props = {
  view: ProfileView;
  setView: (view: ProfileView) => void;
  data: NonNullable<ProfilePageProps['data']>;
  onLogout?: () => void;
  onUploadAvatar?: (file: File) => Promise<void>;
};

export function ProfileNavigation({ view, setView, data, onLogout, onUploadAvatar }: Props) {
  const { user } = data;
  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return (
    <S.Side aria-label="Navegação da conta">
      <div className="profile-identity">
        <S.AvatarWrap title="Alterar foto de perfil">
          {user.avatarUrl ? (
            <S.AvatarImg src={user.avatarUrl} alt={`Foto de ${user.fullName}`} />
          ) : (
            <S.AvatarInitials>{initials}</S.AvatarInitials>
          )}
          <S.AvatarOverlay>
            <Camera size={17} />
            <span>Alterar</span>
          </S.AvatarOverlay>
          <input
            type="file"
            accept="image/*"
            title=""
            aria-label="Carregar foto de perfil"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onUploadAvatar?.(file);
              event.target.value = '';
            }}
          />
        </S.AvatarWrap>
        <div className="profile-copy">
          <span>Conta do cliente</span>
          <h2>{user.fullName}</h2>
          <p>{user.email}</p>
        </div>
      </div>
      <nav aria-label="Seções do perfil">
        <span className="nav-label">Sua conta</span>
        {profileTabs.map(([id, label]) => {
          const Icon = icons[id];
          return (
            <button
              type="button"
              key={id}
              className={view === id ? 'active' : ''}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => setView(id)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
              <ChevronRight className="nav-chevron" aria-hidden="true" />
            </button>
          );
        })}
      </nav>
      <button type="button" className="logout" onClick={onLogout}>
        <LogOut aria-hidden="true" />
        Sair da conta
      </button>
    </S.Side>
  );
}
