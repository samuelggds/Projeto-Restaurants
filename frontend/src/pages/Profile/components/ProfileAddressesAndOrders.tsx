import { MapPin, Plus, ShoppingBag, Trash2 } from "lucide-react";
import {
  CARD_BRAND_OPTIONS,
  getCardBrandDisplay,
  getCardBrandLogo,
  getCardBrandPalette,
} from "../../../config/cardPaymentWallet";
import * as S from "../styles";

type Endereco = {
  id: number;
  rotulo: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep: string;
  complemento?: string;
  pontoReferencia?: string;
};

type NovoEndereco = {
  rotulo: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  complemento: string;
  pontoReferencia: string;
};

type ProfileAddressesAndOrdersProps = {
  enderecos: Endereco[];
  novoEndereco: NovoEndereco;
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
  cardFieldErrors?: {
    holderName?: string;
    brand?: string;
    lastFour?: string;
  };
  showCardFieldFeedback?: boolean;
  isCepLookupLoading?: boolean;
  onNovoEnderecoChange: (value: NovoEndereco) => void;
  onAddEndereco: (event: React.FormEvent<HTMLFormElement>) => void;
  onSelectEndereco: (id: number) => void;
  onDeleteEndereco: (id: number) => void;
  onCardPaymentDraftChange: (field: string, value: string) => void;
  onSelectSavedCard: (cardId: string) => void;
  onSetDefaultSavedCard: (cardId: string) => void;
  onStartNewSavedCard: () => void;
  onSaveCurrentCard: () => void;
  onRemoveSavedCard: (cardId: string) => void;
  onNavigateOrders: () => void;
};

