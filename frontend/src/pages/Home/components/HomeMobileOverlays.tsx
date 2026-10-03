import {
  Check,
  ChevronRight,
  CircleHelp,
  MapPin,
  Plus,
  Settings,
  ShoppingBag,
  Star,
  TicketPercent,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import type { CustomerAddress } from '../../../Services/customerAddressService';
import type { HomeProfileView } from '../types';
import * as S from '../FigmaDeliveryExperience.styles';

export function ProfileQuickMenuOverlay({
  open,
  closing,
  userName,
  userAvatar,
  userInitials,
  showAvatar,
  addressCount,
  onAvatarError,
  onClose,
  onFinishTransition,
  onOpenFullProfile,
  onOpenDestination,
}: {
  open: boolean;
  closing: boolean;
  userName?: string;
  userAvatar?: string;
  userInitials: string;
  showAvatar: boolean;
  addressCount: number;
  onAvatarError: () => void;
  onClose: (action?: () => void) => void;
  onFinishTransition: () => void;
  onOpenFullProfile?: () => void;
  onOpenDestination: (view: HomeProfileView) => void;
}) {
  if (!open) return null;

  return (
    <S.ProfileQuickMenuBackdrop
      className={closing ? 'closing' : undefined}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <S.ProfileQuickMenuSheet
        className={closing ? 'closing' : undefined}
        aria-labelledby="profile-quick-menu-title"
        aria-modal="true"
        role="dialog"
        onAnimationEnd={(event) => {
          if (
            closing &&
            event.target === event.currentTarget &&
            event.animationName === 'profile-quick-sheet-out'
          ) {
            onFinishTransition();
          }
        }}
      >
        <div className="quick-profile-head">
          <span className="quick-avatar" aria-hidden="true">
            {showAvatar && userAvatar ? (
              <img src={userAvatar} alt="" onError={onAvatarError} />
            ) : userInitials !== '•' ? (
              userInitials
            ) : (
              <UserRound />
            )}
          </span>
          <span className="quick-profile-copy">
            <small>MINHA CONTA</small>
            <b id="profile-quick-menu-title">{userName || 'Cliente'}</b>
          </span>
          <button
            className="quick-close"
            type="button"
            aria-label="Fechar atalhos da conta"
            onClick={() => onClose()}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <button
          className="open-full-profile"
          type="button"
          onClick={() => onClose(onOpenFullProfile)}
        >
          Ver perfil completo
          <ChevronRight aria-hidden="true" />
        </button>

        <nav className="quick-profile-links" aria-label="Atalhos da minha conta">
          <button type="button" onClick={() => onOpenDestination('orders')}>
            <ShoppingBag aria-hidden="true" />
            <span>Meus pedidos</span>
            <ChevronRight aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onOpenDestination('addresses')}>
            <MapPin aria-hidden="true" />
            <span>Endereços salvos</span>
            <em>{addressCount}</em>
            <ChevronRight aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onOpenDestination('paymentMethods')}>
            <WalletCards aria-hidden="true" />
            <span>Métodos de pagamento</span>
            <ChevronRight aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onOpenDestination('coupons')}>
            <TicketPercent aria-hidden="true" />
            <span>Meus Cupons</span>
            <ChevronRight aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onOpenDestination('loyalty')}>
            <Star aria-hidden="true" />
            <span>Programa de Fidelidade</span>
            <ChevronRight aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onOpenDestination('help')}>
            <CircleHelp aria-hidden="true" />
            <span>Ajuda e suporte</span>
            <ChevronRight aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onOpenDestination('settings')}>
            <Settings aria-hidden="true" />
            <span>Configurações</span>
            <ChevronRight aria-hidden="true" />
          </button>
        </nav>
      </S.ProfileQuickMenuSheet>
    </S.ProfileQuickMenuBackdrop>
  );
}

export function AddressPickerOverlay({
  open,
  savedAddresses,
  selectedAddressId,
  onClose,
  onSelect,
  onManageAddresses,
}: {
  open: boolean;
  savedAddresses: CustomerAddress[];
  selectedAddressId?: string | number;
  onClose: () => void;
  onSelect: (addressId: number) => void;
  onManageAddresses?: () => void;
}) {
  if (!open) return null;

  const selectedId = String(selectedAddressId ?? '');
  const addressOptions = [...savedAddresses].sort((left, right) => {
    const leftSelected = String(left.id) === selectedId;
    const rightSelected = String(right.id) === selectedId;
    if (leftSelected !== rightSelected) return leftSelected ? -1 : 1;
    if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
    return left.label.localeCompare(right.label, 'pt-BR');
  });

  return (
    <S.AddressPickerBackdrop
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <S.AddressPickerSheet aria-labelledby="address-picker-title" aria-modal="true" role="dialog">
        <div className="sheet-handle" aria-hidden="true" />
        <header>
          <div>
            <small>ENTREGA</small>
            <h2 id="address-picker-title">Onde você quer receber?</h2>
            <p>Escolha um endereço cadastrado para este pedido.</p>
          </div>
          <button
            className="sheet-close"
            type="button"
            aria-label="Fechar seleção de endereço"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="address-list">
          {addressOptions.map((address) => {
            const isSelected = String(address.id) === selectedId;
            const mainLine = [address.address, address.number]
              .map((part) => String(part || '').trim())
              .filter(Boolean)
              .join(', ');
            const locationLine = [address.district, address.city, address.state]
              .map((part) => String(part || '').trim())
              .filter(Boolean)
              .join(' • ');

            return (
              <button
                key={address.id}
                className={isSelected ? 'address-option selected' : 'address-option'}
                type="button"
                aria-label={`Usar endereço ${address.label || mainLine}`}
                aria-pressed={isSelected}
                onClick={() => onSelect(address.id)}
              >
                <span className="address-icon">
                  <MapPin aria-hidden="true" />
                </span>
                <span className="address-copy">
                  <span className="address-title-row">
                    <b>{address.label || 'Endereço'}</b>
                    {address.isDefault ? <em>Padrão</em> : null}
                  </span>
                  <strong>{mainLine || 'Endereço cadastrado'}</strong>
                  {locationLine ? <small>{locationLine}</small> : null}
                  {address.complement ? <small>{address.complement}</small> : null}
                </span>
                <span className="address-check" aria-hidden="true">
                  {isSelected ? <Check /> : null}
                </span>
              </button>
            );
          })}
        </div>

        {onManageAddresses ? (
          <button className="add-address" type="button" onClick={onManageAddresses}>
            <span>
              <Plus aria-hidden="true" />
            </span>
            <span>
              <b>Adicionar novo endereço</b>
              <small>Cadastre outro local para receber seus pedidos.</small>
            </span>
          </button>
        ) : null}
      </S.AddressPickerSheet>
    </S.AddressPickerBackdrop>
  );
}
