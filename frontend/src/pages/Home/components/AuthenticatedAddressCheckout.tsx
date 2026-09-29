import { ArrowLeft, Home, MapPin, Plus, ShoppingBag, UserRound, Briefcase } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { CustomerAddress } from '../../../Services/customerAddressService';
import type { CartItem } from '../hooks/useCart';
import type { DeliveryAddress } from '../hooks/useDeliveryAddress';
import { AddressLocationMap } from './AddressLocationMap';
import { DeliveryAddressForm } from './DeliveryAddressForm';
import * as S from './AuthenticatedAddressCheckout.styles';

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const addressLine = (address: CustomerAddress) =>
  [
    `${address.address}, ${address.number}`,
    address.complement || '',
    `${address.district}, ${address.city} - ${address.state}`,
  ]
    .filter(Boolean)
    .join(' - ');

type Props = {
  primaryColor: string;
  restaurantId: number | null;
  brandName: string;
  logoUrl?: string;
  userName: string;
  isOpen: boolean;
  deliveryTime?: string;
  cart: CartItem[];
  cartCount: number;
  subtotal: number;
  total: number;
  deliveryFee: number;
  orderType: 'delivery' | 'pickup';
  allowDelivery: boolean;
  allowPickup: boolean;
  savedAddresses: CustomerAddress[];
  selectedAddressId: string;
  address: DeliveryAddress;
  setAddress: Dispatch<SetStateAction<DeliveryAddress>>;
  cepStatus: 'idle' | 'loading' | 'success' | 'error';
  cepMessage: string;
  onCepChange: (value: string) => void;
  onCepLookup: (value: string) => Promise<void>;
  onOrderTypeChange: (value: 'delivery' | 'pickup') => void;
  onSelectAddress: (id: string) => void;
  onManageAddresses: () => void;
  onBack: () => void;
  onContinue: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function AuthenticatedAddressCheckout({
  primaryColor,
  restaurantId,
  brandName,
  logoUrl,
  userName,
  isOpen,
  cart,
  cartCount,
  subtotal,
  total,
  deliveryFee,
  orderType,
  allowDelivery,
  allowPickup,
  savedAddresses,
  selectedAddressId,
  address,
  setAddress,
  cepStatus,
  cepMessage,
  onCepChange,
  onCepLookup,
  onOrderTypeChange,
  onSelectAddress,
  onManageAddresses,
  onBack,
  onContinue,
  disabled = false,
  loading = false,
}: Props) {
  const hasSavedAddresses = savedAddresses.length > 0;

  return (
    <S.Page $primary={primaryColor} role="dialog" aria-modal="true" aria-label="Finalizar pedido">
      <S.MobileHeader>
        <button type="button" onClick={onBack} aria-label="Voltar">
          <ArrowLeft aria-hidden="true" />
        </button>
        <h1>Endereço de entrega</h1>
      </S.MobileHeader>

      <S.DesktopHeader>
        <button className="brand" type="button" onClick={onBack}>
          <span className="logo">
            {logoUrl ? <img src={logoUrl} alt="" /> : brandName.slice(0, 1)}
          </span>
          <span>
            <b>{brandName}</b>
            <small>
              <i className={isOpen ? 'open' : ''} />
              {isOpen ? 'Aberto agora' : 'Fechado agora'}
            </small>
          </span>
        </button>

        <div className="search-placeholder">Buscar no cardápio de {brandName}...</div>

        <div className="actions">
          <span className="account"><UserRound aria-hidden="true" /> Olá, {userName}</span>
          <span className="cart"><ShoppingBag aria-hidden="true" /> Meu Carrinho <i>{cartCount}</i></span>
        </div>
      </S.DesktopHeader>

      <S.Content>
        <S.Left>
          <h1>Método de Entrega & Endereço</h1>

          <S.Methods>
            {allowDelivery ? (
              <button
                type="button"
                className={orderType === 'delivery' ? 'active' : ''}
                onClick={() => onOrderTypeChange('delivery')}
              >
                🛵 Entrega em Domicílio
              </button>
            ) : null}
            {allowPickup ? (
              <button
                type="button"
                className={orderType === 'pickup' ? 'active' : ''}
                onClick={() => onOrderTypeChange('pickup')}
                aria-label="Retirada"
              >
                🏪 Retirada no Balcão
              </button>
            ) : null}
          </S.Methods>

          {orderType === 'delivery' ? (
            <>
              <S.SavedAddresses>
                <h2>{hasSavedAddresses ? 'Seus endereços salvos' : 'Seus endereços'}</h2>

                {hasSavedAddresses ? (
                  <S.AddressList>
                    {savedAddresses.map((saved, index) => {
                      const selected = String(saved.id) === selectedAddressId;
                      return (
                        <button
                          key={saved.id}
                          type="button"
                          className={selected ? 'selected' : ''}
                          onClick={() => onSelectAddress(String(saved.id))}
                        >
                          <span className="address-icon">
                            {saved.label.toLocaleLowerCase('pt-BR').includes('trabalho') ? (
                              <Briefcase aria-hidden="true" />
                            ) : (
                              <Home aria-hidden="true" />
                            )}
                          </span>
                          <span className="address-copy">
                            <b>
                              {saved.label || `Endereço ${index + 1}`}
                              {saved.isDefault ? ' (Principal)' : ''}
                            </b>
                            <small>{addressLine(saved)}</small>
                          </span>
                          <span className="radio" aria-hidden="true"><i /></span>
                        </button>
                      );
                    })}
                  </S.AddressList>
                ) : (
                  <S.EmptyAddresses>
                    <span className="empty-icon"><MapPin aria-hidden="true" /></span>
                    <div>
                      <b>Você ainda não tem endereços salvos</b>
                      <small>Cadastre um endereço para agilizar seus próximos pedidos</small>
                    </div>
                    <button type="button" onClick={onManageAddresses}>Cadastrar Endereço</button>
                  </S.EmptyAddresses>
                )}

                {hasSavedAddresses ? (
                  <button className="add-address" type="button" onClick={onManageAddresses}>
                    <Plus aria-hidden="true" /> Adicionar novo endereço
                  </button>
                ) : null}
              </S.SavedAddresses>

              {!hasSavedAddresses ? (
                <S.NewAddressCard>
                  <h2>Adicionar Endereço para Este Pedido</h2>
                  <DeliveryAddressForm
                    address={address}
                    setAddress={setAddress}
                    cepStatus={cepStatus}
                    cepMessage={cepMessage}
                    onCepChange={onCepChange}
                    onCepLookup={onCepLookup}
                    expanded
                    figmaAuthenticatedEmpty
                  />
                </S.NewAddressCard>
              ) : null}

              <S.MapCard>
                <h2>Localização no Mapa</h2>
                <AddressLocationMap
                  restaurantId={restaurantId}
                  address={address}
                  primaryColor={primaryColor}
                />
                <p>A disponibilidade e a taxa são validadas pelo sistema conforme o endereço selecionado.</p>
              </S.MapCard>
            </>
          ) : null}
        </S.Left>

        <S.Right>
          <S.SummaryCard>
            <h2>Resumo do pedido</h2>
            <div className="items">
              {cart.slice(0, 3).map((item) => (
                <div key={item.cartId || item.productId}>
                  <span>{item.quantity}x {item.name}</span>
                  <strong>{money(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            <div className="row"><span>Taxa de entrega</span><strong>{deliveryFee > 0 ? money(deliveryFee) : 'Grátis'}</strong></div>
            <div className="divider" />
            <div className="total"><span>Total com entrega</span><strong>{money(total)}</strong></div>
            <button type="button" disabled={disabled || loading} onClick={onContinue}>
              {loading ? 'Carregando...' : 'Continuar para pagamento'}
            </button>
          </S.SummaryCard>
        </S.Right>
      </S.Content>

      <S.DesktopFooter>
        <div className="top">
          <section>
            <div className="footer-brand"><span>G</span><b>GastroNexa</b></div>
            <p>Sua experiência gourmet completa, direto do conforto de sua casa. O melhor do {brandName} entregue rápido.</p>
          </section>
          <section><b>Nossos Links</b><span>Cardápio</span><span>Cupons Ativos</span><span>Perguntas Frequentes</span></section>
          <section><b>Suporte</b><span>Falar no Chat</span><span>Central de Ajuda</span><span>Termos de Serviço</span></section>
          <section><b>Sua Loja Segura</b><p>GastroNexa é multi-tenant. Cada restaurante é operado diretamente por seu administrador autorizado.</p></section>
        </div>
        <div className="bottom"><span>© {new Date().getFullYear()} GastroNexa & {brandName}. Todos os direitos reservados.</span><span>Privacidade · Cookies</span></div>
      </S.DesktopFooter>

      <S.MobileAction>
        <button type="button" disabled={disabled || loading} onClick={onContinue}>
          {loading ? 'Carregando...' : 'Continuar'}
        </button>
      </S.MobileAction>
    </S.Page>
  );
}
