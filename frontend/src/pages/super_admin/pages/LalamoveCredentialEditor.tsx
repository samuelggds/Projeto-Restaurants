import { useState } from 'react';
import superAdminService from '../../../Services/superAdminService';

type Environment = 'sandbox' | 'production';
type State = { configured: boolean; status: string; version: number; verifiedAt: string | null; canDispatch: false };
type Status = { sandbox: State; production: State };
type Props = { restaurantId: number; onboardingStatus: string };

export function LalamoveCredentialEditor({ restaurantId, onboardingStatus }: Props) {
  const [data, setData] = useState<Status | null>(null);
  const [environment, setEnvironment] = useState<Environment>('sandbox');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const latest = await superAdminService.getLalamoveCredentials(restaurantId);
      setData(latest as Status);
      setLoaded(true);
    } catch {
      setError('Não foi possível consultar o estado das credenciais.');
    } finally { setBusy(false); }
  }

  async function change(action: 'save' | 'verify' | 'revoke') {
    if (busy || !data || (action === 'save' && (!apiKey || !apiSecret))) return;
    if (action === 'verify' && environment !== 'sandbox') return;
    if (action === 'revoke' && !window.confirm('Revogar as credenciais deste restaurante neste ambiente?')) return;
    const version = data[environment].version;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (action === 'save') {
        await superAdminService.saveLalamoveCredentials(restaurantId, {
          environment, apiKey, apiSecret, expectedVersion: version,
        });
      } else if (action === 'verify') {
        await superAdminService.verifyLalamoveSandboxCredentials(restaurantId, version);
      } else {
        await superAdminService.revokeLalamoveCredentials(restaurantId, environment, version);
      }
      setApiKey('');
      setApiSecret('');
      const latest = await superAdminService.getLalamoveCredentials(restaurantId);
      setData(latest as Status);
      setNotice(action === 'save' ? 'Credenciais guardadas com criptografia.' :
        action === 'verify' ? 'Sandbox validado, sem ativar entregas.' : 'Credenciais revogadas.');
    } catch (cause: unknown) {
      const status = (cause as { response?: { status?: number } })?.response?.status;
      setError(status === 409 ? 'Dados alterados ou conta já vinculada. Atualize antes de tentar novamente.' :
        status === 422 ? 'Credenciais não validadas na Lalamove sandbox.' :
        'Não foi possível concluir. Confira a configuração do servidor.');
    } finally { setBusy(false); }
  }

  return <section aria-label={'Credenciais Lalamove restaurante ' + restaurantId}>
    <p><strong>Credenciais individuais</strong> — somente SUPER_ADMIN. Não compartilhe contas entre restaurantes.</p>
    {!loaded ? <button type="button" disabled={busy} onClick={() => void refresh()}>
      Consultar credenciais
    </button> : <>
      <label>Ambiente
        <select aria-label={'Ambiente Lalamove restaurante ' + restaurantId} value={environment}
          disabled={busy} onChange={event => { setEnvironment(event.target.value as Environment); setApiKey(''); setApiSecret(''); setNotice(''); }}>
          <option value="sandbox">Sandbox</option>
          <option value="production">Produção (armazenamento apenas)</option>
        </select>
      </label>
      <p>Status: {data?.[environment].status ?? 'Não configurado'}. Versão: {data?.[environment].version ?? 0}.</p>
      {onboardingStatus === 'IN_REVIEW' && <>
        <label>API Key
          <input type="password" autoComplete="off" spellCheck={false} aria-label={'Lalamove API Key restaurante ' + restaurantId}
            value={apiKey} disabled={busy} onChange={event => setApiKey(event.target.value)}/>
        </label>
        <label>API Secret
          <input type="password" autoComplete="off" spellCheck={false} aria-label={'Lalamove API Secret restaurante ' + restaurantId}
            value={apiSecret} disabled={busy} onChange={event => setApiSecret(event.target.value)}/>
        </label>
        <button type="button" disabled={busy || !apiKey || !apiSecret} onClick={() => void change('save')}>
          Guardar com criptografia
        </button>
      </>}
      {environment === 'sandbox' && data?.sandbox.configured && <button type="button" disabled={busy}
        onClick={() => void change('verify')}>Verificar sandbox</button>}
      {data?.[environment].configured && <button type="button" disabled={busy}
        onClick={() => void change('revoke')}>Revogar credenciais</button>}
      <button type="button" disabled={busy} onClick={() => void refresh()}>Atualizar estado</button>
      <p>Produção bloqueada: nenhuma entrega ou cobrança será autorizada.</p>
    </>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
