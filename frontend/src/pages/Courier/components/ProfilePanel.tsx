import { useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle,
  IdCard,
  Mail,
  Pencil,
  Phone,
  Save,
  User,
  X,
} from 'lucide-react';
import authService from '../../../Services/authService';
import {
  PROFILE_AVATAR_ACCEPT,
  resizeProfileAvatar,
} from '../../../utils/profileAvatar';
import * as S from '../styles';

type CourierUser = {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  role?: string;
  avatar?: string | null;
};

type ProfilePanelProps = {
  user: CourierUser | null;
  onUpdated: (updatedUser: CourierUser) => void;
  saveProfile?: (profile: {
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string | null;
  }) => Promise<CourierUser>;
};

function formatCpfDisplay(raw: string | undefined) {
  const digits = String(raw || '')
    .replace(/\D/g, '')
    .slice(0, 11);

  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export default function ProfilePanel({
  user,
  onUpdated,
  saveProfile = (profile) => authService.updateProfile(profile),
}: ProfilePanelProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    cpf: formatCpfDisplay(user?.cpf),
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    if (name === 'cpf') {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      const masked = digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

      setForm((prev) => ({ ...prev, cpf: masked }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || avatarSaving) return;

    setAvatarSaving(true);
    setError('');
    setSuccess('');

    try {
      const avatar = await resizeProfileAvatar(file);
      const updated = await saveProfile({ avatar });
      onUpdated(updated);
      setSuccess('Foto de perfil atualizada com sucesso!');
      window.setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (err as Error)?.message ||
        'Não foi possível atualizar a foto.';
      setError(message);
    } finally {
      setAvatarSaving(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await saveProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
      });

      onUpdated(updated);
      setEditing(false);
      setSuccess('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Erro ao salvar perfil.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      cpf: formatCpfDisplay(user?.cpf),
    });
    setEditing(false);
    setError('');
  }

  const roleLabel: Record<string, string> = {
    MOTOQUEIRO: 'Motoqueiro',
    FUNCIONARIO: 'Funcionário',
    ADMIN: 'Administrador',
  };

  return (
    <S.ProfilePanel>
      <S.ProfileAvatarRow>
        <S.ProfileAvatarWrap>
          <S.ProfileAvatar>
            {user?.avatar ? (
              <img src={user.avatar} alt="Foto do perfil do motoqueiro" />
            ) : (
              <User size={40} aria-hidden="true" />
            )}
          </S.ProfileAvatar>
          <S.ProfileAvatarButton
            type="button"
            aria-label={user?.avatar ? 'Alterar foto do perfil' : 'Adicionar foto do perfil'}
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarSaving}
          >
            <Camera size={15} aria-hidden="true" />
          </S.ProfileAvatarButton>
          <input
            ref={avatarInputRef}
            hidden
            type="file"
            accept={PROFILE_AVATAR_ACCEPT}
            onChange={handleAvatarChange}
          />
        </S.ProfileAvatarWrap>
        <div>
          <S.ProfileName>{user?.name || '-'}</S.ProfileName>
          <S.ProfileRole>{roleLabel[user?.role || ''] || user?.role}</S.ProfileRole>
          <S.ProfileAvatarHint>
            {avatarSaving ? 'Salvando foto...' : user?.avatar ? 'Toque na câmera para trocar' : 'Adicione uma foto para o cliente reconhecer você'}
          </S.ProfileAvatarHint>
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
              <label htmlFor="courier-profile-name">
                <User size={13} /> Nome completo
              </label>
              <input
                id="courier-profile-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </S.ProfileField>
            <S.ProfileField>
              <label htmlFor="courier-profile-email">
                <Mail size={13} /> E-mail
              </label>
              <input
                id="courier-profile-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </S.ProfileField>
            <S.ProfileField>
              <label htmlFor="courier-profile-phone">
                <Phone size={13} /> Telefone
              </label>
              <input
                id="courier-profile-phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="(11) 99999-9999"
              />
            </S.ProfileField>
            <S.ProfileField>
              <label htmlFor="courier-profile-cpf">
                <IdCard size={13} /> CPF
              </label>
              <input
                id="courier-profile-cpf"
                name="cpf"
                value={form.cpf || 'Não informado'}
                readOnly
                disabled
                style={{ cursor: 'not-allowed', opacity: 0.6 }}
              />
            </S.ProfileField>
          </S.ProfileFieldsGrid>
          <S.ProfileActions>
            <S.SaveButton type="submit" disabled={saving}>
              <Save size={15} />
              {saving ? 'Salvando...' : 'Salvar alterações'}
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
            <strong>{user?.email || '-'}</strong>
          </S.ProfileInfoItem>
          <S.ProfileInfoItem>
            <span>
              <Phone size={13} /> Telefone
            </span>
            <strong>{user?.phone || 'Não informado'}</strong>
          </S.ProfileInfoItem>
          <S.ProfileInfoItem>
            <span>
              <IdCard size={13} /> CPF
            </span>
            <strong>{user?.cpf ? formatCpfDisplay(user.cpf) : 'Não informado'}</strong>
          </S.ProfileInfoItem>
          <S.ProfileInfoItem>
            <span>
              <User size={13} /> Cargo
            </span>
            <strong>{roleLabel[user?.role || ''] || user?.role || '-'}</strong>
          </S.ProfileInfoItem>
        </S.ProfileFieldsGrid>
      )}
    </S.ProfilePanel>
  );
}
