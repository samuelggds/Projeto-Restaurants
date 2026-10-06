import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { CreditCard, LockKeyhole, Search, ShoppingBag, UserRound } from 'lucide-react';
import customerPaymentMethodService, {
  getPaymentMethodErrorMessage,
} from '../../../Services/customerPaymentMethodService';
import * as S from '../Profile.styles';
import { getCardBrandDetails, maskedCardNumber } from '../domain/cardBrand';
import { CardBrandLogo } from './CardBrandLogo';
import { PaymentCardVisual } from './PaymentCardVisual';
import { CustomerDesktopFooter } from '../../Home/components/CustomerDesktopFooter';
import type {
  MercadoPagoField,
  MercadoPagoInstance,
} from '../../../shared/payments/mercadoPagoSdk';

type ProviderConfig = Awaited<ReturnType<typeof customerPaymentMethodService.getConfig>>;

const sdkPromises = new Map<string, Promise<void>>();
function loadSdk(key: string, source: string, ready: () => boolean) {
  if (ready()) return Promise.resolve();
  const current = sdkPromises.get(key);
  if (current) return current;
  const next = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = source;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(`Não foi possível preparar a proteção do pagamento neste momento.`));
    document.head.appendChild(script);
  });
  sdkPromises.set(key, next);
  return next;
}

