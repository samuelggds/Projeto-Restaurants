import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ArrowUpRight, ContactRound, CreditCard, RefreshCw, Search, X, ReceiptText } from 'lucide-react';
import nfcRegistrationService, { type LinkedNfcCustomer } from '../../Services/nfcRegistrationService';
import nfcComandaService, { type NfcComanda } from '../../Services/nfcComandaService';

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toLocaleUpperCase('pt-BR');
const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Não registrado';
const currentStatus = (row: LinkedNfcCustomer) =>
  !row.comanda ? 'Aguardando comanda' :
  row.comanda.status === 'PAID' ? 'Pago' :
  row.comanda.status === 'WAITING_ORDER' ? 'Aguardando pedido' :
  row.comanda.status === 'PENDING' ? 'Pagamento pendente' : 'Em atendimento';

const Shell = styled.section`
  display: grid; gap: 19px; color: #26332b; min-width: 0;
  * { box-sizing: border-box; }
  h2,h3,p { margin: 0; }
  .intro { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
  .eyebrow { color: #e7631b; font-size: 11px; font-weight: 850; letter-spacing: .14em; text-transform: uppercase; }
  h2 { font-size: clamp(25px,3vw,31px); letter-spacing: -.04em; }
  .muted { color: #7b857e; font-size: 12px; }
  .count { border: 1px solid #e2e8e2; border-radius: 11px; background: #fff; padding: 10px 13px; display: inline-flex; gap: 8px; align-items: center; font-size: 12px; font-weight: 750; }
  .count svg { color: #ed7025; height: 16px; width: 16px; }
  .table { background: #fff; border: 1px solid #e4e9e4; border-radius: 18px; overflow: hidden; min-width: 0; }
  .table-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 19px 20px; }
  .table-head strong { display: flex; align-items: center; gap: 9px; font-size: 15px; }
  .table-head svg { color: #e7631b; width: 17px; height: 17px; }
  .searchbar { display: flex; gap: 9px; align-items: center; padding: 0 20px 17px; }
  .searchbar input { min-height: 43px; min-width: 0; flex: 1; border: 1px solid #d6ded7; border-radius: 9px; padding: 10px; font: inherit; font-size: 13px; }
  .searchbar button, .pagination button, .row button { border: 1px solid #dee6df; border-radius: 9px; background: #fff; color: #26332b; padding: 10px 12px; font: inherit; font-size: 12px; font-weight: 750; min-height: 39px; cursor: pointer; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  button:focus-visible,input:focus-visible { outline: 3px solid #f1a66b; outline-offset: 2px; }
  .columns,.row { display: grid; grid-template-columns: minmax(145px,2fr) minmax(90px,1fr) minmax(75px,.75fr) minmax(115px,1fr) minmax(95px,.85fr) minmax(105px,1fr); align-items: center; gap: 12px; padding: 15px 20px; }
  .columns { color: #818983; font-size: 11px; background: #f7f8f5; border-block: 1px solid #e8ece7; }
  .row { border-bottom: 1px solid #e8ece7; font-size: 12px; }
  .row:last-child { border-bottom: 0; }
  .row strong { font-size: 13px; color: #172723; }
  .row small { display: block; margin-top: 4px; color: #909990; overflow-wrap: anywhere; }
  .row .cardcode { color: #e7631b; font-weight: 750; }
  .row .amount { text-align: right; font-weight: 800; }
  .row .actions { text-align: right; }
  .row .customer-cell, .row .card-cell, .row .table-cell, .row .comanda-cell, .row .balance-cell { min-width: 0; }
  .row .customer-copy { min-width: 0; overflow-wrap: anywhere; }
  .row .list-avatar, .row .mobile-label { display: none; }
  .row .cardcode { display: inline-flex; align-items: center; gap: 6px; }
  .row .actions button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; white-space: nowrap; }
  .chip { display: inline-block; margin-top: 5px; padding: 5px 8px; border-radius: 5px; color: #327957; background: #e9f5ed; font-size: 11px; font-weight: 700; }
  .chip.empty { color: #737f78; background: #f3f5f2; }
  .chip.pending { color: #a15d16; background: #fff0dc; }
  .pagination { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 14px 20px; font-size: 12px; color: #77847a; }
  .pagination .controls { display: flex; gap: 8px; align-items: center; }
  .note { padding: 25px 20px; font-size: 13px; color: #65746a; }
  .error { color: #ac3630; }
  @media(max-width:850px) {
    .columns { display: none; }
    .table-head { align-items: start; }
    .row { grid-template-columns: repeat(2,minmax(0,1fr)); align-items: start; gap: 17px 12px; padding: 19px 20px; }
    .row .mobile-label { display: block; color: #9b9f9b; font-size: 11px; margin-bottom: 5px; }
    .row .customer-cell { grid-column: 1 / -1; display: flex; gap: 12px; align-items: center; }
    .row .list-avatar { width: 39px; height: 39px; flex: 0 0 39px; display: grid; place-items: center;
      background: #fff0e5; border-radius: 12px; color: #cc5b1c; font-weight: 850; font-size: 12px; }
    .row .customer-copy strong { font-size: 13px; }
    .row .comanda-cell { grid-column: 1 / -1; }
    .row .amount, .row .actions { text-align: left; }
    .row .balance-cell { grid-column: 1; align-self: end; }
    .row .amount { display: block; font-size: 18px; letter-spacing: -.025em; }
    .row .actions { grid-column: 2; align-self: end; text-align: right; }
    .row .actions button { min-height: 40px; }
    .row .chip { margin-top: 7px; }
  }
  @media(max-width:480px) {
    .row { padding: 19px 15px; }
    .searchbar { padding-inline: 15px; display: grid; grid-template-columns: 1fr 1fr; }
    .searchbar input { grid-column: 1 / -1; }
    .searchbar button { width: 100%; }
    .table-head { padding: 17px 15px; }
    .pagination { padding: 15px; }
    .row .actions button { width: 100%; font-size: 11px; padding-inline: 8px; }
    .row .cardcode { font-size: 11px; }
  }
`;

