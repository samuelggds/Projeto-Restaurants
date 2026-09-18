import { CreditCard, LockKeyhole } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { CustomerPaymentMethod } from '../../../Services/customerPaymentMethodService';
import publicCardPaymentService, {
  type PublicCardPaymentConfig,
} from '../../../Services/publicCardPaymentService';

export type PreparedCardPayment = Record<string, unknown>;
export type CardPaymentPreparer = () => Promise<PreparedCardPayment>;

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
    PagSeguro?: {
      encryptCard(input: Record<string, string>): {
        encryptedCard?: string;
        hasErrors?: boolean;
        errors?: Array<{ message?: string }>;
      };
    };
    MercadoPago?: new (publicKey: string) => MercadoPagoInstance;
  }
}

const sdkPromises = new Map<string, Promise<void>>();
function loadSdk(key: string, source: string, ready: () => boolean) {
  if (ready()) return Promise.resolve();
  const current = sdkPromises.get(key);
  if (current) return current;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = source;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Não foi possível preparar o pagamento com cartão.'));
    document.head.appendChild(script);
  });
  sdkPromises.set(key, promise);
  return promise;
}

function digits(value: string) {
  return value.replace(/\D/g, '');
}

function parseExpiry(value: string) {
  const [rawMonth, rawYear] = value.split('/');
  const month = Number(rawMonth || 0);
  const shortYear = Number(rawYear || 0);
  const year = shortYear < 100 ? 2000 + shortYear : shortYear;
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
    throw new Error('Informe uma validade válida no formato MM/AA.');
  }
  return { month, year };
}

