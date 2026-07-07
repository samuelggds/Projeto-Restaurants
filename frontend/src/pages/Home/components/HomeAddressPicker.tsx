import { MapPin } from "lucide-react";

type Address = {
  id: number;
  rotulo: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
};

type HomeAddressPickerProps = {
  isDarkMode: boolean;
  isMobileViewport: boolean;
  isAddressMenuOpen: boolean;
  addresses: Address[];
  selectedAddress: Address | null;
  selectedAddressId: number | null;
  addressPanelBackground: string;
  addressPanelText: string;
  addressPanelMuted: string;
  addressPanelBorder: string;
  addressDropdownBackground: string;
  onToggleAddressMenu: () => void;
  onSelectAddress: (address: Address) => void;
  onNavigateProfile: () => void;
};

function getAddressLine(address: Address | null) {
  if (!address) {
    return "Nenhum endereço cadastrado";
  }

  return [address.rua, address.numero, address.bairro, address.cidade]
    .filter(Boolean)
    .join(", ");
}

export default function HomeAddressPicker({
  isDarkMode,
  isMobileViewport,
  isAddressMenuOpen,
  addresses,
  selectedAddress,
  selectedAddressId,
  addressPanelBackground,
  addressPanelText,
  addressPanelMuted,
  addressPanelBorder,
  addressDropdownBackground,
  onToggleAddressMenu,
  onSelectAddress,
  onNavigateProfile,
}: HomeAddressPickerProps) {
  return (
    <div
      data-address-picker
      style={{
        width: "100%",
        maxWidth: 520,
        marginLeft: "auto",
        background: addressPanelBackground,
        color: addressPanelText,
        border: `1px solid ${addressPanelBorder}`,
        borderRadius: 14,
        padding: "0.7rem 0.85rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        flexWrap: "wrap",
        boxShadow: isDarkMode
          ? "0 14px 30px rgba(0, 0, 0, 0.24)"
          : "0 14px 30px rgba(15, 23, 42, 0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.65rem",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #f59e0b, #facc15)",
            color: "#0f172a",
            flexShrink: 0,
            boxShadow: "0 8px 16px rgba(245, 158, 11, 0.22)",
          }}
        >
          <MapPin size={16} />
        </div>
        <div style={{ textAlign: "left", minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              opacity: 0.8,
              marginBottom: 1,
              color: addressPanelMuted,
            }}
          >
            Entrega em
          </div>
          <strong
            style={{
              fontSize: 13,
              display: "block",
              color: addressPanelText,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 300,
            }}
          >
            {getAddressLine(selectedAddress)}
          </strong>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: isMobileViewport ? "100%" : "auto",
          display: "flex",
          justifyContent: isMobileViewport ? "center" : "flex-end",
        }}
        data-address-menu
      >
        <button
          type="button"
          onClick={onToggleAddressMenu}
          style={{
            border: "none",
            background: isDarkMode
              ? "linear-gradient(135deg, #f59e0b, #fb7185)"
              : "linear-gradient(135deg, #f59e0b, #facc15)",
            color: "#0f172a",
            fontWeight: 800,
            borderRadius: 999,
            padding: isMobileViewport ? "0.5rem 0.8rem" : "0.55rem 0.85rem",
            minHeight: isMobileViewport ? 34 : 0,
            fontSize: isMobileViewport ? 12 : 13,
            cursor: "pointer",
            whiteSpace: "nowrap",
            boxShadow: "0 8px 18px rgba(217, 119, 6, 0.22)",
            transform: isAddressMenuOpen ? "translateY(1px)" : "translateY(0)",
            transition:
              "transform 180ms ease, box-shadow 180ms ease, filter 180ms ease",
          }}
        >
          Trocar
        </button>

        <div
          style={{
            position: "absolute",
            right: 0,
            left: "auto",
            top: "calc(100% + 0.45rem)",
            bottom: "auto",
            minWidth: "unset",
            width: isMobileViewport
              ? "min(178px, calc(100vw - 2rem))"
              : "min(320px, calc(100vw - 1.25rem))",
            maxWidth: isMobileViewport
              ? "calc(100vw - 2rem)"
              : "calc(100vw - 1.1rem)",
            background: addressDropdownBackground,
            color: addressPanelText,
            border: `1px solid ${addressPanelBorder}`,
            borderRadius: isMobileViewport ? 14 : 16,
            boxShadow: isDarkMode
              ? "0 20px 50px rgba(0, 0, 0, 0.32)"
              : "0 20px 50px rgba(15, 23, 42, 0.14)",
            padding: isMobileViewport ? 6 : 8,
            zIndex: 20,
            overflow: "hidden",
            maxHeight: isAddressMenuOpen
              ? isMobileViewport
                ? "30vh"
                : 360
              : 0,
            opacity: isAddressMenuOpen ? 1 : 0,
            transform: isAddressMenuOpen
              ? "translateY(0) scaleY(1)"
              : isMobileViewport
                ? "translateY(-10px) scaleY(0.97)"
                : "translateY(-8px) scaleY(0.96)",
            transformOrigin: "top right",
            pointerEvents: isAddressMenuOpen ? "auto" : "none",
            transition:
              "max-height 280ms ease, opacity 220ms ease, transform 280ms ease",
          }}
        >
          {addresses.length === 0 ? (
            <button
              type="button"
              onClick={onNavigateProfile}
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                color: addressPanelText,
                textAlign: "left",
                padding: isMobileViewport ? "0.65rem 0.7rem" : "0.85rem 0.9rem",
                cursor: "pointer",
              }}
            >
              Cadastre um endereço no perfil
            </button>
          ) : (
            addresses.map((address) => {
              const isSelected = address.id === selectedAddressId;

              return (
                <button
                  key={address.id}
                  type="button"
                  onClick={() => onSelectAddress(address)}
                  style={{
                    width: "100%",
                    border: "none",
                    background: isSelected
                      ? isDarkMode
                        ? "rgba(251, 191, 36, 0.16)"
                        : "rgba(245, 158, 11, 0.14)"
                      : "transparent",
                    color: addressPanelText,
                    textAlign: "left",
                    padding: isMobileViewport
                      ? "0.62rem 0.68rem"
                      : "0.85rem 0.9rem",
                    borderRadius: 12,
                    cursor: "pointer",
                    marginBottom: 4,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: isMobileViewport ? 12 : 13,
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {address.rotulo}
                  </strong>
                  <span
                    style={{
                      display: "block",
                      fontSize: isMobileViewport ? 11 : 12,
                      opacity: 0.82,
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {address.rua}, {address.numero}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 12,
                      opacity: 0.72,
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {address.bairro} • {address.cidade}
                    {address.estado ? ` - ${address.estado}` : ""}
                  </span>
                </button>
              );
            })
          )}

          <button
            type="button"
            onClick={onNavigateProfile}
            style={{
              width: "100%",
              border: "none",
              borderTop: `1px solid ${addressPanelBorder}`,
              background: "transparent",
              color: addressPanelText,
              textAlign: "left",
              padding: "0.85rem 0.9rem",
              cursor: "pointer",
              marginTop: 4,
              fontWeight: 700,
            }}
          >
            Gerenciar endereços
          </button>
        </div>
      </div>
    </div>
  );
}
