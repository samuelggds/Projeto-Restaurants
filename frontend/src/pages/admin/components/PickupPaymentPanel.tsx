import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { Banknote, CheckCircle2, CreditCard, QrCode, RefreshCw } from 'lucide-react';
import paymentTerminalService, { type PaymentTerminal } from '../../../Services/paymentTerminalService';
import pickupPaymentService, { type PickupPayment } from '../../../Services/pickupPaymentService';
import { adminErrorMessage } from '../utils/adminErrorMessage';
import * as S from './PickupPaymentPanel.styles';

type Method = 'PIX' | 'CARTAO' | 'DINHEIRO';
type Props = {
  orderId: number;
  total: number;
  preferredMethod?: string | null;
  onPaid: () => void | Promise<void>;
  compact?: boolean;
};

function messageFrom(error: unknown) {
  return adminErrorMessage(error, 'Não foi possível concluir a cobrança.');
}
function resolvePreferredMethod(value: string | null | undefined): Method {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'CARTAO' || normalized === 'CARD') return 'CARTAO';
  if (normalized === 'DINHEIRO' || normalized === 'CASH') return 'DINHEIRO';
  return 'PIX';
}

export default function PickupPaymentPanel({ orderId, total, preferredMethod, onPaid, compact = false }: Props) {
  const [method, setMethod] = useState<Method>(() => resolvePreferredMethod(preferredMethod));
  const [payment, setPayment] = useState<PickupPayment | null>(null);
  const [terminals, setTerminals] = useState<PaymentTerminal[]>([]);
  const [terminalPublicId, setTerminalPublicId] = useState('');
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    paymentTerminalService.list().then((snapshot) => {
      if (!active) return;
      const available = snapshot.terminals.filter((terminal) =>
        terminal.active && String(terminal.operatingMode || '').toUpperCase() === 'PDV',
      );
      setTerminals(available);
      setTerminalPublicId((current) => current || available[0]?.publicId || '');
    }).catch(() => { if (active) setTerminals([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!payment || paid || method === 'DINHEIRO') return;
    let active = true;
    const check = async () => {
      try {
        const result = await pickupPaymentService.reconcile(orderId);
        if (!active) return;
        if (result.payment) setPayment(result.payment);
        if (result.paid) {
          setPaid(true);
          await onPaid();
        }
      } catch {
        // Approval still comes from the backend/provider, never from a UI timeout.
      }
    };
    const timer = window.setInterval(() => void check(), 4_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [method, onPaid, orderId, paid, payment]);

  async function startAutomatic() {
    if (method === 'DINHEIRO' || busy || paid) return;
    setBusy(true); setError('');
    try {
      const result = await pickupPaymentService.start(orderId, method, method === 'CARTAO' ? terminalPublicId || undefined : undefined);
      setPayment(result.payment);
    } catch (err) { setError(messageFrom(err)); }
    finally { setBusy(false); }
  }
  async function reconcile() {
    if (busy || paid) return;
    setBusy(true); setError('');
    try {
      const result = await pickupPaymentService.reconcile(orderId);
      if (result.payment) setPayment(result.payment);
      if (result.paid) { setPaid(true); await onPaid(); }
    } catch (err) { setError(messageFrom(err)); }
    finally { setBusy(false); }
  }
  async function confirmCash() {
    if (busy || paid) return;
    setBusy(true); setError('');
    try {
      await pickupPaymentService.confirmCash(orderId);
      setPaid(true);
      await onPaid();
    } catch (err) { setError(messageFrom(err)); }
    finally { setBusy(false); }
  }
  function selectMethod(next: Method) {
    if (busy || paid) return;
    setMethod(next); setPayment(null); setError('');
  }

  return (
    <S.Panel data-compact={compact} aria-label={`Pagamento da retirada do pedido ${orderId}`}>
      <div className="head">
        <div><strong>Pagamento no balcão</strong>{!compact ? <small>Forma escolhida pelo cliente: {resolvePreferredMethod(preferredMethod) === 'PIX' ? 'Pix' : resolvePreferredMethod(preferredMethod) === 'CARTAO' ? 'Cartão na maquininha' : 'Dinheiro'}. O pedido só pode ser entregue após a confirmação do pagamento.</small> : null}</div>
        <b>{Number(total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>
      </div>
      <S.Methods data-compact={compact} role="group" aria-label="Formas de pagamento no balcão">
        <button type="button" aria-label="Pix no balcão" aria-pressed={method === 'PIX'} className={method === 'PIX' ? 'active' : ''} disabled={busy || paid} onClick={() => selectMethod('PIX')}><QrCode aria-hidden="true" /><strong>{compact ? 'Pix' : 'Pix no balcão'}</strong>{!compact ? <small>Gere o QR Code para o cliente</small> : null}</button>
        <button type="button" aria-label="Cartão na maquininha" aria-pressed={method === 'CARTAO'} className={method === 'CARTAO' ? 'active' : ''} disabled={busy || paid} onClick={() => selectMethod('CARTAO')}><CreditCard aria-hidden="true" /><strong>{compact ? 'Maquininha' : 'Cartão na maquininha'}</strong>{!compact ? <small>Envie a cobrança para a Point</small> : null}</button>
        <button type="button" aria-label="Dinheiro" aria-pressed={method === 'DINHEIRO'} className={method === 'DINHEIRO' ? 'active' : ''} disabled={busy || paid} onClick={() => selectMethod('DINHEIRO')}><Banknote aria-hidden="true" /><strong>Dinheiro</strong>{!compact ? <small>Confirme somente após receber</small> : null}</button>
      </S.Methods>
      {method === 'CARTAO' && !payment ? <S.TerminalSelect>Maquininha<select value={terminalPublicId} disabled={busy || paid} onChange={(event) => setTerminalPublicId(event.target.value)}><option value="">Selecione uma Point</option>{terminals.map((terminal) => <option key={terminal.publicId} value={terminal.publicId}>{terminal.serial || terminal.providerTerminalId}</option>)}</select>{!terminals.length ? <small>Nenhuma maquininha ativa em modo PDV. Configure-a antes de enviar a cobrança.</small> : null}</S.TerminalSelect> : null}
      {payment?.method === 'PIX' && payment.pixCopyPaste ? <S.PixBox><QRCode value={payment.pixCopyPaste} /><div><strong>Mostre o QR Code para o cliente</strong><small>Assim que a empresa de pagamento aprovar, o pedido muda para pago automaticamente.</small><S.Actions><button type="button" onClick={() => void navigator.clipboard.writeText(payment.pixCopyPaste || '')}>Copiar Pix</button></S.Actions></div></S.PixBox> : null}
      {payment && !paid ? <S.Status><RefreshCw size={15} aria-hidden="true" />{payment.method === 'CARTAO' ? 'Cobrança enviada para a maquininha. Aguardando aprovação.' : 'Aguardando confirmação do Pix.'}</S.Status> : null}
      {paid ? <S.Status $paid><CheckCircle2 size={15} aria-hidden="true" />Pagamento confirmado.</S.Status> : null}
      {error ? <S.Error role="alert">{error}</S.Error> : null}
      {!paid ? <S.Actions data-compact={compact}>
        {method === 'DINHEIRO' ? <button type="button" className="cash" onClick={() => void confirmCash()} disabled={busy}><CheckCircle2 size={15} aria-hidden="true" />{busy ? 'Confirmando...' : 'Confirmar dinheiro recebido'}</button>
          : !payment ? <button type="button" className="primary" onClick={() => void startAutomatic()} disabled={busy || (method === 'CARTAO' && !terminalPublicId)}>{method === 'PIX' ? <QrCode size={15} aria-hidden="true" /> : <CreditCard size={15} aria-hidden="true" />}{busy ? 'Iniciando...' : method === 'PIX' ? 'Gerar Pix no balcão' : 'Enviar para maquininha'}</button>
            : <button type="button" onClick={() => void reconcile()} disabled={busy}><RefreshCw size={15} aria-hidden="true" />{busy ? 'Consultando...' : 'Atualizar pagamento'}</button>}
      </S.Actions> : null}
      {compact && !paid ? <small className="compact-payment-hint">Confirme dinheiro somente após receber. Pix e maquininha exigem aprovação do provedor.</small> : null}
    </S.Panel>
  );
}