const ModalFrame = styled.div`
  position: fixed; inset: 0; z-index: 10010; background: #15241c99; display: grid; place-items: center; padding: 15px; color: #29372e;
  .dialog { width: min(650px,100%); max-height: calc(100dvh - 30px); overflow-y: auto; background: #fff; border-radius: 19px; box-shadow: 0 25px 65px #0004; }
  .top { padding: 17px 24px; border-bottom: 1px solid #e8eee8; background: #f8f9f6; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .top span { display: inline-flex; gap: 8px; align-items: center; font-size: 13px; font-weight: 800; }
  .top svg { height: 18px; width: 18px; color: #e7631b; }
  button { cursor: pointer; font: inherit; }
  .close { border: 1px solid #e1e6e1; background: #fff; border-radius: 9px; width: 36px; height: 36px; display: grid; place-items: center; }
  .close svg { color: #69766c; }
  .body { padding: 23px 24px; display: grid; gap: 23px; }
  .identity { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .avatar { background: #fff0e5; color: #c55a1b; font-weight: 850; display: grid; place-items: center; width: 48px; height: 48px; border-radius: 12px; }
  .identity-main { flex: 1; min-width: 135px; }
  .identity h3 { font-size: 21px; margin: 0 0 5px; }
  .identity p,small { font-size: 12px; color: #849087; margin: 0; }
  .chip { border-radius: 6px; padding: 7px; background: #e9f5ed; color: #327957; font-size: 11px; font-weight: 800; }
  .chip.pending { background: #fff0dc; color: #955a14; }
  .meta { border-block: 1px solid #e8eee8; padding-block: 19px; display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 18px; }
  .field { min-width: 0; display: grid; gap: 5px; overflow-wrap: anywhere; font-size: 12px; }
  .field span { color: #89948b; }
  .items { display: grid; gap: 9px; }
  .items-head { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
  .items-head small { padding: 6px; background: #f5f7f4; border-radius: 6px; }
  .item { border: 1px solid #e4eae4; border-radius: 11px; overflow: hidden; }
  .item-title { background: #f7f8f5; padding: 11px; color: #556057; font-size: 12px; font-weight: 750; }
  .item-line { display: flex; justify-content: space-between; gap: 10px; padding: 9px 11px; font-size: 12px; }
  .totals { background: #fff0e5; border-radius: 12px; padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .totals div { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
  .totals strong { font-weight: 850; }
  .totals .balance { grid-column: 1/-1; border-top: 1px solid #edcfb9; padding-top: 11px; align-items: center; }
  .totals .balance strong { font-size: 24px; }
  .footer { padding: 15px 24px; border-top: 1px solid #e8eee8; display: flex; justify-content: flex-end; }
  .footer button { background: #e7631b; color: white; border: 0; border-radius: 9px; font-weight: 750; padding: 12px 15px; }
  button:focus-visible { outline: 3px solid #f1a66b; outline-offset: 2px; }
  @media(max-width:550px) { .body { padding: 17px; } .meta { grid-template-columns: repeat(2,minmax(0,1fr)); } .totals { grid-template-columns: 1fr; } .totals .balance { grid-column: auto; } .top,.footer { padding-inline: 17px; } .footer button { width: 100%; } }
`;

