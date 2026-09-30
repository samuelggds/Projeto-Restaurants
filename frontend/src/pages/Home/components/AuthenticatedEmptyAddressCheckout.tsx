import { ArrowLeft, MapPin, Search, ShoppingBag, UserRound } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { AddressLocationMap } from './AddressLocationMap';
import { DeliveryAddressForm } from './DeliveryAddressForm';
import type { DeliveryAddress } from '../hooks/useDeliveryAddress';
import type { CartItem } from '../hooks/useCart';
import { BRAZIL_PHONE_CHECKOUT_MESSAGE, formatBrazilPhoneInput, isValidWhatsappOrderPhone } from '../domain/checkout';
import * as S from './AuthenticatedEmptyAddressCheckout.styles';

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Props = {
  primaryColor: string;
  restaurantId: number | null;
  brandName: string;
  logoUrl?: string;
  userName?: string;
  customerPhone: string;
  onCustomerPhoneChange: (value: string) => void;
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
  address: DeliveryAddress;
  setAddress: Dispatch<SetStateAction<DeliveryAddress>>;
  cepStatus: 'idle' | 'loading' | 'success' | 'error';
  cepMessage: string;
  onCepChange: (value: string) => void;
  onCepLookup: (value: string) => Promise<void>;
  onOrderTypeChange: (value: 'delivery' | 'pickup') => void;
  onRegisterAddress: () => void;
  onBack: () => void;
  onContinue: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function AuthenticatedEmptyAddressCheckout({
  primaryColor,
  restaurantId,
  brandName,
  logoUrl,
  userName,
  customerPhone,
  onCustomerPhoneChange,
  isOpen,
  cart,
  cartCount,
  subtotal,
  total,
  deliveryFee,
  orderType,
  allowDelivery,
  allowPickup,
  address,
  setAddress,
  cepStatus,
  cepMessage,
  onCepChange,
  onCepLookup,
  onOrderTypeChange,
  onRegisterAddress,
  onBack,
  onContinue,
  disabled = false,
  loading = false,
}: Props) {

  return (
    <S.Page $primary={primaryColor} role="dialog" aria-modal="true" aria-label="Finalizar pedido">
      <S.MobileStatus aria-hidden="true">
        <strong>9:41</strong>
        <span>•••</span>
      </S.MobileStatus>

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
          <span className="brand-copy">
            <b>{brandName}</b>
            <small>
              <i className={isOpen ? 'open' : ''} />
              {isOpen ? 'Aberto agora' : 'Fechado agora'}
            </small>
          </span>
        </button>

        <div className="search">
          <Search aria-hidden="true" />
          <span>Buscar no cardápio de {brandName}...</span>
        </div>

        <div className="actions">
          <button type="button" className="account">
            <UserRound aria-hidden="true" />
            <span>{userName ? `Olá, ${userName.split(' ')[0]}` : 'Minha conta'}</span>
          </button>
          <button className="cart" type="button">
            <ShoppingBag aria-hidden="true" />
            <span>Meu Carrinho</span>
            {cartCount > 0 ? <i>{cartCount}</i> : null}
          </button>
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
                🛵 Entrega
              </button>
            ) : null}
            {allowPickup ? (
              <button
                type="button"
                className={orderType === 'pickup' ? 'active' : ''}
                onClick={() => onOrderTypeChange('pickup')}
                aria-label="Retirada"
              >
                🛍 Retirar no local
              </button>
            ) : null}
          </S.Methods>

          <S.ContactCard>
            <label htmlFor="authenticated-empty-order-phone">Telefone / WhatsApp</label>
            <input
              id="authenticated-empty-order-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={formatBrazilPhoneInput(customerPhone)}
              maxLength={24}
              required
              placeholder="(85) 99999-9999"
              aria-invalid={Boolean(customerPhone) && !isValidWhatsappOrderPhone(customerPhone)}
              onChange={(event) => onCustomerPhoneChange(formatBrazilPhoneInput(event.target.value))}
            />
            <small>Obrigatório para finalizar o pedido.</small>
            {!isValidWhatsappOrderPhone(customerPhone) ? (
              <div className="phone-warning" role="alert">
                <strong>Confira o telefone</strong>
                <span>{BRAZIL_PHONE_CHECKOUT_MESSAGE}</span>
              </div>
            ) : null}
          </S.ContactCard>

          {orderType === 'delivery' ? (
            <>
              <S.SectionTitle>Seus endereços</S.SectionTitle>
              <S.EmptyCard>
                <span className="icon"><MapPin aria-hidden="true" /></span>
                <div>
                  <b>Você ainda não tem endereços salvos</b>
                  <small>Cadastre um endereço para agilizar seus próximos pedidos</small>
                </div>
                <button type="button" onClick={onRegisterAddress}>Cadastrar Endereço</button>
              </S.EmptyCard>

              <S.FormCard>
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
              </S.FormCard>

              <S.MapCard>
                <h2>Localização no Mapa</h2>
                <AddressLocationMap
                  restaurantId={restaurantId}
                  address={address}
                  primaryColor={primaryColor}
                />
                <p>A disponibilidade e a taxa continuam sendo validadas pelo sistema para o endereço informado.</p>
              </S.MapCard>
            </>
          ) : null}
        </S.Left>

        <S.Right>
          <S.SummaryCard>
            <h2>Resumo do pedido</h2>
            <div className="items">
              {cart.slice(0, 3).map((item) => (
                <div key={item.cartId || item.productId} className="item">
                  <span>{item.name}</span>
                  <strong>{money(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            <div className="row"><span>Taxa de entrega</span><strong>{deliveryFee > 0 ? money(deliveryFee) : 'Grátis'}</strong></div>
            <div className="divider" />
            <div className="total"><span>Total com entrega</span><strong>{money(total)}</strong></div>
            <button type="button" disabled={disabled || loading} onClick={onContinue}>
              {loading ? 'Carregando...' : 'Continuar para Pagamento'}
            </button>
          </S.SummaryCard>
        </S.Right>
      </S.Content>

      <S.DesktopFooter>
        <div className="top">
          <section>
            <div className="footer-brand"><span>{logoUrl ? <img src={logoUrl} alt="" /> : brandName.slice(0, 1).toUpperCase()}</span><b>{brandName}</b></div>
            <p>Sua experiência gourmet completa, direto do conforto de sua casa. O melhor do {brandName} entregue rápido.</p>
          </section>
          <section><b>Nossos Links</b><span>Cardápio</span><span>Cupons Ativos</span><span>Perguntas Frequentes</span></section>
          <section><b>Suporte</b><span>Falar no Chat</span><span>Central de Ajuda</span><a href="/termos/">Termos de Serviço</a></section>
          <section><b>Sua Loja Segura</b><p>GastroNexa é multi-tenant. Cada restaurante é operado diretamente por seu administrador autorizado.</p></section>
        </div>
        <div className="bottom"><span>© {new Date().getFullYear()} {brandName}. Todos os direitos reservados.</span><span className="legal-links"><a href="/privacidade/">Privacidade</a><span aria-hidden="true">·</span><a href="/cookies/">Cookies</a></span></div>
      </S.DesktopFooter>

      <S.MobileAction>
        <button type="button" disabled={disabled || loading} onClick={onContinue}>
          {loading ? 'Carregando...' : 'Continuar'}
        </button>
      </S.MobileAction>
    </S.Page>
  );
}
