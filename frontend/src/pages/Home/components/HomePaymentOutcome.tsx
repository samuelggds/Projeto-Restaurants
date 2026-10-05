import PixPaymentPanel from '../../Cart/components/PixPaymentPanel';
import { PaymentResultView } from '../../../components/payment/PaymentResultView';
import { UncertainPaymentResult } from './UncertainPaymentResult';
import { CardPaymentReturnPanel } from './CardPaymentReturnPanel';
import type {
  CheckoutPaymentResult,
  PixPaymentData,
  PixPaymentStatus,
} from '../hooks/useCheckoutPayments';
import type {
  CardPaymentReturnDetails,
  CardPaymentReturnStatus,
} from '../hooks/useCardPaymentReturn';
import type { HomeData } from '../types';

type CardReturnState = {
  status: CardPaymentReturnStatus;
  error: string | null;
  providerReturnStatus: string;
  details: CardPaymentReturnDetails | null;
  verify: () => void | Promise<unknown>;
};

type Props = {
  hasCardPaymentReturn: boolean;
  cardPaymentReturn: CardReturnState;
  paymentResult: CheckoutPaymentResult | null;
  pixPaymentData: PixPaymentData | null;
  pixPaymentStatus: PixPaymentStatus;
  pixPaymentError: string | null;
  primaryColor: string;
  homeData: HomeData;
  restaurantId: number | null;
  visitor: boolean;
  onCloseCardPaymentReturn: () => void;
  onRetryCardPayment: (orderPublicId: string) => void;
  onClearPaymentResult: () => void;
  onVerifyPixPayment: () => void | Promise<unknown>;
  onClearPixPayment: () => void;
  onTrackOrder: (orderId: number) => void;
};

const currency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function HomePaymentOutcome({
  hasCardPaymentReturn,
  cardPaymentReturn,
  paymentResult,
  pixPaymentData,
  pixPaymentStatus,
  pixPaymentError,
  primaryColor,
  homeData,
  restaurantId,
  visitor,
  onCloseCardPaymentReturn,
  onRetryCardPayment,
  onClearPaymentResult,
  onVerifyPixPayment,
  onClearPixPayment,
  onTrackOrder,
}: Props) {
  if (hasCardPaymentReturn) {
    return (
      <CardPaymentReturnPanel
        status={cardPaymentReturn.status}
        error={cardPaymentReturn.error}
        providerReturnStatus={cardPaymentReturn.providerReturnStatus}
        primaryColor={primaryColor}
        restaurantName={cardPaymentReturn.details?.restaurantName || homeData.brand.name}
        restaurantLogoUrl={cardPaymentReturn.details?.restaurantLogoUrl || homeData.brand.logoUrl}
        restaurantOpen={homeData.isOpen}
        deliveryTime={cardPaymentReturn.details?.deliveryTime || homeData.deliveryTime}
        details={cardPaymentReturn.details}
        amount={
          typeof cardPaymentReturn.details?.totalAmount === 'number'
            ? currency(cardPaymentReturn.details.totalAmount)
            : undefined
        }
        onVerify={cardPaymentReturn.verify}
        onClose={() => {
          const retryable = ['FAILED', 'CANCELED', 'EXPIRED'].includes(cardPaymentReturn.status);
          const orderPublicId = String(cardPaymentReturn.details?.orderPublicId || '').trim();
          if (retryable && orderPublicId) {
            onRetryCardPayment(orderPublicId);
            return;
          }
          onCloseCardPaymentReturn();
        }}
        onTrackOrder={() => {
          const orderId = Number(cardPaymentReturn.details?.orderId || 0);
          if (orderId > 0) onTrackOrder(orderId);
          else onCloseCardPaymentReturn();
        }}
      />
    );
  }

  if (paymentResult) {
    if (paymentResult.reconciliationRequired) {
      return (
        <UncertainPaymentResult
          result={paymentResult}
          restaurantName={homeData.brand.name}
          restaurantCategory={homeData.brand.category ?? 'RESTAURANTE'}
          visitor={visitor}
          onBack={onClearPaymentResult}
        />
      );
    }

    if (paymentResult.method === 'Cartão' || paymentResult.method === 'Cartão de débito') {
      return (
        <CardPaymentReturnPanel
          status={paymentResult.status}
          error={null}
          providerReturnStatus=""
          primaryColor={primaryColor}
          restaurantName={homeData.brand.name}
          restaurantLogoUrl={homeData.brand.logoUrl}
          restaurantOpen={homeData.isOpen}
          deliveryTime={homeData.deliveryTime}
          details={{
            orderId: paymentResult.orderId,
            restaurantId: restaurantId || undefined,
            restaurantName: homeData.brand.name,
            restaurantLogoUrl: homeData.brand.logoUrl,
            deliveryTime: homeData.deliveryTime,
            totalAmount: paymentResult.total,
            cardPaymentType:
              paymentResult.cardDisplay?.cardPaymentType ||
              (paymentResult.method === 'Cartão de débito' ? 'debit' : 'credit'),
            cardBrand: paymentResult.cardDisplay?.cardBrand || 'card',
            cardLast4: paymentResult.cardDisplay?.cardLast4 || null,
          }}
          amount={currency(paymentResult.total)}
          onVerify={async () => paymentResult.status}
          onClose={onClearPaymentResult}
          onTrackOrder={() => {
            const orderId = Number(paymentResult.orderId || 0);
            if (orderId > 0) onTrackOrder(orderId);
            else onClearPaymentResult();
          }}
        />
      );
    }

    return (
      <PaymentResultView
        status={paymentResult.status}
        method={paymentResult.method}
        restaurantName={homeData.brand.name}
        restaurantCategory={homeData.brand.category ?? 'RESTAURANTE'}
        orderLabel={paymentResult.orderId ? `Pedido #${paymentResult.orderId}` : undefined}
        amount={currency(paymentResult.total)}
        onAutoReturn={onClearPaymentResult}
        primaryAction={{ label: 'Voltar ao cardápio', onClick: onClearPaymentResult }}
      />
    );
  }

  if (pixPaymentData) {
    return (
      <PixPaymentPanel
        pixPaymentData={pixPaymentData}
        paymentStatus={pixPaymentStatus}
        paymentError={pixPaymentError}
        primaryColor={primaryColor}
        restaurantName={homeData.brand.name}
        restaurantLogoUrl={homeData.brand.logoUrl}
        restaurantOpen={homeData.isOpen}
        deliveryTime={homeData.deliveryTime}
        cartCount={0}
        formatCurrency={currency}
        onCopyPixKey={() => navigator.clipboard.writeText(pixPaymentData.pixCode)}
        onVerify={onVerifyPixPayment}
        onBackToCart={onClearPixPayment}
        onTrackOrder={() => {
          const orderId = Number(pixPaymentData.orderId || 0);
          if (orderId > 0) onTrackOrder(orderId);
          else onClearPixPayment();
        }}
      />
    );
  }

  return null;
}
