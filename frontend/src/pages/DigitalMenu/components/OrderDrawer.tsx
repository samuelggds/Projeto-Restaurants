import { CheckCircle, CreditCard, X } from "lucide-react";
import {
  CARD_BRAND_OPTIONS,
  getCardBrandDisplay,
  getCardBrandPalette,
} from "../../../config/cardPaymentWallet";
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

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  PREPARANDO: "Preparando",
  PRONTO: "Pronto",
  SAIU_PARA_ENTREGA: "A caminho",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

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
  savedCards: {
    id: string;
    holderName: string;
    brand: string;
    lastFour: string;
  }[];
  selectedSavedCardId: string | null;
  defaultSavedCardId: string | null;
  cardPaymentDraft: {
    holderName: string;
    brand: string;
    lastFour: string;
  };
  cardNumber: string;
  cardCvv: string;
  setCustomerName: (value: string) => void;
  onCustomerCpfChange: (value: string) => void;
  setPaymentMethod: (value: string) => void;
  setObservation: (value: string) => void;
  onCardPaymentDraftChange: (field: string, value: string) => void;
  onSelectSavedCard: (cardId: string) => void;
  onSetDefaultSavedCard: (cardId: string) => void;
  onStartNewSavedCard: () => void;
  onSaveCurrentCard: () => void;
  onRemoveSavedCard: (cardId: string) => void;
  onCardNumberChange: (value: string) => void;
  onCardCvvChange: (value: string) => void;
  handleFinishOrder: () => void;
  submitting: boolean;
  isConfirmed: boolean;
  loadingProducts: boolean;
  mesaOrders: {
    id: number;
    status: string;
    total: number;
    paymentMethod: string;
    createdAt: string;
    customerName: string;
  }[];
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
  savedCards,
  selectedSavedCardId,
  defaultSavedCardId,
  cardPaymentDraft,
  cardNumber,
  cardCvv,
  setCustomerName,
  onCustomerCpfChange,
  setPaymentMethod,
  setObservation,
  onCardPaymentDraftChange,
  onSelectSavedCard,
  onSetDefaultSavedCard,
  onStartNewSavedCard,
  onSaveCurrentCard,
  onRemoveSavedCard,
  onCardNumberChange,
  onCardCvvChange,
  handleFinishOrder,
  submitting,
  isConfirmed,
  loadingProducts,
  mesaOrders,
}: OrderDrawerProps) {
  const sortedOrders = [...mesaOrders].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });

  function getStepState(
    index: number,
    flowActiveIndex: number,
    isCanceled: boolean,
  ) {
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
                  O pedido sera enviado agora. PIX sera confirmado
                  automaticamente apos a aprovacao do provedor; cartao continua
                  pendente ate a confirmacao da equipe; dinheiro pode ser
                  acertado na entrega.
                </S.InlineInfo>

                {paymentMethod === "CARTAO" ? (
                  <>
                    {savedCards.length > 0 ? (
                      <div
                        style={{
                          display: "grid",
                          gap: "0.5rem",
                        }}
                      >
                        <strong style={{ fontSize: 14 }}>Cartoes salvos</strong>
                        {savedCards.map((card) => {
                          const isSelected = selectedSavedCardId === card.id;
                          const isDefault = defaultSavedCardId === card.id;

                          return (
                            <div
                              key={card.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr auto auto",
                                gap: "0.5rem",
                                alignItems: "center",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => onSelectSavedCard(card.id)}
                                style={{
                                  textAlign: "left",
                                  padding: "0.95rem 1rem",
                                  borderRadius: 16,
                                  border: isSelected
                                    ? "2px solid #dba206"
                                    : "1px solid #cbd5e1",
                                  ...getCardBrandPalette(card.brand),
                                  boxShadow: isSelected
                                    ? "0 14px 30px rgba(219, 162, 6, 0.18)"
                                    : "0 10px 24px rgba(15, 23, 42, 0.10)",
                                  cursor: "pointer",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "0.75rem",
                                    alignItems: "center",
                                    marginBottom: "0.6rem",
                                  }}
                                >
                                  <strong>{card.brand.toUpperCase()}</strong>
                                  <span style={{ fontSize: 11, opacity: 0.9 }}>
                                    {isDefault
                                      ? "PADRAO"
                                      : isSelected
                                        ? "EM USO"
                                        : "SALVO"}
                                  </span>
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>
                                  •••• •••• •••• {card.lastFour}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    opacity: 0.88,
                                    marginTop: "0.5rem",
                                  }}
                                >
                                  {card.holderName}
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => onSetDefaultSavedCard(card.id)}
                                style={{
                                  borderRadius: 10,
                                  border: isDefault
                                    ? "1px solid rgba(34, 197, 94, 0.35)"
                                    : "1px solid rgba(148, 163, 184, 0.35)",
                                  background: isDefault
                                    ? "rgba(34, 197, 94, 0.1)"
                                    : "transparent",
                                  color: isDefault ? "#166534" : "inherit",
                                  padding: "0.7rem 0.85rem",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                }}
                              >
                                {isDefault ? "Padrao" : "Definir padrao"}
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveSavedCard(card.id)}
                                style={{
                                  borderRadius: 10,
                                  border: "1px solid rgba(239, 68, 68, 0.35)",
                                  background: "rgba(239, 68, 68, 0.1)",
                                  color: "#991b1b",
                                  padding: "0.7rem 0.85rem",
                                  cursor: "pointer",
                                }}
                              >
                                Remover
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    <S.Label>
                      Nome do titular
                      <input
                        type="text"
                        placeholder="Como aparece no cartao"
                        value={cardPaymentDraft.holderName}
                        onChange={(event) =>
                          onCardPaymentDraftChange(
                            "holderName",
                            event.target.value,
                          )
                        }
                      />
                    </S.Label>

                    <S.Label>
                      Bandeira e final do cartao
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.2fr 1fr",
                          gap: "0.75rem",
                        }}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Numero do cartao"
                          value={cardNumber}
                          onChange={(event) =>
                            onCardNumberChange(
                              String(event.target.value || "")
                                .replace(/\D/g, "")
                                .slice(0, 19)
                                .replace(/(.{4})/g, "$1 ")
                                .trim(),
                            )
                          }
                        />
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                            gap: "0.5rem",
                          }}
                        >
                          {CARD_BRAND_OPTIONS.map((brand) => {
                            const isActive = cardPaymentDraft.brand === brand;
                            const brandDisplay = getCardBrandDisplay(brand);

                            return (
                              <button
                                key={brand}
                                type="button"
                                onClick={() =>
                                  onCardPaymentDraftChange("brand", brand)
                                }
                                style={{
                                  minHeight: 54,
                                  borderRadius: 12,
                                  border: isActive
                                    ? "2px solid #dba206"
                                    : "1px solid #cbd5e1",
                                  background: isActive
                                    ? brandDisplay.accent
                                    : "transparent",
                                  color: "inherit",
                                  cursor: "pointer",
                                  display: "grid",
                                  justifyItems: "center",
                                  alignContent: "center",
                                  gap: "0.15rem",
                                }}
                              >
                                <strong style={{ fontSize: 14 }}>
                                  {brandDisplay.badge}
                                </strong>
                                <span style={{ fontSize: 11, fontWeight: 700 }}>
                                  {brandDisplay.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "0.8fr 0.6fr",
                          gap: "0.75rem",
                        }}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Final 1234"
                          value={cardPaymentDraft.lastFour}
                          onChange={(event) =>
                            onCardPaymentDraftChange(
                              "lastFour",
                              event.target.value,
                            )
                          }
                        />
                        <input
                          type="password"
                          inputMode="numeric"
                          placeholder="CVV"
                          value={cardCvv}
                          onChange={(event) =>
                            onCardCvvChange(
                              String(event.target.value || "")
                                .replace(/\D/g, "")
                                .slice(0, 4),
                            )
                          }
                        />
                      </div>
                    </S.Label>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                      }}
                    >
                      <button
                        type="button"
                        onClick={onSaveCurrentCard}
                        style={{
                          padding: "0.8rem 1rem",
                          borderRadius: 10,
                          border: "1px solid rgba(34, 197, 94, 0.35)",
                          background: "rgba(34, 197, 94, 0.12)",
                          color: "#166534",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        {selectedSavedCardId
                          ? "Atualizar cartao"
                          : "Salvar cartao"}
                      </button>
                      <button
                        type="button"
                        onClick={onStartNewSavedCard}
                        style={{
                          padding: "0.8rem 1rem",
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          background: "transparent",
                          color: "inherit",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        Novo cartao
                      </button>
                    </div>

                    <S.InlineInfo style={{ marginTop: -4 }}>
                      Por seguranca, este aparelho salva apenas titular,
                      bandeira e os 4 ultimos digitos do cartao. Numero completo
                      e CVV nao sao armazenados; o CVV vale apenas para esta
                      compra.
                    </S.InlineInfo>
                  </>
                ) : null}

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
              {sortedOrders.length === 0 ? (
                <S.EmptyHint>
                  Voce ainda nao enviou pedido nesta mesa. Adicione itens e
                  finalize para acompanhar o fluxo.
                </S.EmptyHint>
              ) : (
                <>
                  {sortedOrders.map((order) => {
                    const normalizedStatus = String(
                      order?.status || "",
                    ).toUpperCase();
                    const isCanceled = normalizedStatus === "CANCELADO";
                    const statusLabel =
                      ORDER_STATUS_LABELS[normalizedStatus] ||
                      normalizedStatus.replace(/_/g, " ");
                    const activeStepIndex = ORDER_FLOW_STEPS.findIndex(
                      (step) => step.key === normalizedStatus,
                    );
                    const flowActiveIndex =
                      activeStepIndex >= 0 ? activeStepIndex : 0;
                    const formattedCreatedAt = order?.createdAt
                      ? new Date(order.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-";

                    return (
                      <S.OrderFlowCard key={`order-${order.id}`}>
                        <S.OrderMetaRow>
                          <strong>Pedido #{order.id}</strong>
                          <S.OrderMetaPill>
                            {isCanceled ? "Cancelado" : statusLabel}
                          </S.OrderMetaPill>
                        </S.OrderMetaRow>

                        <S.Tiny>
                          {order.customerName || "Cliente"} •{" "}
                          {formattedCreatedAt}
                        </S.Tiny>

                        <S.Summary style={{ marginTop: "0.65rem" }}>
                          <span>Total do pedido</span>
                          <strong>R$ {toPrice(order.total)}</strong>
                        </S.Summary>

                        <S.OrderFlowList
                          key={`flow-${order.id}-${normalizedStatus}`}
                        >
                          {ORDER_FLOW_STEPS.map((step, index) => {
                            const stepState = getStepState(
                              index,
                              flowActiveIndex,
                              isCanceled,
                            );

                            return (
                              <S.OrderFlowItem
                                key={step.key}
                                $state={stepState}
                                $index={index}
                              >
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
                            Este pedido foi cancelado. Se precisar, chame a
                            equipe para gerar um novo pedido.
                          </S.OrderFlowHint>
                        ) : (
                          <S.OrderFlowHint>
                            O status muda conforme a equipe atualiza o pedido no
                            painel interno.
                          </S.OrderFlowHint>
                        )}
                      </S.OrderFlowCard>
                    );
                  })}

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
