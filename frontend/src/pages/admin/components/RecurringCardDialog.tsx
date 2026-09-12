import { useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import { CreditCard, RefreshCw, ShieldCheck, X } from 'lucide-react';
import monthlyBillingService, {
  type PlatformBillingProfile,
} from '../../../Services/monthlyBillingService';
import { BillingSimulationContext } from '../../../contexts/BillingSimulationContext';
import { useDialogFocusManagement } from '../../../shared/hooks/useDialogFocusManagement';
import * as S from './RecurringBillingPayment.styles';

type CardToken = {
  id?: string;
  last_four_digits?: string;
  payment_method_id?: string;
  expiration_month?: number;
  expiration_year?: number;
};
type Field = { mount(id: string): void; unmount?(): void };
type MercadoPagoInstance = {
  fields: {
    create(
      name: 'cardNumber' | 'expirationDate' | 'securityCode',
      options: { placeholder: string },
    ): Field;
    createCardToken(input: Record<string, string>): Promise<CardToken>;
  };
};
const SDK_URL = 'https://sdk.mercadopago.com/js/v2';
const SDK_LOAD_TIMEOUT_MS = 15000;
let sdkPromise: Promise<void> | null = null;
function loadSdk() {
  if (window.MercadoPago) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    const script = existing || document.createElement('script');
    const cleanup = () => {
      window.clearTimeout(timeout);
      script.removeEventListener('load', loaded);
      script.removeEventListener('error', fail);
    };
    const fail = () => {
      cleanup();
      script.remove();
      reject(new Error('SDK indisponível'));
    };
    const loaded = () => {
      if (!window.MercadoPago) {
        fail();
        return;
      }
      cleanup();
      resolve();
    };
    const timeout = window.setTimeout(fail, SDK_LOAD_TIMEOUT_MS);
    script.addEventListener('load', loaded);
    script.addEventListener('error', fail);
    if (!existing) {
      script.src = SDK_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  }).finally(() => {
    sdkPromise = null;
  });
  return sdkPromise;
}

