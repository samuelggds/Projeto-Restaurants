import { ArrowRight, CreditCard, ReceiptText, ShieldCheck, Smartphone, X } from 'lucide-react';
import type { CheckoutPaymentMethod } from '../domain/checkout';
import * as S from './TableOrderContinuationModal.styles';

type Props = {
  open: boolean;
  accountEnabled: boolean;
  accountLoading: boolean;
  payNowAvailable: boolean;
  allowPix: boolean;
  allowCard: boolean;
  paymentMethod: Extract<CheckoutPaymentMethod, 'pix' | 'card'>;
  busy: boolean;
  onPaymentMethodChange: (method: Extract<CheckoutPaymentMethod, 'pix' | 'card'>) => void;
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
  allowCard,
  paymentMethod,
  busy,
  onPaymentMethodChange,
  onChooseAccount,
  onChoosePayNow,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <S.Backdrop
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <S.Dialog role="dialog" aria-modal="true" aria-labelledby="table-order-continuation-title">
        <S.Header>
          <span className="icon">
            <ShieldCheck size={23} />
          </span>
          <div>
            <h2 id="table-order-continuation-title">Como deseja continuar?</h2>
            <p>Seu pedido está pronto. Escolha quando prefere fazer o pagamento.</p>
          </div>
          <button type="button" aria-label="Fechar" disabled={busy} onClick={onClose}>
            <X size={18} />
          </button>
        </S.Header>

        <S.Body>
          <S.Choice $featured $disabled={!accountEnabled}>
            <span className="choice-icon">
              <ReceiptText size={21} />
            </span>
            <div>
              <h3>Adicionar à conta da mesa</h3>
              <p>O pedido vai direto para a cozinha e você decide como dividir e pagar depois.</p>
              {accountEnabled && <span className="badge">Mais prático para pedir em grupo</span>}
            </div>
            <S.Action
              $primary
              type="button"
              disabled={!accountEnabled || accountLoading || busy}
              onClick={onChooseAccount}
            >
              {accountLoading ? 'Consultando conta...' : 'Adicionar à conta'}
              <ArrowRight size={16} />
            </S.Action>
          </S.Choice>

          <S.Choice $disabled={!payNowAvailable}>
            <span className="choice-icon">
              <CreditCard size={21} />
            </span>
            <div>
              <h3>Pagar este pedido agora</h3>
              <p>Finalize somente este pedido com uma das formas online configuradas.</p>
            </div>
            {payNowAvailable ? (
              <>
                <S.PaymentMethods aria-label="Forma de pagamento deste pedido">
                  {allowPix && (
                    <button
                      type="button"
                      aria-pressed={paymentMethod === 'pix'}
                      onClick={() => onPaymentMethodChange('pix')}
                    >
                      <Smartphone size={16} /> Pix
                    </button>
                  )}
                  {allowCard && (
                    <button
                      type="button"
                      aria-pressed={paymentMethod === 'card'}
                      onClick={() => onPaymentMethodChange('card')}
                    >
                      <CreditCard size={16} /> Cartão
                    </button>
                  )}
                </S.PaymentMethods>
                <S.Action type="button" disabled={busy} onClick={onChoosePayNow}>
                  Pagar agora <ArrowRight size={16} />
                </S.Action>
              </>
            ) : (
              <S.Empty>O restaurante ainda não disponibilizou Pix ou cartão online.</S.Empty>
            )}
          </S.Choice>

          {!accountEnabled && !accountLoading && !payNowAvailable && (
            <S.Empty>
              Nenhuma opção está disponível no momento. Chame o garçom para receber ajuda.
            </S.Empty>
          )}
        </S.Body>
      </S.Dialog>
    </S.Backdrop>
  );
}
