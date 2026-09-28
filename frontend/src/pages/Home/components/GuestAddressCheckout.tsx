import { ArrowLeft, LockKeyhole, ShoppingBag, UserRound } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { DeliveryAddressForm } from './DeliveryAddressForm';
import type { DeliveryAddress } from '../hooks/useDeliveryAddress';
import * as S from './GuestAddressCheckout.styles';

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Props = {
  primaryColor: string;
  brandName: string;
  logoUrl?: string;
  isOpen: boolean;
  deliveryTime?: string;
  cartCount: number;
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
  onLogin: () => void;
  onBack: () => void;
  onContinue: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function GuestAddressCheckout({
  primaryColor,
  brandName,
  logoUrl,
  isOpen,
  deliveryTime,
  cartCount,
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
  onLogin,
  onBack,
  onContinue,
  disabled = false,
  loading = false,
}: Props) {
  const locationLabel = [address.address, address.number, address.district, address.city, address.state]
    .filter(Boolean)
    .join(', ');

  return (
    <S.Page $primary={primaryColor}>
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
              {deliveryTime ? ` · ${deliveryTime}` : ''}
            </small>
          </span>
        </button>

        <div className="search-placeholder">Buscar no cardápio de {brandName}...</div>

        <div className="actions">
          <button type="button" onClick={onLogin}>
            <UserRound aria-hidden="true" /> Olá, Entrar
          </button>
          <button className="cart" type="button">
            <ShoppingBag aria-hidden="true" />
            Meu Carrinho
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
              >
                🛍 Retirada no Balcão
              </button>
            ) : null}
          </S.Methods>

          <S.LoginCard>
            <span className="icon"><UserRound aria-hidden="true" /></span>
            <span>
              <b>Faça login para salvar seus endereços e agilizar seus próximos pedidos</b>
              <button type="button" onClick={onLogin}>Entrar ou cadastrar-se</button>
            </span>
          </S.LoginCard>

          {orderType === 'delivery' ? (
            <S.AddressCard>
              <h2>Adicionar Novo Endereço</h2>
              <DeliveryAddressForm
                address={address}
                setAddress={setAddress}
                cepStatus={cepStatus}
                cepMessage={cepMessage}
                onCepChange={onCepChange}
                onCepLookup={onCepLookup}
                expanded
                figmaGuest
              />
            </S.AddressCard>
          ) : null}
        </S.Left>

        <S.Right>
          {orderType === 'delivery' ? (
            <S.MapCard>
              <h2>Mapa de Entrega</h2>
              <S.MapVisual aria-label="Prévia da região de entrega">
                <div className="grid" />
                <div className="route" />
                <span className="pin" />
              </S.MapVisual>
              <p>
                {locationLabel
                  ? `Endereço informado: ${locationLabel}. A disponibilidade e a taxa são validadas pelo sistema.`
                  : 'Preencha o endereço para o sistema validar disponibilidade, distância e taxa de entrega.'}
              </p>
            </S.MapCard>
          ) : null}

          <S.TotalCard>
            <div>
              <span>{orderType === 'delivery' ? 'Total com Entrega' : 'Total para Retirada'}</span>
              <strong>{money(total)}</strong>
            </div>
            {orderType === 'delivery' ? (
              <small>Taxa de entrega: {deliveryFee > 0 ? money(deliveryFee) : 'Grátis'}</small>
            ) : null}
            <button type="button" disabled={disabled || loading} onClick={onContinue}>
              {loading ? 'Carregando...' : 'Continuar'}
            </button>
          </S.TotalCard>
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
