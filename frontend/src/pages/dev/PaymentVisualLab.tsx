import { useMemo, useState } from 'react';
import styled from 'styled-components';
import type { CheckoutPaymentMethod } from '../Home/domain/checkout';
import { FigmaPaymentCheckout } from '../Home/components/FigmaPaymentCheckout';
import { PaymentOptions } from '../Home/components/PaymentOptions';
import PixPaymentPanel from '../Cart/components/PixPaymentPanel';
import { CardPaymentReturnPanel } from '../Home/components/CardPaymentReturnPanel';
import type { CardPaymentReturnStatus } from '../Home/hooks/useCardPaymentReturn';
import type { PixPaymentStatus } from '../Home/hooks/useCheckoutPayments';

type VisualScenario =
  | 'card-form'
  | 'debit-form'
  | 'pix-waiting'
  | 'pix-paid'
  | 'pix-failed'
  | 'card-waiting'
  | 'card-paid'
  | 'card-failed';

const PRIMARY = '#d05632';
const RESTAURANT_NAME = 'North Pizza — Teste visual';
const FAKE_ORDER_ID = 990001;
const FAKE_TOTAL = 54.9;
const FAKE_PIX_CODE = 'PIX-FICTICIO-APENAS-PARA-TESTE-VISUAL-SEM-VALOR';

