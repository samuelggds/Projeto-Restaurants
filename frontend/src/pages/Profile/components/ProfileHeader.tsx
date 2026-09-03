import { LogOut, MapPin, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { ProfileBrand, ProfileUser } from '../types';

type Props = {
  brand: ProfileBrand;
  user: ProfileUser;
  cartCount: number;
  onGoHome?: () => void;
  onOpenMenu?: () => void;
  onOpenCart?: () => void;
  onOpenSearch?: () => void;
  onLogout?: () => void;
};

export function ProfileHeader({
  brand,
  user,
  cartCount,
  onGoHome,
  onOpenMenu,
  onOpenCart,
  onOpenSearch,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const mainAddress = String(user.mainAddress || '').trim();
  const hasMainAddress = Boolean(mainAddress && mainAddress !== 'Nenhum endereço cadastrado');

  return (
    <Header $primary={brand.primaryColor ?? '#d64d08'}>
      <HeaderInner>
        <Brand type="button" onClick={onGoHome} aria-label={`Ir para ${brand.name}`}>
          {brand.logoUrl ? (
            <Logo src={brand.logoUrl} alt="" />
          ) : (
            <Monogram>{brand.monogram ?? brand.name.slice(0, 2)}</Monogram>
          )}
          <strong>{brand.name}</strong>
        </Brand>
        <Location title={hasMainAddress ? mainAddress : 'Nenhum endereço cadastrado'}>
          <MapPin size={16} aria-hidden="true" />
          <span>{hasMainAddress ? 'Entregar em' : 'Endereço de entrega'}</span>
          <b>{hasMainAddress ? mainAddress : 'Não cadastrado'}</b>
        </Location>
        <Nav id="profile-main-navigation" $open={open} aria-label="Navegação principal">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onGoHome?.();
            }}
          >
            Início
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenMenu?.();
            }}
          >
            Cardápio
          </button>
        </Nav>
        <Actions>
          <Round type="button" aria-label="Buscar" onClick={onOpenSearch}>
            <Search size={19} aria-hidden="true" />
          </Round>

          <ProfileWrap ref={profileRef}>
            <AvatarButton
              type="button"
              aria-label="Minha conta"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              aria-controls="profile-account-menu"
              $open={profileOpen}
              onClick={() => setProfileOpen((current) => !current)}
            >
              {user.avatarUrl ? <AvatarImg src={user.avatarUrl} alt="" /> : initials}
            </AvatarButton>

            {profileOpen && (
              <ProfileDropdown id="profile-account-menu" role="menu">
                <DropdownArrow />
                <DropdownUser>
                  <DropdownAvatar>
                    {user.avatarUrl ? <AvatarImgSm src={user.avatarUrl} alt="" /> : initials}
                  </DropdownAvatar>
                  <div>
                    <span className="name">{user.fullName}</span>
                    <span className="email">{user.email}</span>
                  </div>
                </DropdownUser>
                <DropdownDivider />
                <DropdownItem type="button" role="menuitem" onClick={() => setProfileOpen(false)}>
                  <UserRound size={16} aria-hidden="true" />
                  Meu perfil
                </DropdownItem>
                <DropdownItem
                  type="button"
                  role="menuitem"
                  $danger
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout?.();
                  }}
                >
                  <LogOut size={16} aria-hidden="true" />
                  Sair da conta
                </DropdownItem>
              </ProfileDropdown>
            )}
          </ProfileWrap>

          <Cart type="button" aria-label={`Sacola com ${cartCount} itens`} onClick={onOpenCart}>
            <ShoppingBag size={18} aria-hidden="true" />
            <span>Sacola</span>
            <i>{cartCount}</i>
          </Cart>
          <Mobile
            type="button"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            aria-controls="profile-main-navigation"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Mobile>
        </Actions>
      </HeaderInner>
    </Header>
  );
}

