import { Banknote, Clock3, CreditCard, LockKeyhole } from 'lucide-react';
import type { HomeData } from '../Home/types';
import {
  currentParticipantAccount,
  previewIndividualTablePayment,
  type TableAccountSnapshot,
} from '../Home/domain/tableAccount';
import { OnlineCardPaymentForm, type CardPaymentPreparer } from '../Home/components/OnlineCardPaymentForm';
import { PixMark } from '../../components/payment/PixMark';
import { FlowHeader } from './TableMenuFlow';
import { formatTableNumber } from './TableMenuFlow.domain';
import * as S from './TableMenuExperience.styles';

const centsToBrl = (value: number) =>
  (Number(value || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function TableCardPaymentView({
  data,
  tableLabel,
  accountSnapshot,
  restaurantId,
  userEmail,
  paymentLoading,
  cardSubmitting,
  cardReady,
  onCardPreparerChange,
  onSubmitCardPayment,
  onBack,
  onHome,
  onOrders,
}: {
  data: HomeData;
  tableLabel: string | number;
  accountSnapshot: TableAccountSnapshot;
  restaurantId: number;
  userEmail?: string;
  paymentLoading: boolean;
  cardSubmitting: boolean;
  cardReady: boolean;
  onCardPreparerChange: (preparer: CardPaymentPreparer | null) => void;
  onSubmitCardPayment: () => void;
  onBack: () => void;
  onHome: () => void;
  onOrders: () => void;
}) {
  const ownAccount = currentParticipantAccount(accountSnapshot);
  const paymentPreview = previewIndividualTablePayment(accountSnapshot);
  const ownRemainingCents = ownAccount?.remainingCents || 0;
  const payableTotalCents =
    paymentPreview && !paymentPreview.blocked ? paymentPreview.totalCents : ownRemainingCents;
  const allowCard = accountSnapshot.capabilities.allowCard === true;

  return (
    <S.FigmaShell $primary="#ff4b4b" $fontFamily={data.fontFamily}>
      <FlowHeader
        data={data}
        tableLabel={tableLabel}
        title="Finalizar Conta"
        onBack={onBack}
        onHome={onHome}
        onMenu={onHome}
        onOrders={onOrders}
      />
      <S.FlowPage>
        <S.CardPaymentLayout>
          <S.CardPaymentHeading>
            <h1>Pagamento com cartão</h1>
            <p>Insira os dados abaixo para concluir seu pagamento com segurança.</p>
          </S.CardPaymentHeading>

          <S.CardSecurityBanner>
            <CreditCard size={22} aria-hidden="true" />
            <span>
              <b>Cartão processado pelo provedor do restaurante</b>
              <small>
                Número completo e CVV são protegidos pelo provedor e não são salvos no GastroNexa.
              </small>
            </span>
          </S.CardSecurityBanner>

          {allowCard && restaurantId > 0 ? (
            <OnlineCardPaymentForm
              restaurantId={restaurantId}
              payerEmail={userEmail}
              paymentType="credit"
              onPreparerChange={onCardPreparerChange}
            />
          ) : (
            <S.CardUnavailable role="status">
              <CreditCard size={20} aria-hidden="true" />
              <span>
                <b>Cartão indisponível</b>
                <small>
                  Esta opção será liberada quando o administrador configurar um provedor de cartão.
                </small>
              </span>
            </S.CardUnavailable>
          )}

          <S.CardPaymentTotal>
            <span>Total a pagar</span>
            <strong>{centsToBrl(payableTotalCents)}</strong>
          </S.CardPaymentTotal>

          <S.PrimaryAction
            type="button"
            disabled={
              paymentLoading ||
              cardSubmitting ||
              !allowCard ||
              restaurantId <= 0 ||
              !cardReady
            }
            onClick={onSubmitCardPayment}
          >
            <LockKeyhole size={17} aria-hidden="true" />
            {cardSubmitting || paymentLoading
              ? 'Processando cartão...'
              : 'Pagar ' + centsToBrl(payableTotalCents)}
          </S.PrimaryAction>

          <S.CardFootnote>
            Ao pagar, o backend confirma a cobrança diretamente com o provedor configurado para
            este restaurante.
          </S.CardFootnote>
        </S.CardPaymentLayout>
      </S.FlowPage>
    </S.FigmaShell>
  );
}

export function TablePaymentChoiceView({
  data,
  tableLabel,
  accountSnapshot,
  paymentLoading,
  onStartPayment,
  onOpenCard,
  onBack,
  onHome,
  onOrders,
}: {
  data: HomeData;
  tableLabel: string | number;
  accountSnapshot: TableAccountSnapshot;
  paymentLoading: boolean;
  onStartPayment: (method: 'PIX' | 'CASH') => void;
  onOpenCard: () => void;
  onBack: () => void;
  onHome: () => void;
  onOrders: () => void;
}) {
  const allowPix = accountSnapshot.capabilities.allowPix === true;
  const allowCard = accountSnapshot.capabilities.allowCard === true;
  const allowCash = accountSnapshot.capabilities.allowCash === true;
  const ownAccount = currentParticipantAccount(accountSnapshot);
  const paymentPreview = previewIndividualTablePayment(accountSnapshot);
  const ownRemainingCents = ownAccount?.remainingCents || 0;
  const payableTotalCents =
    paymentPreview && !paymentPreview.blocked ? paymentPreview.totalCents : ownRemainingCents;
  const pendingPayment = accountSnapshot.activePayment;
  const pendingPaymentActive = Boolean(
    pendingPayment && ['RESERVED', 'PROCESSING'].includes(pendingPayment.status),
  );
  const pixBlockedByOtherPayment = Boolean(
    pendingPaymentActive && pendingPayment?.method !== 'PIX',
  );
  const cardBlockedByOtherPayment = Boolean(
    pendingPaymentActive && pendingPayment?.method !== 'CARD',
  );
  const cashBlockedByOtherPayment = Boolean(
    pendingPaymentActive && pendingPayment?.method !== 'CASH',
  );

  return (
    <S.FigmaShell $primary="#ff4b4b" $fontFamily={data.fontFamily}>
      <FlowHeader
        data={data}
        tableLabel={tableLabel}
        title="Finalizar Conta"
        onBack={onBack}
        onHome={onHome}
        onMenu={onHome}
        onOrders={onOrders}
      />
      <S.FlowPage>
        <S.PaymentCard>
          <S.FlowTitle>
            <h1>Como prefere pagar?</h1>
            <p>
              <span className="desktop-only">
                Finalize agora pelo celular ou deixe para pagar depois com a equipe.
              </span>
              <span className="mobile-only">
                Finalize agora pelo celular ou deixe para pagar depois.
              </span>
            </p>
          </S.FlowTitle>

          <S.PaymentOptionsGrid>
            <S.PaymentChoiceCard className={!allowPix || pixBlockedByOtherPayment ? 'unavailable' : undefined}>
              <span className="icon pix-icon"><PixMark /></span>
              <span className="recommended desktop-only">RECOMENDADO</span>
              <span className="pix-badge mobile-only">PIX</span>
              <h2>Pagar agora (PIX)</h2>
              <p>
                {allowPix
                  ? 'Finalize pelo celular com liberação automática na hora. Rápido e prático.'
                  : 'O PIX será liberado quando o administrador configurar o pagamento deste restaurante.'}
              </p>
              <button
                className="primary"
                type="button"
                disabled={paymentLoading || !allowPix || pixBlockedByOtherPayment}
                onClick={() => onStartPayment('PIX')}
              >
                {!allowPix
                  ? 'PIX indisponível'
                  : pixBlockedByOtherPayment
                    ? 'PIX indisponível no momento'
                    : 'Escolher PIX'}
              </button>
            </S.PaymentChoiceCard>

            <S.PaymentChoiceCard className={!allowCard || cardBlockedByOtherPayment ? 'unavailable' : undefined}>
              <span className="icon"><CreditCard size={20} /></span>
              <h2>Pagar com cartão</h2>
              <p>
                {allowCard
                  ? 'Pague online com cartão pelo provedor configurado para este restaurante.'
                  : 'O cartão será liberado quando o administrador configurar um provedor compatível.'}
              </p>
              <button
                className="primary"
                type="button"
                disabled={paymentLoading || !allowCard || cardBlockedByOtherPayment}
                onClick={onOpenCard}
              >
                {!allowCard
                  ? 'Cartão indisponível'
                  : cardBlockedByOtherPayment
                    ? 'Cartão indisponível no momento'
                    : 'Pagar com cartão'}
              </button>
            </S.PaymentChoiceCard>

            <S.PaymentChoiceCard>
              <span className="icon"><Clock3 size={20} /></span>
              <h2>Deixar na conta</h2>
              <p>
                Os itens permanecem vinculados à Mesa {formatTableNumber(tableLabel)}. Pague ao sair com o garçom.
              </p>
              <button className="secondary" type="button" onClick={onBack}>
                Deixar aberto na Mesa
              </button>
            </S.PaymentChoiceCard>

            <S.PaymentChoiceCard className={!allowCash || cashBlockedByOtherPayment ? 'unavailable' : undefined}>
              <span className="icon"><Banknote size={20} /></span>
              <h2>Pagar em dinheiro</h2>
              <p>
                Pague em espécie ao garçom na hora de encerrar a conta. A confirmação é feita no sistema.
              </p>
              <button
                className="secondary"
                type="button"
                disabled={paymentLoading || !allowCash || cashBlockedByOtherPayment}
                onClick={() => onStartPayment('CASH')}
              >
                {!allowCash
                  ? 'Dinheiro indisponível'
                  : cashBlockedByOtherPayment
                    ? 'Dinheiro indisponível no momento'
                    : 'Pagar com dinheiro'}
              </button>
            </S.PaymentChoiceCard>
          </S.PaymentOptionsGrid>

          <S.PaymentSummary>
            <div className="label">
              <small>
                <span className="desktop-only">Valor restante da sua conta:</span>
                <span className="mobile-only">Sua conta:</span>
              </small>
              <strong>Somente seu consumo</strong>
            </div>
            <span className="amount">{centsToBrl(payableTotalCents)}</span>
          </S.PaymentSummary>
        </S.PaymentCard>
      </S.FlowPage>
    </S.FigmaShell>
  );
}
