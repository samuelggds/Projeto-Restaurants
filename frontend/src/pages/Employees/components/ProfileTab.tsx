import { AlertCircle, Mail, Phone, ShieldAlert, User } from "lucide-react";
import * as S from "../styles";

type EmployeeUser = {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
} | null;

type ManagerInfo = {
  name: string;
  email: string;
  phone: string;
  restaurantName: string;
};

type ProfileTabProps = {
  user: EmployeeUser;
  managerInfo: ManagerInfo;
  isDarkMode: boolean;
};

export default function ProfileTab({
  user,
  managerInfo,
  isDarkMode,
}: ProfileTabProps) {
  return (
    <S.FlexDashboardLayout>
      <S.FormCard style={{ flex: 1 }}>
        <S.PageHeader style={{ marginBottom: "1.5rem" }}>
          <h2>Meu Perfil</h2>
          <p>Suas credenciais e informacoes profissionais no Peca Ja.</p>
        </S.PageHeader>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <S.FormGroup>
            <label>Nome do Colaborador</label>
            <input
              type="text"
              value={user?.name || "-"}
              disabled
              style={{ cursor: "not-allowed", opacity: 0.8 }}
            />
          </S.FormGroup>

          <S.FormGroup>
            <label>E-mail de Acesso</label>
            <input
              type="email"
              value={user?.email || "-"}
              disabled
              style={{ cursor: "not-allowed", opacity: 0.8 }}
            />
          </S.FormGroup>

          <S.FormRow>
            <S.FormGroup>
              <label>Telefone</label>
              <input
                type="text"
                value={user?.phone || "-"}
                disabled
                style={{ cursor: "not-allowed", opacity: 0.8 }}
              />
            </S.FormGroup>
            <S.FormGroup>
              <label>Cargo / Funcao (Role)</label>
              <div style={{ marginTop: "0.25rem" }}>
                <S.SlugBadge
                  style={{ fontSize: "1rem", padding: "0.5rem 1rem" }}
                >
                  {user?.role || "-"}
                </S.SlugBadge>
              </div>
            </S.FormGroup>
          </S.FormRow>
        </div>
      </S.FormCard>

      <S.FormCard
        style={{
          flex: 1,
          borderTop: "4px solid var(--primary, #eab308)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <S.FormSectionTitle
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--primary, #eab308)",
            }}
          >
            <ShieldAlert size={20} /> Plantao da Gerencia
          </S.FormSectionTitle>
          <p
            style={{
              fontSize: "0.9rem",
              opacity: 0.7,
              marginBottom: "1.5rem",
            }}
          >
            Precisa cancelar um pedido, dar desconto ou relatar um problema?
            Entre em contato com a gerencia responsavel.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <User size={18} style={{ opacity: 0.6 }} />
              <div>
                <small style={{ display: "block", opacity: 0.5 }}>
                  Gerencia
                </small>
                <strong>{managerInfo.name}</strong>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <Mail size={18} style={{ opacity: 0.6 }} />
              <div>
                <small style={{ display: "block", opacity: 0.5 }}>
                  E-mail de Contato
                </small>
                <span>{managerInfo.email}</span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <Phone size={18} style={{ opacity: 0.6 }} />
              <div>
                <small style={{ display: "block", opacity: 0.5 }}>
                  Telefone / WhatsApp
                </small>
                <span style={{ color: "#22c55e", fontWeight: "600" }}>
                  {managerInfo.phone}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: isDarkMode ? "#2d2d3a" : "#f3f4f6",
            padding: "1rem",
            borderRadius: "8px",
            marginTop: "1.5rem",
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <AlertCircle
            size={16}
            style={{ flexShrink: 0, color: "var(--primary, #eab308)" }}
          />
          <span
            style={{
              fontSize: "0.8rem",
              opacity: 0.92,
              color: isDarkMode ? "#f8fafc" : "#111827",
            }}
          >
            Voce esta conectado a filial:{" "}
            <strong style={{ color: isDarkMode ? "#ffffff" : "#111827" }}>
              {managerInfo.restaurantName}
            </strong>
          </span>
        </div>
      </S.FormCard>
    </S.FlexDashboardLayout>
  );
}
