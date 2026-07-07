import { Copy, DoorOpen, KeyRound, RefreshCcw } from "lucide-react";
import * as S from "../styles";

type TableItem = {
  id: number;
  number: number;
  capacity?: number | null;
  _count?: {
    orders?: number;
    tableSessions?: number;
  };
};

type OpenSession = {
  id: number;
  tableId?: number;
  table?: {
    number?: number;
  };
  openedBy?: {
    name?: string;
  };
};

type GeneratedPin = {
  pin?: string;
  sessionId?: number;
};

type TableCard = {
  table: TableItem;
  openSession?: OpenSession | null;
  generatedPin?: GeneratedPin | null;
};

type TablesTabProps = {
  tables: TableItem[];
  openSessions: OpenSession[];
  tableCards: TableCard[];
  openingTableIds: number[];
  closingSessionIds: number[];
  highlightedTableId: number | null;
  highlightedTableNumber: number | null;
  isHighlightBlinking: boolean;
  highlightPulseOn: boolean;
  isDarkMode: boolean;
  refreshTablesPanel: () => void;
  copyGeneratedPin: (pin: string) => void;
  handleOpenTable: (table: TableItem) => void;
  handleCloseTableSession: (session: OpenSession) => void;
};

export default function TablesTab({
  tables,
  openSessions,
  tableCards,
  openingTableIds,
  closingSessionIds,
  highlightedTableId,
  highlightedTableNumber,
  isHighlightBlinking,
  highlightPulseOn,
  isDarkMode,
  refreshTablesPanel,
  copyGeneratedPin,
  handleOpenTable,
  handleCloseTableSession,
}: TablesTabProps) {
  return (
    <div>
      <S.PageHeader>
        <h2>Gerador de PIN por Mesa</h2>
        <p>
          Abra uma mesa para gerar um PIN novo, acompanhe as sessoes ativas e
          feche a mesa para invalidar o acesso.
        </p>
      </S.PageHeader>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.85rem",
          marginBottom: "1.25rem",
        }}
      >
        {[
          {
            label: "Mesas cadastradas",
            value: tables.length,
            color: "var(--primary, #eab308)",
          },
          {
            label: "Mesas abertas",
            value: openSessions.length,
            color: "#10b981",
          },
          {
            label: "Mesas fechadas",
            value: Math.max(tables.length - openSessions.length, 0),
            color: "#6366f1",
          },
        ].map((item) => (
          <S.FormCard
            key={item.label}
            style={{ padding: "1rem 1.1rem", maxWidth: "none" }}
          >
            <small style={{ opacity: 0.65 }}>{item.label}</small>
            <div
              style={{
                fontSize: "1.8rem",
                fontWeight: 800,
                color: item.color,
                marginTop: "0.2rem",
              }}
            >
              {item.value}
            </div>
          </S.FormCard>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={refreshTablesPanel}
          style={{
            border: "none",
            borderRadius: 999,
            padding: "0.6rem 1rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "var(--primary, #eab308)",
            color: "#111827",
            fontWeight: 800,
            marginBottom: "1rem",
          }}
        >
          <RefreshCcw size={16} /> Atualizar mesas
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1rem",
        }}
      >
        {tableCards.map(({ table, openSession, generatedPin }) => {
          const isOpen = Boolean(openSession);
          const isOpening = openingTableIds.includes(table.id);
          const isClosing = closingSessionIds.includes(openSession?.id || 0);
          const pinValue = generatedPin?.pin || "";
          const isHighlighted =
            (highlightedTableId && Number(table.id) === highlightedTableId) ||
            (highlightedTableNumber &&
              Number(table.number) === highlightedTableNumber);
          const highlightBorder =
            isHighlighted && isHighlightBlinking && !highlightPulseOn
              ? "2px solid transparent"
              : isHighlighted
                ? "2px solid #ef4444"
                : "1px solid transparent";
          const highlightShadow =
            isHighlighted && isHighlightBlinking && !highlightPulseOn
              ? "0 0 0 1px rgba(245, 158, 11, 0.08)"
              : isHighlighted
                ? "0 0 0 4px rgba(245, 158, 11, 0.2), 0 18px 36px rgba(2, 6, 23, 0.18)"
                : undefined;

          return (
            <S.FormCard
              key={table.id}
              style={{
                maxWidth: "none",
                borderTop: `4px solid ${isOpen ? "#10b981" : "#ef4444"}`,
                border: highlightBorder,
                boxShadow: highlightShadow,
                transform: isHighlighted ? "translateY(-2px)" : undefined,
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
                transition:
                  "box-shadow 0.2s ease, transform 0.25s ease, border-color 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <div style={{ opacity: 0.65, fontSize: "0.8rem" }}>Mesa</div>
                  <h3 style={{ fontSize: "1.35rem", marginTop: 2 }}>
                    #{table.number}
                  </h3>
                </div>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "0.35rem 0.7rem",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    background: isOpen ? "#10b98122" : "#ef444422",
                    color: isOpen ? "#10b981" : "#ef4444",
                  }}
                >
                  {isOpen ? "Aberta" : "Fechada"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "0.45rem",
                  fontSize: "0.9rem",
                  opacity: 0.9,
                }}
              >
                <div>
                  <strong>Capacidade:</strong> {table.capacity || "-"}
                </div>
                <div>
                  <strong>Pedidos abertos:</strong> {table?._count?.orders || 0}
                </div>
                <div>
                  <strong>Sessoes:</strong> {table?._count?.tableSessions || 0}
                </div>
              </div>

              {isOpen ? (
                <div
                  style={{
                    borderRadius: 12,
                    padding: "0.9rem",
                    background: isDarkMode
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      marginBottom: "0.5rem",
                      fontWeight: 800,
                    }}
                  >
                    <KeyRound size={16} /> PIN ativo da mesa
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.3rem",
                        fontWeight: 900,
                        letterSpacing: "0.18em",
                      }}
                    >
                      {pinValue || "PIN salvo nesta sessao"}
                    </div>

                    {pinValue && (
                      <button
                        type="button"
                        onClick={() => copyGeneratedPin(pinValue)}
                        style={{
                          border: "none",
                          borderRadius: 999,
                          padding: "0.45rem 0.8rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          background: "#111827",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        <Copy size={14} /> Copiar
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: "0.65rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    {openSession?.openedBy?.name || "Equipe"} abriu esta mesa.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    borderRadius: 12,
                    padding: "0.9rem",
                    background: isDarkMode
                      ? "rgba(239, 68, 68, 0.12)"
                      : "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    fontSize: "0.9rem",
                  }}
                >
                  Mesa fechada. Abra para gerar um novo PIN.
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "0.65rem",
                  flexWrap: "wrap",
                }}
              >
                {isOpen ? (
                  <button
                    type="button"
                    onClick={() =>
                      openSession && handleCloseTableSession(openSession)
                    }
                    disabled={isClosing}
                    style={{
                      border: "none",
                      borderRadius: 999,
                      padding: "0.65rem 1rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      background: isClosing ? "#94a3b8" : "#ef4444",
                      color: "#fff",
                      fontWeight: 800,
                    }}
                  >
                    <DoorOpen size={16} />
                    {isClosing ? "Fechando..." : "Fechar mesa"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenTable(table)}
                    disabled={isOpening}
                    style={{
                      border: "none",
                      borderRadius: 999,
                      padding: "0.65rem 1rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      background: isOpening ? "#94a3b8" : "#10b981",
                      color: "#fff",
                      fontWeight: 800,
                    }}
                  >
                    <KeyRound size={16} />
                    {isOpening ? "Gerando PIN..." : "Abrir e gerar PIN"}
                  </button>
                )}
              </div>
            </S.FormCard>
          );
        })}
      </div>

      <S.FormCard style={{ marginTop: "1.25rem", maxWidth: "none" }}>
        <S.PageHeader style={{ marginBottom: "1rem" }}>
          <h2>Sessoes abertas agora</h2>
          <p>Feche uma sessao quando a mesa sair de atendimento.</p>
        </S.PageHeader>

        {openSessions.length === 0 ? (
          <div
            style={{
              opacity: 0.7,
              fontSize: "0.95rem",
              padding: "0.75rem 0",
            }}
          >
            Nenhuma mesa aberta no momento.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "0.75rem",
            }}
          >
            {openSessions.map((session) => (
              <div
                key={session.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.85rem 1rem",
                  borderRadius: 12,
                  border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
                  background: isDarkMode ? "#172033" : "#f8fafc",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>
                    Mesa #{session.table?.number || session.tableId}
                  </strong>
                  <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                    Aberta por {session.openedBy?.name || "Equipe"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCloseTableSession(session)}
                  disabled={closingSessionIds.includes(session.id)}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "0.55rem 0.85rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    background: closingSessionIds.includes(session.id)
                      ? "#94a3b8"
                      : "#ef4444",
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  <DoorOpen size={15} />
                  {closingSessionIds.includes(session.id)
                    ? "Fechando..."
                    : "Fechar"}
                </button>
              </div>
            ))}
          </div>
        )}
      </S.FormCard>
    </div>
  );
}