const Header = styled.header<{ $primary: string }>`
  --profile-primary: ${({ $primary }) => $primary};
  position: sticky;
  top: 0;
  z-index: 50;
  height: 72px;
  border-bottom: 1px solid #dedfd9;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(18px);
  @media (max-width: 760px) {
    height: 64px;
  }
`;
const HeaderInner = styled.div`
  width: 100%;
  max-width: 1320px;
  height: 100%;
  margin: 0 auto;
  padding: 0 clamp(22px, 4vw, 56px);
  display: flex;
  align-items: center;
  gap: 16px;
  @media (max-width: 980px) {
    padding: 0 14px;
    gap: 9px;
  }
`;
const Brand = styled.button`
  display: flex;
  align-items: center;
  gap: 9px;
  border: 0;
  background: transparent;
  color: #191816;
  font:
    700 16px 'Sora',
    sans-serif;
  white-space: nowrap;
  cursor: pointer;
  @media (max-width: 520px) {
    gap: 7px;
    font-size: 15px;
  }
  @media (max-width: 360px) {
    strong {
      display: none;
    }
  }
`;
const Logo = styled.img`
  width: 39px;
  height: 39px;
  border-radius: 7px;
  object-fit: contain;
  @media (max-width: 520px) {
    width: 38px;
    height: 38px;
  }
`;
const Monogram = styled.span`
  font:
    400 31px Georgia,
    serif;
  color: var(--profile-primary);
  @media (max-width: 520px) {
    font-size: 25px;
  }
`;
const Location = styled.div`
  margin-left: auto;
  min-width: 0;
  max-width: 380px;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  border: 1px solid #dedfd9;
  border-radius: 7px;
  background: #fafaf7;
  font-size: 11px;
  svg {
    flex: 0 0 auto;
    color: var(--profile-primary);
  }
  span {
    flex: 0 0 auto;
    font-weight: 800;
  }
  b {
    overflow: hidden;
    color: #5f665f;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  @media (max-width: 980px) {
    display: none;
  }
`;
const Nav = styled.nav<{ $open: boolean }>`
  display: flex;
  gap: 2px;
  align-items: center;
  height: 100%;
  button,
  a {
    min-height: 36px;
    padding: 0 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #191816;
    text-decoration: none;
    font: inherit;
    cursor: pointer;
  }
  button:first-child {
    color: var(--profile-primary);
    font-weight: 700;
  }
  button:hover,
  a:hover {
    background: #f1f2ee;
  }
  @media (max-width: 760px) {
    display: ${({ $open }) => ($open ? 'flex' : 'none')};
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    height: auto;
    padding: 18px;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    background: #fff;
    border-bottom: 1px solid #dedfd9;
    box-shadow: 0 18px 30px rgba(50, 30, 15, 0.1);
    button,
    a {
      padding: 14px;
      text-align: left;
    }
  }
`;
const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  margin-left: 2px;
  @media (max-width: 980px) {
    margin-left: auto;
  }
`;
const Round = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 7px;
  background: #fff;
  border: 1px solid #dedfd9;
  display: grid;
  place-items: center;
  cursor: pointer;
  @media (max-width: 620px) {
    display: none;
  }
`;
const Cart = styled.button`
  height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: 7px;
  background: var(--profile-primary);
  color: #fff;
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  cursor: pointer;
  i {
    min-width: 19px;
    height: 19px;
    border-radius: 50%;
    background: #fff;
    color: var(--profile-primary);
    display: grid;
    place-items: center;
    font-style: normal;
  }
  @media (max-width: 520px) {
    width: 44px;
    height: 40px;
    padding: 0;
    justify-content: center;
    span {
      display: none;
    }
    i {
      position: absolute;
      transform: translate(15px, -14px);
      width: 19px;
      height: 19px;
      font-size: 10px;
    }
  }
`;
const Mobile = styled.button`
  display: none;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 7px;
  background: #f1f2ee;
  place-items: center;
  @media (max-width: 760px) {
    display: grid;
  }
`;

const ProfileWrap = styled.div`
  position: relative;
`;
const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
`;
const AvatarImgSm = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
`;
const AvatarButton = styled.button<{ $open: boolean }>`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid ${({ $open }) => ($open ? 'var(--profile-primary)' : '#dedfd9')};
  background: ${({ $open }) => ($open ? '#fdeee7' : '#fff')};
  color: ${({ $open }) => ($open ? 'var(--profile-primary)' : '#191816')};
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.18s;
  font-family: inherit;
  overflow: hidden;
  &:hover {
    border-color: var(--profile-primary);
    background: #fdeee7;
    color: var(--profile-primary);
  }
`;
const ProfileDropdown = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 12px);
  width: 240px;
  background: #fff;
  border: 1px solid #dedfd9;
  border-radius: 8px;
  box-shadow:
    0 8px 32px rgba(50, 30, 15, 0.12),
    0 2px 8px rgba(50, 30, 15, 0.06);
  padding: 8px;
  animation: profile-menu-in 180ms cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 200;
  @keyframes profile-menu-in {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
  }
`;
const DropdownArrow = styled.div`
  position: absolute;
  top: -6px;
  right: 16px;
  width: 12px;
  height: 12px;
  background: #fff;
  border-left: 1px solid #eadfd3;
  border-top: 1px solid #eadfd3;
  border-radius: 2px;
  transform: rotate(45deg);
`;
const DropdownUser = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 12px;
  .name {
    display: block;
    font-weight: 700;
    font-size: 14px;
    color: #191816;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
  }
  .email {
    display: block;
    font-size: 11px;
    color: #9a9591;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
  }
`;
const DropdownAvatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #fdeee7;
  color: var(--profile-primary);
  font-weight: 800;
  font-size: 13px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-family: inherit;
  overflow: hidden;
`;
const DropdownDivider = styled.div`
  height: 1px;
  background: #f0ece6;
  margin: 4px 0;
`;
const DropdownItem = styled.button<{ $danger?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: ${({ $danger }) => ($danger ? '#c94040' : '#191816')};
  text-align: left;
  transition: background 0.15s;
  &:hover {
    background: ${({ $danger }) => ($danger ? '#fef2f2' : '#f5f0ea')};
  }
  svg {
    flex-shrink: 0;
  }
`;
