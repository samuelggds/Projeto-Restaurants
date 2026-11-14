import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle, ArrowRight, LoaderCircle, Sparkles } from 'lucide-react';
import aiGuideService, { type RestaurantManagementSummary } from '../../../Services/aiGuideService';

type Props = {
  onNavigate: (target: string) => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasNumber(record: Record<string, unknown>, key: string) {
  return typeof record[key] === 'number' && Number.isFinite(record[key]);
}

function isManagementSummary(value: unknown): value is RestaurantManagementSummary {
  if (!isRecord(value) || !isRecord(value.period) || !isRecord(value.sales)) return false;
  if (typeof value.period.start !== 'string' || typeof value.period.end !== 'string') return false;
  if (typeof value.dataUpdatedAt !== 'string' || typeof value.timeZone !== 'string') return false;
  if (!Array.isArray(value.priorities)) return false;

  const sales = value.sales;
  const registered = sales.registered;
  const confirmedPayments = sales.confirmedPayments;
  const cancellations = sales.cancellations;
  const refunds = sales.refunds;

  if (
    !isRecord(registered) ||
    !isRecord(confirmedPayments) ||
    !isRecord(cancellations) ||
    !isRecord(refunds)
  ) return false;

  return (
    hasNumber(registered, 'total') &&
    hasNumber(confirmedPayments, 'total') &&
    hasNumber(cancellations, 'count') &&
    hasNumber(refunds, 'count')
  );
}

export function AdminOverviewAiSummary({ onNavigate }: Props) {
  const [summary, setSummary] = useState<RestaurantManagementSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    aiGuideService.getManagementSummary()
      .then((data) => {
        if (!active) return;
        if (!isManagementSummary(data)) {
          setSummary(null);
          setError('Resumo gerencial indisponível. Os indicadores tradicionais continuam funcionando.');
          return;
        }
        setSummary(data);
        setError('');
      })
      .catch(() => {
        if (!active) return;
        setSummary(null);
        setError('Resumo gerencial indisponível. Os indicadores tradicionais continuam funcionando.');
      });
    return () => { active = false; };
  }, []);

  if (error) return <Panel role="status"><div className="error"><AlertTriangle />{error}</div></Panel>;
  if (!summary) return <Panel><div className="loading"><LoaderCircle /> Calculando prioridades com dados reais...</div></Panel>;

  return (
    <Panel aria-label="Prioridades gerenciais">
      <header>
        <div><Sparkles /><span><small>Assistente do Restaurante</small><h3>Prioridades do momento</h3></span></div>
        <span className="period">{new Date(summary.period.start).toLocaleDateString('pt-BR')} — {new Date(summary.period.end).toLocaleDateString('pt-BR')}</span>
      </header>
      <div className="numbers">
        <span><small>Vendas registradas</small><b>{formatMoney(summary.sales.registered.total)}</b></span>
        <span><small>Pagamentos confirmados</small><b>{formatMoney(summary.sales.confirmedPayments.total)}</b></span>
        <span><small>Cancelados / estornados</small><b>{summary.sales.cancellations.count} / {summary.sales.refunds.count}</b></span>
      </div>
      <div className="priorities">
        {summary.priorities.length > 0 ? summary.priorities.map((priority) => (
          <article key={priority.key}>
            <div><b>{priority.situation}</b><p>{priority.evidence}</p><small>{priority.reason}</small></div>
            <button type="button" onClick={() => onNavigate(priority.target)}>{priority.label}<ArrowRight /></button>
          </article>
        )) : <p className="clear">Nenhuma prioridade crítica foi detectada agora.</p>}
      </div>
      <footer>
        Atualizado {new Date(summary.dataUpdatedAt).toLocaleString('pt-BR')} · {summary.timeZone} · vendas não representam lucro.
      </footer>
    </Panel>
  );
}

const Panel = styled.section`
  margin: 14px 0 18px;
  padding: 22px 24px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  header > div { display: flex; align-items: center; gap: 10px; }
  header svg { width: 20px; color: #b94a17; }
  header small { display: block; color: #68717d; font-size: 12px; }
  h3 { margin: 2px 0 0; font-size: 17px; }
  .period { color: #68717d; font-size: 12px; }
  .numbers { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
  .numbers span { padding: 12px; border-radius: 8px; background: #f7f8fa; }
  .numbers small { display: block; color: #68717d; font-size: 12px; }
  .numbers b { display: block; margin-top: 4px; font-size: 18px; }
  .priorities { display: grid; gap: 10px; margin-top: 16px; }
  .priorities article { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px; }
  .priorities b { font-size: 14px; }
  .priorities p { margin: 4px 0; color: #555f6b; font-size: 13px; }
  .priorities small { color: #68717d; font-size: 12px; line-height: 1.5; }
  .priorities button { flex: 0 0 auto; min-height: 42px; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #b94a17; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .priorities button:hover { background: #fff6ef; }
  .priorities button svg { width: 16px; }
  .clear { margin: 0; padding: 8px; color: #37634a; font-size: 13px; }
  .loading, .error { display: flex; gap: 8px; align-items: center; color: #68717d; font-size: 13px; }
  .loading svg { width: 16px; animation: spin .8s linear infinite; }
  .error svg { width: 16px; color: #92521d; }
  @keyframes spin { to { transform: rotate(360deg); } }
  footer { margin-top: 16px; color: #68717d; font-size: 12px; line-height: 1.5; }
  @media(max-width: 700px) {
    padding: 18px;
    .numbers { grid-template-columns: 1fr; }
    .priorities article { align-items: flex-start; flex-direction: column; }
    .priorities button { width: 100%; justify-content: center; }
    header { align-items: flex-start; flex-direction: column; }
  }
`;
