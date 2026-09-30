import { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  paymentReducedMotion,
  paymentSurfaceRise,
} from '../../components/payment/paymentMotion';
import type { CheckoutPaymentMethod } from '../Home/domain/checkout';
import { resolveDefaultCheckoutPaymentMethod } from '../Home/domain/publicSettings';
import { FigmaPaymentCheckout } from '../Home/components/FigmaPaymentCheckout';
import { PaymentOptions } from '../Home/components/PaymentOptions';
import PixPaymentPanel from '../Cart/components/PixPaymentPanel';
import { CardPaymentReturnPanel } from '../Home/components/CardPaymentReturnPanel';
import type { CardPaymentReturnStatus } from '../Home/hooks/useCardPaymentReturn';
import type { PixPaymentStatus } from '../Home/hooks/useCheckoutPayments';

type VisualScenario =
  | 'checkout'
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
const VISUAL_PAYMENT_METHODS: CheckoutPaymentMethod[] = ['pix', 'card', 'debit_card'];
const DEFAULT_VISUAL_PAYMENT_METHOD =
  resolveDefaultCheckoutPaymentMethod(VISUAL_PAYMENT_METHODS) ?? 'pix';

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
  const [scenario, setScenario] = useState<VisualScenario>('checkout');
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPaymentMethod>(DEFAULT_VISUAL_PAYMENT_METHOD);
  const pixExpiresAt = useMemo(() => new Date(Date.now() + 15 * 60 * 1000).toISOString(), []);

  const showCheckout =
    scenario === 'checkout' || scenario === 'card-form' || scenario === 'debit-form';
  const pixStatus: PixPaymentStatus =
    scenario === 'pix-paid' ? 'PAID' : scenario === 'pix-failed' ? 'FAILED' : 'PENDING';
  const cardStatus: CardPaymentReturnStatus =
    scenario === 'card-paid' ? 'PAID' : scenario === 'card-failed' ? 'FAILED' : 'PENDING';

  const selectScenario = (next: VisualScenario) => {
    setScenario(next);
    if (next === 'checkout') setPaymentMethod(DEFAULT_VISUAL_PAYMENT_METHOD);
    if (next === 'card-form') setPaymentMethod('card');
    if (next === 'debit-form') setPaymentMethod('debit_card');
  };

  const continueFakeCheckout = () => {
    if (paymentMethod === 'pix') {
      setScenario('pix-waiting');
      return;
    }
    if (paymentMethod === 'card' || paymentMethod === 'debit_card') {
      setScenario('card-waiting');
    }
  };

  const waitingForPix = scenario === 'pix-waiting';
  const waitingForCard = scenario === 'card-waiting';

  return (
    <Lab>
      <Toolbar aria-label="Controles do laboratório visual">
        <div>
          <strong>LABORATÓRIO LOCAL — PAGAMENTOS FICTÍCIOS</strong>
          <span>
            Somente ambiente local. Não cria pedido, não chama gateway, não movimenta dinheiro e não usa
            credenciais reais.
          </span>
        </div>
        <nav>
          <button className={scenario === 'checkout' ? 'active' : ''} onClick={() => selectScenario('checkout')}>Checkout (PIX padrão)</button>
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

      {(waitingForPix || waitingForCard) ? (
        <SimulatorPanel aria-label="Simulador local do resultado do pagamento">
          <div>
            <strong>Escolha o resultado fictício</strong>
            <span>
              Esta ação é apenas visual e local. Nenhum pagamento, pedido ou webhook será criado.
            </span>
          </div>
          <div className="actions">
            <button
              type="button"
              className="approve"
              onClick={() => setScenario(waitingForPix ? 'pix-paid' : 'card-paid')}
            >
              Simular pagamento aprovado
            </button>
            <button
              type="button"
              className="reject"
              onClick={() => setScenario(waitingForPix ? 'pix-failed' : 'card-failed')}
            >
              Simular pagamento recusado
            </button>
          </div>
        </SimulatorPanel>
      ) : null}

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
            onContinue={continueFakeCheckout}
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
            onBackToCart={() => selectScenario('checkout')}
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
            onClose={() => selectScenario('checkout')}
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
  animation: ${paymentSurfaceRise} 260ms cubic-bezier(0.22, 0.8, 0.32, 1) both;

  ${paymentReducedMotion}

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


const SimulatorPanel = styled.section`
  position: sticky;
  z-index: 999;
  top: 94px;
  margin: 12px auto 0;
  width: min(720px, calc(100% - 32px));
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid #d9d5cf;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  animation: ${paymentSurfaceRise} 280ms cubic-bezier(0.22, 0.8, 0.32, 1) both;

  ${paymentReducedMotion}

  > div:first-child {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  strong {
    color: #292521;
    font-size: 12px;
  }

  span {
    color: #716b65;
    font-size: 10px;
    line-height: 1.4;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 7px;
  }

  button {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 9px;
    font: inherit;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }

  .approve {
    border: 1px solid #7fbd90;
    background: #edf8f0;
    color: #236b37;
  }

  .reject {
    border: 1px solid #dfa098;
    background: #fff0ee;
    color: #9b342b;
  }

  @media (max-width: 700px) {
    top: 126px;
    align-items: stretch;
    flex-direction: column;

    .actions {
      justify-content: stretch;
    }

    button {
      flex: 1 1 150px;
    }
  }
`;
