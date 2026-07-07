import { CheckCircle, CreditCard, X } from "lucide-react";
import * as S from "../styles";

type CartItem = {
  productId: number | string;
  name: string;
  price: number;
  quantity: number;
};

type OrderDrawerProps = {
  drawerOpen: boolean;
  drawerStep: string;
  setDrawerOpen: (value: boolean) => void;
  setDrawerStep: (value: string) => void;
  cart: CartItem[];
  cartTotal: number;
  toPrice: (value: unknown) => string;
  updateQuantity: (productId: number | string, delta: number) => void;
  customerName: string;
  customerCpf: string;
  paymentMethod: string;
  observation: string;
  setCustomerName: (value: string) => void;
  onCustomerCpfChange: (value: string) => void;
  setPaymentMethod: (value: string) => void;
  setObservation: (value: string) => void;
  handleFinishOrder: () => void;
  submitting: boolean;
  isConfirmed: boolean;
  loadingProducts: boolean;
};

export default function OrderDrawer({
  drawerOpen,
  drawerStep,
  setDrawerOpen,
  setDrawerStep,
  cart,
  cartTotal,
  toPrice,
  updateQuantity,
  customerName,
  customerCpf,
  paymentMethod,
  observation,
  setCustomerName,
  onCustomerCpfChange,
  setPaymentMethod,
  setObservation,
  handleFinishOrder,
  submitting,
  isConfirmed,
  loadingProducts,
}: OrderDrawerProps) {
  return (
    <>
      <S.Overlay $open={drawerOpen} onClick={() => setDrawerOpen(false)} />

      <S.Drawer $open={drawerOpen}>
        <S.DrawerHeader>
          <h2>Seu Pedido</h2>
          <S.DrawerTotal>R$ {toPrice(cartTotal)}</S.DrawerTotal>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </S.DrawerHeader>

        <S.DrawerTabs>
          <S.DrawerTab
            type="button"
            $active={drawerStep === "pedido"}
            onClick={() => setDrawerStep("pedido")}
          >
            Pedido
          </S.DrawerTab>
          <S.DrawerTab
            type="button"
            $active={drawerStep === "finalizar"}
            onClick={() => setDrawerStep("finalizar")}
          >
            Finalizar
          </S.DrawerTab>
        </S.DrawerTabs>

        <S.DrawerContent $open={drawerOpen}>
          {drawerStep === "pedido" ? (
            <>
              {cart.length === 0 ? (
                <S.EmptyHint>
                  Seu pedido esta vazio. Adicione itens no cardapio.
                </S.EmptyHint>
              ) : (
                cart.map((item, index) => (
                  <S.CartLine
                    key={item.productId}
                    $open={drawerOpen}
                    $index={index}
                  >
                    <div>
                      <strong>{item.name}</strong>
                      <S.Tiny>
                        {item.quantity} x R$ {toPrice(item.price)}
                      </S.Tiny>
                    </div>

                    <S.QtyWrap>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, -1)}
                      >
                        -
                      </button>
                      <strong>{item.quantity}</strong>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, 1)}
                      >
                        +
                      </button>
                    </S.QtyWrap>
                  </S.CartLine>
                ))
              )}

              <S.Summary>
                <span>Total</span>
                <strong>R$ {toPrice(cartTotal)}</strong>
              </S.Summary>

              <S.ActionButton
                type="button"
                style={{ marginTop: "0.9rem", width: "100%" }}
                onClick={() => setDrawerStep("finalizar")}
                disabled={cart.length === 0}
              >
                Ir para finalizar
              </S.ActionButton>
            </>
          ) : (
            <>
              <S.InputGrid>
                <S.Label>
                  Nome completo
                  <input
                    type="text"
                    placeholder="Seu nome"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                  />
                </S.Label>

                <S.Label>
                  CPF
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={customerCpf}
                    onChange={(event) =>
                      onCustomerCpfChange(event.target.value)
                    }
                  />
                </S.Label>

                <S.Label>
                  Forma de pagamento
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  >
                    <option value="PIX">PIX</option>
                    <option value="CARTAO">Cartao</option>
                    <option value="DINHEIRO">Dinheiro</option>
                  </select>
                </S.Label>

                <S.InlineInfo style={{ marginTop: -4 }}>
                  O pedido sera enviado agora. PIX e cartao ficam como pagamento
                  pendente ate a confirmacao da equipe; dinheiro pode ser
                  acertado na entrega.
                </S.InlineInfo>

                <S.Label>
                  Observacao (opcional)
                  <textarea
                    placeholder="Ex.: sem cebola, embalagem separada..."
                    value={observation}
                    onChange={(event) => setObservation(event.target.value)}
                  />
                </S.Label>
              </S.InputGrid>

              <S.Summary>
                <span>
                  <CreditCard size={15} style={{ marginRight: 6 }} /> Total
                </span>
                <strong>R$ {toPrice(cartTotal)}</strong>
              </S.Summary>

              <S.CheckoutButton
                type="button"
                onClick={handleFinishOrder}
                disabled={
                  cart.length === 0 ||
                  submitting ||
                  isConfirmed ||
                  loadingProducts
                }
                style={
                  isConfirmed
                    ? {
                        background: "linear-gradient(135deg, #4f2150, #6e2c6a)",
                        color: "#ffffff",
                        border: "1px solid rgba(90, 39, 87, 0.34)",
                        boxShadow: "0 14px 28px rgba(58, 21, 65, 0.3)",
                        letterSpacing: "0.01em",
                      }
                    : undefined
                }
              >
                {isConfirmed ? (
                  <>
                    <CheckCircle size={18} style={{ marginRight: 6 }} />
                    Confirmado
                  </>
                ) : submitting ? (
                  "Enviando pedido..."
                ) : (
                  <>
                    <CheckCircle size={18} style={{ marginRight: 6 }} />
                    Enviar pedido para a mesa
                  </>
                )}
              </S.CheckoutButton>

              <S.InlineInfo>
                Nome e CPF identificam seu pedido no painel dos funcionarios. O
                pagamento pode ser concluido depois, se ainda nao estiver
                confirmado.
              </S.InlineInfo>
            </>
          )}
        </S.DrawerContent>
      </S.Drawer>
    </>
  );
}
