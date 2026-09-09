import { useState } from 'react';
import { PaymentResultView } from '../../../components/payment/PaymentResultView';
import { OrderSupportDialog } from '../../../features/order-support/OrderSupportDialog';
import type { UncertainCheckoutPaymentResult } from '../hooks/useCheckoutPayments';

export function UncertainPaymentResult({
  result,
  restaurantName,
  restaurantCategory,
  visitor,
  onBack,
}: {
  result: UncertainCheckoutPaymentResult;
  restaurantName: string;
  restaurantCategory: unknown;
  visitor: boolean;
  onBack: () => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const orderId =
    Number.isSafeInteger(result.orderId) && result.orderId > 0 ? result.orderId : null;
  return (
    <>
      <PaymentResultView
        status="PENDING"
        method={result.method}
        restaurantName={restaurantName}
        restaurantCategory={restaurantCategory}
        orderLabel={orderId ? `Pedido #${orderId}` : undefined}
        amount={result.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        description="Seu pedido foi registrado, mas a confirmação do pagamento ainda não chegou. Fale com o restaurante sobre este pedido antes de tentar pagar novamente."
        primaryAction={
          orderId
            ? {
                label: 'Consultar pedido com o restaurante',
                onClick: () => setHelpOpen(true),
              }
            : undefined
        }
        secondaryAction={{ label: 'Voltar ao cardápio', onClick: onBack }}
      />
      {helpOpen && orderId ? (
        <OrderSupportDialog
          open
          onClose={() => setHelpOpen(false)}
          orders={[{ id: orderId, total: result.total }]}
          initialOrderId={orderId}
          visitor={visitor}
        />
      ) : null}
    </>
  );
}
