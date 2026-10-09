import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import superAdminService from '../../../Services/superAdminService';

type Status = 'REQUESTED' | 'IN_REVIEW' | 'ACTION_REQUIRED' | 'SUSPENDED';
type Reason = 'PROVIDER_APPROVAL' | 'MERCHANT_ACCOUNT' | 'WALLET_BALANCE' | 'SERVICE_COVERAGE' | 'THERMAL_BAG' | 'OTHER';
type Entry = {
  id: string;
  restaurantId: number;
  restaurant: { id: number; name: string; slug: string };
  status: Status;
  updatedAt: string;
  requestedAt: string;
  reviewReasonCode: Reason | null;
  connected: false;
  canDispatch: false;
};
const availableTransitions: Record<Status, Status[]> = {
  REQUESTED: ['IN_REVIEW', 'ACTION_REQUIRED', 'SUSPENDED'],
  IN_REVIEW: ['ACTION_REQUIRED', 'SUSPENDED'],
  ACTION_REQUIRED: ['IN_REVIEW', 'SUSPENDED'],
  SUSPENDED: ['IN_REVIEW'],
};
const statuses: Record<Status, string> = {
  REQUESTED: 'Solicitação recebida',
  IN_REVIEW: 'Em análise',
  ACTION_REQUIRED: 'Aguardando informações',
  SUSPENDED: 'Suspensa',
};
const reasons: Array<[Reason, string]> = [
  ['PROVIDER_APPROVAL', 'Aprovação Lalamove'],
  ['MERCHANT_ACCOUNT', 'Conta do restaurante'],
  ['WALLET_BALANCE', 'Saldo na carteira'],
  ['SERVICE_COVERAGE', 'Cobertura da região'],
  ['THERMAL_BAG', 'Bolsa térmica indisponível'],
  ['OTHER', 'Outra pendência'],
];
const Layout = styled.section`
  display: grid; gap: 16px;
  article {background: #fff; border: 1px solid #e8e2dc; padding: 22px; border-radius: 12px; display: grid; gap: 12px;}
  h2, h3, p {margin: 0;}
  p, small {color: #716861; line-height: 1.6;}
  .row {display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: center;}
  .controls {display: flex; flex-wrap: wrap; gap: 12px; align-items: end;}
  label {display: grid; gap: 5px; font-size: 13px;}
  select {padding: 11px; min-width: 190px; max-width: 100%; border: 1px solid #d8d0c7; border-radius: 8px; background: white;}
  button {padding: 11px 15px; border: 1px solid #d7cfc6; border-radius: 8px; background: #fff; font-weight: 700; cursor: pointer;}
  button.primary {background: #c45439; color: white; border-color: #c45439;}
  button:disabled {opacity: .5; cursor: not-allowed;}
`;
function errorMessage(value: unknown) {
  const status = (value as { response?: { status?: number } })?.response?.status;
  if (status === 409) return 'Esta solicitação foi alterada. Atualize a lista antes de revisar novamente.';
  if (status === 401 || status === 403) return 'Acesso não autorizado. Verifique sua sessão e suas permissões.';
  // Never render arbitrary error bodies: they can contain internal diagnostics.
  return 'Não foi possível concluir a operação. Atualize e tente novamente.';
}
export function LalamoveReviewPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [next, setNext] = useState<number | null>(null);
  // Loading is the initial state, not a synchronous update caused by the effect.
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<Record<number, Status | ''>>({});
  const [reason, setReason] = useState<Record<number, Reason | ''>>({});
  const activeRequest = useRef<AbortController | null>(null);

  const fetchEntries = useCallback((controller: AbortController, cursor?: number) => {
    // Subscribe to the API result. State changes happen only in response callbacks,
    // never in the synchronous effect path (including error/finalization paths).
    return superAdminService.listLalamoveOnboarding(cursor, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.requests)) throw new Error('Resposta inválida');
        setEntries((old) => cursor != null ? [...old, ...data.requests] : data.requests);
        setNext(data.nextCursor ?? null);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          activeRequest.current = null;
          setBusy(false);
        }
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current = controller;
    void fetchEntries(controller);
    return () => {
      // Also invalidate an event-triggered refresh or review after unmount.
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [fetchEntries]);

  function load(cursor?: number) {
    // The ref prevents duplicate actions even before React renders disabled buttons.
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true);
    setError('');
    if (cursor == null) {
      setStatus({});
      setReason({});
    }
    void fetchEntries(controller, cursor);
  }

  async function review(item: Entry) {
    const desired = status[item.restaurantId];
    if (!desired || desired === item.status || activeRequest.current) return;
    const selectedReason = reason[item.restaurantId] || null;
    if (['ACTION_REQUIRED', 'SUSPENDED'].includes(desired) && !selectedReason) {
      setError('Selecione o motivo antes de salvar.');
      return;
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true);
    setError('');
    try {
      // Do not retry or claim to cancel a mutation that may already have committed.
      await superAdminService.reviewLalamoveOnboarding(item.restaurantId, {
        status: desired, expectedStatus: item.status,
        expectedUpdatedAt: item.updatedAt,
        reasonCode: desired === 'IN_REVIEW' ? null : selectedReason,
      });
      if (controller.signal.aborted) return;
      setStatus({});
      setReason({});
      await fetchEntries(controller);
    } catch (e) {
      if (!controller.signal.aborted) setError(errorMessage(e));
    } finally {
      if (!controller.signal.aborted) {
        activeRequest.current = null;
        setBusy(false);
      }
    }
  }
  return <Layout aria-busy={busy}>
    <article>
      <div className="row"><h2>Solicitações Lalamove</h2><button type="button" onClick={() => load()} disabled={busy}>Atualizar</button></div>
      <p>Revisões são feitas por restaurante e auditadas. Não há ativação de entregas reais ou acesso a chaves nesta tela.</p>
    </article>
    {busy && <article role="status"><p>Carregando solicitações...</p></article>}
    {error && <article role="alert"><p>{error}</p></article>}
    {!busy && !error && entries.length === 0 && <article><p>Nenhuma solicitação nesta página.</p></article>}
    {entries.map(item => <article key={item.id}>
      <div className="row"><h3>{item.restaurant.name}</h3><strong>{statuses[item.status]}</strong></div>
      <small>{item.restaurant.slug} · Restaurante #{item.restaurantId}</small>
      <p>Solicitação: {new Date(item.requestedAt).toLocaleString('pt-BR')}</p>
      {item.reviewReasonCode && <p>Motivo: {reasons.find(([key]) => key === item.reviewReasonCode)?.[1] || 'Outro'}</p>}
      <p>Conexão e despachos reais continuam desabilitados até homologação.</p>
      <div className="controls">
        <label>Status
          <select disabled={busy} aria-label={'Novo status Lalamove restaurante ' + item.restaurantId} value={status[item.restaurantId] || ''} onChange={event => setStatus(old => ({...old, [item.restaurantId]: event.target.value as Status}))}>
            <option value="">Selecionar</option>
            {availableTransitions[item.status].map(value => <option key={value} value={value}>{statuses[value]}</option>)}
          </select>
        </label>
        {['ACTION_REQUIRED', 'SUSPENDED'].includes(status[item.restaurantId]) && <label>Motivo
          <select disabled={busy} aria-label={'Motivo Lalamove restaurante ' + item.restaurantId} value={reason[item.restaurantId] || ''} onChange={event => setReason(old => ({...old, [item.restaurantId]: event.target.value as Reason}))}>
            <option value="">Selecionar</option>
            {reasons.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>}
        <button type="button" className="primary" disabled={busy || !status[item.restaurantId]} onClick={() => void review(item)}>Salvar revisão</button>
      </div>
    </article>)}
    {next != null && <button type="button" disabled={busy} onClick={() => load(next)}>Carregar mais</button>}
  </Layout>;
}