function LinkedCustomerModal({ customer, onClose }: { customer: LinkedNfcCustomer; onClose: () => void }) {
  const [comanda, setComanda] = useState<NfcComanda | null>(null);
  const [loading, setLoading] = useState(Boolean(customer.comanda));
  const [error, setError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const closeByEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeByEscape);
    return () => document.removeEventListener('keydown', closeByEscape);
  }, [onClose]);
  useEffect(() => {
    let active = true;
    const id = customer.comanda?.id;
    if (!id) return;
    void nfcComandaService.customerComandas(customer.customerId).then(data => {
      if (active) { const found = data.comandas.find(item => item.id === id && item.cardId === customer.card.id); setComanda(found ?? null); if (!found) setError('A comanda foi alterada ou não está disponível para consulta. Atualize a lista de clientes.'); setLoading(false); }
    }).catch(() => { if (active) { setError('Não foi possível consultar a comanda no servidor.'); setLoading(false); } });
    return () => { active = false; };
  }, [customer]);
  const status = currentStatus(customer);
  return <ModalFrame role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="nfc-linked-modal-title">
      <header className="top"><span><ReceiptText aria-hidden="true"/> Detalhes da comanda</span><button type="button" className="close" ref={closeRef} aria-label="Fechar detalhes da comanda" onClick={onClose}><X aria-hidden="true"/></button></header>
      <div className="body">
        <div className="identity">
          <div className="avatar" aria-hidden="true">{initials(customer.name)}</div>
          <div className="identity-main"><h3 id="nfc-linked-modal-title">{customer.name}</h3><p>{customer.comanda ? 'Comanda '+customer.comanda.id.slice(0,8).toUpperCase()+' · visita atual' : 'Cartão vinculado · sem comanda aberta'}</p></div>
          <span className={'chip '+(customer.comanda?.status === 'PENDING' ? 'pending' : '')}>{status}</span>
        </div>
        <div className="meta">
          <div className="field"><span>CPF</span><strong>{customer.cpfMasked}</strong></div>
          <div className="field"><span>Telefone</span><strong>{customer.phoneMasked}</strong></div>
          <div className="field"><span>Cartão vinculado</span><strong>{customer.card.displayCode}</strong></div>
          <div className="field"><span>Mesa</span><strong>{customer.comanda?.tableNumber ? 'Mesa '+String(customer.comanda.tableNumber).padStart(2,'0') : 'Sem mesa'}</strong></div>
          <div className="field"><span>Abertura da visita</span><strong>{dateTime(customer.comanda?.openedAt)}</strong></div>
          <div className="field"><span>Identificação da comanda</span><strong>{customer.comanda ? '#'+customer.comanda.id.slice(0,8).toUpperCase() : 'Não aberta'}</strong></div>
        </div>
        <section className="items">
          <div className="items-head"><strong>Consumo desta visita</strong><small>{comanda?.items.length ?? 0} itens</small></div>
          {loading && <p role="status">Carregando detalhes...</p>}
          {error && <p role="alert" style={{color:'#b42c28'}}>{error}</p>}
          {!loading && !error && comanda?.items.map(item => <div className="item" key={item.id}>
            <div className="item-title">{item.kind === 'COVER' ? 'Couvert / entrada' : 'Item do pedido'} · {dateTime(item.createdAt)}</div>
            <div className="item-line"><span>{item.quantity} × {item.description}</span><strong>{money(item.totalCents)}</strong></div>
          </div>)}
          {!loading && !error && !comanda?.items.length && <p style={{fontSize:13,color:'#728077'}}>Nenhum consumo registrado nesta visita.</p>}
        </section>
        <div className="totals">
          <div><span>Consumo total</span><strong>{loading || error || !comanda ? '—' : money(comanda.totalCents)}</strong></div>
          <div><span>Pagamentos confirmados</span><strong>{loading || error || !comanda ? '—' : money(comanda.paidCents)}</strong></div>
          <div className="balance"><span>Saldo em aberto</span><strong>{loading || error || !comanda ? '—' : money(comanda.outstandingCents)}</strong></div>
        </div>
        {!loading && !error && comanda && <section className="items">
          <div className="items-head"><strong>Pagamentos registrados</strong></div>
          {comanda.payments.map(payment => <div key={payment.id} className="item-line">
            <span>{payment.method === 'PIX' ? 'Pix' : payment.method === 'CARTAO' ? 'Cartão' : 'Legado'} · {payment.status === 'CONFIRMED' ? 'Confirmado' : payment.status === 'REVERSED' ? 'Estornado' : 'Pendente'}</span>
            <strong>{money(payment.amountCents)}</strong>
          </div>)}
          {!comanda.payments.length && <p style={{fontSize:13,color:'#728077'}}>Nenhum pagamento registrado.</p>}
        </section>}
        <small>Os dados e o status de pagamento são consultados no backend. A visualização não confirma pagamentos nem libera o cartão.</small>
      </div>
      <footer className="footer"><button type="button" onClick={onClose}>Voltar aos clientes</button></footer>
    </div>
  </ModalFrame>;
}

