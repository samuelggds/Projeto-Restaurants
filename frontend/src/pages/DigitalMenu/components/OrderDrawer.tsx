import { CheckCircle, CreditCard, X } from "lucide-react";
import {
  CARD_BRAND_OPTIONS,
  getCardBrandDisplay,
  getCardBrandLogo,
  normalizeCardExpiryInput,
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

const CARD_BRAND_LOGO_STYLE_BASE = {
  width: 62,
  height: 24,
  borderRadius: 0,
  objectFit: "contain" as const,
  display: "block",
  background: "transparent",
  padding: 0,
  boxSizing: "border-box" as const,
  border: "none",
};

const CARD_BRAND_LOGO_SIZE_PRESETS = {
  default: {
    compact: { width: 62, height: 24 },
    preview: { width: 84, height: 30 },
  },
  visa: {
    compact: { width: 54, height: 20 },
    preview: { width: 74, height: 24 },
  },
  mastercard: {
    compact: { width: 60, height: 24 },
    preview: { width: 82, height: 30 },
  },
  elo: {
    compact: { width: 70, height: 26 },
    preview: { width: 92, height: 34 },
  },
  hipercard: {
    compact: { width: 64, height: 24 },
    preview: { width: 86, height: 30 },
  },
  "american express": {
    compact: { width: 68, height: 24 },
    preview: { width: 88, height: 30 },
  },
} as const;

function normalizeCardBrandKey(brand: string | null | undefined) {
  return String(brand || "")
    .trim()
    .toLowerCase();
}

function getCardBrandLogoStyle(
  brand: string | null | undefined,
  variant: "compact" | "preview" = "compact",
) {
  const key = normalizeCardBrandKey(brand);
  const sizeSet =
    CARD_BRAND_LOGO_SIZE_PRESETS[key] || CARD_BRAND_LOGO_SIZE_PRESETS.default;

  return {
    ...CARD_BRAND_LOGO_STYLE_BASE,
    ...sizeSet[variant],
  };
}

function maskCardDigits(value: string) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 16);
  if (!digits) {
    return "1234 1234 1234 1234";
  }

  const grouped = digits.match(/.{1,4}/g) || [];
  return grouped.join(" ").padEnd(19, "_");
}

