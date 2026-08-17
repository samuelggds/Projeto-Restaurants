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

  return (
    <Header $primary={brand.primaryColor ?? '#d64d08'}>
      <Brand type="button" onClick={onGoHome}>
        {brand.logoUrl ? (
          <Logo src={brand.logoUrl} alt={brand.name} />
        ) : (
          <Monogram>{brand.monogram ?? brand.name.slice(0, 2)}</Monogram>
        )}
        <strong>{brand.name}</strong>
      </Brand>
      <Location>
        <MapPin size={17} />
        <span>Entregar em</span>
        <b>• {user.mainAddress || brand.address}</b>
      </Location>
      <Nav $open={open}>
        <button onClick={onGoHome}>Início</button>
        <button onClick={onOpenMenu}>Cardápio</button>
        <a href="#sobre">Sobre</a>
      </Nav>
      <Actions>
        <Round aria-label="Buscar" onClick={onOpenSearch}>
          <Search size={20} />
        </Round>

        {/* ── Profile dropdown */}
        <ProfileWrap ref={profileRef}>
          <AvatarButton
            aria-label="Minha conta"
            $open={profileOpen}
            onClick={() => setProfileOpen((o) => !o)}
          >
            {user.avatarUrl ? <AvatarImg src={user.avatarUrl} alt="" /> : initials}
          </AvatarButton>

          <ProfileDropdown $open={profileOpen}>
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
            <DropdownItem
              onClick={() => {
                setProfileOpen(false);
              }}
            >
              <UserRound size={16} />
              Meu Perfil
            </DropdownItem>
            <DropdownItem
              $danger
              onClick={() => {
                setProfileOpen(false);
                onLogout?.();
              }}
            >
              <LogOut size={16} />
              Sair da conta
            </DropdownItem>
          </ProfileDropdown>
        </ProfileWrap>

        <Cart aria-label={`Sacola com ${cartCount} itens`} onClick={onOpenCart}>
          <ShoppingBag size={19} />
          <span>Sacola</span>
          <i>{cartCount}</i>
        </Cart>
        <Mobile aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          {open ? <X /> : <Menu />}
        </Mobile>
      </Actions>
    </Header>
  );
}

const Header = styled.header<{ $primary: string }>`
  --profile-primary: ${({ $primary }) => $primary};
  position: sticky;
  top: 0;
  z-index: 50;
  height: 82px;
  padding: 0 clamp(18px, 3.4vw, 54px);
  display: flex;
  align-items: center;
  gap: 28px;
  border-bottom: 1px solid #eadfd3;
  background: rgba(255, 253, 249, 0.96);
  backdrop-filter: blur(14px);
  @media (max-width: 980px) {
    height: 68px;
    padding: 0 14px;
    gap: 9px;
  }
`;
const Brand = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: transparent;
  color: #191816;
  font-size: 20px;
  white-space: nowrap;
  cursor: pointer;
  @media (max-width: 520px) {
    gap: 7px;
    font-size: 15px;
  }
`;
const Logo = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 10px;
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
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid #eadfd3;
  border-radius: 999px;
  font-size: 14px;
  span {
    font-weight: 600;
  }
  b {
    font-weight: 500;
  }
  @media (max-width: 980px) {
    display: none;
  }
`;
const Nav = styled.nav<{ $open: boolean }>`
  display: flex;
  gap: 28px;
  align-items: center;
  height: 100%;
  button,
  a {
    border: 0;
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
  @media (max-width: 760px) {
    display: ${({ $open }) => ($open ? 'flex' : 'none')};
    position: fixed;
    top: 68px;
    left: 0;
    right: 0;
    height: auto;
    padding: 18px;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    background: #fffdf9;
    border-bottom: 1px solid #eadfd3;
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
  margin-left: auto;
`;
const Round = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid #eadfd3;
  display: grid;
  place-items: center;
  cursor: pointer;
  @media (max-width: 620px) {
    display: none;
  }
`;
const Cart = styled.button`
  height: 48px;
  padding: 0 18px;
  border: 0;
  border-radius: 13px;
  background: var(--profile-primary);
  color: #fff;
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 700;
  cursor: pointer;
  i {
    width: 23px;
    height: 23px;
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
  background: transparent;
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
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid ${({ $open }) => ($open ? 'var(--profile-primary)' : '#eadfd3')};
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
const ProfileDropdown = styled.div<{ $open: boolean }>`
  position: absolute;
  right: 0;
  top: calc(100% + 12px);
  width: 240px;
  background: #fff;
  border: 1px solid #eadfd3;
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(50, 30, 15, 0.12),
    0 2px 8px rgba(50, 30, 15, 0.06);
  padding: 8px;
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: translateY(${({ $open }) => ($open ? '0' : '-8px')});
  transition:
    opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 200;
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
  border-radius: 10px;
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
