import { ShieldCheck, ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../../Services/api';
import { useAuth } from '../../../contexts/authContext';
import { useAppDialog } from '../../../components/AppDialog/context';
import * as S from '../SuperAdmin.styles';

export function SuperAdminMfaControl() {
  const { user, logout } = useAuth();
  const { confirmDialog } = useAppDialog();
  const navigate = useNavigate();
  const enabled = Boolean(user?.mfaEnabled);

  const changeMfa = async () => {
    const nextEnabled = !enabled;
    const confirmed = await confirmDialog({
      title: nextEnabled
        ? 'Ativar a verificação em duas etapas?'
        : 'Desativar a verificação em duas etapas?',
      description: nextEnabled
        ? 'No próximo acesso, a conta SUPER_ADMIN exigirá uma confirmação adicional pelos canais disponíveis.'
        : 'A conta SUPER_ADMIN terá acesso apenas com a senha. Isso reduz a proteção de uma conta com acesso a toda a plataforma. Você poderá reativar depois.',
      confirmLabel: nextEnabled ? 'Ativar proteção' : 'Desativar mesmo assim',
      cancelLabel: nextEnabled ? 'Agora não' : 'Manter proteção',
      tone: nextEnabled ? 'default' : 'danger',
    });
    if (!confirmed) return;

    try {
      await api.patch('/auth/mfa', { enabled: nextEnabled });
      toast.success(
        nextEnabled
          ? 'Verificação em duas etapas ativada. Entre novamente.'
          : 'Verificação em duas etapas desativada. Entre novamente.',
      );
      logout();
      navigate('/super_admin/login', { replace: true });
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(
        requestError.response?.data?.error ||
          requestError.message ||
          'Não foi possível alterar a verificação em duas etapas.',
      );
    }
  };

  return (
    <S.FormCard>
      <header>
        <div>
          <h2>Segurança da conta SUPER_ADMIN</h2>
          <p>Escolha se o seu acesso terá uma segunda confirmação no login.</p>
        </div>
      </header>
      <div className="line">
        <span>
          <strong>{enabled ? 'Verificação em duas etapas ativada' : 'Verificação em duas etapas desativada'}</strong>
          <small>
            {enabled
              ? 'Sua senha é acompanhada por uma confirmação adicional.'
              : 'Sua conta está usando somente a senha para autenticação.'}
          </small>
        </span>
        <S.Switch
          $on={enabled}
          role="switch"
          aria-label="Verificação em duas etapas da conta SUPER_ADMIN"
          aria-checked={enabled}
          onClick={() => void changeMfa()}
        />
      </div>
      <S.InlineAlert $tone={enabled ? 'success' : 'error'}>
        {enabled ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
        {enabled
          ? 'Proteção reforçada ativa para esta conta.'
          : 'Proteção reduzida: ative novamente o 2FA sempre que possível.'}
      </S.InlineAlert>
    </S.FormCard>
  );
}