export default function ProfileAddressesAndOrders({
  enderecos,
  novoEndereco,
  savedCards,
  selectedSavedCardId,
  defaultSavedCardId,
  cardPaymentDraft,
  cardFieldErrors = {},
  showCardFieldFeedback = false,
  isCepLookupLoading = false,
  onNovoEnderecoChange,
  onAddEndereco,
  onSelectEndereco,
  onDeleteEndereco,
  onCardPaymentDraftChange,
  onSelectSavedCard,
  onSetDefaultSavedCard,
  onStartNewSavedCard,
  onSaveCurrentCard,
  onRemoveSavedCard,
  onNavigateOrders,
}: ProfileAddressesAndOrdersProps) {
  const orderedSavedCards = [...savedCards].sort((a, b) => {
    const aDefault = a.id === defaultSavedCardId ? 1 : 0;
    const bDefault = b.id === defaultSavedCardId ? 1 : 0;

    if (aDefault !== bDefault) {
      return bDefault - aDefault;
    }

    const aSelected = a.id === selectedSavedCardId ? 1 : 0;
    const bSelected = b.id === selectedSavedCardId ? 1 : 0;

    if (aSelected !== bSelected) {
      return bSelected - aSelected;
    }

    return 0;
  });

  const cardPreviewDigits = cardPaymentDraft.lastFour
    ? `•••• •••• •••• ${cardPaymentDraft.lastFour}`
    : "•••• •••• •••• ••••";
  const cardPreviewHolder =
    cardPaymentDraft.holderName?.trim().toUpperCase() || "NOME DO TITULAR";
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
    if (!showCardFieldFeedback) {
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

  return (
    <S.RightColumn>
      <S.OrdersCard style={{ marginBottom: "2rem" }}>
        <S.SectionTitle>
          <MapPin size={20} />
          <h3>Meus Endereços de Entrega</h3>
        </S.SectionTitle>

        <S.AddressList>
          {enderecos.length === 0 ? (
            <p className="empty-msg">Nenhum endereço cadastrado ainda.</p>
          ) : (
            enderecos.map((endereco) => (
              <S.AddressItem key={endereco.id}>
                <div
                  className="address-details"
                  onClick={() => onSelectEndereco(endereco.id)}
                >
                  <h5>{endereco.rotulo}</h5>
                  <p>
                    {endereco.rua}, Nº {endereco.numero}{" "}
                    {endereco.bairro ? `- ${endereco.bairro}` : ""}
                  </p>
                  <span>
                    {endereco.cidade}
                    {endereco.cep ? ` • CEP: ${endereco.cep}` : ""}
                  </span>
                  {endereco.complemento ? (
                    <span>Complemento: {endereco.complemento}</span>
                  ) : null}
                  {endereco.pontoReferencia ? (
                    <span>Ponto de referência: {endereco.pontoReferencia}</span>
                  ) : null}
                </div>
                <S.DeleteAddressButton
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteEndereco(endereco.id);
                  }}
                  title="Excluir endereço"
                >
                  <Trash2 size={16} />
                </S.DeleteAddressButton>
              </S.AddressItem>
            ))
          )}
        </S.AddressList>

        <hr
          style={{
            border: "0",
            borderTop: "1px solid var(--border)",
            margin: "1.5rem 0",
            opacity: 0.2,
          }}
        />

        <S.AddressForm onSubmit={onAddEndereco}>
          <h4>Adicionar Novo Endereço</h4>
          <div className="form-row text-full">
            <input
              type="text"
              placeholder="CEP"
              value={novoEndereco.cep}
              onChange={(event) =>
                onNovoEnderecoChange({
                  ...novoEndereco,
                  cep: event.target.value,
                })
              }
            />
          </div>
          <div className="form-row text-full">
            <input
              type="text"
              placeholder="Identificação (Ex: Casa, Trabalho, Apto 101)"
              value={novoEndereco.rotulo}
              onChange={(event) =>
                onNovoEnderecoChange({
                  ...novoEndereco,
                  rotulo: event.target.value,
                })
              }
              required
            />
          </div>
          <div className="form-row split-rua">
            <input
              type="text"
              placeholder="Rua / Avenida"
              value={novoEndereco.rua}
              onChange={(event) =>
                onNovoEnderecoChange({
                  ...novoEndereco,
                  rua: event.target.value,
                })
              }
              required
            />
            <input
              type="text"
              placeholder="Nº"
              value={novoEndereco.numero}
              onChange={(event) =>
                onNovoEnderecoChange({
                  ...novoEndereco,
                  numero: event.target.value,
                })
              }
              required
            />
          </div>
          <div className="form-row split-bairro">
            <input
              type="text"
              placeholder="Bairro"
              value={novoEndereco.bairro}
              onChange={(event) =>
                onNovoEnderecoChange({
                  ...novoEndereco,
                  bairro: event.target.value,
                })
              }
            />
          </div>
          <div className="form-row text-full">
            <input
              type="text"
              placeholder="Complemento (opcional)"
              value={novoEndereco.complemento}
              onChange={(event) =>
                onNovoEnderecoChange({
                  ...novoEndereco,
                  complemento: event.target.value,
                })
              }
            />
          </div>
          <div className="form-row text-full">
            <input
              type="text"
              placeholder="Ponto de referência (opcional)"
              value={novoEndereco.pontoReferencia}
              onChange={(event) =>
                onNovoEnderecoChange({
                  ...novoEndereco,
                  pontoReferencia: event.target.value,
                })
              }
            />
          </div>
          {isCepLookupLoading && (
            <small
              style={{
                display: "block",
                marginTop: "-0.35rem",
                marginBottom: "0.35rem",
                color: "#475569",
                fontWeight: 500,
              }}
            >
              Buscando endereco pelo CEP...
            </small>
          )}
          <S.AddAddressButton type="submit">
            <Plus size={16} /> Salvar Endereço
          </S.AddAddressButton>
        </S.AddressForm>
      </S.OrdersCard>

      <S.OrdersCard style={{ marginBottom: "2rem" }}>
        <S.SectionTitle>
          <ShoppingBag size={20} />
          <h3>Meus Cartões</h3>
        </S.SectionTitle>

        <S.AddressList>
          {savedCards.length === 0 ? (
            <div
              style={{
                padding: "0.9rem 1rem",
                borderRadius: 12,
                border: "1px solid rgba(63, 100, 255, 0.32)",
                background: "rgba(239, 246, 255, 0.85)",
              }}
            >
              <p className="empty-msg" style={{ margin: 0 }}>
                Nenhum cartão salvo ainda.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "0.5rem",
              }}
            >
              <label
                htmlFor="saved-card-select-profile"
                style={{ fontSize: 13, fontWeight: 700 }}
              >
                Escolher cartao salvo
              </label>
              <select
                id="saved-card-select-profile"
                value={selectedSavedCardId || ""}
                onChange={(event) =>
                  event.target.value
                    ? onSelectSavedCard(event.target.value)
                    : onStartNewSavedCard()
                }
                style={{
                  width: "100%",
                  minHeight: 48,
                  borderRadius: 12,
                  padding: "0.75rem 0.9rem",
                  border: "1px solid #c9d3e8",
                  background: "transparent",
                  color: "inherit",
                  fontWeight: 700,
                }}
              >
                <option value="">Novo cartao</option>
                {orderedSavedCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {`${card.brand} final ${card.lastFour} - ${card.holderName}`}
                  </option>
                ))}
              </select>
              <strong style={{ fontSize: 14 }}>Cartoes salvos</strong>

              {orderedSavedCards.map((card) => {
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
                          ? "2px solid #3f64ff"
                          : "1px solid #c9d3e8",
                        ...getCardBrandPalette(card.brand),
                        boxShadow: isSelected
                          ? "0 14px 30px rgba(63, 100, 255, 0.2)"
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
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.45rem",
                          }}
                        >
                          <img
                            src={getCardBrandLogo(card.brand)}
                            alt={`Bandeira ${card.brand}`}
                            style={{
                              width: 40,
                              height: 24,
                              objectFit: "contain",
                            }}
                          />
                          <strong>{card.brand.toUpperCase()}</strong>
                        </div>
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
          )}
        </S.AddressList>

        <hr
          style={{
            border: "0",
            borderTop: "1px solid var(--border)",
            margin: "1.5rem 0",
            opacity: 0.2,
          }}
        />

        <S.AddressForm
          onSubmit={(event) => {
            event.preventDefault();
            onSaveCurrentCard();
          }}
        >
          <h4>Salvar ou editar cartão</h4>
          <S.CardVisualPreview>
            <S.CardVisualTop>
              <S.CardChip />
              <S.CardBrandLogo
                src={getCardBrandLogo(cardPaymentDraft.brand)}
                alt={`Bandeira ${getCardBrandDisplay(cardPaymentDraft.brand).label}`}
              />
            </S.CardVisualTop>
            <S.CardVisualNumber>{cardPreviewDigits}</S.CardVisualNumber>
            <S.CardVisualFooter>
              <div className="left">
                <small>Final</small>
                <strong>
                  {String(cardPaymentDraft.lastFour || "").trim() || "0000"}
                </strong>
              </div>
              <div className="right">
                <small>Nome no cartao</small>
                <strong>{cardPreviewHolder}</strong>
              </div>
            </S.CardVisualFooter>
          </S.CardVisualPreview>
          <div className="form-row text-full">
            <input
              type="text"
              placeholder="Nome do titular"
              value={cardPaymentDraft.holderName}
              style={resolveCardFieldStyle(
                Boolean(cardFieldErrors.holderName),
                String(cardPaymentDraft.holderName || "").trim().length >= 3,
              )}
              onChange={(event) =>
                onCardPaymentDraftChange("holderName", event.target.value)
              }
            />
            {cardFieldErrors.holderName ? (
              <small style={cardErrorTextStyle}>
                {cardFieldErrors.holderName}
              </small>
            ) : null}
          </div>
          <div className="form-row text-full">
            <select
              value={cardPaymentDraft.brand}
              onChange={(event) =>
                onCardPaymentDraftChange("brand", event.target.value)
              }
              style={{
                width: "100%",
                minHeight: 48,
                borderRadius: 12,
                padding: "0.75rem 0.9rem",
                border: cardFieldErrors.brand
                  ? "1px solid #ef4444"
                  : showCardFieldFeedback &&
                      String(cardPaymentDraft.brand || "").trim().length > 0
                    ? "1px solid #22c55e"
                    : "1px solid #c9d3e8",
                background: "transparent",
                color: "inherit",
                fontWeight: 700,
                boxShadow: cardFieldErrors.brand
                  ? "0 0 0 1px rgba(239, 68, 68, 0.18)"
                  : showCardFieldFeedback &&
                      String(cardPaymentDraft.brand || "").trim().length > 0
                    ? "0 0 0 1px rgba(34, 197, 94, 0.2)"
                    : "none",
              }}
            >
              <option value="">Selecione a bandeira</option>
              {CARD_BRAND_OPTIONS.map((brand) => (
                <option key={brand} value={brand}>
                  {getCardBrandDisplay(brand).label}
                </option>
              ))}
            </select>
            {cardFieldErrors.brand ? (
              <small style={cardErrorTextStyle}>{cardFieldErrors.brand}</small>
            ) : null}
          </div>
          <div className="form-row split-bairro">
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
                    onClick={() => onCardPaymentDraftChange("brand", brand)}
                    style={{
                      minHeight: 58,
                      borderRadius: 12,
                      border: isActive
                        ? "2px solid #3f64ff"
                        : showCardFieldFeedback && cardFieldErrors.brand
                          ? "1px solid #ef4444"
                          : showCardFieldFeedback &&
                              String(cardPaymentDraft.brand || "").trim()
                                .length >= 2
                            ? "1px solid #22c55e"
                            : "1px solid #cbd5e1",
                      background: isActive
                        ? "rgba(63, 100, 255, 0.12)"
                        : "transparent",
                      color: "inherit",
                      cursor: "pointer",
                      display: "grid",
                      justifyItems: "center",
                      alignContent: "center",
                      gap: "0.25rem",
                      padding: "0.45rem 0.5rem",
                      boxShadow:
                        !isActive &&
                        showCardFieldFeedback &&
                        cardFieldErrors.brand
                          ? "0 0 0 1px rgba(239, 68, 68, 0.18)"
                          : !isActive &&
                              showCardFieldFeedback &&
                              String(cardPaymentDraft.brand || "").trim()
                                .length >= 2
                            ? "0 0 0 1px rgba(34, 197, 94, 0.2)"
                            : "none",
                    }}
                  >
                    <img
                      src={getCardBrandLogo(brand)}
                      alt={`Bandeira ${brandDisplay.label}`}
                      style={{
                        width: 40,
                        height: 24,
                        objectFit: "contain",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {brandDisplay.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <input
              className="card-last-four-input"
              type="text"
              placeholder="Final 1234"
              inputMode="numeric"
              value={cardPaymentDraft.lastFour}
              style={resolveCardFieldStyle(
                Boolean(cardFieldErrors.lastFour),
                String(cardPaymentDraft.lastFour || "").replace(/\D/g, "")
                  .length === 4,
              )}
              onChange={(event) =>
                onCardPaymentDraftChange("lastFour", event.target.value)
              }
            />
            {cardFieldErrors.lastFour ? (
              <small style={cardErrorTextStyle}>
                {cardFieldErrors.lastFour}
              </small>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <S.AddAddressButton type="submit" style={{ flex: 1 }}>
              <Plus size={16} />
              {selectedSavedCardId ? "Atualizar Cartão" : "Salvar Cartão"}
            </S.AddAddressButton>
            <S.ActionButton
              type="button"
              $variant="secondary"
              style={{ flex: 1 }}
              onClick={onStartNewSavedCard}
            >
              Novo Cartão
            </S.ActionButton>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              lineHeight: 1.5,
              opacity: 0.72,
            }}
          >
            Por seguranca, este aparelho salva apenas titular, bandeira e os 4
            ultimos digitos do cartao. Numero completo e CVV nao sao
            armazenados.
          </p>
        </S.AddressForm>
      </S.OrdersCard>

      <S.OrdersCard>
        <S.SectionTitle>
          <ShoppingBag size={20} />
          <h3>Pedidos do Perfil</h3>
        </S.SectionTitle>
        <p
          style={{
            margin: "0 0 1rem",
            opacity: 0.75,
            fontSize: "0.95rem",
          }}
        >
          Abra a tela exclusiva para visualizar todos os pedidos feitos por este
          perfil.
        </p>
        <S.ActionButton
          type="button"
          $variant="secondary"
          onClick={onNavigateOrders}
        >
          <ShoppingBag size={16} /> Ver meus pedidos
        </S.ActionButton>
      </S.OrdersCard>
    </S.RightColumn>
  );
}