export function NfcLinkedCustomers() {
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<LinkedNfcCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<LinkedNfcCustomer | null>(null);
  useEffect(() => {
    let active = true;
    void nfcRegistrationService.linkedCustomers(applied, page).then(result => {
      if (!active) return;
      setRecords(result.customers);
      setTotal(result.total);
      setPageSize(result.pageSize);
      setError('');
    }).catch(() => {
      if (!active) return;
      setError('Não foi possível carregar os clientes vinculados.');
      setRecords([]);
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, [applied, page, revision]);
  return <Shell aria-label="Clientes com cartão NFC vinculado">
    <div className="intro">
      <div><p className="eyebrow">Clientes e comandas</p><h2>Clientes NFC.</h2><p className="muted">Todos os clientes com cartão ativo vinculado, em um só lugar.</p></div>
      <span className="count"><ContactRound aria-hidden="true"/> {total} clientes vinculados</span>
    </div>
    <div className="table">
      <div className="table-head"><strong><ContactRound aria-hidden="true"/> Cartões vinculados</strong><span className="muted">Selecione um cliente para ver a comanda.</span></div>
      <form className="searchbar" onSubmit={e => { e.preventDefault(); setBusy(true); setPage(1); setApplied(query.trim()); setRevision(i => i + 1); }}>
        <input type="search" value={query} onChange={e=>setQuery(e.target.value)} maxLength={80} aria-label="Buscar por nome, telefone ou CPF" placeholder="Pesquisar por nome, telefone ou CPF completo" />
        <button type="submit"><Search size={15} aria-hidden="true"/> Buscar</button>
        <button type="button" onClick={() => { setBusy(true); setQuery(''); setApplied(''); setPage(1); setRevision(i => i + 1); }}><RefreshCw size={15} aria-hidden="true"/> Limpar</button>
      </form>
      <div className="columns"><span>Cliente</span><span>Cartão NFC</span><span>Mesa</span><span>Comanda</span><span style={{textAlign:'right'}}>Em aberto</span><span/></div>
      {busy && <p className="note" role="status">Consultando clientes no servidor...</p>}
      {error && <p className="note error" role="alert">{error}</p>}
      {!busy && !error && !records.length && <p className="note">Nenhum cliente com cartão ativo corresponde à busca.</p>}
      {!busy && !error && records.map(row => <div className="row" key={row.card.id}>
        <div className="customer-cell">
          <span className="list-avatar" aria-hidden="true">{initials(row.name)}</span>
          <div className="customer-copy"><strong>{row.name}</strong><small>{row.phoneMasked}</small></div>
        </div>
        <div className="card-cell"><span className="mobile-label">Cartão NFC</span><span className="cardcode"><CreditCard size={14} aria-hidden="true"/> {row.card.displayCode}</span></div>
        <div className="table-cell"><span className="mobile-label">Mesa</span>{row.comanda?.tableNumber ? 'Mesa '+String(row.comanda.tableNumber).padStart(2,'0') : 'Sem mesa'}</div>
        <div className="comanda-cell"><span className="mobile-label">Comanda</span><strong>{row.comanda ? '#'+row.comanda.id.slice(0,8).toUpperCase() : 'Sem comanda'}</strong><div><span className={'chip '+(!row.comanda || row.comanda.status==='WAITING_ORDER'?'empty':row.comanda.status==='PENDING'?'pending':'')}>{currentStatus(row)}</span></div></div>
        <div className="balance-cell"><span className="mobile-label">Em aberto</span><strong className="amount">{row.comanda ? money(row.comanda.outstandingCents) : '—'}</strong></div>
        <div className="actions"><button type="button" onClick={() => setSelected(row)}>Ver comanda <ArrowUpRight size={13} aria-hidden="true"/></button></div>
      </div>)}
      <div className="pagination"><span>{total} clientes com cartão vinculado · Consumo individual por visita</span><div className="controls"><button type="button" disabled={busy || page===1} onClick={()=>{setBusy(true);setPage(p=>p-1);}}>Anterior</button><span>Página {page}</span><button type="button" disabled={busy || page*pageSize>=total} onClick={()=>{setBusy(true);setPage(p=>p+1);}}>Próxima</button></div></div>
    </div>
    {selected && <LinkedCustomerModal key={selected.customerId + ':' + selected.card.id} customer={selected} onClose={()=>setSelected(null)}/>}
  </Shell>;
}
