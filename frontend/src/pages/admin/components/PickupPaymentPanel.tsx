import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { Banknote, CheckCircle2, CreditCard, QrCode, RefreshCw } from 'lucide-react';
import paymentTerminalService, { type PaymentTerminal } from '../../../Services/paymentTerminalService';
import pickupPaymentService, { type PickupPayment } from '../../../Services/pickupPaymentService';
import * as S from './PickupPaymentPanel.styles';

type Method = 'PIX' | 'CARTAO' | 'DINHEIRO';

type Props = {
  orderId: number;
  total: number;
  onPaid: () => void | Promise<void>;
};

function messageFrom(error: unknown) {
  return (
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
    (error as Error)?.message ||
    'Não foi possível concluir a operação.'
  );
}

export default function PickupPaymentPanel({ orderId, total, onPaid }: Props) {
  const [method, setMethod] = useState<Method>('PIX');
  const [payment, setPayment] = useState<PickupPayment | null>(null);
  const [terminals, setTerminals] = useState<PaymentTerminal[]>([]);
  const [terminalPublicId, setTerminalPublicId] = useState('');
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    paymentTerminalService
      .list()
      .then((snapshot) => {
        if (!active) return;
        const available = snapshot.terminals.filter(
          (terminal) => terminal.active && String(terminal.operatingMode || '').toUpperCase() === 'PDV',
        );
        setTerminals(available);
        setTerminalPublicId((current) => current || available[0]?.publicId || '');
      })
      .catch(() => setTerminals([]));
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
        // Enquanto o provedor ainda não aprovou, mantemos o estado e tentamos novamente.
      }
    };
    const timer = window.setInterval(() => void check(), 4_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [method, onPaid, orderId, paid, payment]);

  async function startAutomatic() {
    if (method === 'DINHEIRO') return;
    setBusy(true);
    setError('');
    try {
      const result = await pickupPaymentService.start(
        orderId,
        method,
        method === 'CARTAO' ? terminalPublicId || undefined : undefined,
      );
      setPayment(result.payment);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  async function reconcile() {
    setBusy(true);
    setError('');
    try {
      const result = await pickupPaymentService.reconcile(orderId);
      if (result.payment) setPayment(result.payment);
      if (result.paid) {
        setPaid(true);
        await onPaid();
      }
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmCash() {
    setBusy(true);
    setError('');
    try {
      await pickupPaymentService.confirmCash(orderId);
      setPaid(true);
      await onPaid();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <S.Panel aria-label={`Pagamento da retirada do pedido ${orderId}`}>
      <div className="head">
        <div>
          <strong>Pagamento no restaurante</strong>
          <small>Pix e cartão são validados pelo provedor. Dinheiro exige confirmação do funcionário.</small>
        </div>
        <b>{Number(total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>
      </div>

      <S.Methods>
        <button type="button" className={method === 'PIX' ? 'active' : ''} onClick={() => { setMethod('PIX'); setPayment(null); setError(''); }}>
          <QrCode /><strong>Pix</strong><small>Confirmação automática</small>
        </button>
        <button type="button" className={method === 'CARTAO' ? 'active' : ''} onClick={() => { setMethod('CARTAO'); setPayment(null); setError(''); }}>
          <CreditCard /><strong>Cartão</strong><small>Point integrada</small>
        </button>
        <button type="button" className={method === 'DINHEIRO' ? 'active' : ''} onClick={() => { setMethod('DINHEIRO'); setPayment(null); setError(''); }}>
          <Banknote /><strong>Dinheiro</strong><small>Confirmação manual</small>
        </button>
      </S.Methods>

      {method === 'CARTAO' && !payment ? (
        <S.TerminalSelect>
          Maquininha
          <select value={terminalPublicId} onChange={(event) => setTerminalPublicId(event.target.value)}>
            <option value="">Selecione uma Point</option>
            {terminals.map((terminal) => (
              <option key={terminal.publicId} value={terminal.publicId}>
                {terminal.serial || terminal.providerTerminalId}
              </option>
            ))}
          </select>
        </S.TerminalSelect>
      ) : null}

      {payment?.method === 'PIX' && payment.pixCopyPaste ? (
        <S.PixBox>
          <QRCode value={payment.pixCopyPaste} />
          <div>
            <strong>Mostre o QR Code para o cliente</strong>
            <small>Assim que o provedor aprovar, o pedido muda para pago automaticamente.</small>
            <S.Actions>
              <button type="button" onClick={() => void navigator.clipboard.writeText(payment.pixCopyPaste || '')}>Copiar Pix</button>
            </S.Actions>
          </div>
        </S.PixBox>
      ) : null}

      {payment && !paid ? (
        <S.Status>
          <RefreshCw size={15} />
          {payment.method === 'CARTAO'
            ? 'Cobrança enviada para a maquininha. Aguardando aprovação.'
            : 'Aguardando confirmação do Pix.'}
        </S.Status>
      ) : null}
      {paid ? <S.Status $paid><CheckCircle2 size={15} />Pagamento confirmado.</S.Status> : null}
      {error ? <S.Error role="alert">{error}</S.Error> : null}

      {!paid ? (
        <S.Actions>
          {method === 'DINHEIRO' ? (
            <button type="button" className="cash" onClick={() => void confirmCash()} disabled={busy}>
              <Banknote size={15} /> {busy ? 'Confirmando...' : 'Confirmar dinheiro recebido'}
            </button>
          ) : !payment ? (
            <button
              type="button"
              className="primary"
              onClick={() => void startAutomatic()}
              disabled={busy || (method === 'CARTAO' && !terminalPublicId)}
            >
              {method === 'PIX' ? <QrCode size={15} /> : <CreditCard size={15} />}
              {busy ? 'Iniciando...' : method === 'PIX' ? 'Gerar Pix' : 'Enviar para maquininha'}
            </button>
          ) : (
            <button type="button" onClick={() => void reconcile()} disabled={busy}>
              <RefreshCw size={15} /> {busy ? 'Consultando...' : 'Atualizar pagamento'}
            </button>
          )}
        </S.Actions>
      ) : null}
    </S.Panel>
  );
}