export function RecurringCardDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (profile: PlatformBillingProfile) => void;
}) {
  const simulated = useContext(BillingSimulationContext);
  const [holderName, setHolderName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [sdkError, setSdkError] = useState(false);
  const [ready, setReady] = useState(simulated);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const mpRef = useRef<MercadoPagoInstance | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const panel = useDialogFocusManagement<HTMLFormElement>(() => {
    if (!saving) onClose();
  });
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);
  useEffect(() => {
    if (simulated) return;
    let active = true;
    const fields: Field[] = [];
    void monthlyBillingService
      .getRecurringConfig()
      .then(async (config) => {
        if (!active) return;
        if (!config.publicKey) throw new Error('Cadastro indisponível');
        await loadSdk();
        if (!active) return;
        if (!window.MercadoPago) throw new Error('SDK indisponível');
        const mp = new window.MercadoPago(config.publicKey);
        const definitions = [
          ['cardNumber', 'Número do cartão', 'billing-card-number'],
          ['expirationDate', 'MM/AA', 'billing-card-expiration'],
          ['securityCode', 'CVV', 'billing-card-security'],
        ] as const;
        for (const [name, placeholder, id] of definitions) {
          const field = mp.fields.create(name, { placeholder });
          fields.push(field);
          field.mount(id);
        }
        mpRef.current = mp;
        setReady(true);
      })
      .catch(() => {
        if (active) setSdkError(true);
      });
    return () => {
      active = false;
      fields.forEach((field) => field.unmount?.());
      mpRef.current = null;
    };
  }, [attempt, simulated]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving || !ready) return;
    if (!consent) {
      setError('Autorize a renovação automática para continuar.');
      return;
    }
    const cpf = taxId.replace(/\D/g, '');
    if (!simulated && (cpf.length !== 11 || !holderName.trim())) {
      setError('Confira o nome e o CPF do titular.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const token: CardToken = simulated
        ? {
            id: 'demo-recurring-card-token',
            last_four_digits: '4242',
            payment_method_id: 'DEMO',
            expiration_month: 12,
            expiration_year: new Date().getFullYear() + 5,
          }
        : await mpRef.current!.fields.createCardToken({
            cardholderName: holderName.trim(),
            identificationType: 'CPF',
            identificationNumber: cpf,
          });
      if (
        !token.id ||
        !/^\d{4}$/.test(String(token.last_four_digits)) ||
        !token.expiration_month ||
        !token.expiration_year
      )
        throw new Error('Cartão inválido');
      const next = await monthlyBillingService.enableRecurringCard({
        cardToken: token.id,
        brand: token.payment_method_id || 'card',
        last4: token.last_four_digits!,
        expMonth: token.expiration_month,
        expYear: token.expiration_year,
      });
      onSaved(next);
    } catch {
      setError(
        'Não foi possível ativar a renovação. Confira os dados, tente outro cartão ou tente novamente em instantes.',
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <S.Overlay
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <S.Modal
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-billing-dialog-title"
        aria-describedby="recurring-billing-dialog-description"
        onSubmit={(event) => void save(event)}
      >
        <header>
          <span className="dialog-icon">
            <CreditCard aria-hidden="true" />
          </span>
          <button
            ref={closeButtonRef}
            className="close"
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar cadastro de cartão"
          >
            <X size={20} />
          </button>
        </header>
        <h2 id="recurring-billing-dialog-title">Cartão para renovação automática</h2>
        <p id="recurring-billing-dialog-description">
          A mensalidade do plano contratado será renovada neste cartão. Você pode desativar a
          renovação quando precisar.
        </p>
        {simulated ? (
          <div className="demo-card">
            <strong>Cartão fictício •••• 4242</strong>
            <p>Esta é uma simulação. Não informe dados reais; nenhuma cobrança será feita.</p>
          </div>
        ) : (
          <>
            {!ready && !sdkError ? (
              <p className="loading" role="status">
                Preparando cadastro seguro...
              </p>
            ) : null}
            {sdkError ? (
              <div className="error" role="alert">
                <p>
                  O cadastro de cartão está indisponível no momento. Tente novamente em instantes.
                  Você também pode consultar o Pix na aba Cobranças.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSdkError(false);
                    setReady(false);
                    setAttempt((value) => value + 1);
                  }}
                >
                  <RefreshCw size={15} /> Tentar novamente
                </button>
              </div>
            ) : null}
            <fieldset disabled={!ready || saving} hidden={sdkError}>
              <label htmlFor="billing-holder">
                Nome do titular
                <input
                  id="billing-holder"
                  autoComplete="cc-name"
                  value={holderName}
                  onChange={(event) => setHolderName(event.target.value)}
                  maxLength={60}
                  required
                />
              </label>
              <div className="field-label" id="billing-card-number-label">
                Número do cartão
                <div
                  id="billing-card-number"
                  className="mp-field"
                  role="group"
                  aria-labelledby="billing-card-number-label"
                />
              </div>
              <div className="row">
                <div className="field-label" id="billing-expiration-label">
                  Validade
                  <div
                    id="billing-card-expiration"
                    className="mp-field"
                    role="group"
                    aria-labelledby="billing-expiration-label"
                  />
                </div>
                <div className="field-label" id="billing-security-label">
                  Código de segurança
                  <div
                    id="billing-card-security"
                    className="mp-field"
                    role="group"
                    aria-labelledby="billing-security-label"
                  />
                </div>
              </div>
              <label htmlFor="billing-tax-id">
                CPF do titular
                <input
                  id="billing-tax-id"
                  inputMode="numeric"
                  value={taxId}
                  onChange={(event) => setTaxId(event.target.value.replace(/\D/g, '').slice(0, 11))}
                  minLength={11}
                  required
                />
              </label>
            </fieldset>
          </>
        )}
        <label className="consent">
          <input
            type="checkbox"
            checked={consent}
            disabled={saving || !ready}
            onChange={(event) => setConsent(event.target.checked)}
          />
          <span>
            Autorizo a cobrança recorrente mensal do plano contratado neste cartão até que eu
            desative a renovação automática.
          </span>
        </label>
        <p className="security">
          <ShieldCheck size={16} aria-hidden="true" />
          {simulated
            ? 'Somente dados fictícios nesta demonstração.'
            : 'Seus dados de cartão são protegidos pelo Mercado Pago.'}
        </p>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <footer>
          <button type="button" disabled={saving} onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" type="submit" disabled={saving || !ready || !consent}>
            {saving
              ? 'Ativando...'
              : simulated
                ? 'Simular ativação'
                : 'Ativar renovação automática'}
          </button>
        </footer>
      </S.Modal>
    </S.Overlay>
  );
}
