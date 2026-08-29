import {
  Clock3,
  LogOut,
  LayoutDashboard,
  MapPin,
  Search,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { HomeBrand } from '../types';
import type { CustomerAddress } from '../../../Services/customerAddressService';

type Props = {
  brand: HomeBrand;
  cartCount: number;
  userName?: string;
  userEmail?: string;
  userLoggedIn?: boolean;
  isAdmin?: boolean;
  isTableMenu?: boolean;
  tableLabel?: string | number;
  savedAddresses?: CustomerAddress[];
  selectedAddressId?: string;
  onSelectAddress?: (addressId: string) => void;
  onManageAddresses?: () => void;
  onOpenProfile?: () => void;
  onOpenAdmin?: () => void;
  onOpenCart?: () => void;
  onSearch?: () => void;
  onLogout?: () => void;
  isRestaurantOpen?: boolean;
  businessHoursLabel?: string;
  availabilityLabel?: string;
  availabilityDetail?: string;
};

export function HomeHeader({
  brand,
  cartCount,
  userName,
  userEmail,
  userLoggedIn = false,
  isAdmin = false,
  isTableMenu = false,
  tableLabel,
  savedAddresses = [],
  selectedAddressId,
  onSelectAddress,
  onManageAddresses,
  onOpenProfile,
  onOpenAdmin,
  onOpenCart,
  onSearch,
  onLogout,
  isRestaurantOpen = false,
  businessHoursLabel = 'Horário não informado',
  availabilityLabel,
  availabilityDetail,
}: Props) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = userName
    ? userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'U';
  // Saved delivery addresses are private customer data. Even if stale props are
  // briefly present during logout, never expose them to an unauthenticated view.
  const availableAddresses = userLoggedIn ? savedAddresses : [];
  const selectedAddress = availableAddresses.find(
    (address) => String(address.id) === String(selectedAddressId),
  );
  const locationText = selectedAddress
    ? [selectedAddress.address, selectedAddress.number].filter(Boolean).join(', ')
    : '';
  const locationLabel = selectedAddress
    ? 'Entregar em'
    : availableAddresses.length > 0
      ? 'Escolher endereço'
      : 'Cadastrar endereço';
  const statusLabel = availabilityLabel || (isRestaurantOpen ? 'Aberto agora' : 'Fechado agora');
  const requestedDetail = (availabilityDetail || businessHoursLabel).replace(/^Hoje:\s*/i, '');
  const detailContradictsStatus = isRestaurantOpen
    ? /fechad/i.test(requestedDetail)
    : /abert/i.test(requestedDetail);
  const statusDetail = detailContradictsStatus ? '' : requestedDetail;
  const statusDescription = [statusLabel, statusDetail].filter(Boolean).join('. ');

  return (
    <Header $primary={brand.primaryColor ?? '#d64d08'}>
      <Brand href="#inicio" aria-label={brand.name}>
        {brand.logoUrl ? (
          <Logo src={brand.logoUrl} alt={brand.name} />
        ) : (
          <Monogram>{brand.monogram ?? brand.name.slice(0, 2)}</Monogram>
        )}
        <strong>{brand.name}</strong>
      </Brand>

      {isTableMenu && tableLabel && (
        <TableBadge aria-label={`Mesa ${String(tableLabel)}`}>
          <span>Mesa</span>
          <strong>{String(tableLabel).padStart(2, '0')}</strong>
        </TableBadge>
      )}

      {!isTableMenu && (
        <LocationWrap ref={locationRef}>
          <Location
            type="button"
            aria-label={selectedAddress ? `Endereço de entrega: ${locationText}` : locationLabel}
            aria-expanded={locationOpen}
            aria-controls="home-delivery-address-menu"
            onClick={() => setLocationOpen((open) => !open)}
          >
            <MapPin size={17} />
            <span>{locationLabel}</span>
            {locationText && <b>• {locationText}</b>}
          </Location>
          {locationOpen && (
            <LocationDropdown id="home-delivery-address-menu" $open>
              {availableAddresses.length > 0 ? (
                <>
                  <strong>Onde deseja receber?</strong>
                  {availableAddresses.map((address) => (
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
                        <small>
                          {address.address}, {address.number} • {address.district}
                        </small>
                      </span>
                    </LocationOption>
                  ))}
                  <AddressAction
                    type="button"
                    onClick={() => {
                      setLocationOpen(false);
                      onManageAddresses?.();
                    }}
                  >
                    Cadastrar outro endereço
                  </AddressAction>
                </>
              ) : (
                <EmptyAddress>
                  <MapPin size={23} />
                  <strong>
                    {userLoggedIn ? 'Cadastre seu endereço' : 'Entre para cadastrar um endereço'}
                  </strong>
                  <p>
                    {userLoggedIn
                      ? 'Salve um endereço para escolhê-lo nas próximas entregas.'
                      : 'Faça login para salvar e escolher seus endereços de entrega.'}
                  </p>
                  <AddressAction
                    type="button"
                    onClick={() => {
                      setLocationOpen(false);
                      onManageAddresses?.();
                    }}
                  >
                    {userLoggedIn ? 'Cadastrar endereço' : 'Entrar na conta'}
                  </AddressAction>
                </EmptyAddress>
              )}
            </LocationDropdown>
          )}
        </LocationWrap>
      )}

      <BusinessStatus
        $open={isRestaurantOpen}
        $tableMenu={isTableMenu}
        title={statusDescription}
        role="status"
        aria-label={statusDescription}
      >
        <i />
        <Clock3 size={15} />
        <span>{statusLabel}</span>
        {statusDetail && <small>{statusDetail}</small>}
      </BusinessStatus>

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
                <span className="name">{userName || 'Usuário'}</span>
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

        <CartButton aria-label={`Sacola com ${cartCount} itens`} onClick={onOpenCart}>
          <ShoppingBag size={19} />
          <span>Sacola</span>
          <i>{cartCount}</i>
        </CartButton>
      </Actions>
    </Header>
  );
}

