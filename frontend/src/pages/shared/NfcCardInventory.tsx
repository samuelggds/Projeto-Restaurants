import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { CreditCard, X } from 'lucide-react';
import nfcRegistrationService, { type NfcInventoryCard, type NfcInventoryStatus } from '../../Services/nfcRegistrationService';

type Filter = 'ALL' | NfcInventoryStatus;
type Props = { refreshKey?: number; onPrepare: () => void };
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'ALL', label: 'Todos' },
  { key: 'READY', label: 'Disponíveis' },
  { key: 'ACTIVE', label: 'Vinculados' },
  { key: 'REVOKED', label: 'Revogados' },
  { key: 'PENDING_WRITE', label: 'Em preparação' },
];
const money = (value: number) => (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const statusLabel: Record<NfcInventoryStatus, string> = {
  READY: 'Disponível', ACTIVE: 'Vinculado', REVOKED: 'Revogado', PENDING_WRITE: 'Aguardando gravação',
};
const UI = styled.section`
  display: grid; gap: 18px; min-width: 0;
  *, *::before, *::after { box-sizing: border-box; }
  h3, p { margin: 0; }
  .top { display: flex; align-items: start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .top h3 { font-size: 21px; color: #20272b; }
  .top p, .note { color: #65737b; font-size: 13px; }
  button { font: inherit; cursor: pointer; }
  .prepare { background: #d65a1a; color: white; border: 0; padding: 12px 17px; border-radius: 11px; font-weight: 750; }
  .filters { display: flex; flex-wrap: wrap; gap: 8px; }
  .filters button, .pagination button { background: white; border: 1px solid #dce3e7; border-radius: 9px; padding: 9px 12px; color: #44515b; font-size: 12px; }
  .filters button[aria-pressed="true"] { border-color: #e9b89c; background: #fff1e7; color: #a94312; font-weight: 800; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill,minmax(128px,1fr)); gap: 12px; }
  .card { display: grid; gap: 13px; text-align: left; padding: 16px; border: 1px solid #e2e6e9; border-radius: 12px; background: white; min-height: 104px; box-shadow: 0 3px 11px #17212b08; }
  .card:hover, .card:focus-visible { border-color: #d65a1a; outline-offset: 3px; }
  .card > span { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
  .card svg { width: 17px; color: #9aa5ad; }
  .card strong { font-size: 15px; color: #17252e; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #a5b0b7; }
  .dot[data-status="ACTIVE"] { background: #d65a1a; }
  .dot[data-status="READY"] { background: #278b60; }
  .dot[data-status="REVOKED"] { background: #7d8991; }
  .dot[data-status="PENDING_WRITE"] { background: #d6a331; }
  .pagination { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
  .pagination button:disabled { opacity: .45; cursor: not-allowed; }
  .overlay { position: fixed; inset: 0; z-index: 11000; background: #17212a99; display: grid; place-items: center; padding: 15px; }
  .modal { width: min(100%,570px); max-height: calc(100dvh - 30px); overflow: auto; border-radius: 20px; background: #fff; box-shadow: 0 25px 70px #0003; }
  .modal-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 1px solid #e8edef; padding: 20px 24px; }
  .modal-head button { background: #f5f6f7; border: 0; border-radius: 9px; padding: 9px; }
  .modal-body { display: grid; gap: 19px; padding: 24px; }
  .status { justify-self: start; color: #a44517; background: #fff2e9; font-size: 12px; font-weight: 800; padding: 6px 10px; border-radius: 6px; }
  .details { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 17px; }
  .detail { display: grid; gap: 5px; min-width: 0; overflow-wrap: anywhere; }
  .detail small { color: #7d8890; }
  .detail strong { font-size: 14px; color: #253038; }
  .account { border-top: 1px solid #e5eaec; padding-top: 17px; display: grid; gap: 9px; }
  .account strong { color: #26333a; }
  .warning { background: #fff8f2; border: 1px solid #f0d8c8; border-radius: 10px; padding: 12px; font-size: 12px; }
  .close { justify-self: stretch; border: 1px solid #dce3e7; border-radius: 9px; background: #fff; padding: 11px; }
  @media(max-width:500px) { .modal-body { padding: 17px; } .details { grid-template-columns: 1fr; } .modal-head { padding: 17px; } }
`;

export function NfcCardInventory({ refreshKey = 0, onPrepare }: Props) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof nfcRegistrationService.inventory>> | null>(null);
  const [selected, setSelected] = useState<NfcInventoryCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const inventory = await nfcRegistrationService.inventory(page, filter);
      setData(inventory);
      setError('');
    } catch {
      setError('Não foi possível carregar o estoque NFC. Tente novamente.');
    } finally { setLoading(false); }
  }, [page, filter]);
  useEffect(() => { void load(); }, [load, refreshKey]);
  useEffect(() => { if (!selected) return; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [selected]);
  const counts = data?.counts;
  const allCount = counts ? Object.values(counts).reduce((sum, count) => sum + count, 0) : 0;
  return <UI aria-label="Estoque de cartões NFC">
    <div className="top"><div><h3>Seus cartões, de relance.</h3><p>Selecione um cartão para consultar seu vínculo e a comanda.</p></div>
      <button className="prepare" type="button" onClick={onPrepare}>Preparar cartão</button></div>
    <div className="filters" aria-label="Filtrar cartões">
      {FILTERS.map(({ key, label }) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => { setLoading(true); setError(''); setPage(1); setFilter(key); }}>
        {label} {key === 'ALL' ? allCount : (counts?.[key] ?? 0)}
      </button>)}
    </div>
    <p className="note">{allCount} cartões no estoque · Verde: disponível · Laranja: vinculado · Cinza: revogado</p>
    {error && <p role="alert">{error} <button type="button" onClick={() => { setLoading(true); setError(''); void load(); }}>Tentar novamente</button></p>}
    {loading ? <p role="status">Carregando cartões...</p> :
      !data?.cards.length ? <p role="status">Nenhum cartão neste filtro.</p> :
      <div className="cards">
        {data.cards.map((card, index) => <button type="button" className="card" key={card.id} onClick={() => setSelected(card)}
          aria-label={`Consultar ${card.displayCode}: ${statusLabel[card.status]}`}>
          <span><CreditCard aria-hidden="true" /><i className="dot" data-status={card.status} aria-hidden="true" /></span>
          <strong>{String((data.page - 1) * data.pageSize + index + 1).padStart(2, '0')}</strong>
          <small>{card.displayCode}</small>
        </button>)}
      </div>}
    <div className="pagination"><span className="note">Página {page} · {data?.total ?? 0} neste filtro</span>
      <div><button type="button" disabled={loading || page <= 1} onClick={() => { setLoading(true); setPage(v => v - 1); }}>Anterior</button>{' '}
        <button type="button" disabled={loading || !data || page * data.pageSize >= data.total} onClick={() => { setLoading(true); setPage(v => v + 1); }}>Próxima</button></div>
    </div>
    {selected && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Gerenciar cartão ${selected.displayCode}`}>
        <div className="modal-head"><h3>{selected.displayCode}</h3><button type="button" onClick={() => setSelected(null)} aria-label="Fechar detalhes"><X /></button></div>
        <div className="modal-body"><span className="status">{statusLabel[selected.status]}</span>
          <p>{selected.customer ? 'Vinculado à visita deste cliente.' : 'Nenhum cliente vinculado a este cartão.'}</p>
          {selected.customer && <div className="details">
            <div className="detail"><small>Cliente</small><strong>{selected.customer.name}</strong></div>
            <div className="detail"><small>CPF</small><strong>{selected.customer.cpfMasked}</strong></div>
            <div className="detail"><small>Telefone</small><strong>{selected.customer.phoneMasked}</strong></div>
            <div className="detail"><small>Mesa</small><strong>{selected.comanda?.tableNumber ?? 'Não informada'}</strong></div>
          </div>}
          {selected.comanda && <div className="account">
            <strong>Comanda da visita</strong>
            <div className="details"><div className="detail"><small>Comanda</small><strong>{selected.comanda.id.slice(0,8).toUpperCase()}</strong></div>
              <div className="detail"><small>Saldo pendente</small><strong>{money(selected.comanda.outstandingCents)}</strong></div></div>
          </div>}
          {selected.status === 'ACTIVE' && <p className="warning">A liberação exige aproximação do cartão, CPF completo do cliente e quitação confirmada pelo servidor. Use o atendimento NFC para finalizar com segurança.</p>}
          {selected.status === 'REVOKED' && <p className="warning">Cartão revogado: não permite novos atendimentos. A reemissão segue a conferência financeira e a regravação segura.</p>}
          <button type="button" className="close" onClick={() => setSelected(null)}>Fechar</button>
        </div>
      </div>
    </div>}
  </UI>;
}