export function PaymentMethodModal({
  restaurantId,
  restaurantName,
  restaurantLogoUrl,
  restaurantDescription,
  userAvatarUrl,
  userName,
  userEmail,
  primaryColor,
  cartCount = 0,
  onClose,
  onSaved,
  onGoHome,
  onOpenSearch,
  onOpenCart,
  onCoupons,
  onHelp,
  onSupport,
}: {
  restaurantId: number;
  restaurantName: string;
  restaurantLogoUrl?: string;
  restaurantDescription?: string;
  userAvatarUrl?: string;
  userName?: string;
  userEmail?: string;
  primaryColor?: string;
  cartCount?: number;
  onClose: () => void;
  onSaved: () => void;
  onGoHome: () => void;
  onOpenSearch: () => void;
  onOpenCart: () => void;
  onCoupons?: () => void;
  onHelp?: () => void;
  onSupport?: () => void;
}) {
  const [holder, setHolder] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [taxId, setTaxId] = useState('');
  const [payerEmail, setPayerEmail] = useState(String(userEmail || '').trim().toLowerCase());
  const [secureExpiryValid, setSecureExpiryValid] = useState(false);
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mercadoPagoReady, setMercadoPagoReady] = useState(false);
  const [mercadoPagoBin, setMercadoPagoBin] = useState('');
  const [mercadoPagoBrand, setMercadoPagoBrand] = useState('');
  const mercadoPagoRef = useRef<MercadoPagoInstance | null>(null);
  const detectedBrand = getCardBrandDetails(mercadoPagoBrand || number || mercadoPagoBin);

  useEffect(() => {
    let active = true;
    customerPaymentMethodService
      .getConfig(restaurantId)
      .then((next) => {
        if (active) setConfig(next);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            getPaymentMethodErrorMessage(reason, 'Cadastro de cartões indisponível no momento.'),
          );
      });
    return () => {
      active = false;
    };
  }, [restaurantId]);

  useEffect(() => {
    if (config?.provider !== 'MERCADO_PAGO' || !config.publicKey) return;
    let active = true;
    const mountedFields: MercadoPagoField[] = [];
    void loadSdk('Mercado Pago', 'https://sdk.mercadopago.com/js/v2', () =>
      Boolean(window.MercadoPago),
    )
      .then(() => {
        if (!active || !window.MercadoPago || !config.publicKey) return;
        const instance = new window.MercadoPago(config.publicKey);
        const cardNumberField = instance.fields.create('cardNumber', {
          placeholder: '0000 0000 0000 0000',
        });
        cardNumberField.on?.('binChange', ({ bin }) => {
          const normalizedBin = String(bin || '')
            .replace(/\D/g, '')
            .slice(0, 8);
          if (!active) return;
          setMercadoPagoBin(normalizedBin);
          setMercadoPagoBrand('');
          if (normalizedBin.length < 6) return;
          void instance
            .getPaymentMethods({ bin: normalizedBin })
            .then((response) => {
              if (active) setMercadoPagoBrand(String(response.results?.[0]?.id || ''));
            })
            .catch(() => {});
        });
        const expirationField = instance.fields.create('expirationDate', { placeholder: 'MM/AA' });
        expirationField.on?.('validityChange', (event) => {
          if (!active) return;
          const hasErrors = Array.isArray(event.errorMessages) && event.errorMessages.length > 0;
          setSecureExpiryValid(!hasErrors);
        });
        const fields = [
          cardNumberField,
          expirationField,
          instance.fields.create('securityCode', { placeholder: '3 dígitos' }),
        ];
        fields[0].mount('mercado-pago-card-number');
        fields[1].mount('mercado-pago-expiration');
        fields[2].mount('mercado-pago-security-code');
        mountedFields.push(...fields);
        mercadoPagoRef.current = instance;
        setMercadoPagoReady(true);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Não foi possível preparar a proteção do pagamento neste momento.',
          );
      });
    return () => {
      active = false;
      mountedFields.forEach((field) => field.unmount?.());
      mercadoPagoRef.current = null;
      setMercadoPagoReady(false);
      setMercadoPagoBin('');
      setMercadoPagoBrand('');
      setSecureExpiryValid(false);
    };
  }, [config]);

  async function securePayload(
    providerConfig: ProviderConfig,
    digits: string,
    _month: number,
    _fullYear: number,
  ) {
    return { cardData: { number: digits, securityCode: cvv }, holderTaxId: taxId };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const digits = number.replace(/\D/g, '');
    const [month, year] = expiry.split('/').map(Number);
    const fullYear = year < 100 ? 2000 + year : year;
    setSaving(true);
    setError('');
    try {
      const normalizedPayerEmail = payerEmail.trim().toLowerCase();
      if (
        normalizedPayerEmail.length < 3 ||
        normalizedPayerEmail.length > 254 ||
        /\s/u.test(normalizedPayerEmail) ||
        !/^[^@]+@[^@]+\.[^@]+$/u.test(normalizedPayerEmail)
      ) {
        throw new Error('Informe um e-mail válido do pagador para salvar o cartão.');
      }

      const providerConfig = config || (await customerPaymentMethodService.getConfig(restaurantId));
      let secured: Record<string, unknown>;
      let display: { brand: string; last4: string; month: number; year: number } = {
        brand: detectedBrand.id,
        last4: digits.slice(-4),
        month,
        year: fullYear,
      };
      if (providerConfig.provider === 'MERCADO_PAGO') {
        const mp = mercadoPagoRef.current;
        if (!mp || !mercadoPagoReady)
          throw new Error('Aguarde um instante enquanto preparamos a tela de pagamento.');
        const token = await mp.fields.createCardToken({
          cardholderName: holder.trim(),
          identificationType: 'CPF',
          identificationNumber: taxId.replace(/\D/g, ''),
        });
        if (!token.id) {
          throw new Error(
            'Não foi possível validar este cartão no momento. Verifique os dados e tente novamente.',
          );
        }
        secured = {
          cardToken: token.id,
          holderTaxId: taxId,
        };
        display = {
          brand: String(token.payment_method_id || mercadoPagoBrand || detectedBrand.id),
          last4: String(token.last_four_digits || ''),
          month: Number(token.expiration_month || 0),
          year: Number(token.expiration_year || 0),
        };
      } else {
        secured = await securePayload(providerConfig, digits, month, fullYear);
      }
      await customerPaymentMethodService.create({
        restaurantId,
        ...secured,
        payerEmail: normalizedPayerEmail,
        holderName: holder.trim(),
        brand: display.brand || undefined,
        last4: display.last4 || undefined,
        expMonth: display.month || undefined,
        expYear: display.year || undefined,
      });
      setNumber('');
      setCvv('');
      onSaved();
    } catch (reason) {
      setError(getPaymentMethodErrorMessage(reason, 'Não foi possível cadastrar o cartão.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <S.PaymentScreen style={{ '--p': primaryColor || '#ff5a2c' } as CSSProperties}>
      <S.PaymentDesktopHeader>
        <button className="brand" type="button" onClick={onGoHome}>
          <span className="brand-logo">
            {restaurantLogoUrl ? <img src={restaurantLogoUrl} alt="" /> : restaurantName.slice(0, 1)}
          </span>
          <span className="brand-copy">
            <b>{restaurantName}</b>
            <small><i /> Aberto agora</small>
          </span>
        </button>
        <button className="search" type="button" onClick={onOpenSearch}>
          <Search aria-hidden="true" />
          <span>Buscar no cardápio de {restaurantName}...</span>
        </button>
        <div className="actions">
          <button className="account" type="button" onClick={onClose}>
            <UserRound aria-hidden="true" /><span>Olá, Cliente</span>
          </button>
          <button className="cart" type="button" onClick={onOpenCart}>
            <ShoppingBag aria-hidden="true" /><span>Meu Carrinho</span>
            {cartCount > 0 ? <b>{cartCount}</b> : null}
          </button>
        </div>
      </S.PaymentDesktopHeader>

      <S.PaymentMobileHeader>
        <button className="customer-avatar" type="button" onClick={onClose} aria-label="Voltar para minha conta">
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt="" />
          ) : (
            <span>{String(userName || 'Cliente').trim().slice(0, 1).toUpperCase()}</span>
          )}
        </button>
        <strong>Novo Cartão</strong>
        <span />
      </S.PaymentMobileHeader>

      <S.PaymentScreenMain>
        <S.PaymentHeading>
          <span>Métodos de Pagamento</span>
          <h1>Adicionar Novo Cartão</h1>
        </S.PaymentHeading>

        <S.PaymentModalCard onSubmit={submit} aria-label="Cadastrar cartão">
          <PaymentCardVisual
            brand={detectedBrand.id}
            numberLabel={number ? maskedCardNumber(number) : '•••• •••• •••• ••••'}
            holderName={holder.trim() || 'TITULAR DO CARTÃO'}
            expiryLabel={
              config?.provider === 'MERCADO_PAGO'
                ? secureExpiryValid
                  ? '••/••'
                  : 'MM/AA'
                : expiry || 'MM/AA'
            }
          />

          <div className="payment-fields">
            <label>
              Nome impresso no cartão
              <input
                autoComplete="cc-name"
                placeholder="Como aparece gravado no cartão"
                value={holder}
                onChange={(event) => setHolder(event.target.value)}
                maxLength={60}
                required
              />
            </label>

            {config?.provider === 'MERCADO_PAGO' ? (
              <>
                <label>
                  Número do cartão
                  <div className="payment-number-field">
                    <div id="mercado-pago-card-number" className="mp-secure-field" />
                    <span className="card-brand-pill">
                      {detectedBrand.id === 'card'
                        ? <CreditCard className="generic-number-icon" />
                        : <CardBrandLogo brand={detectedBrand.id} />}
                    </span>
                  </div>
                </label>
                <div className="payment-row">
                  <label>Validade<div id="mercado-pago-expiration" className="mp-secure-field" /></label>
                  <label>CVV<div id="mercado-pago-security-code" className="mp-secure-field" /></label>
                </div>
              </>
            ) : (
              <>
                <label>
                  Número do cartão
                  <div className="payment-number-field">
                    <input
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="0000 0000 0000 0000"
                      value={number}
                      onChange={(event) =>
                        setNumber(event.target.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim())
                      }
                      minLength={15}
                      required
                    />
                    <span className="card-brand-pill">
                      {detectedBrand.id === 'card'
                        ? <CreditCard className="generic-number-icon" />
                        : <CardBrandLogo brand={detectedBrand.id} />}
                    </span>
                  </div>
                </label>
                <div className="payment-row">
                  <label>
                    Validade
                    <input
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/AA"
                      value={expiry}
                      onChange={(event) =>
                        setExpiry(event.target.value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2'))
                      }
                      pattern="\d{2}/\d{2}"
                      required
                    />
                  </label>
                  <label>
                    CVV
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="3 dígitos"
                      value={cvv}
                      onChange={(event) => setCvv(event.target.value.replace(/\D/g, '').slice(0, 4))}
                      minLength={3}
                      required
                    />
                  </label>
                </div>
              </>
            )}

            <label>
              E-mail do pagador
              <input
                type="email"
                autoComplete="email"
                value={payerEmail}
                onChange={(event) => setPayerEmail(event.target.value.slice(0, 160))}
                required
              />
              <small>Use o mesmo e-mail que você informa ao pagar com este cartão.</small>
            </label>

            <label>
              CPF do titular
              <input
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={taxId}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
                  setTaxId(
                    digits
                      .replace(/^(\d{3})(\d)/, '$1.$2')
                      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
                      .replace(/\.(\d{3})(\d)/, '.$1-$2'),
                  );
                }}
                minLength={14}
                required
              />
            </label>
          </div>

          <p className="payment-security">
            <LockKeyhole />
            <span>
              <strong>Seus dados são criptografados e protegidos</strong>
              <small>Os dados sensíveis são tokenizados pelo provedor de pagamento.</small>
            </span>
          </p>

          {error ? <p className="payment-error" role="alert">{error}</p> : null}

          <footer className="payment-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
            <button
              type="submit"
              disabled={saving || !config || (config.provider === 'MERCADO_PAGO' && !mercadoPagoReady)}
            >
              {saving ? 'Salvando...' : 'Salvar Novo Cartão'}
            </button>
          </footer>
        </S.PaymentModalCard>
      </S.PaymentScreenMain>

      <CustomerDesktopFooter
        restaurantName={restaurantName}
        restaurantLogoUrl={restaurantLogoUrl}
        description={restaurantDescription || `Sua experiência gourmet completa, direto do conforto de sua casa. O melhor do ${restaurantName} entregue rápido.`}
        primaryColor={primaryColor}
        onMenu={onGoHome}
        onCoupons={onCoupons}
        onHelp={onHelp}
        onSupport={onSupport}
      />
    </S.PaymentScreen>
  );
}
