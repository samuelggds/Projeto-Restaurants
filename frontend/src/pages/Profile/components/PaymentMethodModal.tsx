import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CreditCard, LockKeyhole, X } from 'lucide-react';
import customerPaymentMethodService, { getPaymentMethodErrorMessage } from '../../../Services/customerPaymentMethodService';
import * as S from '../Profile.styles';
import { getCardBrandDetails, maskedCardNumber } from '../domain/cardBrand';
import { CardBrandLogo } from './CardBrandLogo';

type ProviderConfig = Awaited<ReturnType<typeof customerPaymentMethodService.getConfig>>;
type MercadoPagoCardToken = {
  id?: string;
  last_four_digits?: string;
  payment_method_id?: string;
  expiration_month?: number;
  expiration_year?: number;
};
type MercadoPagoField = {
  mount(containerId: string): void;
  unmount?(): void;
  on?(event: 'binChange', callback: (event: { bin?: string | null }) => void): MercadoPagoField;
};
type MercadoPagoInstance = {
  fields: {
    create(
      name: 'cardNumber' | 'expirationDate' | 'securityCode',
      options: { placeholder: string },
    ): MercadoPagoField;
    createCardToken(input: Record<string, string>): Promise<MercadoPagoCardToken>;
  };
  getPaymentMethods(input: { bin: string }): Promise<{
    results?: Array<{ id?: string; name?: string }>;
  }>;
};
declare global {
  interface Window {
    PagSeguro?: { encryptCard(input: Record<string, string>): { encryptedCard?: string; hasErrors?: boolean; errors?: Array<{ message?: string }> } };
    MercadoPago?: new (publicKey: string) => MercadoPagoInstance;
  }
}

const sdkPromises = new Map<string, Promise<void>>();
function loadSdk(key: string, source: string, ready: () => boolean) {
  if (ready()) return Promise.resolve();
  const current = sdkPromises.get(key); if (current) return current;
  const next = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script'); script.src = source; script.async = true;
    script.onload = () => resolve(); script.onerror = () => reject(new Error(`Não foi possível carregar a proteção do ${key}.`));
    document.head.appendChild(script);
  });
  sdkPromises.set(key, next); return next;
}

