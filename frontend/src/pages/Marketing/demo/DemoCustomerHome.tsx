import { useState, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import {
  ArrowRight,
  Bike,
  CreditCard,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  Store,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import { DemoTableActions } from './DemoTableActions';
import { TableOrderContinuationModal } from '../../Home/components/TableOrderContinuationModal';
import { TableAccessGate } from '../../Home/components/TableAccessGate';
import { DemoTableAccountPanel } from './DemoTableAccountPanel';
import { requestDemoTableService } from './demoTableService';
import { HomePage } from '../../Home/HomePage';
import * as H from '../../Home/Home.styles';
import * as S from './DemoExperienceV2.styles';
import { useDialogFocusManagement } from '../../../shared/hooks/useDialogFocusManagement';
import { demoCheckoutError } from './demoCheckout';
import { useDemoHomeData } from './useDemoHomeData';
import {
  addDemoCartItem,
  changeDemoCartQuantity,
  createDemoOrder,
  getDemoCartTotal,
  getDemoSessionAccount,
  type DemoOrderChannel,
  type DemoPaymentMethod,
  type DemoState,
} from './demoDomain';
import styled from 'styled-components';

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const Controls = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  button {
    min-height: 52px;
    border: 1px solid var(--home-border);
    border-radius: 7px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
  }
  button[aria-pressed='true'] {
    border-color: var(--home-primary);
    color: var(--home-primary);
    background: #fbf2ff;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  @media (max-width: 400px) {
    button {
      flex-direction: column;
      font-size: 12px;
    }
  }
`;
const ActionDock = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 45;
  button {
    min-height: 46px;
    padding: 10px 18px;
    border: 1px solid #ba2de1;
    border-radius: 10px;
    background: white;
    color: #79209a;
    font-weight: 700;
    box-shadow: 0 6px 25px #0002;
    cursor: pointer;
  }
  @media (max-width: 600px) {
    bottom: 16px;
    right: 12px;
  }
`;

export function DemoCustomerHome({
  state,
  onState,
  onLogout,
  ordersPanel,
  tableMenu = false,
}: {
  state: DemoState;
  onState: (state: DemoState) => void;
  onLogout: () => void;
  ordersPanel: ReactNode;
  tableMenu?: boolean;
}) {
  const data = useDemoHomeData();
  const products = data.products;
  const account = getDemoSessionAccount(state);
  const [panel, setPanel] = useState<'cart' | 'orders' | 'address' | 'account' | null>(null);
  const panelRef = useDialogFocusManagement<HTMLElement>(
    () => setPanel(null),
    panel !== null && panel !== 'account',
  );
  const [channel, setChannel] = useState<DemoOrderChannel>(tableMenu ? 'TABLE' : 'DELIVERY');
  const [payment, setPayment] = useState<DemoPaymentMethod>('PIX');
  const [continuation, setContinuation] = useState(false);
  const [addressSelected, setAddressSelected] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const count = state.cart.reduce((total, line) => total + line.quantity, 0);
  const table = state.tables.find((item) => item.number === 8);
  const orderingLocked =
    tableMenu &&
    Boolean(table?.closingRequested) &&
    data.tableAccount?.blockNewOrdersOnClosingRequest !== false;
  const checkoutError = orderingLocked
    ? 'Conta solicitada: aguarde o garçom concluir o atendimento.'
    : demoCheckoutError(state, data, channel, tableMenu ? 'CASH' : payment);
  const tablePayment =
    payment === 'CARD' && data.acceptsCard ? 'CARD' : data.acceptsPix ? 'PIX' : 'CARD';
  const submit = (method: DemoPaymentMethod) => {
    if (!state.cart.length) return;
    const error = demoCheckoutError(state, data, channel, method, {
      settlementMode:
        channel === 'TABLE' ? (method === 'CASH' ? 'TABLE_ACCOUNT' : 'PAY_NOW') : undefined,
    });
    if (error) {
      toast.error(error);
      return;
    }
    const result = createDemoOrder(state, {
      channel: tableMenu ? 'TABLE' : channel,
      paymentMethod: method,
      tableNumber: 8,
    });
    onState(result.state);
    setNotice(
      `Pedido ${result.order.publicId} recebido pela cozinha. Acompanhe as próximas etapas.`,
    );
    setContinuation(false);
    setPanel(tableMenu ? null : 'orders');
  };
  const checkout = () => {
    if (tableMenu) {
      setPanel(null);
      setContinuation(true);
    } else submit(payment);
  };
  const requestService = (type: 'WAITER' | 'BILL') => {
    onState(requestDemoTableService(state, type));
    setNotice(
      type === 'BILL'
        ? 'Conta solicitada. O garçom foi avisado; novos pedidos ficam bloqueados até o fim do atendimento.'
        : 'Garçom chamado para a mesa 08.',
    );
    setPanel(type === 'BILL' ? 'account' : 'orders');
  };
  if (tableMenu && !table?.occupied)
    return (
      <TableAccessGate
        primaryColor={data.brand.primaryColor}
        tableLabel="08"
        invalidTitle="Mesa aguardando abertura"
        invalidMessage="Abra a mesa 08 na área do garçom para iniciar esta demonstração."
      />
    );
  return (
    <H.HomeExperience
      $tableMenu={tableMenu}
      $primary={data.brand.primaryColor}
      $fontFamily={data.fontFamily}
    >
      <div inert={panel !== null || continuation}>
        <HomePage
          data={data}
          isTableMenu={tableMenu}
          tableLabel={tableMenu ? '08' : undefined}
          orderingLocked={orderingLocked}
          onOpenTableAccount={
            data.tableAccount?.enabled === false ? undefined : () => setPanel('account')
          }
          cartCount={count}
          userName={account?.name}
          userEmail={account?.email}
          userLoggedIn
          savedAddresses={
            addressSelected
              ? [
                  {
                    id: 1,
                    label: 'Casa (fictícia)',
                    address: 'Rua Exemplo',
                    number: '100',
                    district: 'Centro',
                    city: 'Cidade Demo',
                    state: 'SP',
                    zipCode: '00000000',
                    isDefault: true,
                  },
                ]
              : []
          }
          selectedAddressId={addressSelected ? '1' : undefined}
          onSelectAddress={() => setAddressSelected(true)}
          onManageAddresses={() => setPanel('address')}
          onOpenMenu={() =>
            document.getElementById('cardapio')?.scrollIntoView({ behavior: 'smooth' })
          }
          onOpenCart={() => setPanel('cart')}
          onOpenProfile={() => setPanel('orders')}
          onLogout={onLogout}
          favoriteProductIds={favorites}
          onToggleFavorite={(id) =>
            setFavorites((current) =>
              current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
            )
          }
          onAddProduct={(id, configuration) => {
            const product = products.find((item) => item.id === id);
            if (product) {
              onState(addDemoCartItem(state, product, configuration));
              setPanel('cart');
            }
          }}
        />
        {tableMenu && (
          <DemoTableActions
            state={state}
            primary={data.brand.primaryColor}
            waiterEnabled={data.waiterCallEnabled !== false}
            billEnabled={data.billRequestEnabled !== false && !orderingLocked}
            accountEnabled={data.tableAccount?.enabled !== false}
            onRequest={requestService}
            onAccount={() => setPanel('account')}
          />
        )}
        {!tableMenu && (
          <ActionDock>
            <button type="button" onClick={() => setPanel('orders')}>
              Meus pedidos · acompanhar
            </button>
          </ActionDock>
        )}
      </div>
      {panel && panel !== 'account' && (
        <>
          <H.CartOverlay
            $open
            type="button"
            tabIndex={-1}
            aria-label="Fechar painel"
            onClick={() => setPanel(null)}
          />
          <H.CartDrawer
            $open
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-panel-title"
          >
            <H.CartHead>
              <div className="cart-heading">
                <span className="cart-mark">
                  <ShoppingBag />
                </span>
                <div className="cart-title">
                  <h2 id="demo-panel-title">
                    {panel === 'cart'
                      ? 'Sua sacola'
                      : panel === 'orders'
                        ? 'Meus pedidos'
                        : 'Endereço de entrega'}
                  </h2>
                  <small>{data.brand.name}</small>
                </div>
              </div>
              <span />
              <button type="button" aria-label="Fechar" onClick={() => setPanel(null)}>
                <X />
              </button>
            </H.CartHead>
            <H.CartBody>
              {panel === 'cart' && (
                <>
                  <H.CartItems>
                    {state.cart.length ? (
                      state.cart.map((line) => (
                        <H.CartItemRow key={line.cartId ?? line.productId}>
                          <img
                            src={products.find((item) => item.id === line.productId)?.image}
                            alt=""
                          />
                          <H.CartItemInfo>
                            <strong>{line.name}</strong>
                            {line.customizations?.map((detail, index) => (
                              <small key={index}>{detail}</small>
                            ))}
                            <span>{money(line.unitPrice)}</span>
                            <H.CartQty>
                              <button
                                type="button"
                                aria-label={`Diminuir ${line.name}`}
                                onClick={() =>
                                  onState(
                                    changeDemoCartQuantity(
                                      state,
                                      line.cartId ?? line.productId,
                                      line.quantity - 1,
                                    ),
                                  )
                                }
                              >
                                <Minus size={16} />
                              </button>
                              <span>{line.quantity}</span>
                              <button
                                type="button"
                                aria-label={`Aumentar ${line.name}`}
                                onClick={() =>
                                  onState(
                                    changeDemoCartQuantity(
                                      state,
                                      line.cartId ?? line.productId,
                                      line.quantity + 1,
                                    ),
                                  )
                                }
                              >
                                <Plus size={16} />
                              </button>
                            </H.CartQty>
                          </H.CartItemInfo>
                        </H.CartItemRow>
                      ))
                    ) : (
                      <H.CartEmpty>
                        <ShoppingBag />
                        <h3>Sua sacola está vazia</h3>
                        <p>Escolha seus favoritos no cardápio.</p>
                      </H.CartEmpty>
                    )}
                  </H.CartItems>
                  <H.CartOptions>
                    {!tableMenu && (
                      <div>
                        <H.CartSectionLabel>Tipo de pedido</H.CartSectionLabel>
                        <Controls>
                          {(
                            [
                              ['DELIVERY', 'Entrega', Bike],
                              ['PICKUP', 'Retirada', Store],
                              ['TABLE', 'Mesa 08', Utensils],
                            ] as const
                          ).map(([value, label, Icon]) => (
                            <button
                              key={value}
                              type="button"
                              disabled={
                                value === 'DELIVERY'
                                  ? !data.acceptsDelivery
                                  : value === 'PICKUP'
                                    ? !data.acceptsPickup
                                    : data.tableOrderingEnabled === false
                              }
                              aria-pressed={channel === value}
                              onClick={() => setChannel(value)}
                            >
                              <Icon size={17} />
                              {label}
                            </button>
                          ))}
                        </Controls>
                      </div>
                    )}
                    <p>
                      {channel === 'TABLE'
                        ? 'Pedido para a mesa 08. O garçom levará os itens após o preparo.'
                        : channel === 'DELIVERY'
                          ? 'Entrega no endereço fictício: Rua Exemplo, 100. O motoqueiro levará seu pedido.'
                          : 'Retire no balcão quando o pedido estiver pronto.'}
                    </p>
                    {!tableMenu && (
                      <div>
                        <H.CartSectionLabel>Pagamento</H.CartSectionLabel>
                        <Controls>
                          {(
                            [
                              ['PIX', 'Pix', QrCode],
                              ['CARD', 'Cartão', CreditCard],
                              ['CASH', 'Dinheiro', Wallet],
                            ] as const
                          ).map(([value, label, Icon]) => (
                            <button
                              key={value}
                              type="button"
                              disabled={
                                value === 'PIX'
                                  ? !data.acceptsPix
                                  : value === 'CARD'
                                    ? !data.acceptsCard
                                    : false
                              }
                              aria-pressed={payment === value}
                              onClick={() => setPayment(value)}
                            >
                              <Icon size={17} />
                              {label}
                            </button>
                          ))}
                        </Controls>
                      </div>
                    )}
                    <p>Pagamento simulado. Nenhuma cobrança será realizada.</p>
                  </H.CartOptions>
                </>
              )}
              {panel === 'orders' && (
                <div style={{ padding: 20 }}>
                  {notice && <S.Toast role="status">{notice}</S.Toast>}
                  {ordersPanel}
                </div>
              )}
              {panel === 'address' && (
                <div style={{ padding: 24 }}>
                  <h3>Casa · endereço fictício</h3>
                  <p>Rua Exemplo, 100 · Centro · Cidade Demo</p>
                  <p>Use este endereço de exemplo para experimentar a entrega.</p>
                  <H.CartCheckout
                    type="button"
                    onClick={() => {
                      setAddressSelected(true);
                      setPanel(null);
                    }}
                  >
                    Usar este endereço
                  </H.CartCheckout>
                </div>
              )}
            </H.CartBody>
            <H.CartFoot>
              {panel === 'cart' && (
                <>
                  <H.CartSummaryRow>
                    <span>
                      {count} {count === 1 ? 'item' : 'itens'}
                    </span>
                    <span>
                      {tableMenu ? 'Pedido para a mesa 08' : 'Taxa de entrega grátis na demo'}
                    </span>
                  </H.CartSummaryRow>
                  <H.CartTotal>
                    <span>Total</span>
                    <span>{money(getDemoCartTotal(state))}</span>
                  </H.CartTotal>
                  <p role="status" style={{ color: '#92400e', margin: 0 }}>
                    {count > 0 ? checkoutError : ''}
                  </p>
                  <H.CartCheckout
                    type="button"
                    disabled={!count || Boolean(checkoutError)}
                    onClick={checkout}
                  >
                    {tableMenu ? 'Revisar e continuar' : 'Enviar pedido'} <ArrowRight size={18} />
                  </H.CartCheckout>
                </>
              )}
            </H.CartFoot>
          </H.CartDrawer>
        </>
      )}
      <DemoTableAccountPanel
        open={panel === 'account'}
        state={state}
        onState={onState}
        onClose={() => setPanel(null)}
      />
      <TableOrderContinuationModal
        open={continuation}
        accountEnabled={data.tableAccount?.enabled !== false}
        accountLoading={false}
        payNowAvailable={
          data.tableAccount?.enabled !== false &&
          data.tableAccount?.allowOnlinePayment !== false &&
          (data.acceptsPix || data.acceptsCard)
        }
        allowPix={data.acceptsPix}
        allowCard={data.acceptsCard}
        paymentMethod={tablePayment === 'CARD' ? 'card' : 'pix'}
        busy={false}
        onPaymentMethodChange={(method) => setPayment(method === 'card' ? 'CARD' : 'PIX')}
        onChooseAccount={() => submit('CASH')}
        onChoosePayNow={() => submit(tablePayment)}
        onClose={() => {
          setContinuation(false);
          setPanel('cart');
        }}
      />
    </H.HomeExperience>
  );
}
