import { CheckCircle, CreditCard, X } from "lucide-react";
import * as S from "../styles";

const ORDER_FLOW_STEPS = [
  {
    key: "PENDENTE",
    title: "Pedido recebido",
    description: "A equipe recebeu seu pedido e vai iniciar em breve.",
  },
  {
    key: "PREPARANDO",
    title: "Em preparo",
    description: "Seu pedido esta sendo preparado na cozinha.",
  },
  {
    key: "PRONTO",
    title: "Pronto",
    description: "Pedido pronto para ser levado ate sua mesa.",
  },
  {
    key: "SAIU_PARA_ENTREGA",
    title: "A caminho da mesa",
    description: "Um atendente esta levando o pedido para voce.",
  },
  {
    key: "ENTREGUE",
    title: "Entregue",
    description: "Pedido entregue. Bom apetite!",
  },
];

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
  latestOrder: {
    id: number;
    status: string;
    total: number;
    paymentMethod: string;
    createdAt: string;
    customerName: string;
  } | null;
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
  latestOrder,
}: OrderDrawerProps) {
  const normalizedStatus = String(latestOrder?.status || "").toUpperCase();
  const isCanceled = normalizedStatus === "CANCELADO";
  const activeStepIndex = ORDER_FLOW_STEPS.findIndex(
    (step) => step.key === normalizedStatus,
  );
  const flowActiveIndex = activeStepIndex >= 0 ? activeStepIndex : 0;
  const formattedCreatedAt = latestOrder?.createdAt
    ? new Date(latestOrder.createdAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  function getStepState(index: number) {
    if (isCanceled) {
      return "pending";
    }

    if (index < flowActiveIndex) {
      return "done";
    }

    if (index === flowActiveIndex) {
      return "active";
    }

    return "pending";
  }

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
          <S.DrawerTab
            type="button"
            $active={drawerStep === "fluxo"}
            onClick={() => setDrawerStep("fluxo")}
          >
            Fluxo
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
          ) : drawerStep === "finalizar" ? (
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
          ) : (
            <>
              {!latestOrder ? (
                <S.EmptyHint>
                  Voce ainda nao enviou pedido nesta mesa. Adicione itens e
                  finalize para acompanhar o fluxo.
                </S.EmptyHint>
              ) : (
                <>
                  <S.OrderFlowCard>
                    <S.OrderMetaRow>
                      <strong>Pedido #{latestOrder.id}</strong>
                      <S.OrderMetaPill>
                        {isCanceled ? "Cancelado" : normalizedStatus}
                      </S.OrderMetaPill>
                    </S.OrderMetaRow>

                    <S.Tiny>
                      {latestOrder.customerName || "Cliente"} •{" "}
                      {formattedCreatedAt}
                    </S.Tiny>

                    <S.Summary style={{ marginTop: "0.65rem" }}>
                      <span>Total do pedido</span>
                      <strong>R$ {toPrice(latestOrder.total)}</strong>
                    </S.Summary>

                    <S.OrderFlowList>
                      {ORDER_FLOW_STEPS.map((step, index) => {
                        const stepState = getStepState(index);

                        return (
                          <S.OrderFlowItem key={step.key} $state={stepState}>
                            <S.OrderFlowDot $state={stepState} />
                            <S.OrderFlowContent>
                              <strong>{step.title}</strong>
                              <span>{step.description}</span>
                            </S.OrderFlowContent>
                          </S.OrderFlowItem>
                        );
                      })}
                    </S.OrderFlowList>

                    {isCanceled ? (
                      <S.OrderFlowHint>
                        Este pedido foi cancelado. Se precisar, chame a equipe
                        para gerar um novo pedido.
                      </S.OrderFlowHint>
                    ) : (
                      <S.OrderFlowHint>
                        O status muda conforme a equipe atualiza o pedido no
                        painel interno.
                      </S.OrderFlowHint>
                    )}
                  </S.OrderFlowCard>

                  <S.ActionButton
                    type="button"
                    style={{ marginTop: "0.8rem", width: "100%" }}
                    onClick={() => setDrawerStep("pedido")}
                  >
                    Voltar para pedido
                  </S.ActionButton>
                </>
              )}
            </>
          )}
        </S.DrawerContent>
      </S.Drawer>
    </>
  );
}
