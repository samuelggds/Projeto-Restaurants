import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock3, Copy, QrCode, RefreshCw, X } from 'lucide-react';
import QRCode from 'react-qr-code';
import monthlyBillingService, { type Invoice } from '../../../Services/monthlyBillingService';
import { useDialogFocusManagement } from '../../../shared/hooks/useDialogFocusManagement';
import { BillingPixValidity } from './BillingPixValidity';
import { getBillingPixExpiry, useBillingPixExpiry } from './useBillingPixExpiry';
import * as S from './MonthlyBilling.styles';

export type MonthlyBillingPix = { invoice: Invoice; qrCode: string; expiresAt?: string | null };
type Props = {
  pix: MonthlyBillingPix;
  generating: boolean;
  error?: string;
  onClose: () => void;
  onGenerate: () => void;
  onConfirmed: () => void;
};

export function MonthlyBillingPixDialog({
  pix,
  generating,
  error,
  onClose,
  onGenerate,
  onConfirmed,
}: Props) {
  const validity = useBillingPixExpiry(pix.expiresAt);
  const usable = validity.status === 'valid' && Boolean(pix.qrCode.trim());
  const [copied, setCopied] = useState<'idle' | 'copied' | 'error'>('idle');
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');
  const code = useRef<HTMLTextAreaElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const panel = useDialogFocusManagement<HTMLDivElement>(onClose);
  const active = useRef(false);
  const checkPending = useRef(false);

  const checkPayment = useCallback(
    async (manual = false) => {
      if (checkPending.current || generating || !active.current) return;
      checkPending.current = true;
      setChecking(true);
      if (manual) setCheckMessage('');
      try {
        const overview = await monthlyBillingService.getOverview();
        if (!active.current) return;
        if (
          overview.invoices.some(
            (invoice) => invoice.id === pix.invoice.id && invoice.status === 'PAGO',
          )
        ) {
          onConfirmed();
        } else if (manual)
          setCheckMessage(
            'O pagamento ainda não foi confirmado. Aguarde a confirmação antes de pagar novamente.',
          );
      } catch {
        if (active.current && manual)
          setCheckMessage('Não foi possível consultar o pagamento. Tente novamente.');
      } finally {
        checkPending.current = false;
        if (active.current) setChecking(false);
      }
    },
    [generating, onConfirmed, pix.invoice.id],
  );

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => void checkPayment(), 5000);
    return () => window.clearInterval(timer);
  }, [checkPayment]);

  const copy = async () => {
    if (getBillingPixExpiry(pix.expiresAt).status !== 'valid') {
      validity.refresh();
      return;
    }
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      if (active.current) setCopied('copied');
    } catch {
      if (!active.current) return;
      setCopied('error');
      if (details.current) details.current.open = true;
      code.current?.focus();
      code.current?.select();
    }
  };

  const dialog = (
    <S.PixBackdrop role="presentation" onMouseDown={onClose}>
      <S.PixModal
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pix-payment-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="close" type="button" aria-label="Fechar" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
        <span className="brand">
          <QrCode aria-hidden="true" /> Pagamento seguro via Pix
        </span>
        <h2 id="pix-payment-title">Pague sua mensalidade</h2>
        <p>Fatura #{pix.invoice.id}. O prazo deste Pix não altera o vencimento da mensalidade.</p>
        <div className="amount">
          {Number(pix.invoice.total).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </div>
        {usable ? (
          <>
            <BillingPixValidity validity={validity} />
            <div className="qr-frame" role="img" aria-label="QR Code Pix da mensalidade">
              <QRCode value={pix.qrCode} size={202} />
            </div>
            <button className="copy" type="button" onClick={() => void copy()}>
              {copied === 'copied' ? <Check /> : <Copy />}
              {copied === 'copied' ? 'Código copiado' : 'Copiar código Pix'}
            </button>
            {copied !== 'idle' && (
              <span className={`copy-feedback ${copied}`} role="status">
                {copied === 'copied'
                  ? 'Agora cole no aplicativo do seu banco.'
                  : 'Selecione e copie o código abaixo manualmente.'}
              </span>
            )}
            <details ref={details}>
              <summary>Ver código Pix</summary>
              <label className="sr-only" htmlFor="monthly-pix-code">
                Código Pix copia e cola
              </label>
              <textarea ref={code} id="monthly-pix-code" value={pix.qrCode} readOnly rows={3} />
            </details>
          </>
        ) : (
          <div className="expired-pix">
            <Clock3 aria-hidden="true" />
            <h3 role="status">
              {validity.status === 'expired'
                ? 'Este código Pix expirou'
                : 'A validade deste Pix não pôde ser confirmada'}
            </h3>
            <p>
              O QR Code e o copia e cola foram ocultados. Gere outro código para esta mesma fatura.
              Se já pagou, verifique a confirmação abaixo.
            </p>
            <button
              className="copy"
              type="button"
              onClick={onGenerate}
              disabled={generating || checking}
            >
              {generating ? <RefreshCw /> : <QrCode />}
              {generating ? 'Preparando seu Pix...' : 'Gerar novo Pix'}
            </button>
          </div>
        )}
        {error && (
          <p className="pix-error" role="alert">
            {error}
          </p>
        )}
        <div className="payment-confirmation">
          <span>A confirmação do pagamento é consultada automaticamente.</span>
          <button
            type="button"
            disabled={checking || generating}
            onClick={() => void checkPayment(true)}
          >
            <RefreshCw size={15} />
            {checking ? 'Conferindo...' : 'Verificar pagamento'}
          </button>
          {checkMessage && <p role="status">{checkMessage}</p>}
        </div>
      </S.PixModal>
    </S.PixBackdrop>
  );
  const portalTarget =
    typeof document !== 'undefined' ? document.querySelector('[data-admin-root]') : null;
  return portalTarget ? createPortal(dialog, portalTarget) : dialog;
}