export function PaymentMethodModal({ restaurantId, onClose, onSaved }: { restaurantId: number; onClose: () => void; onSaved: () => void }) {
  const [holder, setHolder] = useState(''); const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState(''); const [cvv, setCvv] = useState('');
  const [taxId, setTaxId] = useState(''); const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const [mercadoPagoReady, setMercadoPagoReady] = useState(false);
  const [mercadoPagoBin, setMercadoPagoBin] = useState('');
  const [mercadoPagoBrand, setMercadoPagoBrand] = useState('');
  const mercadoPagoRef = useRef<MercadoPagoInstance | null>(null);
  const detectedBrand = getCardBrandDetails(mercadoPagoBrand || number || mercadoPagoBin);

  useEffect(() => {
    let active = true;
    customerPaymentMethodService.getConfig(restaurantId).then((next) => { if (active) setConfig(next); }).catch((reason: unknown) => {
      if (active) setError(getPaymentMethodErrorMessage(reason, 'Cadastro de cartões indisponível no momento.'));
    });
    return () => { active = false; };
  }, [restaurantId]);

  useEffect(() => {
    if (config?.provider !== 'MERCADO_PAGO' || !config.publicKey) return;
    let active = true;
    const mountedFields: MercadoPagoField[] = [];
    void loadSdk('Mercado Pago', 'https://sdk.mercadopago.com/js/v2', () => Boolean(window.MercadoPago))
      .then(() => {
        if (!active || !window.MercadoPago || !config.publicKey) return;
        const instance = new window.MercadoPago(config.publicKey);
        const cardNumberField = instance.fields.create('cardNumber', { placeholder: 'Número do cartão' });
        cardNumberField.on?.('binChange', ({ bin }) => {
          const normalizedBin = String(bin || '').replace(/\D/g, '').slice(0, 8);
          if (!active) return;
          setMercadoPagoBin(normalizedBin);
          setMercadoPagoBrand('');
          if (normalizedBin.length < 6) return;
          void instance.getPaymentMethods({ bin: normalizedBin })
            .then((response) => {
              if (active) setMercadoPagoBrand(String(response.results?.[0]?.id || ''));
            })
            .catch(() => {});
        });
        const fields = [
          cardNumberField,
          instance.fields.create('expirationDate', { placeholder: 'MM/AA' }),
          instance.fields.create('securityCode', { placeholder: 'CVV' }),
        ];
        fields[0].mount('mercado-pago-card-number');
        fields[1].mount('mercado-pago-expiration');
        fields[2].mount('mercado-pago-security-code');
        mountedFields.push(...fields);
        mercadoPagoRef.current = instance;
        setMercadoPagoReady(true);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Proteção do Mercado Pago indisponível.');
      });
    return () => {
      active = false;
      mountedFields.forEach((field) => field.unmount?.());
      mercadoPagoRef.current = null;
      setMercadoPagoReady(false);
      setMercadoPagoBin('');
      setMercadoPagoBrand('');
    };
  }, [config]);

  async function securePayload(providerConfig: ProviderConfig, digits: string, month: number, fullYear: number) {
    if (providerConfig.provider === 'PAGBANK') {
      if (!providerConfig.publicKey) throw new Error('Chave pública PagBank indisponível.');
      await loadSdk('PagBank', 'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js', () => Boolean(window.PagSeguro));
      const result = window.PagSeguro?.encryptCard({ publicKey: providerConfig.publicKey, holder: holder.trim(), number: digits, expMonth: String(month).padStart(2, '0'), expYear: String(fullYear), securityCode: cvv });
      if (!result?.encryptedCard || result.hasErrors) throw new Error(result?.errors?.[0]?.message || 'Confira os dados informados.');
      return { encryptedCard: result.encryptedCard };
    }
    return { cardData: { number: digits, securityCode: cvv }, holderTaxId: taxId };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const digits = number.replace(/\D/g, ''); const [month, year] = expiry.split('/').map(Number);
    const fullYear = year < 100 ? 2000 + year : year; setSaving(true); setError('');
    try {
      const providerConfig = config || await customerPaymentMethodService.getConfig(restaurantId);
      let secured: Record<string, unknown>;
      let display: { brand: string; last4: string; month: number; year: number } = {
        brand: detectedBrand.id,
        last4: digits.slice(-4),
        month,
        year: fullYear,
      };
      if (providerConfig.provider === 'MERCADO_PAGO') {
        const mp = mercadoPagoRef.current;
        if (!mp || !mercadoPagoReady) throw new Error('Aguarde o formulário seguro do Mercado Pago carregar.');
        const token = await mp.fields.createCardToken({
          cardholderName: holder.trim(),
          identificationType: 'CPF',
          identificationNumber: taxId.replace(/\D/g, ''),
        });
        const tokenMonth = Number(token.expiration_month || 0);
        const tokenYear = Number(token.expiration_year || 0);
        const tokenLast4 = String(token.last_four_digits || '');
        if (!token.id || !/^\d{4}$/.test(tokenLast4) || !tokenMonth || !tokenYear) {
          throw new Error('O Mercado Pago não conseguiu proteger os dados do cartão.');
        }
        secured = { cardToken: token.id, holderTaxId: taxId };
        display = {
          brand: String(token.payment_method_id || mercadoPagoBrand || detectedBrand.id),
          last4: tokenLast4,
          month: tokenMonth,
          year: tokenYear,
        };
      } else {
        secured = await securePayload(providerConfig, digits, month, fullYear);
      }
      await customerPaymentMethodService.create({ restaurantId, ...secured, holderName: holder.trim(), brand: display.brand, last4: display.last4, expMonth: display.month, expYear: display.year });
      setNumber(''); setCvv(''); onSaved();
    } catch (reason) { setError(getPaymentMethodErrorMessage(reason, 'Não foi possível cadastrar o cartão.')); }
    finally { setSaving(false); }
  }

  return (
    <S.ModalOverlay role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <S.PaymentModalCard onSubmit={submit} aria-label="Cadastrar cartão">
        <header><div><CreditCard /><span><b>Novo cartão</b></span></div><button type="button" onClick={onClose} aria-label="Fechar"><X /></button></header>
        <S.PaymentCardPreview $brand={detectedBrand.id} aria-label="Prévia segura do cartão">
          <header><span className="payment-chip" aria-hidden="true" /><CardBrandLogo className="card-brand-logo" brand={detectedBrand.id} /></header>
          <strong>{number ? maskedCardNumber(number) : '•••• •••• •••• ••••'}</strong>
          <footer>
            <span><small>Titular</small><b>{holder.trim() || 'Nome no cartão'}</b></span>
            <span><small>Validade</small><b>{expiry || 'MM/AA'}</b></span>
          </footer>
        </S.PaymentCardPreview>
        <label>Nome impresso no cartão<input autoComplete="cc-name" value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={60} required /></label>
        {config?.provider === 'MERCADO_PAGO' ? (
          <>
            <label>Número do cartão<div className="payment-number-field"><div id="mercado-pago-card-number" className="mp-secure-field" />{detectedBrand.id !== 'card' && <span className="card-brand-pill" aria-live="polite"><CardBrandLogo brand={detectedBrand.id} /></span>}</div></label>
            <div className="payment-row">
              <label>Validade<div id="mercado-pago-expiration" className="mp-secure-field" /></label>
              <label>CVV<div id="mercado-pago-security-code" className="mp-secure-field" /></label>
            </div>
          </>
        ) : (
          <>
            <label>Número do cartão<div className="payment-number-field"><input inputMode="numeric" autoComplete="cc-number" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim())} minLength={15} required />{detectedBrand.id !== 'card' && <span className="card-brand-pill" aria-live="polite"><CardBrandLogo brand={detectedBrand.id} /></span>}</div></label>
            <div className="payment-row">
              <label>Validade<input inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={expiry} onChange={(e) => setExpiry(e.target.value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2'))} pattern="\d{2}/\d{2}" required /></label>
              <label>CVV<input type="password" inputMode="numeric" autoComplete="cc-csc" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} minLength={3} required /></label>
            </div>
          </>
        )}
        {config?.provider !== 'PAGBANK' && <label>CPF do titular<input inputMode="numeric" autoComplete="off" value={taxId} onChange={(e) => setTaxId(e.target.value.replace(/\D/g, '').slice(0, 11))} minLength={11} required /></label>}
        <p className="payment-security"><LockKeyhole /> O número completo e o CVV nunca são salvos no banco de dados.</p>
        {config?.provider === 'ASAAS' && <p className="payment-provider-note">No Asaas, os dados seguem por conexão HTTPS diretamente para tokenização e são descartados após a resposta.</p>}
        {config?.provider === 'MERCADO_PAGO' && <p className="payment-provider-note">Por segurança, o Mercado Pago solicitará apenas o CVV quando este cartão for reutilizado.</p>}
        {error && <p className="payment-error" role="alert">{error}</p>}
        <footer><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button type="submit" disabled={saving || !config || (config.provider === 'MERCADO_PAGO' && !mercadoPagoReady)}>{saving ? 'Protegendo cartão…' : 'Salvar cartão'}</button></footer>
      </S.PaymentModalCard>
    </S.ModalOverlay>
  );
}
