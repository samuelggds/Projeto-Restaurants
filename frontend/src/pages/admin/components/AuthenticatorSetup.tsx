import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import authService from '../../../Services/authService';
import { useAuth } from '../../../contexts/authContext';

type Status = 'loading' | 'ready' | 'enabled';

export function AuthenticatorSetup() {
  const { logout } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void authService.getAuthenticatorStatus().then((result) => {
      if (active) setStatus(result.enabled ? 'enabled' : 'ready');
    }).catch(() => {
      if (active) {
        setStatus('ready');
        toast.error('Não foi possível consultar o aplicativo autenticador.');
      }
    });
    return () => { active = false; };
  }, []);

  const start = async () => {
    if (!password) return toast.error('Informe sua senha atual.');
    setBusy(true);
    try {
      const response = await authService.startAuthenticatorSetup(password);
      setSecret(response.secret);
      setCode('');
      setPassword('');
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || 'Não foi possível iniciar a configuração.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!/^\d{6}$/u.test(code)) return toast.error('Digite os seis números do aplicativo.');
    setBusy(true);
    try {
      const response = await authService.confirmAuthenticatorSetup(code);
      if (!response.enabled) throw new Error('Código não confirmado.');
      setSecret('');
      setCode('');
      setStatus('enabled');
      toast.success('Aplicativo confirmado no servidor. Entre novamente.');
      logout();
    } catch (error) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || 'Código incorreto ou configuração expirada.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthenticatorCard aria-label="Aplicativo autenticador">
      <h3 style={{ margin: 0 }}>Aplicativo autenticador</h3>
      <p style={{ margin: 0, fontSize: 13 }}>
        Gere códigos no celular, mesmo sem receber e-mails pelo Outlook.
        Toda confirmação é realizada pelo servidor da GastroNexa.
      </p>
      {status === 'loading' && <p>Verificando configuração...</p>}
      {status === 'enabled' && <p role="status">Aplicativo autenticador ativado para esta conta.</p>}
      {status === 'ready' && !secret && (
        <>
          <label htmlFor="totp-current-password">Senha atual</label>
          <input id="totp-current-password" type="password" autoComplete="current-password"
            value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
          <button type="button" disabled={busy || !password} onClick={() => void start()}>
            Configurar aplicativo autenticador
          </button>
        </>
      )}
      {status === 'ready' && secret && (
        <>
          <p>Adicione uma conta no Google Authenticator ou Microsoft Authenticator e selecione
            a opção de inserir uma chave de configuração manualmente.</p>
          <label htmlFor="totp-setup-secret">Chave de configuração (guarde em segurança)</label>
          <input id="totp-setup-secret" type="text" readOnly value={secret}
            autoComplete="off" aria-label="Chave para cadastrar no autenticador" />
          <label htmlFor="totp-confirm-code">Código de seis dígitos</label>
          <input id="totp-confirm-code" type="text" inputMode="numeric" autoComplete="one-time-code"
            value={code} maxLength={6} onChange={(event) => setCode(event.target.value.replace(/\D/gu, ''))}
            disabled={busy} />
          <button type="button" disabled={busy || code.length !== 6} onClick={() => void confirm()}>
            Confirmar código no servidor
          </button>
          <p style={{ fontSize: 12 }}>
            A configuração expira em dez minutos. Após confirmar, será necessário entrar novamente.
            Nunca compartilhe a chave de configuração.
          </p>
        </>
      )}
    </AuthenticatorCard>
  );
}

const AuthenticatorCard = styled.section`
  padding:22px; border:1px solid #e5e7eb; border-radius:12px; display:grid; gap:12px; background:#fff;
  h3 {font-size:17px; font-weight:650;} p {line-height:1.65; color:#68717d;}
  label {font-size:13px;font-weight:600;}
  input {width:100%;min-width:0;min-height:44px;border:1px solid #d5dae1;border-radius:8px;padding:10px 12px;background:#fff;font:inherit;}
  button {justify-self:start;min-height:42px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#b94a17;font:inherit;font-size:13px;font-weight:600;}
  button:disabled {opacity:.5;cursor:not-allowed;}
  @media(max-width:520px){padding:18px 16px;button{width:100%;}}
`;
