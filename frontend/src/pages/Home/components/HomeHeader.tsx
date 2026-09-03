import {
  Check,
  ChevronDown,
  Clock3,
  LogOut,
  LayoutDashboard,
  MapPin,
  Plus,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { HomeBrand } from '../types';
import type { CustomerAddress } from '../../../Services/customerAddressService';

type Props = {
  brand: HomeBrand;
  cartCount: number;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
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

export const HomeHeader = memo(function HomeHeader({
  brand,
  cartCount,
  userName,
  userEmail,
  userAvatar,
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
  const [avatarFailed, setAvatarFailed] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const locationTriggerRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    setAvatarFailed(false);
  }, [userAvatar]);

  const initials = userName
    ? userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'U';
  const showAvatar = Boolean(userAvatar && !avatarFailed);
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
          <Logo
            src={brand.logoUrl}
            alt={brand.name}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        ) : (
          <Monogram>{brand.monogram ?? brand.name.slice(0, 2)}</Monogram>
        )}
        <BrandName>{brand.name}</BrandName>
      </Brand>

      {isTableMenu && tableLabel && (
        <TableBadge aria-label={`Mesa ${String(tableLabel)}`}>
          <span>Mesa</span>
          <strong>{String(tableLabel).padStart(2, '0')}</strong>
        </TableBadge>
      )}

      {!isTableMenu && (
        <LocationWrap
          ref={locationRef}
          onKeyDown={(event) => {
            if (event.key !== 'Escape' || !locationOpen) return;
            event.stopPropagation();
            setLocationOpen(false);
            locationTriggerRef.current?.focus();
          }}
        >
          <Location
            ref={locationTriggerRef}
            type="button"
            aria-label={selectedAddress ? `Endereço de entrega: ${locationText}` : locationLabel}
            aria-expanded={locationOpen}
            aria-haspopup="dialog"
            aria-controls="home-delivery-address-menu"
            onClick={() => setLocationOpen((open) => !open)}
          >
            <MapPin size={17} aria-hidden="true" />
            <LocationCopy>
              <span>{locationLabel}</span>
              {locationText && <b>{locationText}</b>}
            </LocationCopy>
            <LocationChevron $open={locationOpen} aria-hidden="true">
              <ChevronDown size={16} />
            </LocationChevron>
          </Location>
          {locationOpen && (
            <LocationDropdown
              id="home-delivery-address-menu"
              $open
              role="dialog"
              aria-labelledby="home-delivery-address-title"
            >
              <LocationDropdownHeader>
                <div>
                  <small>Endereço de entrega</small>
                  <strong id="home-delivery-address-title">Onde deseja receber?</strong>
                </div>
                <DropdownClose
                  type="button"
                  aria-label="Fechar endereços"
                  onClick={() => {
                    setLocationOpen(false);
                    locationTriggerRef.current?.focus();
                  }}
                >
                  <X size={17} />
                </DropdownClose>
              </LocationDropdownHeader>
              {availableAddresses.length > 0 ? (
                <>
                  <LocationOptions role="group" aria-label="Endereços salvos">
                    {availableAddresses.map((address) => {
                      const active = String(address.id) === String(selectedAddressId);
                      const street = [address.address, address.number].filter(Boolean).join(', ');
                      const locality = [address.district, address.city].filter(Boolean).join(' • ');

                      return (
                        <LocationOption
                          type="button"
                          key={address.id}
                          $active={active}
                          aria-pressed={active}
                          aria-label={`${address.label || 'Endereço'}: ${street}, ${locality}${active ? '. Selecionado' : ''}`}
                          onClick={() => {
                            onSelectAddress?.(String(address.id));
                            setLocationOpen(false);
                          }}
                        >
                          <LocationOptionIcon $active={active}>
                            <MapPin size={16} aria-hidden="true" />
                          </LocationOptionIcon>
                          <LocationOptionText>
                            <LocationOptionTitle>
                              <b>{address.label || 'Endereço'}</b>
                              {active && (
                                <SelectedAddress>
                                  <Check size={12} />
                                  Selecionado
                                </SelectedAddress>
                              )}
                            </LocationOptionTitle>
                            <small>{street}</small>
                            {locality && <em>{locality}</em>}
                          </LocationOptionText>
                        </LocationOption>
                      );
                    })}
                  </LocationOptions>
                  <AddressAction
                    type="button"
                    onClick={() => {
                      setLocationOpen(false);
                      onManageAddresses?.();
                    }}
                  >
                    <Plus size={17} />
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
                    <Plus size={17} />
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
              {showAvatar ? (
                <AvatarPhoto
                  src={userAvatar}
                  alt=""
                  decoding="async"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                initials
              )}
            </AvatarButton>
          ) : (
            <RoundButton aria-label="Minha conta" onClick={onOpenProfile}>
              <UserRound size={20} />
            </RoundButton>
          )}

          <ProfileDropdown $open={profileOpen}>
            <DropdownArrow />
            <DropdownUser>
              <DropdownAvatar>
                {showAvatar ? (
                  <AvatarPhoto
                    src={userAvatar}
                    alt=""
                    decoding="async"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  initials
                )}
              </DropdownAvatar>
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
          {cartCount > 0 && <i>{cartCount}</i>}
        </CartButton>
      </Actions>
    </Header>
  );
});

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
  height: 76px;
  padding: 0 clamp(18px, 3.4vw, 54px);
  display: flex;
  align-items: center;
  gap: clamp(10px, 1.45vw, 28px);
  border-bottom: 1px solid #dfe4df;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  @media (max-width: 1380px) {
    padding-inline: 24px;
  }
  @media (max-width: 1040px) {
    height: auto;
    padding: 10px 18px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    grid-template-areas:
      'brand status actions'
      'footer footer footer';
    column-gap: 12px;
    row-gap: 8px;
  }
  @media (max-width: 760px) {
    --home-control-height: 40px;
    height: auto;
    min-height: 0;
    padding: 10px 14px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'brand actions'
      'footer status';
    align-items: center;
    column-gap: 12px;
    row-gap: 8px;
    background: #fffdf9;
    backdrop-filter: none;
  }
  @media (max-width: 520px) {
    --home-control-height: 40px;
  }
  @media (max-width: 360px) {
    --home-control-height: 36px;
    padding: 9px 10px;
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
  font-size: 18px;
  strong {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 1040px) {
    grid-area: brand;
    width: 100%;
    flex: none;
    gap: 10px;
    white-space: normal;
    font-size: clamp(15px, 4.2vw, 18px);
    line-height: 1.18;

    strong {
      overflow: visible;
      text-overflow: clip;
      white-space: normal;
      overflow-wrap: anywhere;
    }
  }
  @media (max-width: 520px) {
    gap: 7px;
  }
`;
const BrandName = styled.strong`
  min-width: 0;

  @media (max-width: 760px) {
    display: block;
    flex: 1;
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
    overflow-wrap: anywhere;
  }
`;
const Logo = styled.img`
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 10px;
  @media (max-width: 520px) {
    width: 38px;
    height: 38px;
  }
  @media (max-width: 360px) {
    width: 34px;
    height: 34px;
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
  @media (max-width: 1040px) {
    grid-area: footer;
    width: 100%;
    min-width: 0;
    max-width: none;
    margin-left: 0;
  }
  @media (max-width: 760px) {
    grid-area: footer;
    position: relative;
    inset: auto;
    width: 100%;
    min-width: 0;
    max-width: none;
    margin-left: 0;
  }
  @media (max-width: 360px) {
    inset: auto;
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
  border: 1px solid #dfe4df;
  border-radius: 7px;
  font-size: 14px;
  background: #f8faf8;
  color: #17211d;
  cursor: pointer;
  max-width: 100%;

  > svg {
    flex: 0 0 auto;
    color: var(--home-primary);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 24%, transparent);
    outline-offset: 2px;
  }

  @media (max-width: 760px) {
    width: 100%;
    padding: 0 12px;
    max-width: none;
    font-size: 12px;
  }
`;
const LocationCopy = styled.span`
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  text-align: left;

  > span {
    flex: 0 0 auto;
    font-weight: 700;
    white-space: nowrap;
  }

  > b {
    min-width: 0;
    overflow: hidden;
    color: #5d625e;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 760px) {
    align-content: center;
    align-items: start;
    display: grid;
    gap: 1px;

    > span {
      font-size: 10px;
      line-height: 1.05;
    }

    > b {
      width: 100%;
      font-size: 12px;
      line-height: 1.15;
    }
  }
`;
const LocationChevron = styled.span<{ $open: boolean }>`
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  display: grid;
  place-items: center;
  color: #626963;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
  transition: transform 0.18s ease;
`;
const LocationDropdown = styled.div<{ $open: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: min(390px, calc(100vw - 32px));
  max-width: none;
  max-height: min(430px, calc(100vh - 110px));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 1px solid #eadfd3;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(50, 30, 15, 0.16);
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: translateY(${({ $open }) => ($open ? '0' : '-8px')});
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  z-index: 210;

  @media (max-width: 760px) {
    width: calc(100vw - 28px);
    max-width: none;
    max-height: min(360px, calc(100vh - 150px));
    padding: 7px;
  }

  @media (max-width: 380px) {
    width: calc(100vw - 20px);
    padding: 6px;
  }
`;
const LocationDropdownHeader = styled.header`
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 4px 8px 8px;
  border-bottom: 1px solid #eee8e1;

  > div {
    min-width: 0;
  }

  small,
  strong {
    display: block;
  }

  small {
    margin-bottom: 2px;
    color: #77716b;
    font-size: 11px;
    line-height: 1.2;
  }

  strong {
    color: #191816;
    font-size: 14px;
    line-height: 1.25;
  }
`;
const DropdownClose = styled.button`
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid #e5e2dd;
  border-radius: 6px;
  background: #fff;
  color: #4d514d;
  cursor: pointer;

  &:hover {
    border-color: #cfc9c1;
    background: #f7f6f3;
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 24%, transparent);
    outline-offset: 1px;
  }
`;
const LocationOptions = styled.div`
  min-height: 0;
  overflow-y: auto;
  display: grid;
  gap: 4px;
  padding: 6px 0;
`;
const LocationOption = styled.button<{ $active: boolean }>`
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid
    ${({ $active }) => ($active ? 'color-mix(in srgb, var(--home-primary) 54%, #fff)' : '#ebe8e3')};
  border-radius: 7px;
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--home-primary) 7%, #fff)' : '#fff'};
  color: #191816;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;

  &:hover {
    border-color: #d8d1c8;
    background: #faf8f5;
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 22%, transparent);
    outline-offset: 1px;
  }

  @media (max-width: 520px) {
    align-items: flex-start;
    padding: 7px;
    gap: 8px;
  }

  @media (max-width: 360px) {
    padding: 6px;
  }
`;
const LocationOptionIcon = styled.span<{ $active: boolean }>`
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--home-primary) 14%, #fff)' : '#f2f3f0'};
  color: ${({ $active }) => ($active ? 'var(--home-primary)' : '#606761')};
`;
const LocationOptionText = styled.span`
  min-width: 0;
  flex: 1;

  > small,
  > em {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  > small {
    margin-top: 2px;
    color: #4f544f;
    font-size: 12px;
    line-height: 1.25;
  }

  > em {
    margin-top: 1px;
    color: #807970;
    font-size: 11px;
    font-style: normal;
    line-height: 1.25;
  }
`;
const LocationOptionTitle = styled.span`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;

  > b {
    min-width: 0;
    overflow: hidden;
    font-size: 13px;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
const SelectedAddress = styled.span`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--home-primary) 13%, #fff);
  color: color-mix(in srgb, var(--home-primary) 84%, #2b201a);
  font-size: 10px;
  font-weight: 750;
  line-height: 1.2;
`;
const EmptyAddress = styled.div`
  padding: 14px 10px 4px;
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
  min-height: 40px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 12px;
  border: 0;
  border-radius: 7px;
  background: var(--home-primary);
  color: #fff;
  font: inherit;
  font-size: 13px;
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
    min-height: 38px;
    font-size: 13px;
    padding-inline: 10px;
  }
`;
const BusinessStatus = styled.div<{ $open: boolean }>`
  height: var(--home-control-height);
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 0 11px;
  border: 1px solid ${({ $open }) => ($open ? '#bfe4ca' : '#f1aaa4')};
  border-radius: 7px;
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
  @media (max-width: 1040px) {
    grid-area: status;
    justify-self: end;
    padding: 0 9px;
    font-size: 11px;
    margin-left: auto;
  }
  @media (max-width: 760px) {
    grid-area: status;
    justify-self: start;
    margin-left: 0;
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
      max-width: none;
      font-size: 0;
    }
    span::after {
      content: '${({ $open }) => ($open ? 'Aberto' : 'Fechado')}';
      font-size: 10px;
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

  @media (max-width: 1040px) {
    grid-area: footer;
    position: static;
    justify-self: start;
    padding: 7px 10px;
  }

  @media (max-width: 360px) {
    padding: 6px 9px;
  }
`;
const Actions = styled.div`
  min-width: 0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  margin-left: auto;
  @media (max-width: 1040px) {
    grid-area: actions;
    justify-self: end;
    margin-left: 0;
  }
  @media (max-width: 360px) {
    gap: 6px;
  }
`;
const RoundButton = styled.button`
  width: var(--home-control-height);
  height: var(--home-control-height);
  border-radius: 50%;
  background: transparent;
  border: 1px solid #dfe4df;
  display: grid;
  place-items: center;
  color: #17211d;
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
  overflow: hidden;
  padding: 0;
  transition:
    background-color 0.18s,
    border-color 0.18s,
    color 0.18s,
    transform 0.18s;
  font-family: inherit;
  &:hover {
    border-color: var(--home-primary);
    background: #fdeee7;
    color: var(--home-primary);
  }
`;
const AvatarPhoto = styled.img`
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
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
const CartButton = styled.button`
  position: relative;
  height: var(--home-control-height);
  padding: 0 18px;
  border: 0;
  border-radius: 7px;
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
