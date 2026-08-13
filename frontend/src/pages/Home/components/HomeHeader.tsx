import {
  Clock3,
  LogOut,
  LayoutDashboard,
  MapPin,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { HomeBrand } from "../types";
import type { CustomerAddress } from "../../../Services/customerAddressService";

type Props = {
  brand: HomeBrand;
  cartCount: number;
  userName?: string;
  userEmail?: string;
  userLoggedIn?: boolean;
  isAdmin?: boolean;
  savedAddresses?: CustomerAddress[];
  selectedAddressId?: string;
  onSelectAddress?: (addressId: string) => void;
  onOpenMenu?: () => void;
  onOpenProfile?: () => void;
  onOpenAdmin?: () => void;
  onOpenCart?: () => void;
  onSearch?: () => void;
  onLogout?: () => void;
  isRestaurantOpen?: boolean;
  businessHoursLabel?: string;
};

export function HomeHeader({
  brand,
  cartCount,
  userName,
  userEmail,
  userLoggedIn = false,
  isAdmin = false,
  savedAddresses = [],
  selectedAddressId,
  onSelectAddress,
  onOpenMenu,
  onOpenProfile,
  onOpenAdmin,
  onOpenCart,
  onSearch,
  onLogout,
  isRestaurantOpen = false,
  businessHoursLabel = "Horário não informado",
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
      if (
        locationRef.current &&
        !locationRef.current.contains(e.target as Node)
      ) {
        setLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = userName
    ? userName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "U";
  const selectedAddress = savedAddresses.find(
    (address) => String(address.id) === String(selectedAddressId),
  );
  const locationText = selectedAddress
    ? `${selectedAddress.address}, ${selectedAddress.number}`
    : brand.address;

  return (
    <Header $primary={brand.primaryColor ?? "#d64d08"}>
      <Brand href="#inicio" aria-label={brand.name}>
        {brand.logoUrl ? (
          <Logo src={brand.logoUrl} alt={brand.name} />
        ) : (
          <Monogram>{brand.monogram ?? brand.name.slice(0, 2)}</Monogram>
        )}
        <strong>{brand.name}</strong>
      </Brand>

      <LocationWrap ref={locationRef}>
        <Location
          type="button"
          aria-label="Escolher endereço de entrega"
          aria-expanded={locationOpen}
          onClick={() => savedAddresses.length > 0 && setLocationOpen((open) => !open)}
        >
          <MapPin size={17} />
          <span>Entregar em</span>
          <b>• {locationText || "Escolha um endereço"}</b>
        </Location>
        {savedAddresses.length > 0 && (
          <LocationDropdown $open={locationOpen}>
            <strong>Onde deseja receber?</strong>
            {savedAddresses.map((address) => (
              <LocationOption
                type="button"
                key={address.id}
                $active={String(address.id) === String(selectedAddressId)}
                onClick={() => {
                  onSelectAddress?.(String(address.id));
                  setLocationOpen(false);
                }}
              >
                <MapPin size={17} />
                <span>
                  <b>{address.label}</b>
                  <small>{address.address}, {address.number} • {address.district}</small>
                </span>
              </LocationOption>
            ))}
          </LocationDropdown>
        )}
      </LocationWrap>

      <BusinessStatus $open={isRestaurantOpen} title={businessHoursLabel}>
        <i />
        <Clock3 size={15} />
        <span>{isRestaurantOpen ? "Aberto" : "Fechado"}</span>
        <small>{businessHoursLabel.replace("Hoje: ", "")}</small>
      </BusinessStatus>

      <Navigation $open={mobileOpen}>
        <a href="#inicio" onClick={() => setMobileOpen(false)}>
          Início
        </a>
        <button
          onClick={() => {
            onOpenMenu?.();
            setMobileOpen(false);
          }}
        >
          Cardápio
        </button>
        <a href="#sobre" onClick={() => setMobileOpen(false)}>
          Sobre
        </a>
      </Navigation>

      <Actions>
        <RoundButton aria-label="Buscar" onClick={onSearch}>
          <Search size={20} />
        </RoundButton>

        {/* ── Profile button + dropdown */}
        <ProfileWrap ref={profileRef}>
          {userLoggedIn ? (
            <AvatarButton
              aria-label="Minha conta"
              $open={profileOpen}
              onClick={() => setProfileOpen((o) => !o)}
            >
              {initials}
            </AvatarButton>
          ) : (
            <RoundButton aria-label="Minha conta" onClick={onOpenProfile}>
              <UserRound size={20} />
            </RoundButton>
          )}

          <ProfileDropdown $open={profileOpen}>
            <DropdownArrow />
            <DropdownUser>
              <DropdownAvatar>{initials}</DropdownAvatar>
              <div>
                <span className="name">{userName || "Usuário"}</span>
                {userEmail && <span className="email">{userEmail}</span>}
              </div>
            </DropdownUser>
            <DropdownDivider />
            {isAdmin && (
              <DropdownItem
                onClick={() => {
                  setProfileOpen(false);
                  onOpenAdmin?.();
                }}
              >
                <LayoutDashboard size={16} />
                Painel administrativo
              </DropdownItem>
            )}
            <DropdownItem
              onClick={() => {
                setProfileOpen(false);
                onOpenProfile?.();
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

        <CartButton
          aria-label={`Sacola com ${cartCount} itens`}
          onClick={onOpenCart}
        >
          <ShoppingBag size={19} />
          <span>Sacola</span>
          <i>{cartCount}</i>
        </CartButton>
        <MobileMenu
          aria-label="Abrir menu"
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </MobileMenu>
      </Actions>
    </Header>
  );
}

const Header = styled.header<{ $primary: string }>`
  --home-primary: ${({ $primary }) => $primary};
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
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
    gap: 10px;
  }
  @media (max-width: 760px) {
    height: 118px;
    padding: 14px 14px 50px;
    align-items: flex-start;
  }
`;
const Brand = styled.a`
  display: flex;
  align-items: center;
  gap: 12px;
  color: #191816;
  text-decoration: none;
  white-space: nowrap;
  font-size: 20px;
  @media (max-width: 520px) {
    gap: 7px;
    font-size: 15px;
  }
`;
const Logo = styled.img`
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 10px;
  @media (max-width: 520px) {
    width: 38px;
    height: 38px;
  }
`;
const Monogram = styled.span`
  font-family: Georgia, serif;
  font-size: 31px;
  color: var(--home-primary);
  font-weight: 400;
  @media (max-width: 520px) {
    font-size: 25px;
  }
`;
const LocationWrap = styled.div`
  margin-left: auto;
  position: relative;
  @media (max-width: 980px) {
    display: none;
  }
  @media (max-width: 760px) {
    display: block;
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 8px;
    margin-left: 0;
  }
`;
const Location = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid #eadfd3;
  border-radius: 999px;
  font-size: 14px;
  background: #fffdf9;
  color: #191816;
  cursor: pointer;
  max-width: 360px;
  span {
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }
  b {
    font-weight: 500;
    min-width: 0;
    max-width: 210px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  @media (max-width: 760px) {
    width: 100%;
    height: 40px;
    padding: 8px 12px;
    max-width: none;
    font-size: 12px;
    b {
      max-width: none;
      flex: 1;
      text-align: left;
    }
  }
`;
const LocationDropdown = styled.div<{ $open: boolean }>`
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  width: min(360px, 86vw);
  padding: 10px;
  border: 1px solid #eadfd3;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(50, 30, 15, 0.16);
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: translateY(${({ $open }) => ($open ? "0" : "-8px")});
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 210;
  > strong {
    display: block;
    padding: 7px 9px 9px;
    font-size: 14px;
  }
  @media (max-width: 760px) {
    width: 100%;
    max-height: min(360px, 55vh);
    overflow-y: auto;
  }
`;
const LocationOption = styled.button<{ $active: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px;
  border: 1px solid ${({ $active }) => ($active ? "var(--home-primary)" : "transparent")};
  border-radius: 11px;
  background: ${({ $active }) => ($active ? "#fff5ef" : "transparent")};
  color: #191816;
  text-align: left;
  cursor: pointer;
  &:hover { background: #fbf4ec; }
  > span { min-width: 0; }
  b, small { display: block; }
  b { font-size: 13px; margin-bottom: 3px; }
  small {
    color: #746d66;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
const Navigation = styled.nav<{ $open: boolean }>`
  display: flex;
  gap: 28px;
  height: 100%;
  align-items: center;
  a,
  button {
    border: 0;
    background: transparent;
    color: #191816;
    text-decoration: none;
    font: inherit;
    cursor: pointer;
  }
  a:first-child {
    color: var(--home-primary);
    font-weight: 700;
  }
  @media (max-width: 760px) {
    display: ${({ $open }) => ($open ? "flex" : "none")};
    position: fixed;
    top: 118px;
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
    a,
    button {
      padding: 14px;
      text-align: left;
      border-radius: 10px;
    }
    a:hover,
    button:hover {
      background: #fbf4ec;
    }
  }
`;
const BusinessStatus = styled.div<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 8px 11px;
  border: 1px solid ${({ $open }) => ($open ? "#bfe4ca" : "#eadfd3")};
  border-radius: 999px;
  background: ${({ $open }) => ($open ? "#f0faf1" : "#fbf8f4")};
  color: ${({ $open }) => ($open ? "#23743b" : "#766d64")};
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 4px ${({ $open }) => ($open ? "#dff3e3" : "#eee8e0")}; }
  small { color: #7a746d; font-size: 11px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
  @media (max-width: 1160px) { small { display: none; } }
  @media (max-width: 980px) { display: none; }
`;
const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  margin-left: auto;
`;
const RoundButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid #eadfd3;
  display: grid;
  place-items: center;
  color: #191816;
  cursor: pointer;
  @media (max-width: 520px) {
    display: none;
  }
`;
const ProfileWrap = styled.div`
  position: relative;
`;
const AvatarButton = styled.button<{ $open: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid
    ${({ $open }) => ($open ? "var(--home-primary)" : "#eadfd3")};
  background: ${({ $open }) => ($open ? "#fdeee7" : "#fff")};
  color: ${({ $open }) => ($open ? "var(--home-primary)" : "#191816")};
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.18s;
  font-family: inherit;
  &:hover {
    border-color: var(--home-primary);
    background: #fdeee7;
    color: var(--home-primary);
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
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: translateY(${({ $open }) => ($open ? "0" : "-8px")});
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
  color: var(--home-primary);
  font-weight: 800;
  font-size: 13px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-family: inherit;
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
  color: ${({ $danger }) => ($danger ? "#c94040" : "#191816")};
  text-align: left;
  transition: background 0.15s;

  &:hover {
    background: ${({ $danger }) => ($danger ? "#fef2f2" : "#f5f0ea")};
  }

  svg {
    flex-shrink: 0;
  }
`;
const CartButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: 0;
  border-radius: 13px;
  background: var(--home-primary);
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
    color: var(--home-primary);
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
const MobileMenu = styled.button`
  display: none;
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  color: #191816;
  place-items: center;
  @media (max-width: 760px) {
    display: grid;
  }
`;
