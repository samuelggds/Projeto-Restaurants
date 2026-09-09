import { useState } from 'react';
import { PaymentResultView } from '../../../components/payment/PaymentResultView';
import { OrderSupportDialog } from '../../../features/order-support/OrderSupportDialog';
import type { CheckoutPaymentResult } from '../hooks/useCheckoutPayments';

export function UncertainPaymentResult({
  result,
  restaurantName,
  restaurantCategory,
  visitor,
  onBack,
}: {
  result: CheckoutPaymentResult;
  restaurantName: string;
  restaurantCategory: unknown;
  visitor: boolean;
  onBack: () => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <>
      <PaymentResultView
        status="PENDING"
        method={result.method}
        restaurantName={restaurantName}
        restaurantCategory={restaurantCategory}
        orderLabel={`Pedido #${result.orderId}`}
        amount={result.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        description="Seu pedido foi registrado, mas a confirmação do pagamento ainda não chegou. Fale com o restaurante sobre este pedido antes de tentar pagar novamente."
        primaryAction={{
          label: 'Consultar pedido com o restaurante',
          onClick: () => setHelpOpen(true),
        }}
        secondaryAction={{ label: 'Voltar ao cardápio', onClick: onBack }}
      />
      {helpOpen && result.orderId ? (
        <OrderSupportDialog
          open
          onClose={() => setHelpOpen(false)}
          orders={[{ id: result.orderId, total: result.total }]}
          initialOrderId={result.orderId}
          visitor={visitor}
        />
      ) : null}
    </>
  );
}
