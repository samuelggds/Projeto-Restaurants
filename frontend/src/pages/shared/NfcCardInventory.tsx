import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { CreditCard, X } from 'lucide-react';
import { extractNfcToken, scanNfcCard, writeNfcCard } from './nfcWebReader';
import { NfcPrepareOrder } from './NfcPrepareOrder';
import { NfcCustomerComandas } from './NfcCustomerComandas';
import nfcRegistrationService, { type NfcInventoryCard, type NfcInventoryStatus } from '../../Services/nfcRegistrationService';

type Filter = 'ALL' | NfcInventoryStatus;
type Props = { refreshKey?: number; onPrepare: () => void; onRegister: () => void };
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
const visualStatus = (card: NfcInventoryCard) => card.visualStatus;
const visualLabel = (card: NfcInventoryCard) => card.visualStatus === 'BLOCKED' ? 'Bloqueado por pendência' : card.visualStatus === 'OPEN_BALANCE' ? 'Comanda em aberto · saldo a pagar' : statusLabel[card.status];
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
  .card .customer-name { font-size: 12px; color: #334155; font-weight: 750; overflow-wrap: anywhere; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #a5b0b7; }
  .dot[data-status="ACTIVE"] { background: #258352; }
  .dot[data-status="BLOCKED"] { background: #ce3737; }
  .dot[data-status="OPEN_BALANCE"] { background: #2671c9; }
  .dot[data-status="READY"] { background: #278b60; }
  .dot[data-status="REVOKED"] { background: #7d8991; }
  .dot[data-status="PENDING_WRITE"] { background: #e8751b; }
  .status[data-status="ACTIVE"] { color: #1a7448; background: #e8f6ed; }
  .status[data-status="BLOCKED"] { color: #b12d2d; background: #ffeded; }
  .status[data-status="OPEN_BALANCE"] { color: #15599e; background: #eaf3ff; }
  .status[data-status="REVOKED"] { color: #53606b; background: #edf0f2; }
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
  .card-actions { display: flex; flex-wrap: wrap; gap: 9px; }
  .card-actions button { border-radius: 9px; padding: 10px 14px; font-weight: 750; border: 1px solid #dce3e7; background: white; }
  .card-actions .release { background: #188454; color: white; border-color: #188454; }
  .card-actions .revoke { color: #a8352c; border-color: #f0c8c5; }
  .card-actions button:disabled { opacity: .55; cursor: not-allowed; }
  .cpf-field { display: grid; gap: 7px; font-size: 12px; font-weight: 750; }
  .cpf-field input { border: 1px solid #dce3e7; border-radius: 9px; padding: 12px; font: inherit; }
  .action-panel { display: grid; gap: 10px; border-top: 1px solid #e7ecef; padding-top: 15px; }
  .action-panel h4 { margin: 0; font-size: 14px; }
  .action-panel p { font-size: 12px; color: #64717a; }
  .action-panel button { border: 1px solid #dce3e7; border-radius: 10px; padding: 11px 13px; background: #fff; font: inherit; font-weight: 750; cursor: pointer; }
  .action-panel button:disabled { cursor: not-allowed; opacity: .55; }
  .action-panel .go { background: #d65a1a; border-color: #d65a1a; color: white; }
  .action-panel .payment-methods { display: flex; flex-wrap: wrap; gap: 8px; }
  .close { justify-self: stretch; border: 1px solid #dce3e7; border-radius: 9px; background: #fff; padding: 11px; }
  @media(max-width:500px) { .modal-body { padding: 17px; } .details { grid-template-columns: 1fr; } .modal-head { padding: 17px; } }
`;

export function NfcCardInventory({ refreshKey = 0, onPrepare, onRegister }: Props) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof nfcRegistrationService.inventory>> | null>(null);
  const [selected, setSelected] = useState<NfcInventoryCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [cpf, setCpf] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [paymentAvailability, setPaymentAvailability] = useState<Awaited<ReturnType<typeof nfcRegistrationService.paymentAvailability>> | null>(null);
  const [reuseCpf, setReuseCpf] = useState('');
  const [reuseUrl, setReuseUrl] = useState('');
  const load = useCallback(async () => {
    try {
      const inventory = await nfcRegistrationService.inventory(page, filter);
      setData(inventory);
      setError('');
    } catch {
      setError('Não foi possível carregar o estoque NFC. Tente novamente.');
    } finally { setLoading(false); }
  }, [page, filter]);
  useEffect(() => {
    let current = true;
    void nfcRegistrationService.inventory(page, filter).then(inventory => {
      if (!current) return;
      setData(inventory);
      setError('');
    }).catch(() => {
      if (current) setError('Não foi possível carregar o estoque NFC. Tente novamente.');
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [page, filter, refreshKey]);
  useEffect(() => {
    // Refresh from the server; never treat Socket.IO notifications as financial data.
    let active = true;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const next = await nfcRegistrationService.inventory(page, filter);
        if (active) {
          setData(next);
          setSelected(previous => previous ? next.cards.find(card => card.id === previous.id) ?? null : null);
        }
      } catch { /* Keep the previous snapshot until the next successful refresh. */ }
    };
    const onVisible = () => { void refresh(); };
    const interval = window.setInterval(() => { void refresh(); }, 5000);
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [page, filter, refreshKey]);
  useEffect(() => { if (!selected) return; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [selected]);
  useEffect(() => {
    let active = true;
    void nfcRegistrationService.paymentAvailability().then(value => {
      if (active) setPaymentAvailability(value);
    }).catch(() => { if (active) setPaymentAvailability(null); });
    return () => { active = false; };
  }, [refreshKey]);
  const openCard = (card: NfcInventoryCard) => {
    setSelected(card); setCpf(''); setActionError(''); setActionNotice('');
    setShowOrder(false); setShowAccount(false); setReuseCpf(''); setReuseUrl('');
  };
  const releaseCard = async () => {
    if (!selected || selected.status !== 'ACTIVE' || !selected.comanda ||
      selected.comanda.outstandingCents !== 0 ||
      cpf.length !== 11 || actionBusy) return;
    setActionBusy(true); setActionError('');
    try {
      const token = await scanNfcCard();
      const scanned = await nfcRegistrationService.resolve(token);
      if (scanned.id !== selected.id) {
        throw new Error('Cartão físico diferente do cartão selecionado. Nenhuma liberação foi realizada.');
      }
      const result = await nfcRegistrationService.returnPaidCard(token, cpf, selected.comanda.id);
      if (result.cardId !== selected.id) {
        throw new Error('O retorno não corresponde ao cartão selecionado. Atualize o estoque.');
      }
      setActionNotice('Pagamento conferido no servidor: cartão verde, desvinculado e disponível para novo cadastro.');
      setSelected(null); setCpf('');
      await load();
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setActionError(response.response?.data?.error || (cause instanceof Error ? cause.message : 'Não foi possível liberar o cartão.'));
    } finally { setActionBusy(false); }
  };
  const revokeCard = async () => {
    if (!selected || !['ACTIVE','READY','PENDING_WRITE'].includes(selected.status) || actionBusy) return;
    const reason = window.prompt('Motivo da revogação (mínimo de 5 caracteres):');
    if (!reason || reason.trim().length < 5) return;
    if (!window.confirm('Confirma a revogação deste cartão? Esta ação não elimina dívidas ou comandas.')) return;
    setActionBusy(true); setActionError('');
    try {
      await nfcRegistrationService.revoke(selected.id, reason.trim());
      setSelected(null);
      await load();
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setActionError(response.response?.data?.error || 'Não foi possível revogar o cartão.');
    } finally { setActionBusy(false); }
  };
  const deleteUnusedCard = async () => {
    if (!selected || !selected.canDelete || selected.customer || !['READY', 'PENDING_WRITE'].includes(selected.status) || actionBusy) return;
    if (!window.confirm('Excluir definitivamente este cartão sem cliente?')) return;
    setActionBusy(true); setActionError('');
    try {
      await nfcRegistrationService.deleteUnused(selected.id);
      setSelected(null);
      setActionNotice('Cartão excluído do estoque.');
      await load();
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setActionError(response.response?.data?.error || 'Cartão com histórico não pode ser excluído.');
    } finally { setActionBusy(false); }
  };
  const prepareRevoked = async () => {
    if (!selected || selected.status !== 'REVOKED' || !selected.customer || reuseCpf.length !== 11 || actionBusy) return;
    setActionBusy(true); setActionError('');
    try {
      const result = await nfcRegistrationService.prepareRevokedCardReuse(selected.id, reuseCpf);
      setReuseUrl(result.ndefUrl);
      setActionNotice('Regravação autorizada. Grave o novo identificador no cartão físico e confirme a leitura.');
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setActionError(response.response?.data?.error || 'Não foi possível autorizar a recuperação. Confira a quitação e o CPF completo.');
    } finally { setActionBusy(false); }
  };
  const finishRevoked = async () => {
    if (!selected || !reuseUrl || actionBusy) return;
    setActionBusy(true); setActionError('');
    try {
      await writeNfcCard(reuseUrl);
      const token = await scanNfcCard();
      if (token !== extractNfcToken(reuseUrl)) throw new Error('Cartão físico diferente do identificador regravado.');
      await nfcRegistrationService.completeRevokedCardReuse(selected.id, token);
      setSelected(null); setReuseUrl(''); setReuseCpf('');
      setActionNotice('Cartão recuperado e disponível para novo cliente.');
      await load();
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setActionError(response.response?.data?.error || (cause instanceof Error ? cause.message : 'A regravação não foi confirmada.'));
    } finally { setActionBusy(false); }
  };
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
    <p className="note">{allCount} cartões no estoque · Verde: ativo/disponível · Azul: comanda a pagar · Vermelho: bloqueado · Laranja: gravação · Cinza: revogado</p>
    {error && <p role="alert">{error} <button type="button" onClick={() => { setLoading(true); setError(''); void load(); }}>Tentar novamente</button></p>}
    {loading ? <p role="status">Carregando cartões...</p> :
      !data?.cards.length ? <p role="status">Nenhum cartão neste filtro.</p> :
      <div className="cards">
        {data.cards.map((card, index) => <button type="button" className="card" key={card.id} onClick={() => openCard(card)}
          aria-label={`Consultar ${card.displayCode}: ${visualLabel(card)}`}>
          <span><CreditCard aria-hidden="true" /><i className="dot" data-status={visualStatus(card)} aria-hidden="true" /></span>
          <strong>{String((data.page - 1) * data.pageSize + index + 1).padStart(2, '0')}</strong>
          <small>{card.displayCode}</small>
          {card.customer && <span className="customer-name">{card.status === 'REVOKED' ? 'Histórico: ' : ''}{card.customer.name}</span>}
          {card.visualStatus === 'OPEN_BALANCE' && card.comanda && <small>Saldo: {money(card.comanda.outstandingCents)}</small>}
        </button>)}
      </div>}
    <div className="pagination"><span className="note">Página {page} · {data?.total ?? 0} neste filtro</span>
      <div><button type="button" disabled={loading || page <= 1} onClick={() => { setLoading(true); setPage(v => v - 1); }}>Anterior</button>{' '}
        <button type="button" disabled={loading || !data || page * data.pageSize >= data.total} onClick={() => { setLoading(true); setPage(v => v + 1); }}>Próxima</button></div>
    </div>
    {actionNotice && <p role="status" className="state">{actionNotice}</p>}
    {selected && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Gerenciar cartão ${selected.displayCode}`}>
        <div className="modal-head"><h3>{selected.displayCode}</h3><button type="button" onClick={() => setSelected(null)} aria-label="Fechar detalhes"><X /></button></div>
        <div className="modal-body"><span className="status" data-status={visualStatus(selected)}>{visualLabel(selected)}</span>
          <p>{selected.status === 'REVOKED' ? 'Cartão revogado, associado historicamente a este cliente.' : selected.customer ? 'Vinculado à visita deste cliente.' : 'Nenhum cliente vinculado a este cartão.'}</p>
          {selected.customer && <div className="details">
            <div className="detail"><small>Cliente</small><strong>{selected.customer.name}</strong></div>
            <div className="detail"><small>CPF</small><strong>{selected.customer.cpfMasked}</strong></div>
            <div className="detail"><small>Telefone</small><strong>{selected.customer.phoneMasked}</strong></div>
            <div className="detail"><small>Mesa</small><strong>{selected.comanda?.tableNumber ?? 'Não informada'}</strong></div>
          </div>}
          {selected.comanda && <div className="account">
            <strong>Comanda de {selected.customer?.name || 'cliente não identificado'}</strong>
            <div className="details">
              <div className="detail"><small>Comanda</small><strong>{selected.comanda.id.slice(0,8).toUpperCase()}</strong></div>
              <div className="detail"><small>Situação</small><strong>{selected.comanda.status === 'PAID' ? 'Quitada' : selected.comanda.status === 'UNPAID' ? 'Pagamento pendente' : 'Em andamento'}</strong></div>
              <div className="detail"><small>Consumo total</small><strong>{money(selected.comanda.totalCents)}</strong></div>
              <div className="detail"><small>Pagamentos registrados</small><strong>{money(selected.comanda.paidCents)}</strong></div>
              <div className="detail"><small>Saldo pendente</small><strong>{money(selected.comanda.outstandingCents)}</strong></div>
            </div>
          </div>}
          {selected.customer && (selected.status === 'ACTIVE' || selected.status === 'REVOKED') &&
            <section className="action-panel" aria-label="Consultar comanda e opções de pagamento">
              <h4>Comanda de {selected.customer.name}</h4>
              <p>Consulte os pedidos, o saldo e o histórico financeiro diretamente no atendimento. A cobrança PIX/Point NFC depende de integração homologada.</p>
              <button type="button" className="go" onClick={() => setShowAccount(value => !value)}>{showAccount ? 'Ocultar comanda' : 'Ver comanda e pagamento'}</button>
              {showAccount && <NfcCustomerComandas customerId={selected.customer.id} cardId={selected.status === 'ACTIVE' ? selected.id : undefined} customerName={selected.customer.name} />}
            </section>}
          {selected.status === 'ACTIVE' && !selected.comanda && <p className="warning">Nenhuma comanda atual foi identificada. Não é possível liberar o cartão sem conferência financeira no servidor.</p>}
          {selected.status === 'ACTIVE' && selected.comanda?.outstandingCents === 0 &&
            <label className="cpf-field">CPF completo para finalizar a visita
              <input type="password" autoComplete="off" inputMode="numeric" maxLength={11} value={cpf} onChange={e => setCpf(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))} placeholder="11 dígitos do CPF" />
            </label>}
          {selected.status === 'ACTIVE' && !selected.blockedByDebt && selected.comanda?.status === 'OPEN' &&
            <section className="action-panel" aria-label="Ações da comanda ativa">
              <h4>Atendimento e pedidos</h4>
              <p>Cardápio, carrinho e confirmação NFC utilizam os serviços de produtos e pedidos do restaurante. O backend confere cartão, CPF, itens e permissões.</p>
              <button type="button" className="go" onClick={() => setShowOrder(value => !value)}>{showOrder ? 'Ocultar cardápio' : 'Abrir cardápio e adicionar pedido'}</button>
              {showOrder && <NfcPrepareOrder comandaId={selected.comanda.id} />}
              <div className="payment-methods"><button type="button" disabled>{paymentAvailability?.pixConfigured ? 'PIX · Aguardando homologação NFC' : 'PIX · Mercado Pago não configurado'}</button><button type="button" disabled>{paymentAvailability?.pointConfigured ? 'Point · Aguardando homologação NFC' : 'Point · Mercado Pago não configurado'}</button></div>
            </section>}
          {selected.status === 'ACTIVE' && selected.blockedByDebt &&
            <section className="action-panel" aria-label="Pagamento de comanda bloqueada">
              <h4>Cliente bloqueado por pendência financeira</h4>
              <p>Novos pedidos indisponíveis. Regularize a dívida no servidor antes de permitir outra compra.</p>
              <div className="payment-methods"><button type="button" disabled>{paymentAvailability?.pixConfigured ? 'Quitar por PIX · Aguardando homologação NFC' : 'PIX · Mercado Pago não configurado'}</button><button type="button" disabled>{paymentAvailability?.pointConfigured ? 'Quitar na Point · Aguardando homologação NFC' : 'Point · Mercado Pago não configurado'}</button></div>
              <p>Não há confirmação manual de pagamento NFC. As cobranças só serão habilitadas após a integração real com o gateway.</p>
            </section>}
          {selected.status === 'ACTIVE' && !selected.blockedByDebt && !selected.comanda &&
            <p className="warning">Cliente vinculado sem comanda identificada. Abra a ficha do cliente para consultar e regularizar a visita antes de registrar pedidos.</p>}
          {selected.status === 'PENDING_WRITE' &&
            <section className="action-panel"><h4>Cartão aguardando gravação</h4>
              <p>Finalize a programação pelo cadastro e confira a leitura física antes de usá-lo.</p>
              <button type="button" className="go" onClick={() => { setSelected(null); onRegister(); }}>Ir para cadastro NFC</button>
            </section>}
          {selected.status === 'REVOKED' && selected.customer &&
            <section className="action-panel" aria-label="Recuperação de cartão revogado">
              <h4>Recuperar cartão revogado</h4>
              <p>Somente após conferência do CPF completo e quitação de todas as comandas no servidor. O cartão físico precisa receber um novo identificador.</p>
              {!reuseUrl ? <label className="cpf-field">CPF completo do titular anterior
                <input type="password" autoComplete="off" inputMode="numeric" maxLength={11} value={reuseCpf} onChange={e => setReuseCpf(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))} placeholder="11 dígitos do CPF" />
              </label> : <p role="status">Recuperação autorizada. Regrave e confirme a leitura do mesmo cartão.</p>}
              <button type="button" className="go" disabled={actionBusy || (!reuseUrl && reuseCpf.length !== 11)} onClick={() => void (reuseUrl ? finishRevoked() : prepareRevoked())}>{reuseUrl ? 'Gravar e confirmar cartão' : 'Liberar cartão por conferência'}</button>
            </section>}
          {actionError && <p className="warning" role="alert">{actionError}</p>}
          <div className="card-actions">
            {selected.status === 'ACTIVE' && selected.comanda && selected.comanda.outstandingCents === 0 &&
              <button type="button" className="release" disabled={actionBusy || cpf.length !== 11} onClick={() => void releaseCard()}>{actionBusy ? 'Conferindo...' : 'Confirmar CPF e liberar cartão'}</button>}
            {(selected.status === 'ACTIVE' || selected.status === 'READY' || selected.status === 'PENDING_WRITE') &&
              <button type="button" className="revoke" disabled={actionBusy} onClick={() => void revokeCard()}>Revogar cartão</button>}
            {selected.canDelete && !selected.customer && (selected.status === 'READY' || selected.status === 'PENDING_WRITE') &&
              <button type="button" className="revoke" disabled={actionBusy} onClick={() => void deleteUnusedCard()}>Excluir cartão</button>}
          </div>
          {selected.status === 'ACTIVE' && <p className="warning">A liberação exige cartão identificado, CPF completo e quitação confirmada pelo servidor. No iPhone, aproxime o cartão e use a opção Acessar painel do restaurante na página NFC; não é necessária uma segunda leitura Web NFC.</p>}
          {selected.status === 'REVOKED' && <p className="warning">Cartão revogado: não permite novos atendimentos. A reemissão segue a conferência financeira e a regravação segura.</p>}
          <button type="button" className="close" onClick={() => setSelected(null)}>Fechar</button>
        </div>
      </div>
    </div>}
  </UI>;
}
