import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  IdCard,
  Mail,
  Pencil,
  Phone,
  Save,
  User,
  X,
} from "lucide-react";
import authService from "../../../Services/authService";
import * as S from "../styles";

type CourierUser = {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  role?: string;
};

type ProfilePanelProps = {
  user: CourierUser | null;
  onUpdated: (updatedUser: CourierUser) => void;
};

function formatCpfDisplay(raw: string | undefined) {
  const digits = String(raw || "")
    .replace(/\D/g, "")
    .slice(0, 11);

  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function ProfilePanel({ user, onUpdated }: ProfilePanelProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    cpf: formatCpfDisplay(user?.cpf),
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    if (name === "cpf") {
      const digits = value.replace(/\D/g, "").slice(0, 11);
      const masked = digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

      setForm((prev) => ({ ...prev, cpf: masked }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await authService.updateProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
      });

      onUpdated(updated);
      setEditing(false);
      setSuccess("Perfil atualizado com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Erro ao salvar perfil.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      cpf: formatCpfDisplay(user?.cpf),
    });
    setEditing(false);
    setError("");
  }

  const roleLabel: Record<string, string> = {
    MOTOQUEIRO: "Motoqueiro",
    FUNCIONARIO: "Funcionário",
    ADMIN: "Administrador",
  };

  return (
    <S.ProfilePanel>
      <S.ProfileAvatarRow>
        <S.ProfileAvatar>
          <User size={40} />
        </S.ProfileAvatar>
        <div>
          <S.ProfileName>{user?.name || "-"}</S.ProfileName>
          <S.ProfileRole>
            {roleLabel[user?.role || ""] || user?.role}
          </S.ProfileRole>
        </div>
        {!editing && (
          <S.EditProfileBtn onClick={() => setEditing(true)} type="button">
            <Pencil size={15} />
            Editar
          </S.EditProfileBtn>
        )}
      </S.ProfileAvatarRow>

      {success && (
        <S.SuccessMsg>
          <CheckCircle size={14} />
          {success}
        </S.SuccessMsg>
      )}
      {error && (
        <S.ErrorMsg>
          <AlertCircle size={14} />
          {error}
        </S.ErrorMsg>
      )}

      {editing ? (
        <form onSubmit={handleSave}>
          <S.ProfileFieldsGrid>
            <S.ProfileField>
              <label>
                <User size={13} /> Nome completo
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </S.ProfileField>
            <S.ProfileField>
              <label>
                <Mail size={13} /> E-mail
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </S.ProfileField>
            <S.ProfileField>
              <label>
                <Phone size={13} /> Telefone
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="(11) 99999-9999"
              />
            </S.ProfileField>
            <S.ProfileField>
              <label>
                <IdCard size={13} /> CPF
              </label>
              <input
                name="cpf"
                value={form.cpf || "Não informado"}
                readOnly
                disabled
                style={{ cursor: "not-allowed", opacity: 0.6 }}
              />
            </S.ProfileField>
          </S.ProfileFieldsGrid>
          <S.ProfileActions>
            <S.SaveButton type="submit" disabled={saving}>
              <Save size={15} />
              {saving ? "Salvando..." : "Salvar alterações"}
            </S.SaveButton>
            <S.CancelButton type="button" onClick={handleCancel}>
              <X size={15} />
              Cancelar
            </S.CancelButton>
          </S.ProfileActions>
        </form>
      ) : (
        <S.ProfileFieldsGrid>
          <S.ProfileInfoItem>
            <span>
              <Mail size={13} /> E-mail
            </span>
            <strong>{user?.email || "-"}</strong>
          </S.ProfileInfoItem>
          <S.ProfileInfoItem>
            <span>
              <Phone size={13} /> Telefone
            </span>
            <strong>{user?.phone || "Não informado"}</strong>
          </S.ProfileInfoItem>
          <S.ProfileInfoItem>
            <span>
              <IdCard size={13} /> CPF
            </span>
            <strong>
              {user?.cpf ? formatCpfDisplay(user.cpf) : "Não informado"}
            </strong>
          </S.ProfileInfoItem>
          <S.ProfileInfoItem>
            <span>
              <User size={13} /> Cargo
            </span>
            <strong>{roleLabel[user?.role || ""] || user?.role || "-"}</strong>
          </S.ProfileInfoItem>
        </S.ProfileFieldsGrid>
      )}
    </S.ProfilePanel>
  );
}
