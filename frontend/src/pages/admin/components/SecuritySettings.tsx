import { useState } from 'react';
import { ArrowRight, KeyRound, ShieldCheck, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { useAuth } from '../../../contexts/authContext';
import authService from '../../../Services/authService';
import * as S from '../Admin.styles';

type Props = {
  openEmployees: () => void;
};

const SecurityPage = styled(S.SettingSection)`
  .security-hero {
    position: relative;
    overflow: hidden;
    min-height: 176px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 24px;
    padding: 28px;
    border: 1px solid #ded5cd;
    border-radius: 20px;
    background:
      radial-gradient(circle at 92% 12%, color-mix(in srgb, var(--a) 18%, transparent), transparent 27%),
      linear-gradient(135deg, #26211e 0%, #342b26 58%, #201d1b 100%);
    color: #fff;
    box-shadow: 0 18px 42px rgba(43, 32, 25, 0.14);
  }

  .security-hero::after {
    content: '';
    position: absolute;
    right: -56px;
    bottom: -86px;
    width: 190px;
    height: 190px;
    border: 24px solid rgba(255, 255, 255, 0.045);
    border-radius: 50%;
    pointer-events: none;
  }

  .hero-copy {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr);
    align-items: start;
    gap: 16px;
  }

  .hero-icon,
  .card-icon {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .hero-icon {
    width: 54px;
    height: 54px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.08);
    color: color-mix(in srgb, var(--a) 72%, white);
    backdrop-filter: blur(8px);
  }

  .hero-icon svg {
    width: 25px;
  }

  .eyebrow {
    display: block;
    margin-bottom: 7px;
    color: color-mix(in srgb, var(--a) 55%, white);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .security-hero h2 {
    margin: 0;
    color: #fff;
    font-size: clamp(21px, 2.5vw, 29px);
    line-height: 1.1;
  }

  .security-hero p {
    max-width: 650px;
    margin: 9px 0 0;
    color: rgba(255, 255, 255, 0.68);
    font-size: 12px;
    line-height: 1.55;
  }

  .status-badge {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    padding: 8px 11px;
    color: #d9f4df;
    background: rgba(31, 112, 57, 0.28);
    font-size: 10px;
    font-weight: 850;
    white-space: nowrap;
  }

  .status-badge svg {
    width: 15px;
  }

  .status-badge[data-enabled='false'] {
    color: #f3d8ce;
    background: rgba(151, 70, 45, 0.24);
  }

  .security-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .security-card {
    min-width: 0;
    min-height: 230px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .card-heading {
    display: grid;
    grid-template-columns: 45px minmax(0, 1fr);
    align-items: start;
    gap: 13px;
  }

  .card-icon {
    width: 45px;
    height: 45px;
    border-radius: 13px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 9%, white);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--a) 12%, transparent);
    transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .security-card:hover .card-icon {
    transform: translateY(-2px) scale(1.04);
  }

  .card-icon svg {
    width: 21px;
  }

  .card-heading h3 {
    margin: 1px 0 5px;
    color: #2d2723;
    font-size: 15px;
  }

  .card-heading p,
  .security-card > p {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.55;
  }

  .security-points {
    display: grid;
    gap: 8px;
    margin-top: 2px;
  }

  .security-points span {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #5e554f;
    font-size: 10px;
    font-weight: 650;
  }

  .security-points span::before {
    content: '';
    width: 7px;
    height: 7px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: var(--a);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 9%, transparent);
  }

  .mfa-control {
    display: grid;
    gap: 10px;
    margin-top: auto;
    padding-top: 4px;
  }

  .mfa-control label {
    display: grid;
    gap: 6px;
    color: #514942;
    font-size: 10px;
    font-weight: 800;
  }

  .mfa-control input {
    width: 100%;
    min-height: 42px;
    border: 1px solid #ded6cf;
    border-radius: 9px;
    padding: 0 12px;
    outline: none;
    color: #302a26;
    background: #fff;
    font-size: 12px;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease;
  }

  .mfa-control input:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 11%, transparent);
  }

  .mfa-state {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 38px;
    padding: 8px 10px;
    border-radius: 9px;
    background: #f8f5f2;
    color: #5e554f;
    font-size: 10px;
  }

  .mfa-state strong {
    color: #302a26;
    font-size: 11px;
  }

  .mfa-button {
    min-height: 43px;
    border: 0;
    border-radius: 10px;
    padding: 0 15px;
    color: #fff;
    background: var(--a);
    font-size: 11px;
    font-weight: 850;
    cursor: pointer;
    box-shadow: 0 8px 18px color-mix(in srgb, var(--a) 20%, transparent);
    transition:
      transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 220ms ease,
      filter 180ms ease;
  }

  .mfa-button[data-enabled='true'] {
    color: #843a30;
    background: #fff3f1;
    box-shadow: inset 0 0 0 1px #ead2ce;
  }

  .mfa-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 11px 24px color-mix(in srgb, var(--a) 28%, transparent);
    filter: brightness(0.98);
  }

  .mfa-button:disabled {
    cursor: wait;
    opacity: 0.62;
  }

  .mfa-note {
    margin: 0;
    color: #827a73;
    font-size: 9px;
    line-height: 1.45;
  }

  .manage-button {
    width: fit-content;
    min-height: 43px;
    margin-top: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 10px;
    padding: 0 15px;
    color: #fff;
    background: var(--a);
    font-size: 11px;
    font-weight: 850;
    box-shadow: 0 8px 18px color-mix(in srgb, var(--a) 20%, transparent);
    transition:
      transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 220ms ease,
      filter 180ms ease;
  }

  .manage-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 11px 24px color-mix(in srgb, var(--a) 28%, transparent);
    filter: brightness(0.97);
  }

  .manage-button:active {
    transform: translateY(0) scale(0.99);
  }

  .manage-button svg {
    width: 15px;
    transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .manage-button:hover svg {
    transform: translateX(2px);
  }

  @media (max-width: 760px) {
    .security-hero,
    .security-grid {
      grid-template-columns: 1fr;
    }
    .status-badge {
      justify-self: start;
    }
  }

  @media (max-width: 480px) {
    .security-hero {
      padding: 20px 17px;
    }
    .hero-copy {
      grid-template-columns: 1fr;
    }
    .security-card {
      min-height: 0;
    }
    .manage-button,
    .mfa-button {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card-icon,
    .manage-button,
    .manage-button svg,
    .mfa-button,
    .mfa-control input {
      transition: none;
    }
  }
`;

export function SecuritySettings({ openEmployees }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mfaPassword, setMfaPassword] = useState('');
  const [mfaSaving, setMfaSaving] = useState(false);
  const mfaEnabled = Boolean(user?.mfaEnabled);

  const toggleMfa = async () => {
    if (!mfaPassword) {
      toast.error('Digite sua senha atual para alterar o MFA.');
      return;
    }

    setMfaSaving(true);
    try {
      const nextEnabled = !mfaEnabled;
      await authService.updateMfaPreference(nextEnabled, mfaPassword);
      toast.success(
        nextEnabled
          ? 'MFA ativado. Entre novamente para continuar.'
          : 'MFA desativado. Entre novamente para continuar.',
      );
      logout();
      navigate('/login');
    } catch (error: unknown) {
      const requestError = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      toast.error(
        requestError.response?.data?.error ||
          requestError.message ||
          'Não foi possível atualizar o MFA.',
      );
    } finally {
      setMfaSaving(false);
    }
  };

  return (
    <SecurityPage>
      <section className="security-hero">
        <div className="hero-copy">
          <span className="hero-icon" aria-hidden="true">
            <ShieldCheck />
          </span>
          <div>
            <span className="eyebrow">SEGURANÇA DA CONTA ADMINISTRATIVA</span>
            <h2>Acesso administrativo protegido por escolha da conta</h2>
            <p>
              O MFA vem desativado por padrão. Cada administrador pode ativar uma segunda etapa de
              verificação para a própria conta quando desejar.
            </p>
          </div>
        </div>
        <span className="status-badge" data-enabled={mfaEnabled ? 'true' : 'false'}>
          <ShieldCheck /> {mfaEnabled ? 'MFA ativado' : 'MFA desativado'}
        </span>
      </section>

      <div className="security-grid">
        <S.Card className="security-card">
          <div className="card-heading">
            <span className="card-icon" aria-hidden="true">
              <KeyRound />
            </span>
            <div>
              <h3>Verificação em duas etapas (MFA)</h3>
              <p>
                Ative ou desative a proteção para esta conta administrativa. A configuração não
                altera o MFA de outros usuários ou restaurantes.
              </p>
            </div>
          </div>

          <div className="security-points">
            <span>Desativado por padrão até o administrador ativar</span>
            <span>A senha atual é obrigatória para alterar esta configuração</span>
            <span>A mudança invalida sessões antigas por segurança</span>
          </div>

          <div className="mfa-control">
            <div className="mfa-state" role="status" aria-live="polite">
              <span>Status atual</span>
              <strong>{mfaEnabled ? 'Ativado' : 'Desativado'}</strong>
            </div>
            <label>
              Senha atual
              <input
                type="password"
                autoComplete="current-password"
                value={mfaPassword}
                onChange={(event) => setMfaPassword(event.target.value)}
                placeholder="Confirme sua senha"
                disabled={mfaSaving}
              />
            </label>
            <button
              className="mfa-button"
              type="button"
              data-enabled={mfaEnabled ? 'true' : 'false'}
              disabled={mfaSaving}
              onClick={() => void toggleMfa()}
            >
              <ShieldCheck aria-hidden="true" />
              {mfaSaving ? 'Salvando...' : mfaEnabled ? 'Desativar MFA' : 'Ativar MFA'}
            </button>
            <p className="mfa-note">
              Após a alteração, você será desconectado e precisará entrar novamente.
            </p>
          </div>
        </S.Card>

        <S.Card className="security-card">
          <div className="card-heading">
            <span className="card-icon" aria-hidden="true">
              <UsersRound />
            </span>
            <div>
              <h3>Acessos da equipe</h3>
              <p>Crie, edite, desative ou reative os acessos vinculados a este restaurante.</p>
            </div>
          </div>
          <p>
            Centralize a gestão da equipe em uma única tela e mantenha somente as pessoas certas com
            acesso à operação.
          </p>
          <button className="manage-button" type="button" onClick={openEmployees}>
            Gerenciar funcionários <ArrowRight />
          </button>
        </S.Card>
      </div>
    </SecurityPage>
  );
}