function resolveCardHolderName(value: string) {
  const text = String(value || "").trim();
  if (!text) {
    return "SMITH PLACE HOLDER";
  }

  return text.toUpperCase().slice(0, 26);
}

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
  paymentTiming: "NOW" | "LATER";
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
  cardExpiry: string;
  cardCvv: string;
  cardFieldErrors?: {
    holderName?: string;
    brand?: string;
    cardNumber?: string;
    lastFour?: string;
    cardExpiry?: string;
    cardCvv?: string;
  };
  showCardFieldFeedback?: boolean;
  setCustomerName: (value: string) => void;
  onCustomerCpfChange: (value: string) => void;
  setPaymentMethod: (value: string) => void;
  setPaymentTiming: (value: "NOW" | "LATER") => void;
  setObservation: (value: string) => void;
  onCardPaymentDraftChange: (field: string, value: string) => void;
  onSelectSavedCard: (cardId: string) => void;
  onSetDefaultSavedCard: (cardId: string) => void;
  onStartNewSavedCard: () => void;
  onSaveCurrentCard: () => void;
  onRemoveSavedCard: (cardId: string) => void;
  onCardNumberChange: (value: string) => void;
  onCardExpiryChange: (value: string) => void;
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
    paid?: boolean;
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
  paymentTiming,
  observation,
  savedCards,
  selectedSavedCardId,
  defaultSavedCardId,
  cardPaymentDraft,
  cardNumber,
  cardExpiry,
  cardCvv,
  cardFieldErrors = {},
  showCardFieldFeedback = false,
  setCustomerName,
  onCustomerCpfChange,
  setPaymentMethod,
  setPaymentTiming,
  setObservation,
  onCardPaymentDraftChange,
  onSelectSavedCard,
  onSetDefaultSavedCard,
  onStartNewSavedCard,
  onSaveCurrentCard,
  onRemoveSavedCard,
  onCardNumberChange,
  onCardExpiryChange,
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
  const cardPreviewDigits = maskCardDigits(cardNumber);
  const cardPreviewHolder = resolveCardHolderName(cardPaymentDraft.holderName);
  const cardPreviewCvv = String(cardCvv || "").trim() || "789";
  const cardErrorTextStyle = {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 4,
    fontWeight: 600,
  } as const;
  const cardFieldErrorStyle = {
    border: "1px solid #ef4444",
    boxShadow: "0 0 0 1px rgba(239, 68, 68, 0.18)",
  } as const;
  const cardFieldValidStyle = {
    border: "1px solid #22c55e",
    boxShadow: "0 0 0 1px rgba(34, 197, 94, 0.2)",
  } as const;

  function resolveCardFieldStyle(hasError: boolean, isValid: boolean) {
    if (!showCardFieldFeedback || paymentMethod !== "CARTAO") {
      return undefined;
    }

    if (hasError) {
      return cardFieldErrorStyle;
    }

    if (isValid) {
      return cardFieldValidStyle;
    }

    return undefined;
  }

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
          <h2>Pedido da mesa</h2>
          <button type="button" onClick={() => setDrawerOpen(false)}>
            <X size={18} />
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

                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      padding: "1rem 1rem 0.75rem",
                      borderBottom: "1px solid #eef2f7",
                      background: "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        lineHeight: 1.2,
                        color: "#111827",
                      }}
                    >
                      Meios de pagamento
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      width: "100%",
                      border: "none",
                      borderBottom: "1px solid #eef2f7",
                      background:
                        paymentMethod === "CARTAO" ? "#f3f7ff" : "#ffffff",
                      padding: "0.85rem 0.95rem",
                      display: "grid",
                      gridTemplateColumns: "auto auto 1fr",
                      gap: "0.75rem",
                      alignItems: "center",
                      cursor: "pointer",
                      color: "#111827",
                      textAlign: "left",
                    }}
                    onClick={() => setPaymentMethod("CARTAO")}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "999px",
                        border:
                          paymentMethod === "CARTAO"
                            ? "5px solid #3b82f6"
                            : "2px solid #cbd5e1",
                        background: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    />
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "999px",
                        border: "1px solid #e5e7eb",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#1f2937",
                        background: "#ffffff",
                      }}
                    >
                      <CreditCard size={19} />
                    </span>
                    <span>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        Cartao de credito
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          display: "inline-flex",
                          padding: "0.2rem 0.55rem",
                          borderRadius: 999,
                          background: "#dcfce7",
                          color: "#059669",
                          fontWeight: 700,
                          fontSize: 11,
                        }}
                      >
                        Parcelamento disponivel
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {["Mastercard", "Visa", "Elo", "American Express"].map(
                          (brand) => (
                            <span
                              key={brand}
                              style={{
                                width: 34,
                                height: 22,
                                borderRadius: 6,
                                border: "1px solid #e5e7eb",
                                background: "#ffffff",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 2,
                              }}
                            >
                              <img
                                src={getCardBrandLogo(brand)}
                                alt={`Bandeira ${brand}`}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                }}
                              />
                            </span>
                          ),
                        )}
                      </div>
                    </span>
                  </button>

                  <button
                    type="button"
                    style={{
                      width: "100%",
                      border: "none",
                      background:
                        paymentMethod === "PIX" ? "#f3f7ff" : "#ffffff",
                      padding: "0.85rem 0.95rem",
                      display: "grid",
                      gridTemplateColumns: "auto auto 1fr",
                      gap: "0.75rem",
                      alignItems: "center",
                      cursor: "pointer",
                      color: "#111827",
                      textAlign: "left",
                    }}
                    onClick={() => setPaymentMethod("PIX")}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "999px",
                        border:
                          paymentMethod === "PIX"
                            ? "5px solid #3b82f6"
                            : "2px solid #cbd5e1",
                        background: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    />
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "999px",
                        border: "1px solid #e5e7eb",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#111827",
                        background: "#ffffff",
                        fontSize: 18,
                        fontWeight: 800,
                      }}
                    >
                      ◈
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      Pix
                    </span>
                  </button>
                </div>

                <S.InlineInfo style={{ marginTop: -4 }}>
                  O pedido sera enviado agora. PIX sera confirmado
                  automaticamente apos a aprovacao do provedor; cartao continua
                  pendente ate a confirmacao da equipe.
                </S.InlineInfo>

                {paymentMethod === "PIX" ? (
                  <div
                    style={{
                      marginTop: "0.15rem",
                      borderRadius: 16,
                      border: "1px solid rgba(90, 39, 87, 0.18)",
                      background:
                        "linear-gradient(140deg, rgba(255, 255, 255, 0.98), rgba(244, 237, 255, 0.92))",
                      padding: "0.85rem 0.9rem",
                      display: "grid",
                      gap: "0.62rem",
                    }}
                  >
                    <div style={{ display: "grid", gap: "0.14rem" }}>
                      <strong style={{ fontSize: 14, color: "#3b1f3f" }}>
                        Voce deseja pagar agora ou pagar depois com o garcom?
                      </strong>
                      <span
                        style={{
                          fontSize: 12,
                          lineHeight: 1.45,
                          color: "#5b4a69",
                        }}
                      >
                        Escolha a forma mais confortavel para voce. Se pagar
                        agora, o pedido vai como <strong>Pago</strong>. Se
                        deixar para o garcom, ele fica como
                        <strong> Nao pago</strong>.
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "0.5rem",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setPaymentTiming("NOW")}
                        style={{
                          minHeight: 42,
                          borderRadius: 12,
                          border:
                            paymentTiming === "NOW"
                              ? "2px solid rgba(63, 100, 255, 0.92)"
                              : "1px solid rgba(99, 102, 241, 0.3)",
                          background:
                            paymentTiming === "NOW"
                              ? "linear-gradient(135deg, rgba(63, 100, 255, 0.2), rgba(116, 145, 255, 0.14))"
                              : "rgba(255, 255, 255, 0.84)",
                          color: "#2f2a4a",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Pagar agora
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentTiming("LATER")}
                        style={{
                          minHeight: 42,
                          borderRadius: 12,
                          border:
                            paymentTiming === "LATER"
                              ? "2px solid rgba(16, 185, 129, 0.85)"
                              : "1px solid rgba(16, 185, 129, 0.28)",
                          background:
                            paymentTiming === "LATER"
                              ? "linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(52, 211, 153, 0.1))"
                              : "rgba(255, 255, 255, 0.84)",
                          color: "#1f513f",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Pagar depois ao garcom
                      </button>
                    </div>
                  </div>
                ) : null}

                {paymentMethod === "PIX" && paymentTiming === "LATER" ? (
                  <S.InlineInfo
                    style={{
                      marginTop: "0.05rem",
                      borderColor: "rgba(16, 185, 129, 0.34)",
                      background: "rgba(16, 185, 129, 0.08)",
                      color: "#0f766e",
                    }}
                  >
                    Sem problemas. O pedido sera enviado como nao pago e voce
                    pode finalizar com o garcom quando preferir.
                  </S.InlineInfo>
                ) : null}

                {paymentMethod === "CARTAO" ? (
                  <S.InlineInfo
                    style={{
                      marginTop: "0.05rem",
                      borderColor: "rgba(59, 130, 246, 0.35)",
                      background: "rgba(59, 130, 246, 0.08)",
                      color: "#1d4ed8",
                    }}
                  >
                    No cartao, o pagamento acontece automaticamente no momento
                    do pedido e ja consta como pago. Para continuar, deixe um
                    cartao salvo e selecionado.
                  </S.InlineInfo>
                ) : null}

                {paymentMethod === "CARTAO" ? (
                  <>
                    {savedCards.length > 0 ? (
                      <S.SavedCardsSection>
                        <S.SavedCardsHeading>
                          Cartoes salvos
                        </S.SavedCardsHeading>
                        {savedCards.map((card) => {
                          const isSelected = selectedSavedCardId === card.id;
                          const isDefault = defaultSavedCardId === card.id;

                          return (
                            <S.SavedCardRow key={card.id}>
                              <S.SavedCardMainButton
                                type="button"
                                onClick={() => onSelectSavedCard(card.id)}
                                $selected={isSelected}
                              >
                                <S.SavedCardTop>
                                  <S.SavedCardBrandIdentity>
                                    <S.CardBrandLogo
                                      src={getCardBrandLogo(card.brand)}
                                      alt={`Bandeira ${card.brand}`}
                                      style={getCardBrandLogoStyle(card.brand)}
                                    />
                                    <strong>{card.brand.toUpperCase()}</strong>
                                  </S.SavedCardBrandIdentity>
                                  <S.SavedCardState
                                    $tone={
                                      isDefault
                                        ? "defaultCard"
                                        : isSelected
                                          ? "active"
                                          : "default"
                                    }
                                  >
                                    {isDefault
                                      ? "PADRAO"
                                      : isSelected
                                        ? "EM USO"
                                        : "SALVO"}
                                  </S.SavedCardState>
                                </S.SavedCardTop>
                                <S.SavedCardNumber>
                                  •••• •••• •••• {card.lastFour}
                                </S.SavedCardNumber>
                                <S.SavedCardHolder>
                                  {card.holderName}
                                </S.SavedCardHolder>
                              </S.SavedCardMainButton>

                              <S.SavedCardActions>
                                <S.CardMiniAction
                                  type="button"
                                  onClick={() => onSetDefaultSavedCard(card.id)}
                                  $variant={isDefault ? "success" : "default"}
                                >
                                  {isDefault ? "Padrao" : "Definir padrao"}
                                </S.CardMiniAction>
                                <S.CardMiniAction
                                  type="button"
                                  onClick={() => onRemoveSavedCard(card.id)}
                                  $variant="danger"
                                >
                                  Remover
                                </S.CardMiniAction>
                              </S.SavedCardActions>
                            </S.SavedCardRow>
                          );
                        })}
                      </S.SavedCardsSection>
                    ) : null}

                    <S.CardVisualPreview>
                      <S.CardVisualTop>
                        <S.CardChip />
                        <S.CardBrandLogo
                          src={getCardBrandLogo(cardPaymentDraft.brand)}
                          alt={`Bandeira ${
                            getCardBrandDisplay(cardPaymentDraft.brand).label
                          }`}
                          style={getCardBrandLogoStyle(
                            cardPaymentDraft.brand,
                            "preview",
                          )}
                        />
                      </S.CardVisualTop>
                      <S.CardVisualNumber>
                        {cardPreviewDigits}
                      </S.CardVisualNumber>
                      <S.CardVisualFooter>
                        <div className="left">
                          <small>CVC</small>
                          <strong>{cardPreviewCvv}</strong>
                        </div>
                        <div className="right">
                          <small>Nome no cartao</small>
                          <strong>{cardPreviewHolder}</strong>
                        </div>
                      </S.CardVisualFooter>
                    </S.CardVisualPreview>

                    <S.Label>
                      Nome do titular
                      <input
                        type="text"
                        placeholder="Como aparece no cartao"
                        value={cardPaymentDraft.holderName}
                        style={
                          cardFieldErrors.holderName
                            ? {
                                border: "1px solid #ef4444",
                                boxShadow: "0 0 0 1px rgba(239, 68, 68, 0.18)",
                              }
                            : undefined
                        }
                        onChange={(event) =>
                          onCardPaymentDraftChange(
                            "holderName",
                            event.target.value,
                          )
                        }
                      />
                      {cardFieldErrors.holderName ? (
                        <small style={cardErrorTextStyle}>
                          {cardFieldErrors.holderName}
                        </small>
                      ) : null}
                    </S.Label>

                    <S.Label>
                      Bandeira e final do cartao
                      <S.CardDraftRow>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Numero do cartao"
                          value={cardNumber}
                          style={resolveCardFieldStyle(
                            Boolean(cardFieldErrors.cardNumber),
                            String(cardNumber || "").trim().length >= 13,
                          )}
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
                        <S.BrandOptionGrid>
                          {CARD_BRAND_OPTIONS.map((brand) => {
                            const isActive = cardPaymentDraft.brand === brand;
                            const brandDisplay = getCardBrandDisplay(brand);

                            return (
                              <S.BrandOptionButton
                                key={brand}
                                type="button"
                                onClick={() =>
                                  onCardPaymentDraftChange("brand", brand)
                                }
                                $active={isActive}
                                $accent={brandDisplay.accent}
                                style={
                                  !isActive && cardFieldErrors.brand
                                    ? {
                                        border: "1px solid #ef4444",
                                        boxShadow:
                                          "0 0 0 1px rgba(239, 68, 68, 0.18)",
                                      }
                                    : isActive &&
                                        showCardFieldFeedback &&
                                        paymentMethod === "CARTAO" &&
                                        !cardFieldErrors.brand
                                      ? {
                                          border: "2px solid #22c55e",
                                          boxShadow:
                                            "0 0 0 1px rgba(34, 197, 94, 0.2)",
                                        }
                                      : undefined
                                }
                              >
                                <S.CardBrandLogo
                                  src={getCardBrandLogo(brand)}
                                  alt={`Bandeira ${brandDisplay.label}`}
                                  style={getCardBrandLogoStyle(brand)}
                                />
                                <span>{brandDisplay.label}</span>
                              </S.BrandOptionButton>
                            );
                          })}
                        </S.BrandOptionGrid>
                      </S.CardDraftRow>
                      {cardFieldErrors.cardNumber ? (
                        <small style={cardErrorTextStyle}>
                          {cardFieldErrors.cardNumber}
                        </small>
                      ) : null}
                      {cardFieldErrors.brand ? (
                        <small style={cardErrorTextStyle}>
                          {cardFieldErrors.brand}
                        </small>
                      ) : null}
                      <S.CardLastRow>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Final 1234"
                          value={cardPaymentDraft.lastFour}
                          style={resolveCardFieldStyle(
                            Boolean(cardFieldErrors.lastFour),
                            String(cardPaymentDraft.lastFour || "").replace(
                              /\D/g,
                              "",
                            ).length === 4,
                          )}
                          onChange={(event) =>
                            onCardPaymentDraftChange(
                              "lastFour",
                              event.target.value,
                            )
                          }
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="MM/AA"
                          value={cardExpiry}
                          style={resolveCardFieldStyle(
                            Boolean(cardFieldErrors.cardExpiry),
                            String(cardExpiry || "").trim().length === 5,
                          )}
                          onChange={(event) =>
                            onCardExpiryChange(
                              normalizeCardExpiryInput(event.target.value),
                            )
                          }
                        />
                        <input
                          type="password"
                          inputMode="numeric"
                          placeholder="CVV"
                          value={cardCvv}
                          style={resolveCardFieldStyle(
                            Boolean(cardFieldErrors.cardCvv),
                            /^\d{3,4}$/.test(
                              String(cardCvv || "")
                                .replace(/\D/g, "")
                                .slice(0, 4),
                            ),
                          )}
                          onChange={(event) =>
                            onCardCvvChange(
                              String(event.target.value || "")
                                .replace(/\D/g, "")
                                .slice(0, 4),
                            )
                          }
                        />
                      </S.CardLastRow>
                      {cardFieldErrors.lastFour ? (
                        <small style={cardErrorTextStyle}>
                          {cardFieldErrors.lastFour}
                        </small>
                      ) : null}
                      {cardFieldErrors.cardExpiry ? (
                        <small style={cardErrorTextStyle}>
                          {cardFieldErrors.cardExpiry}
                        </small>
                      ) : null}
                      {cardFieldErrors.cardCvv ? (
                        <small style={cardErrorTextStyle}>
                          {cardFieldErrors.cardCvv}
                        </small>
                      ) : null}
                    </S.Label>

                    <S.CardActionRow>
                      <S.CardPrimaryAction
                        type="button"
                        onClick={onSaveCurrentCard}
                      >
                        {selectedSavedCardId
                          ? "Atualizar cartao"
                          : "Salvar cartao"}
                      </S.CardPrimaryAction>
                      <S.CardGhostAction
                        type="button"
                        onClick={onStartNewSavedCard}
                      >
                        Novo cartao
                      </S.CardGhostAction>
                    </S.CardActionRow>

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
                    {paymentTiming === "NOW" && paymentMethod === "PIX"
                      ? "Gerar PIX e pagar agora"
                      : paymentTiming === "NOW" && paymentMethod === "CARTAO"
                        ? "Pagar com cartao agora"
                        : "Enviar pedido para a mesa"}
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

                        <div
                          style={{
                            marginTop: "0.5rem",
                            display: "inline-flex",
                            alignItems: "center",
                            borderRadius: 999,
                            border: `1px solid ${
                              order?.paid
                                ? "rgba(34, 197, 94, 0.4)"
                                : "rgba(239, 68, 68, 0.35)"
                            }`,
                            background: order?.paid
                              ? "rgba(34, 197, 94, 0.12)"
                              : "rgba(239, 68, 68, 0.1)",
                            color: order?.paid ? "#166534" : "#991b1b",
                            fontSize: 12,
                            fontWeight: 800,
                            padding: "0.18rem 0.62rem",
                            letterSpacing: "0.03em",
                            textTransform: "uppercase",
                          }}
                        >
                          {order?.paid ? "Pago" : "Nao pago"}
                        </div>

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