export function OnlineCardPaymentForm({
  restaurantId,
  savedCard,
  payerEmail: initialPayerEmail = '',
  onPreparerChange,
}: {
  restaurantId: number;
  savedCard?: CustomerPaymentMethod | null;
  payerEmail?: string;
  onPreparerChange: (preparer: CardPaymentPreparer | null) => void;
}) {
  const [config, setConfig] = useState<PublicCardPaymentConfig | null>(null);
  const [holder, setHolder] = useState(savedCard?.holderName || '');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [taxId, setTaxId] = useState('');
  const [payerEmail, setPayerEmail] = useState(initialPayerEmail);
  const [postalCode, setPostalCode] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [error, setError] = useState('');
  const [mercadoPagoPaymentMethodId, setMercadoPagoPaymentMethodId] = useState('');
  const mercadoPagoRef = useRef<MercadoPagoInstance | null>(null);
  const isSaved = Boolean(savedCard);
  const isSavedMercadoPago = savedCard?.provider === 'MERCADO_PAGO';

  useEffect(() => {
    let active = true;
    publicCardPaymentService
      .getConfig(restaurantId)
      .then((next) => {
        if (!active) return;
        setConfig(next);
        setError('');
      })
      .catch(() => {
        if (active) setError('Pagamento com cartão indisponível no momento.');
      });
    return () => {
      active = false;
    };
  }, [restaurantId]);

  useEffect(() => {
    if (config?.provider !== 'MERCADO_PAGO' || !config.publicKey) return undefined;
    let active = true;
    const mounted: MercadoPagoField[] = [];
    void loadSdk(
      'mercado-pago',
      'https://sdk.mercadopago.com/js/v2',
      () => Boolean(window.MercadoPago),
    )
      .then(() => {
        if (!active || !window.MercadoPago || !config.publicKey) return;
        const mp = new window.MercadoPago(config.publicKey);
        mercadoPagoRef.current = mp;
        if (isSavedMercadoPago) {
          const security = mp.fields.create('securityCode', { placeholder: 'CVV' });
          security.mount('checkout-mp-security-code');
          mounted.push(security);
        } else {
          const cardNumber = mp.fields.create('cardNumber', { placeholder: 'Número do cartão' });
          cardNumber.on?.('binChange', ({ bin }) => {
            const normalizedBin = String(bin || '')
              .replace(/\D/g, '')
              .slice(0, 8);
            if (!active) return;
            setMercadoPagoPaymentMethodId('');
            if (normalizedBin.length < 6) return;
            void mp
              .getPaymentMethods({ bin: normalizedBin })
              .then((response) => {
                if (active) {
                  setMercadoPagoPaymentMethodId(String(response.results?.[0]?.id || '').trim());
                }
              })
              .catch(() => {
                if (active) setMercadoPagoPaymentMethodId('');
              });
          });
          const expiration = mp.fields.create('expirationDate', { placeholder: 'MM/AA' });
          const security = mp.fields.create('securityCode', { placeholder: 'CVV' });
          cardNumber.mount('checkout-mp-card-number');
          expiration.mount('checkout-mp-expiration');
          security.mount('checkout-mp-security-code');
          mounted.push(cardNumber, expiration, security);
        }
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar a proteção do Mercado Pago.');
      });
    return () => {
      active = false;
      mounted.forEach((field) => field.unmount?.());
      mercadoPagoRef.current = null;
      setMercadoPagoPaymentMethodId('');
    };
  }, [config, isSavedMercadoPago]);

  useEffect(() => {
    if (config?.provider !== 'PAGBANK' || !config.publicKey || isSaved) return undefined;
    let active = true;
    void loadSdk(
      'pagbank',
      'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js',
      () => Boolean(window.PagSeguro),
    ).catch(() => {
      if (active) setError('Não foi possível carregar a proteção do PagBank.');
    });
    return () => {
      active = false;
    };
  }, [config, isSaved]);

  useEffect(() => {
    if (!config) {
      onPreparerChange(null);
      return undefined;
    }

    const prepare: CardPaymentPreparer = async () => {
      setError('');
      try {
        if (savedCard) {
          if (savedCard.provider !== config.provider) {
            throw new Error('O cartão salvo não pertence ao provedor atual do restaurante.');
          }
          if (config.provider === 'MERCADO_PAGO') {
            if (!savedCard.providerCardId || !mercadoPagoRef.current) {
              throw new Error('Aguarde a preparação segura do cartão salvo.');
            }
            const token = await mercadoPagoRef.current.fields.createCardToken({
              cardId: savedCard.providerCardId,
            });
            if (!token.id) throw new Error('Não foi possível validar o CVV do cartão salvo.');
            return {
              paymentMethodId: savedCard.publicId,
              cardToken: token.id,
              cardPaymentMethodId: String(token.payment_method_id || savedCard.brand).trim(),
            };
          }
          return { paymentMethodId: savedCard.publicId };
        }

        const holderName = holder.trim();
        const holderTaxId = digits(taxId);
        if (holderName.length < 2) throw new Error('Informe o nome impresso no cartão.');
        if (![11, 14].includes(holderTaxId.length)) {
          throw new Error('Informe o CPF ou CNPJ do titular do cartão.');
        }

        if (config.provider === 'MERCADO_PAGO') {
          const normalizedPayerEmail = payerEmail.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedPayerEmail)) {
            throw new Error('Informe um e-mail válido do comprador.');
          }
          if (!mercadoPagoRef.current) throw new Error('Aguarde a preparação segura do cartão.');
          const token = await mercadoPagoRef.current.fields.createCardToken({
            cardholderName: holderName,
            identificationType: holderTaxId.length === 11 ? 'CPF' : 'CNPJ',
            identificationNumber: holderTaxId,
          });
          const paymentMethodId = String(
            token.payment_method_id || mercadoPagoPaymentMethodId || '',
          ).trim();
          if (!token.id || !paymentMethodId) {
            throw new Error('Não foi possível identificar a bandeira do cartão. Revise os dados e tente novamente.');
          }
          return {
            cardToken: token.id,
            cardPaymentMethodId: paymentMethodId,
            holderName,
            holderTaxId,
            payerEmail: normalizedPayerEmail,
          };
        }

        const cleanNumber = digits(number);
        const cleanCvv = digits(cvv);
        const { month, year } = parseExpiry(expiry);
        if (cleanNumber.length < 13 || cleanNumber.length > 19) {
          throw new Error('Informe um número de cartão válido.');
        }
        if (cleanCvv.length < 3 || cleanCvv.length > 4) {
          throw new Error('Informe o CVV do cartão.');
        }

        if (config.provider === 'PAGBANK') {
          if (!config.publicKey || !window.PagSeguro) {
            throw new Error('Aguarde a preparação segura do PagBank.');
          }
          const encrypted = window.PagSeguro.encryptCard({
            publicKey: config.publicKey,
            holder: holderName,
            number: cleanNumber,
            expMonth: String(month).padStart(2, '0'),
            expYear: String(year),
            securityCode: cleanCvv,
          });
          if (!encrypted.encryptedCard || encrypted.hasErrors) {
            throw new Error(encrypted.errors?.[0]?.message || 'Revise os dados do cartão.');
          }
          return {
            encryptedCard: encrypted.encryptedCard,
            holderName,
            holderTaxId,
          };
        }

        const cleanPostalCode = digits(postalCode);
        if (cleanPostalCode.length !== 8 || !addressNumber.trim()) {
          throw new Error('Informe o CEP e o número do endereço do titular.');
        }
        return {
          cardData: { number: cleanNumber, securityCode: cleanCvv },
          holderName,
          holderTaxId,
          expMonth: month,
          expYear: year,
          billingPostalCode: cleanPostalCode,
          billingAddressNumber: addressNumber.trim(),
        };
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : 'Revise os dados do cartão.';
        setError(message);
        if (reason instanceof Error) throw reason;
        throw new Error(message, { cause: reason });
      }
    };

    onPreparerChange(prepare);
    return () => onPreparerChange(null);
  }, [
    addressNumber,
    config,
    cvv,
    expiry,
    holder,
    mercadoPagoPaymentMethodId,
    number,
    onPreparerChange,
    payerEmail,
    postalCode,
    savedCard,
    taxId,
  ]);

  if (isSaved && config?.provider !== 'MERCADO_PAGO') {
    return (
      <SecureHint>
        <LockKeyhole size={17} />
        <span>
          <b>Cartão protegido e pronto para uso</b>
          <small>O pagamento será processado online usando o token seguro salvo no provedor.</small>
        </span>
      </SecureHint>
    );
  }

  return (
    <CardForm aria-label={isSaved ? 'Confirmar cartão salvo' : 'Dados do cartão'}>
      <header>
        <CreditCard size={20} />
        <div>
          <b>{isSaved ? 'Confirme seu cartão salvo' : 'Dados do cartão'}</b>
          <span>
            {isSaved
              ? `Final ${savedCard?.last4}. Informe somente o código de segurança.`
              : 'Pagamento online protegido pelo provedor do restaurante.'}
          </span>
        </div>
      </header>

      {!isSaved && (
        <label className="full">
          <span>Nome impresso no cartão</span>
          <input
            autoComplete="cc-name"
            value={holder}
            onChange={(event) => setHolder(event.target.value.slice(0, 60))}
          />
        </label>
      )}

      {config?.provider === 'MERCADO_PAGO' ? (
        <>
          {!isSaved && (
            <label className="full">
              <span>Número do cartão</span>
              <div id="checkout-mp-card-number" className="secure-field" />
            </label>
          )}
          <div className="row">
            {!isSaved && (
              <label>
                <span>Validade</span>
                <div id="checkout-mp-expiration" className="secure-field" />
              </label>
            )}
            <label className={isSaved ? 'full' : undefined}>
              <span>CVV</span>
              <div id="checkout-mp-security-code" className="secure-field" />
            </label>
          </div>
        </>
      ) : !isSaved ? (
        <>
          <label className="full">
            <span>Número do cartão</span>
            <input
              inputMode="numeric"
              autoComplete="cc-number"
              value={number}
              onChange={(event) =>
                setNumber(
                  digits(event.target.value)
                    .slice(0, 19)
                    .replace(/(.{4})/g, '$1 ')
                    .trim(),
                )
              }
              placeholder="0000 0000 0000 0000"
            />
          </label>
          <div className="row">
            <label>
              <span>Validade</span>
              <input
                inputMode="numeric"
                autoComplete="cc-exp"
                value={expiry}
                onChange={(event) =>
                  setExpiry(
                    digits(event.target.value)
                      .slice(0, 4)
                      .replace(/^(\d{2})(\d)/, '$1/$2'),
                  )
                }
                placeholder="MM/AA"
              />
            </label>
            <label>
              <span>CVV</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cvv}
                onChange={(event) => setCvv(digits(event.target.value).slice(0, 4))}
                placeholder="123"
              />
            </label>
          </div>
        </>
      ) : null}

      {!isSaved && config?.provider === 'MERCADO_PAGO' && (
        <label className="full">
          <span>E-mail do comprador</span>
          <input
            type="email"
            autoComplete="email"
            value={payerEmail}
            onChange={(event) => setPayerEmail(event.target.value.slice(0, 160))}
            placeholder="voce@exemplo.com"
          />
        </label>
      )}

      {!isSaved && (
        <label className="full">
          <span>CPF/CNPJ do titular</span>
          <input
            inputMode="numeric"
            value={taxId}
            onChange={(event) => setTaxId(digits(event.target.value).slice(0, 14))}
            placeholder="Somente números"
          />
        </label>
      )}

      {!isSaved && config?.provider === 'ASAAS' && (
        <div className="row">
          <label>
            <span>CEP do titular</span>
            <input
              inputMode="numeric"
              value={postalCode}
              onChange={(event) => setPostalCode(digits(event.target.value).slice(0, 8))}
              placeholder="00000000"
            />
          </label>
          <label>
            <span>Número</span>
            <input
              value={addressNumber}
              onChange={(event) => setAddressNumber(event.target.value.slice(0, 12))}
            />
          </label>
        </div>
      )}

      <p className="security">
        <LockKeyhole size={15} /> O número completo e o CVV nunca são salvos no GastroNexa.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </CardForm>
  );
}

