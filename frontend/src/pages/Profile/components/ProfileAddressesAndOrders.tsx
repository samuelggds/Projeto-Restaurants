import { MapPin, Plus, ShoppingBag, Trash2 } from "lucide-react";
import {
  CARD_BRAND_OPTIONS,
  getCardBrandDisplay,
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
              placeholder="Identificação (Ex: Casa, Trabalho, Namorada)"
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
            <p className="empty-msg">Nenhum cartão salvo ainda.</p>
          ) : (
            savedCards.map((card) => {
              const isSelected = selectedSavedCardId === card.id;
              const isDefault = defaultSavedCardId === card.id;

              return (
                <S.AddressItem key={card.id}>
                  <div
                    className="address-details"
                    onClick={() => onSelectSavedCard(card.id)}
                    style={{
                      cursor: "pointer",
                      padding: "0.95rem 1rem",
                      borderRadius: 16,
                      ...getCardBrandPalette(card.brand),
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
                      <h5 style={{ color: "inherit" }}>
                        {card.brand.toUpperCase()}
                      </h5>
                      <span style={{ fontSize: 11, opacity: 0.9 }}>
                        {isDefault
                          ? "PADRAO"
                          : isSelected
                            ? "EDITANDO"
                            : "SALVO"}
                      </span>
                    </div>
                    <p style={{ fontSize: 18, fontWeight: 800 }}>
                      •••• •••• •••• {card.lastFour}
                    </p>
                    <span style={{ opacity: 0.88 }}>{card.holderName}</span>
                  </div>
                  <S.ActionButton
                    type="button"
                    $variant="secondary"
                    style={{ width: "auto", minWidth: 120 }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSetDefaultSavedCard(card.id);
                    }}
                  >
                    {isDefault ? "Padrao" : "Definir padrao"}
                  </S.ActionButton>
                  <S.DeleteAddressButton
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveSavedCard(card.id);
                    }}
                    title="Excluir cartão"
                  >
                    <Trash2 size={16} />
                  </S.DeleteAddressButton>
                </S.AddressItem>
              );
            })
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
          <div className="form-row text-full">
            <input
              type="text"
              placeholder="Nome do titular"
              value={cardPaymentDraft.holderName}
              onChange={(event) =>
                onCardPaymentDraftChange("holderName", event.target.value)
              }
            />
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
            <input
              type="text"
              placeholder="Final 1234"
              inputMode="numeric"
              value={cardPaymentDraft.lastFour}
              onChange={(event) =>
                onCardPaymentDraftChange("lastFour", event.target.value)
              }
            />
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
            Por seguranca, ficam salvos apenas titular, bandeira e os 4 ultimos
            digitos. Numero completo e CVV nao sao armazenados.
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