const cart = [
  {
    cartId: 'visual-test-item',
    productId: 'visual-test-product',
    name: 'Pizza teste visual',
    price: 49.9,
    quantity: 1,
    image: '',
  },
];

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PaymentVisualLab() {
  const [scenario, setScenario] = useState<VisualScenario>('card-form');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('card');
  const pixExpiresAt = useMemo(() => new Date(Date.now() + 15 * 60 * 1000).toISOString(), []);

  const showCheckout = scenario === 'card-form' || scenario === 'debit-form';
  const pixStatus: PixPaymentStatus =
    scenario === 'pix-paid' ? 'PAID' : scenario === 'pix-failed' ? 'FAILED' : 'PENDING';
  const cardStatus: CardPaymentReturnStatus =
    scenario === 'card-paid' ? 'PAID' : scenario === 'card-failed' ? 'FAILED' : 'PENDING';

  const selectScenario = (next: VisualScenario) => {
    setScenario(next);
    if (next === 'card-form') setPaymentMethod('card');
    if (next === 'debit-form') setPaymentMethod('debit_card');
  };

  return (
    <Lab>
      <Toolbar aria-label="Controles do laboratório visual">
        <div>
          <strong>LABORATÓRIO LOCAL — PAGAMENTOS FICTÍCIOS</strong>
          <span>
            Somente DEV. Não cria pedido, não chama gateway, não movimenta dinheiro e não usa
            credenciais reais.
          </span>
        </div>
        <nav>
          <button className={scenario === 'card-form' ? 'active' : ''} onClick={() => selectScenario('card-form')}>Dados cartão</button>
          <button className={scenario === 'debit-form' ? 'active' : ''} onClick={() => selectScenario('debit-form')}>Dados débito</button>
          <button className={scenario === 'pix-waiting' ? 'active' : ''} onClick={() => selectScenario('pix-waiting')}>PIX aguardando</button>
          <button className={scenario === 'pix-paid' ? 'active success' : ''} onClick={() => selectScenario('pix-paid')}>PIX aprovado</button>
          <button className={scenario === 'pix-failed' ? 'active failure' : ''} onClick={() => selectScenario('pix-failed')}>PIX recusado</button>
          <button className={scenario === 'card-waiting' ? 'active' : ''} onClick={() => selectScenario('card-waiting')}>Cartão aguardando</button>
          <button className={scenario === 'card-paid' ? 'active success' : ''} onClick={() => selectScenario('card-paid')}>Cartão aprovado</button>
          <button className={scenario === 'card-failed' ? 'active failure' : ''} onClick={() => selectScenario('card-failed')}>Cartão recusado</button>
        </nav>
      </Toolbar>

      <Preview data-testid="payment-visual-preview">
        {showCheckout ? (
          <FigmaPaymentCheckout
            primaryColor={PRIMARY}
            loggedIn={false}
            brandName={RESTAURANT_NAME}
            cart={cart}
            cartCount={1}
            subtotal={49.9}
            deliveryFee={5}
            total={FAKE_TOTAL}
            paymentMethods={
              <PaymentOptions
                paymentMethod={paymentMethod}
                allowPayOnDelivery={false}
                allowPayAtPickup={false}
                allowPix
                allowCard
                allowDebitCard
                onChange={setPaymentMethod}
                restaurantId={999999}
                loggedIn={false}
                userEmail="teste.visual@example.invalid"
                figmaCheckout
                visualTestMode
              />
            }
            onBack={() => undefined}
            onContinue={() => undefined}
          />
        ) : scenario.startsWith('pix-') ? (
          <PixPaymentPanel
            pixPaymentData={{
              restaurantId: 999999,
              orderId: FAKE_ORDER_ID,
              total: FAKE_TOTAL,
              paymentId: 'pix-visual-ficticio',
              provider: 'VISUAL_TEST_ONLY',
              pixCode: FAKE_PIX_CODE,
              qrCodeBase64: null,
              paid: pixStatus === 'PAID',
              expiresAt: pixExpiresAt,
            }}
            paymentStatus={pixStatus}
            paymentError={
              pixStatus === 'FAILED'
                ? 'Pagamento fictício não aprovado para revisão visual da interface.'
                : null
            }
            primaryColor={PRIMARY}
            restaurantName={RESTAURANT_NAME}
            restaurantOpen
            deliveryTime="35–50 min"
            deliveryAddress="Rua Fictícia, 123 — Bairro Teste"
            orderPublicId="PEDIDO-VISUAL-990001"
            orderItems={[{ name: 'Pizza teste visual', quantity: 1, total: 49.9 }]}
            deliveryFee={5}
            cartCount={1}
            formatCurrency={money}
            onCopyPixKey={async () => undefined}
            onVerify={async () => pixStatus}
            onBackToCart={() => setScenario('card-form')}
            onTrackOrder={() => undefined}
          />
        ) : (
          <CardPaymentReturnPanel
            status={cardStatus}
            error={
              cardStatus === 'FAILED'
                ? 'Pagamento fictício recusado para revisão visual. Nenhuma cobrança foi realizada.'
                : null
            }
            providerReturnStatus=""
            primaryColor={PRIMARY}
            restaurantName={RESTAURANT_NAME}
            restaurantOpen
            deliveryTime="35–50 min"
            details={{
              orderId: FAKE_ORDER_ID,
              orderPublicId: 'PEDIDO-VISUAL-990001',
              restaurantId: 999999,
              restaurantName: RESTAURANT_NAME,
              deliveryTime: '35–50 min',
              totalAmount: FAKE_TOTAL,
            }}
            amount={money(FAKE_TOTAL)}
            onVerify={async () => cardStatus}
            onClose={() => setScenario('card-form')}
            onTrackOrder={() => undefined}
          />
        )}
      </Preview>
    </Lab>
  );
}

const Lab = styled.main`
  min-height: 100vh;
  background: #f5f5f3;
`;

const Toolbar = styled.aside`
  position: sticky;
  z-index: 1000;
  top: 0;
  padding: 12px 18px;
  display: grid;
  gap: 10px;
  border-bottom: 1px solid #d8d8d4;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(12px);

  > div {
    display: grid;
    gap: 2px;
  }

  strong {
    color: #7c2d12;
    font-size: 12px;
    letter-spacing: 0.04em;
  }

  span {
    color: #66635f;
    font-size: 11px;
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  button {
    min-height: 34px;
    padding: 0 11px;
    border: 1px solid #dedbd6;
    border-radius: 9px;
    background: #fff;
    color: #403d39;
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }

  button.active {
    border-color: #8b5cf6;
    background: #f3efff;
    color: #5b21b6;
  }

  button.active.success {
    border-color: #86c79a;
    background: #effaf2;
    color: #24703a;
  }

  button.active.failure {
    border-color: #e7aaa2;
    background: #fff2f0;
    color: #a3382e;
  }
`;

const Preview = styled.section`
  min-height: calc(100vh - 100px);
`;
