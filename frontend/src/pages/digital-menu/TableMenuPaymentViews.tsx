import { Banknote, Clock3 } from 'lucide-react';
import type { HomeData } from '../Home/types';
import {
  currentParticipantAccount,
  previewIndividualTablePayment,
  type TableAccountSnapshot,
} from '../Home/domain/tableAccount';
import { PixMark } from '../../components/payment/PixMark';
import { FlowHeader } from './TableMenuFlow';
import { formatTableNumber } from './TableMenuFlow.domain';
import * as S from './TableMenuExperience.styles';

const centsToBrl = (value: number) =>
  (Number(value || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function TablePaymentChoiceView({
  data,
  tableLabel,
  accountSnapshot,
  paymentLoading,
  onStartPayment,
  onBack,
  onHome,
  onOrders,
}: {
  data: HomeData;
  tableLabel: string | number;
  accountSnapshot: TableAccountSnapshot;
  paymentLoading: boolean;
  onStartPayment: (method: 'PIX' | 'CASH') => void;
  onBack: () => void;
  onHome: () => void;
  onOrders: () => void;
}) {
  const allowPix = accountSnapshot.capabilities.allowPix === true;
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
                Finalize agora pelo PIX ou pague em dinheiro com a equipe.
              </span>
              <span className="mobile-only">
                Finalize com PIX ou pague em dinheiro.
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
