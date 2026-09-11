import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { CreditCard, QrCode, ShieldCheck, X } from 'lucide-react';
import monthlyBillingService, {
  type PlatformBillingProfile,
} from '../../../Services/monthlyBillingService';
import * as S from './RecurringBillingPayment.styles';

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
};
type MercadoPagoInstance = {
  fields: {
    create(
      name: 'cardNumber' | 'expirationDate' | 'securityCode',
      options: { placeholder: string },
    ): MercadoPagoField;
    createCardToken(input: Record<string, string>): Promise<MercadoPagoCardToken>;
  };
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string) => MercadoPagoInstance;
  }
}

const SDK_URL = 'https://sdk.mercadopago.com/js/v2';
let sdkPromise: Promise<void> | null = null;

function loadMercadoPagoSdk() {
  if (window.MercadoPago) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    const script = existing || document.createElement('script');

    const fail = () => {
      sdkPromise = null;
      script.remove();
      reject(new Error('Falha ao carregar o Mercado Pago.'));
    };

    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', fail, { once: true });

    if (!existing) {
      script.src = SDK_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return sdkPromise;
}

const date = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : 'A definir';

export function RecurringBillingPayment() {
  const [profile, setProfile] = useState<PlatformBillingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [holderName, setHolderName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [sdkReady, setSdkReady] = useState(false);
  const mercadoPagoRef = useRef<MercadoPagoInstance | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async () => {
    try {
      setProfile(await monthlyBillingService.getRecurringProfile());
      setError('');
    } catch (reason) {
      const message = (reason as { response?: { data?: { error?: string } } })?.response?.data
        ?.error;
      setError(message || 'Não foi possível carregar a forma de pagamento da mensalidade.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return undefined;

    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    let active = true;
    const fields: MercadoPagoField[] = [];

    void monthlyBillingService
      .getRecurringConfig()
      .then(async (config) => {
        await loadMercadoPagoSdk();
        if (!active || !window.MercadoPago) return;
        const mp = new window.MercadoPago(config.publicKey);
        const cardNumber = mp.fields.create('cardNumber', { placeholder: 'Número do cartão' });
        const expiration = mp.fields.create('expirationDate', { placeholder: 'MM/AA' });
        const securityCode = mp.fields.create('securityCode', { placeholder: 'CVV' });
        cardNumber.mount('billing-card-number');
        expiration.mount('billing-card-expiration');
        securityCode.mount('billing-card-security');
        fields.push(cardNumber, expiration, securityCode);
        mercadoPagoRef.current = mp;
        setSdkReady(true);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const message = (reason as { response?: { data?: { error?: string } } })?.response?.data
          ?.error;
        setError(
          message || (reason instanceof Error ? reason.message : 'Cartão indisponível no momento.'),
        );
      });

    return () => {
      active = false;
      fields.forEach((field) => field.unmount?.());
      mercadoPagoRef.current = null;
      setSdkReady(false);
    };
  }, [modalOpen]);

  async function usePix() {
    setChanging(true);
    setError('');
    try {
      setProfile(await monthlyBillingService.usePixBilling());
    } catch (reason) {
      const message = (reason as { response?: { data?: { error?: string } } })?.response?.data
        ?.error;
      setError(message || 'Não foi possível alterar para Pix.');
    } finally {
      setChanging(false);
    }
  }

  async function saveCard(event: FormEvent) {
    event.preventDefault();
    if (!consent) {
      setError('Autorize a cobrança automática para continuar.');
      return;
    }
    const normalizedTaxId = taxId.replace(/\D/g, '');
    if (normalizedTaxId.length !== 11) {
      setError('Informe um CPF válido do titular.');
      return;
    }
    const mp = mercadoPagoRef.current;
    if (!mp || !sdkReady) {
      setError('Aguarde o carregamento seguro do cartão.');
      return;
    }

    setChanging(true);
    setError('');
    try {
      const token = await mp.fields.createCardToken({
        cardholderName: holderName.trim(),
        identificationType: 'CPF',
        identificationNumber: normalizedTaxId,
      });
      const last4 = String(token.last_four_digits || '');
      const expMonth = Number(token.expiration_month || 0);
      const expYear = Number(token.expiration_year || 0);
      const brand = String(token.payment_method_id || 'card');
      if (!token.id || !/^\d{4}$/.test(last4) || !expMonth || !expYear) {
        throw new Error('O Mercado Pago não conseguiu validar este cartão.');
      }
      const next = await monthlyBillingService.enableRecurringCard({
        cardToken: token.id,
        brand,
        last4,
        expMonth,
        expYear,
      });
      setProfile(next);
      setModalOpen(false);
      setHolderName('');
      setTaxId('');
      setConsent(false);
    } catch (reason) {
      const message = (reason as { response?: { data?: { error?: string } } })?.response?.data
        ?.error;
      setError(
        message || (reason instanceof Error ? reason.message : 'Não foi possível salvar o cartão.'),
      );
    } finally {
      setChanging(false);
    }
  }

  if (loading) return null;
  const cardActive =
    profile?.billingMethod === 'CARD' && profile.autoRenew && profile.status === 'AUTHORIZED';

  return (
    <>
      <S.Card aria-labelledby="billing-payment-method-title">
        <header>
          <div>
            <h3 id="billing-payment-method-title">Forma de pagamento da mensalidade</h3>
            <p>Escolha pagar manualmente por Pix ou renovar automaticamente no cartão.</p>
          </div>
          {cardActive ? <span className="status">Renovação automática ativa</span> : null}
        </header>
        <div className="methods">
          <button
            type="button"
            className={`method ${!cardActive ? 'active' : ''}`}
            onClick={() => void usePix()}
            disabled={changing}
          >
            <QrCode size={20} />
            <strong>Pix manual</strong>
            <span>QR Code e Pix copia e cola em cada mensalidade.</span>
          </button>
          <button
            type="button"
            className={`method ${cardActive ? 'active' : ''}`}
            onClick={() => setModalOpen(true)}
            disabled={changing}
          >
            <CreditCard size={20} />
            <strong>Cartão automático</strong>
            <span>Cadastre uma vez e renove a mensalidade automaticamente.</span>
          </button>
        </div>
        {cardActive ? (
          <div className="summary">
            <span>
              <strong>
                {profile?.cardBrand || 'Cartão'} •••• {profile?.cardLast4}
              </strong>
            </span>
            <span>
              Próxima cobrança: <strong>{date(profile?.nextBillingAt)}</strong>
            </span>
          </div>
        ) : null}
        {profile?.lastFailureReason ? <p className="error">{profile.lastFailureReason}</p> : null}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </S.Card>

      {modalOpen ? (
        <S.Overlay
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}
        >
          <S.Modal
            role="dialog"
            aria-modal="true"
            aria-labelledby="recurring-billing-dialog-title"
            onSubmit={(event) => void saveCard(event)}
          >
            <header>
              <div>
                <h3 id="recurring-billing-dialog-title">Cartão para renovação automática</h3>
                <p>
                  Os dados sensíveis são tokenizados pelo Mercado Pago e não ficam salvos no
                  GastroNexa.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Fechar"
              >
                <X />
              </button>
            </header>
            <label>
              Nome do titular
              <input
                value={holderName}
                onChange={(event) => setHolderName(event.target.value)}
                maxLength={60}
                required
              />
            </label>
            <label>
              Número do cartão
              <div id="billing-card-number" className="mp-field" />
            </label>
            <div className="row">
              <label>
                Validade<div id="billing-card-expiration" className="mp-field" />
              </label>
              <label>
                CVV<div id="billing-card-security" className="mp-field" />
              </label>
            </div>
            <label>
              CPF do titular
              <input
                inputMode="numeric"
                value={taxId}
                onChange={(event) => setTaxId(event.target.value.replace(/\D/g, '').slice(0, 11))}
                minLength={11}
                required
              />
            </label>
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                Autorizo a cobrança recorrente mensal do plano contratado neste cartão até que eu
                desative a renovação automática.
              </span>
            </label>
            <p className="security">
              <ShieldCheck size={15} /> Número completo e CVV não são persistidos no banco da
              plataforma.
            </p>
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
            <footer>
              <button type="button" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button
                className="primary"
                type="submit"
                disabled={changing || !sdkReady || !consent}
              >
                {changing ? 'Ativando...' : 'Ativar cobrança automática'}
              </button>
            </footer>
          </S.Modal>
        </S.Overlay>
      ) : null}
    </>
  );
}
