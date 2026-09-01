import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  CreditCard,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
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

type OpenModalProps = Omit<Props, 'open'>;

function OpenTableOrderContinuationModal({
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
}: OpenModalProps) {
  const [step, setStep] = useState<'DECISION' | 'METHOD'>('DECISION');
  const choosingMethod = step === 'METHOD';

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
            <h2 id="table-order-continuation-title">
              {choosingMethod ? 'Como deseja pagar este pedido?' : 'Como deseja continuar?'}
            </h2>
            <p>
              {choosingMethod
                ? 'Escolha uma forma online para pagar somente este pedido.'
                : 'Seu pedido está pronto. Escolha quando prefere fazer o pagamento.'}
            </p>
          </div>
          <button type="button" aria-label="Fechar" disabled={busy} onClick={onClose}>
            <X size={18} />
          </button>
        </S.Header>

        <S.Body>
          {choosingMethod ? (
            <>
              <S.BackButton type="button" disabled={busy} onClick={() => setStep('DECISION')}>
                <ArrowLeft size={16} />
                Voltar
              </S.BackButton>
              <S.MethodPanel>
                <S.PaymentMethods aria-label="Forma de pagamento deste pedido">
                  {allowPix && (
                    <button
                      type="button"
                      aria-pressed={paymentMethod === 'pix'}
                      disabled={busy}
                      onClick={() => onPaymentMethodChange('pix')}
                    >
                      <span>
                        <Smartphone size={18} />
                      </span>
                      <b>Pix</b>
                      <small>Use o QR Code ou copie o código.</small>
                    </button>
                  )}
                  {allowCard && (
                    <button
                      type="button"
                      aria-pressed={paymentMethod === 'card'}
                      disabled={busy}
                      onClick={() => onPaymentMethodChange('card')}
                    >
                      <span>
                        <CreditCard size={18} />
                      </span>
                      <b>Cartão</b>
                      <small>Conclua no ambiente seguro do provedor.</small>
                    </button>
                  )}
                </S.PaymentMethods>
                <S.PaymentNotice>
                  <Clock3 size={17} />
                  <span>
                    <b>Clicar em pagar não significa pagamento confirmado.</b>
                    <small>O pedido só será considerado pago após a confirmação do provedor.</small>
                  </span>
                </S.PaymentNotice>
                <S.Action $primary type="button" disabled={busy} onClick={onChoosePayNow}>
                  {busy ? 'Iniciando com segurança...' : 'Continuar para pagar'}
                  <ArrowRight size={16} />
                </S.Action>
              </S.MethodPanel>
            </>
          ) : (
            <>
              <S.Choice $featured $disabled={!accountEnabled}>
                <span className="choice-icon">
                  <ReceiptText size={21} />
                </span>
                <div>
                  <h3>Adicionar à conta da mesa</h3>
                  <p>
                    O pedido vai direto para a cozinha e você decide como dividir e pagar depois.
                  </p>
                  {accountEnabled && (
                    <span className="badge">Mais prático para pedir em grupo</span>
                  )}
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
                  <S.Action type="button" disabled={busy} onClick={() => setStep('METHOD')}>
                    Escolher forma de pagamento
                    <ArrowRight size={16} />
                  </S.Action>
                ) : (
                  <S.Empty>O restaurante ainda não disponibilizou Pix ou cartão online.</S.Empty>
                )}
              </S.Choice>

              {!accountEnabled && !accountLoading && !payNowAvailable && (
                <S.Empty>
                  Nenhuma opção está disponível no momento. Chame o garçom para receber ajuda.
                </S.Empty>
              )}
            </>
          )}
        </S.Body>
      </S.Dialog>
    </S.Backdrop>
  );
}

export function TableOrderContinuationModal({ open, ...props }: Props) {
  if (!open) return null;
  return <OpenTableOrderContinuationModal {...props} />;
}