const CardForm = styled.section`
  display: grid;
  gap: 11px;
  margin: 4px 0 12px;
  padding: 14px;
  border: 1px solid #dde2df;
  border-radius: 14px;
  background: #fff;

  header {
    display: flex;
    gap: 10px;
    align-items: center;
    color: var(--home-primary);
  }
  header div {
    display: grid;
    gap: 2px;
  }
  header b {
    color: #282d2a;
    font-size: 13px;
  }
  header span {
    color: #777e7a;
    font-size: 10px;
    line-height: 1.4;
  }
  label {
    display: grid;
    gap: 5px;
    min-width: 0;
  }
  label > span {
    color: #4e5652;
    font-size: 11px;
    font-weight: 800;
  }
  .full {
    grid-column: 1 / -1;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }
  input,
  .secure-field {
    width: 100%;
    min-height: 42px;
    padding: 10px 11px;
    border: 1px solid #d5dbd8;
    border-radius: 10px;
    background: #fff;
    color: #202522;
    font: inherit;
    font-size: 13px;
    outline: none;
  }
  input:focus,
  .secure-field:focus-within {
    border-color: var(--home-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--home-primary) 12%, transparent);
  }
  .security {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #68706b;
    font-size: 10px;
  }
  .error {
    margin: 0;
    color: #a12d25;
    font-size: 11px;
    font-weight: 700;
  }
  @media (max-width: 390px) {
    .row {
      grid-template-columns: 1fr;
    }
  }
`;

const SecureHint = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 12px;
  border: 1px solid #d9e6dc;
  border-radius: 12px;
  color: #226438;
  background: #f8fcf9;
  span {
    display: grid;
    gap: 2px;
  }
  b {
    font-size: 11px;
  }
  small {
    color: #617068;
    font-size: 10px;
    line-height: 1.35;
  }
`;