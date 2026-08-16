import {
  Camera,
  Grid2X2,
  Heart,
  LockKeyhole,
  LogOut,
  MapPin,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import type { ProfilePageProps, ProfileView } from '../types';
import * as S from '../Profile.styles';
import { profileTabs } from '../config/profileTabs';

const icons = {
  overview: Grid2X2,
  orders: ShoppingBag,
  addresses: MapPin,
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
    <S.Side>
      <S.AvatarWrap title="Alterar foto de perfil">
        {user.avatarUrl ? (
          <S.AvatarImg src={user.avatarUrl} alt={`Foto de ${user.fullName}`} />
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
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'pointer',
            width: '100%',
            height: '100%',
          }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onUploadAvatar?.(file);
            event.target.value = '';
          }}
        />
      </S.AvatarWrap>
      <h2>{user.fullName}</h2>
      <p>{user.email}</p>
      <nav>
        {profileTabs.map(([id, label]) => {
          const Icon = icons[id];
          return (
            <button
              type="button"
              key={id}
              className={view === id ? 'active' : ''}
              onClick={() => setView(id)}
            >
              <Icon />
              {label}
            </button>
          );
        })}
      </nav>
      <button type="button" className="logout" onClick={onLogout}>
        <LogOut />
        Sair da conta
      </button>
    </S.Side>
  );
}
