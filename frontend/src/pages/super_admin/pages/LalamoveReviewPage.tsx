import { useCallback, useEffect, useState } from 'react';
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
  const details = (value as { response?: { data?: { error?: string } } })?.response?.data;
  return details?.error || 'Não foi possível concluir a operação. Atualize e tente novamente.';
}
export function LalamoveReviewPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<Record<number, Status | ''>>({});
  const [reason, setReason] = useState<Record<number, Reason | ''>>({});
  const load = useCallback(async (cursor?: number) => {
    setBusy(true); setError('');
    try {
      const data = await superAdminService.listLalamoveOnboarding(cursor);
      if (!Array.isArray(data.requests)) throw new Error('Resposta inválida');
      setEntries((old) => cursor ? [...old, ...data.requests] : data.requests);
      setNext(data.nextCursor ?? null);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function review(item: Entry) {
    const desired = status[item.restaurantId];
    if (!desired || desired === item.status || busy) return;
    const selectedReason = reason[item.restaurantId] || null;
    if (['ACTION_REQUIRED', 'SUSPENDED'].includes(desired) && !selectedReason) {
      setError('Selecione o motivo antes de salvar.'); return;
    }
    setBusy(true); setError('');
    try {
      await superAdminService.reviewLalamoveOnboarding(item.restaurantId, {
        status: desired, expectedStatus: item.status,
        expectedUpdatedAt: item.updatedAt,
        reasonCode: desired === 'IN_REVIEW' ? null : selectedReason,
      });
      setStatus({}); setReason({});
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  return <Layout>
    <article>
      <div className="row"><h2>Solicitações Lalamove</h2><button type="button" onClick={() => void load()} disabled={busy}>Atualizar</button></div>
      <p>Revisões são feitas por restaurante e auditadas. Não há ativação de entregas reais ou acesso a chaves nesta tela.</p>
    </article>
    {error && <article role="alert"><p>{error}</p></article>}
    {!busy && entries.length === 0 && <article><p>Nenhuma solicitação nesta página.</p></article>}
    {entries.map(item => <article key={item.id}>
      <div className="row"><h3>{item.restaurant.name}</h3><strong>{statuses[item.status]}</strong></div>
      <small>{item.restaurant.slug} · Restaurante #{item.restaurantId}</small>
      <p>Solicitação: {new Date(item.requestedAt).toLocaleString('pt-BR')}</p>
      {item.reviewReasonCode && <p>Motivo: {reasons.find(([key]) => key === item.reviewReasonCode)?.[1] || 'Outro'}</p>}
      <p>Conexão e despachos reais continuam desabilitados até homologação.</p>
      <div className="controls">
        <label>Status
          <select aria-label={'Novo status Lalamove restaurante ' + item.restaurantId} value={status[item.restaurantId] || ''} onChange={event => setStatus(old => ({...old, [item.restaurantId]: event.target.value as Status}))}>
            <option value="">Selecionar</option>
            {(['IN_REVIEW', 'ACTION_REQUIRED', 'SUSPENDED'] as const).filter(value => value !== item.status).map(value => <option key={value} value={value}>{statuses[value]}</option>)}
          </select>
        </label>
        {['ACTION_REQUIRED', 'SUSPENDED'].includes(status[item.restaurantId]) && <label>Motivo
          <select aria-label={'Motivo Lalamove restaurante ' + item.restaurantId} value={reason[item.restaurantId] || ''} onChange={event => setReason(old => ({...old, [item.restaurantId]: event.target.value as Reason}))}>
            <option value="">Selecionar</option>
            {reasons.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>}
        <button type="button" className="primary" disabled={busy || !status[item.restaurantId]} onClick={() => void review(item)}>Salvar revisão</button>
      </div>
    </article>)}
    {next != null && <button type="button" disabled={busy} onClick={() => void load(next)}>Carregar mais</button>}
  </Layout>;
}
