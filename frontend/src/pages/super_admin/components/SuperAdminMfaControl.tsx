import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/authContext';
import authService from '../../../Services/authService';
import * as S from '../SuperAdmin.styles';

export function SuperAdminMfaControl() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const enabled = Boolean(user?.mfaEnabled);

  const toggle = async () => {
    if (!password) {
      toast.error('Digite sua senha atual para alterar a verificação em duas etapas.');
      return;
    }

    setSaving(true);
    try {
      await authService.updateMfaPreference(!enabled, password);
      toast.success(
        !enabled
          ? 'Verificação em duas etapas ativada. Entre novamente.'
          : 'Verificação em duas etapas desativada. Entre novamente.',
      );
      logout();
      navigate('/login');
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(
        requestError.response?.data?.error ||
          requestError.message ||
          'Não foi possível atualizar a verificação em duas etapas.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <S.FormCard>
      <header>
        <div>
          <h2>Segurança da conta SUPER_ADMIN</h2>
          <p>
            A verificação em duas etapas é opcional e pode ser ativada ou desativada por esta conta.
          </p>
        </div>
      </header>

      <div className="line">
        <span>
          <strong>Verificação em duas etapas</strong>
          <small>
            {enabled
              ? 'Ativada: novos acessos exigem uma confirmação adicional.'
              : 'Desativada: ative se quiser adicionar uma segunda confirmação ao login.'}
          </small>
        </span>
        <output>{enabled ? 'Ativada' : 'Desativada'}</output>
      </div>

      <label>
        Senha atual
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <S.Button type="button" $variant="primary" disabled={saving} onClick={() => void toggle()}>
        <ShieldCheck size={16} />
        {saving ? 'Salvando…' : enabled ? 'Desativar MFA' : 'Ativar MFA'}
      </S.Button>
    </S.FormCard>
  );
}
