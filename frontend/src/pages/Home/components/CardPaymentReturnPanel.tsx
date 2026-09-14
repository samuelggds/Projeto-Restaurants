import { PaymentResultView } from '../../../components/payment/PaymentResultView';
import type { CardPaymentReturnStatus } from '../hooks/useCardPaymentReturn';

type Props = {
  status: CardPaymentReturnStatus;
  error: string | null;
  providerReturnStatus: string;
  primaryColor?: string;
  restaurantName?: string;
  restaurantCategory?: unknown;
  orderLabel?: string;
  amount?: string;
  onVerify: () => void | Promise<unknown>;
  onClose: () => void;
};

export function CardPaymentReturnPanel({
  status,
  restaurantName,
  restaurantCategory,
  orderLabel,
  amount,
  onVerify,
  onClose,
}: Props) {
  const terminal = ['PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED'].includes(status);

  return (
    <PaymentResultView
      status={status}
      method="Cartão"
      restaurantName={restaurantName}
      restaurantCategory={restaurantCategory ?? 'RESTAURANTE'}
      orderLabel={orderLabel}
      amount={amount}
      onAutoReturn={onClose}
      primaryAction={
        terminal
          ? { label: 'Voltar ao cardápio', onClick: onClose }
          : {
              label: status === 'VERIFYING' ? 'Verificando...' : 'Verificar pagamento',
              onClick: () => void onVerify(),
              disabled: status === 'VERIFYING',
            }
      }
      secondaryAction={terminal ? undefined : { label: 'Voltar ao cardápio', onClick: onClose }}
    />
  );
}
