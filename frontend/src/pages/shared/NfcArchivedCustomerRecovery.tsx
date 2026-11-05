import { useRef, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { CheckCircle2, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/authContext';
import nfcRegistrationService from '../../Services/nfcRegistrationService';

const Panel = styled.section`
  display: grid; gap: 14px; min-width: 0; padding: clamp(16px, 2.4vw, 22px);
  border-radius: 15px; background: #fff9f5; border: 1px solid #efd5c6; color: #26313b;
  h4, p { margin: 0; }
  h4 { font-size: 17px; font-weight: 800; }
  p { font-size: 13px; line-height: 1.6; color: #66717e; }
  .title { display: flex; align-items: center; gap: 9px; }
  .title svg, .note svg { width: 19px; height: 19px; flex: none; color: #d35c1c; }
  form { display: flex; align-items: flex-end; gap: 9px; }
  form label { flex: 1 1 auto; min-width: 0; display: grid; gap: 6px; font-weight: 700; font-size: 12px; }
  input:not([type="checkbox"]) {
    width: 100%; min-height: 44px; box-sizing: border-box; padding: 10px 12px;
    border: 1px solid #ccd5dc; border-radius: 10px; background: #fff; color: #26313b;
    font: inherit; font-size: 16px;
  }
  button {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px;
    border-radius: 10px; border: 1px solid #c85820; background: #c85820; color: #fff;
    padding: 10px 14px; font: inherit; font-weight: 800; font-size: 13px; cursor: pointer;
  }
  button svg { width: 17px; height: 17px; }
  button:disabled { opacity: .55; cursor: not-allowed; }
  button:focus-visible, input:focus-visible { outline: 3px solid #f2b48d; outline-offset: 2px; }
  .result { display: grid; gap: 11px; border: 1px solid #e8d4c6; border-radius: 12px; background: #fff; padding: 15px; }
  .result strong { font-size: 14px; }
  .confirm { display: flex; align-items: flex-start; gap: 9px; line-height: 1.6; font-weight: 600; font-size: 12px; }
  .confirm input { flex: none; width: 17px; height: 17px; margin-top: 2px; accent-color: #c85820; }
  .notice, .error { border-radius: 10px; padding: 11px 13px; font-size: 13px; }
  .notice { border: 1px solid #b9e3c6; background: #f0fbf3; color: #176d40; }
  .notice svg { width: 16px; height: 16px; margin-right: 6px; vertical-align: -3px; }
  .error { border: 1px solid #efc8c4; background: #fff3f1; color: #a02f2b; }
  .note { display: flex; align-items: flex-start; gap: 8px; }
  @media (max-width: 480px) {
    form { flex-direction: column; align-items: stretch; }
    form label, form button, .result button { width: 100%; }
  }
`;

type LookupState = 'idle' | 'archived' | 'active' | 'missing';

export function NfcArchivedCustomerRecovery({ onRecovered }: { onRecovered: () => void }) {
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  const [cpf, setCpf] = useState('');
  const [checkedCpf, setCheckedCpf] = useState('');
  const [lookup, setLookup] = useState<LookupState>('idle');
  const [confirmed, setConfirmed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const revision = useRef(0);
  const busy = searching || reactivating;

  const changeCpf = (raw: string) => {
    revision.current += 1;
    setCpf(raw.replace(/\D/g, '').slice(0, 11));
    setCheckedCpf('');
    setLookup('idle');
    setConfirmed(false);
    setError('');
    setSuccess('');
  };

  const search = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAdmin || busy) return;
    if (cpf.length !== 11) { setError('Informe os 11 números do CPF completo.'); return; }
    const version = ++revision.current;
    setSearching(true); setError(''); setSuccess(''); setLookup('idle'); setCheckedCpf(''); setConfirmed(false);
    try {
      const result = await nfcRegistrationService.identitySearchDetails(cpf);
      if (version !== revision.current) return;
      setCheckedCpf(cpf);
      setLookup(result.archivedMatch ? 'archived' : result.customers.length ? 'active' : 'missing');
    } catch (cause) {
      if (version !== revision.current) return;
      const failure = cause as { response?: { data?: { error?: string } } };
      setError(failure.response?.data?.error || 'Não foi possível consultar este CPF. Tente novamente.');
    } finally { if (version === revision.current) setSearching(false); }
  };

  const reactivate = async () => {
    if (!isAdmin || busy || !confirmed || lookup !== 'archived' || cpf !== checkedCpf || checkedCpf.length !== 11) return;
    const version = ++revision.current;
    setReactivating(true); setError(''); setSuccess('');
    try {
      await nfcRegistrationService.reactivateArchived(checkedCpf);
      if (version !== revision.current) return;
      setCpf(''); setCheckedCpf(''); setConfirmed(false); setLookup('idle');
      setSuccess('Cadastro recuperado. O histórico foi preservado; localize o cliente pelo CPF no atendimento NFC para vincular um cartão.');
      onRecovered();
    } catch (cause) {
      if (version !== revision.current) return;
      const failure = cause as { response?: { data?: { error?: string } } };
      setError(failure.response?.data?.error || 'Não foi possível recuperar o cadastro. Verifique possíveis pendências.');
      setConfirmed(false);
    } finally { if (version === revision.current) setReactivating(false); }
  };

  // The server independently checks ADMIN, tenant context, pending operations and audit.
  if (!isAdmin) return null;

  return <Panel aria-label="Recuperar cliente arquivado">
    <div className="title"><RotateCcw aria-hidden="true" /><h4>Recuperar cliente arquivado</h4></div>
    <p>Busque o CPF de um cliente removido da lista deste restaurante. A recuperação mantém o cadastro original e seu histórico.</p>
    <form onSubmit={event => void search(event)}>
      <label htmlFor="nfc-recovery-cpf">CPF completo
        <input id="nfc-recovery-cpf" inputMode="numeric" autoComplete="off" value={cpf}
          onChange={event => changeCpf(event.target.value)} placeholder="11 números do CPF"
          maxLength={11} disabled={busy} />
      </label>
      <button type="submit" disabled={busy}><Search aria-hidden="true" />{searching ? 'Consultando...' : 'Buscar cadastro'}</button>
    </form>
    {lookup === 'missing' && <div className="result" role="status"><strong>Nenhum cadastro arquivado encontrado</strong><p>Confira o CPF e o restaurante autenticado.</p></div>}
    {lookup === 'active' && <div className="result" role="status"><strong>Cadastro já ativo</strong><p>Localize o cliente na lista de cadastros ou no atendimento NFC. Não é necessário recuperar.</p></div>}
    {lookup === 'archived' && <div className="result" role="group" aria-label="Confirmar recuperação do cadastro">
      <strong>Cadastro arquivado encontrado neste restaurante</strong>
      <p>A reativação exige confirmação do administrador. O servidor verificará cartões vinculados, comandas e pagamentos pendentes.</p>
      <label className="confirm">
        <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={busy} />
        <span>Confirmo que desejo recuperar este cadastro e preservar sua identidade e seu histórico financeiro.</span>
      </label>
      <button type="button" disabled={!confirmed || busy} onClick={() => void reactivate()}>
        <RotateCcw aria-hidden="true" />{reactivating ? 'Recuperando...' : 'Confirmar recuperação'}
      </button>
    </div>}
    {error && <div role="alert" className="error">{error}</div>}
    {success && <div role="status" className="notice"><CheckCircle2 aria-hidden="true" />{success}</div>}
    <p className="note"><ShieldCheck aria-hidden="true" />Operação exclusiva do administrador, auditada e restrita ao restaurante. Nenhum cartão é vinculado automaticamente.</p>
  </Panel>;
}
