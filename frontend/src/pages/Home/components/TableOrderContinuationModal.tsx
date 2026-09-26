import { Clock3, QrCode, ReceiptText, ShieldCheck, X } from 'lucide-react';
import * as S from './TableOrderContinuationModal.styles';

type Props = {
  open: boolean;
  accountEnabled: boolean;
  accountLoading: boolean;
  payNowAvailable: boolean;
  allowPix: boolean;
  allowCard: boolean;
  paymentMethod: 'pix' | 'card';
  restaurantId: number | null;
  payerEmail?: string;
  busy: boolean;
  onPaymentMethodChange: (method: 'pix' | 'card') => void;
  onChooseAccount: () => void;
  onChoosePayNow: () => void;
  onClose: () => void;
};

export function TableOrderContinuationModal({
  open,
  accountEnabled,
  accountLoading,
  payNowAvailable,
  allowPix,
  busy,
  onChooseAccount,
  onChoosePayNow,
  onClose,
}: Props) {
  if (!open) return null;

  const pixAvailable = payNowAvailable && allowPix;

  return (
    <S.Backdrop
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      <S.Dialog role="dialog" aria-modal="true" aria-labelledby="table-order-continuation-title">
        <S.Header>
          <span className="icon">
            <ShieldCheck size={23} />
          </span>
          <div>
            <h2 id="table-order-continuation-title">Como deseja finalizar?</h2>
            <p>Escolha pagar este pedido agora via Pix ou deixar o valor na sua comanda.</p>
          </div>
          <button type="button" aria-label="Fechar" disabled={busy} onClick={onClose}>
            <X size={18} />
          </button>
        </S.Header>

        <S.Body>
          <S.Choice $featured $disabled={!pixAvailable}>
            <span className="choice-icon">
              <QrCode size={21} />
            </span>
            <div>
              <h3>Pagar agora</h3>
              <p>Gere um Pix com QR Code e copia e cola para pagar este pedido.</p>
              <span className="badge">Confirmação automática</span>
            </div>
            {pixAvailable ? (
              <S.Action $primary type="button" disabled={busy} onClick={onChoosePayNow}>
                {busy ? 'Gerando Pix...' : 'Pagar agora com Pix'}
              </S.Action>
            ) : (
              <S.Empty>Pix ainda não está disponível neste restaurante.</S.Empty>
            )}
          </S.Choice>

          <S.Choice $disabled={!accountEnabled}>
            <span className="choice-icon">
              <ReceiptText size={21} />
            </span>
            <div>
              <h3>Pagar depois</h3>
              <p>O pedido entra na cozinha normalmente e fica pendente na sua comanda.</p>
            </div>
            <S.Action
              type="button"
              disabled={!accountEnabled || accountLoading || busy}
              onClick={onChooseAccount}
            >
              {accountLoading ? 'Enviando pedido...' : 'Adicionar à minha comanda'}
            </S.Action>
          </S.Choice>

          <S.PaymentNotice>
            <Clock3 size={17} />
            <span>
              <b>Quer pagar no cartão?</b>
              <small>Chame o garçom e faça o pagamento presencialmente na maquininha.</small>
            </span>
          </S.PaymentNotice>
        </S.Body>
      </S.Dialog>
    </S.Backdrop>
  );
}