const Header = styled.header<{ $primary: string }>`
  --home-primary: ${({ $primary }) => $primary};
  --home-control-height: 44px;
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  height: 82px;
  padding: 0 clamp(18px, 3.4vw, 54px);
  display: flex;
  align-items: center;
  gap: clamp(10px, 1.45vw, 28px);
  border-bottom: 1px solid #eadfd3;
  background: rgba(255, 253, 249, 0.96);
  backdrop-filter: blur(14px);
  @media (max-width: 1380px) {
    padding-inline: 24px;
  }
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
  @media (max-width: 520px) {
    --home-control-height: 40px;
  }
  @media (max-width: 360px) {
    --home-control-height: 36px;
    padding-inline: 10px;
    gap: 6px;
  }
`;
const Brand = styled.a`
  min-width: 0;
  flex: 0 1 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #191816;
  text-decoration: none;
  white-space: nowrap;
  font-size: 20px;
  strong {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 520px) {
    gap: 7px;
    font-size: 15px;
    strong {
      display: none;
    }
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
  flex: 1 1 260px;
  width: min(360px, 27vw);
  min-width: 180px;
  max-width: 360px;
  margin-left: auto;
  position: relative;
  @media (max-width: 980px) {
    width: min(300px, 34vw);
    min-width: 160px;
  }
  @media (max-width: 760px) {
    display: block;
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 8px;
    width: auto;
    min-width: 0;
    max-width: none;
    margin-left: 0;
  }
  @media (max-width: 360px) {
    right: 10px;
    left: 10px;
  }
`;
const Location = styled.button`
  width: 100%;
  height: var(--home-control-height);
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  border: 1px solid #eadfd3;
  border-radius: 999px;
  font-size: 14px;
  background: #fffdf9;
  color: #191816;
  cursor: pointer;
  max-width: 100%;
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
    padding: 0 12px;
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
  max-width: 100%;
  box-sizing: border-box;

  padding: 12px;

  border: 1px solid #eadfd3;
  border-radius: 16px;
  background: #fff;

  box-shadow: 0 18px 40px rgba(50, 30, 15, 0.16);

  opacity: ${({ $open }) => ($open ? 1 : 0)};

  transform: translateY(${({ $open }) => ($open ? '0' : '-8px')});

  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};

  transition:
    opacity 0.2s ease,
    transform 0.2s ease;

  z-index: 210;

  > strong {
    display: block;
    padding: 5px 7px 12px;
    font-size: 14px;
  }

  @media (max-width: 760px) {
    width: 100%;
    max-width: 100%;

    max-height: min(420px, 65vh);
    overflow-y: auto;

    padding: 10px;
  }

  @media (max-width: 380px) {
    padding: 8px;
    border-radius: 14px;
  }
`;
const LocationOption = styled.button<{ $active: boolean }>`
  width: 100%;
  min-width: 0;

  display: flex;
  align-items: center;
  gap: 12px;

  padding: 12px;

  /* cria espaço entre um endereço e outro */
  margin-bottom: 8px;

  border: 1px solid ${({ $active }) => ($active ? 'var(--home-primary)' : 'transparent')};

  border-radius: 11px;

  background: ${({ $active }) => ($active ? '#fff5ef' : 'transparent')};

  color: #191816;
  text-align: left;
  cursor: pointer;

  box-sizing: border-box;

  > svg {
    flex-shrink: 0;
  }

  &:hover {
    background: #fbf4ec;
  }

  > span {
    min-width: 0;
    flex: 1;
  }

  b,
  small {
    display: block;
  }

  b {
    font-size: 13px;
    margin-bottom: 4px;
  }

  small {
    color: #746d66;
    font-size: 12px;
    line-height: 1.4;

    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 520px) {
    align-items: flex-start;

    padding: 12px 10px;
    gap: 10px;

    > svg {
      margin-top: 2px;
    }

    b {
      font-size: 14px;
    }

    small {
      /*
       * Em celular pequeno deixamos o endereço quebrar
       * em mais de uma linha em vez de cortar.
       */
      white-space: normal;
      overflow: visible;
      text-overflow: unset;
      overflow-wrap: anywhere;
    }
  }

  @media (max-width: 360px) {
    padding: 11px 9px;

    b {
      font-size: 13px;
    }

    small {
      font-size: 11px;
    }
  }
`;
const EmptyAddress = styled.div`
  padding: 13px 11px 7px;
  color: #191816;
  text-align: center;

  > svg {
    margin-bottom: 7px;
    color: var(--home-primary);
  }

  > strong {
    display: block;
    font-size: 14px;
  }

  > p {
    margin: 6px 0 13px;
    color: #746d66;
    font-size: 12px;
    line-height: 1.45;
  }
`;
const AddressAction = styled.button`
  width: 100%;
  min-height: 44px;

  padding: 10px 12px;

  border: 0;
  border-radius: 10px;

  background: var(--home-primary);
  color: #fff;

  font: inherit;
  font-size: 14px;
  font-weight: 750;

  cursor: pointer;

  box-sizing: border-box;

  &:hover {
    filter: brightness(0.94);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 28%, transparent);

    outline-offset: 2px;
  }

  @media (max-width: 360px) {
    min-height: 42px;
    font-size: 13px;
    padding-inline: 10px;
  }
`;
const BusinessStatus = styled.div<{ $open: boolean; $tableMenu: boolean }>`
  height: var(--home-control-height);
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 0 11px;
  border: 1px solid ${({ $open }) => ($open ? '#bfe4ca' : '#f1aaa4')};
  border-radius: 999px;
  background: ${({ $open }) => ($open ? '#f0faf1' : '#fff1f0')};
  color: ${({ $open }) => ($open ? '#23743b' : '#bf3029')};
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 0 4px ${({ $open }) => ($open ? '#dff3e3' : '#ffe0dd')};
  }
  small {
    color: ${({ $open }) => ($open ? '#7a746d' : '#a43a35')};
    font-size: 11px;
    font-weight: 600;
  }
  @media (max-width: 1550px) {
    small {
      display: none;
    }
  }
  @media (max-width: 980px) {
    padding: 0 9px;
    font-size: 11px;
    margin-left: auto;
  }
  @media (max-width: 760px) {
    ${({ $tableMenu }) =>
      $tableMenu
        ? `
          position: absolute;
          left: 14px;
          bottom: 10px;
          margin-left: 0;
        `
        : 'margin-left: auto;'}
  }
  @media (max-width: 520px) {
    gap: 4px;
    padding: 0 8px;
    svg {
      display: none;
    }
    i {
      width: 6px;
      height: 6px;
      box-shadow: none;
    }
    span {
      max-width: 84px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;
const TableBadge = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  flex-shrink: 0;
  padding: 7px 11px;
  border: 1px solid #f0cdbd;
  border-radius: 999px;
  background: #fff5ef;
  color: #a8462b;
  white-space: nowrap;

  span {
    font-size: 10px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  strong {
    font-size: 16px;
    line-height: 1;
  }

  @media (max-width: 760px) {
    position: absolute;
    right: 14px;
    bottom: 10px;
    padding: 7px 10px;
  }

  @media (max-width: 360px) {
    right: 10px;
  }
`;
const Actions = styled.div`
  min-width: 0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  margin-left: auto;
  @media (max-width: 360px) {
    gap: 6px;
  }
`;
const RoundButton = styled.button`
  width: var(--home-control-height);
  height: var(--home-control-height);
  border-radius: 50%;
  background: transparent;
  border: 1px solid #eadfd3;
  display: grid;
  place-items: center;
  color: #191816;
  cursor: pointer;
`;
const ProfileWrap = styled.div`
  position: relative;
`;
const AvatarButton = styled.button<{ $open: boolean }>`
  width: var(--home-control-height);
  height: var(--home-control-height);
  border-radius: 50%;
  border: 2px solid ${({ $open }) => ($open ? 'var(--home-primary)' : '#eadfd3')};
  background: ${({ $open }) => ($open ? '#fdeee7' : '#fff')};
  color: ${({ $open }) => ($open ? 'var(--home-primary)' : '#191816')};
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
const CartButton = styled.button`
  position: relative;
  height: var(--home-control-height);
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
    width: var(--home-control-height);
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
  @media (max-width: 360px) {
    width: var(--home-control-height);
  }
`;
