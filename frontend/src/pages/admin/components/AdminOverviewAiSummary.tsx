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

export function AdminOverviewAiSummary({ onNavigate }: Props) {
  const [summary, setSummary] = useState<RestaurantManagementSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    aiGuideService.getManagementSummary()
      .then((data) => {
        if (!active) return;
        setSummary(data);
        setError('');
      })
      .catch(() => {
        if (!active) return;
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
  margin:14px 0 18px;padding:14px 16px;border:1px solid #e6dfda;border-radius:16px;background:linear-gradient(135deg,#fff,#faf7f5);box-shadow:0 10px 28px rgba(54,42,35,.05);header{display:flex;align-items:center;justify-content:space-between;gap:12px}header>div{display:flex;align-items:center;gap:9px}header svg{width:18px;color:#d45d3b}header span span{display:block}header small{display:block;color:#d45d3b;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.07em}h3{margin:2px 0 0;font-size:14px}.period{color:#857a73;font-size:9px}.numbers{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:11px}.numbers span{padding:9px 10px;border-radius:10px;background:#f7f3f0}.numbers small{display:block;color:#8b817a;font-size:8px}.numbers b{display:block;margin-top:2px;font-size:12px}.priorities{display:grid;gap:7px;margin-top:10px}.priorities article{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid #ece5e0;border-radius:11px;background:#fff}.priorities b{font-size:10px}.priorities p{margin:2px 0;color:#625952;font-size:9px}.priorities small{color:#8b817a;font-size:8px;line-height:1.4}.priorities button{flex:0 0 auto;min-height:32px;padding:0 9px;border:0;border-radius:8px;background:#292321;color:#fff;font-size:8px;font-weight:850;display:flex;align-items:center;gap:4px}.priorities button svg{width:11px}.clear{margin:0;padding:8px;color:#56705f;font-size:10px}.loading,.error{display:flex;gap:7px;align-items:center;color:#766c65;font-size:10px}.loading svg{width:15px;animation:spin .8s linear infinite}.error svg{width:15px;color:#b45309}@keyframes spin{to{transform:rotate(360deg)}}footer{margin-top:9px;color:#998e87;font-size:8px;line-height:1.4}@media(max-width:700px){.numbers{grid-template-columns:1fr}.priorities article{align-items:flex-start;flex-direction:column}.priorities button{width:100%;justify-content:center}header{align-items:flex-start;flex-direction:column}}
`;
