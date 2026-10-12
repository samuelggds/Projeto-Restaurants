import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, Check, Clock3, History, Phone, Plus, RefreshCw, Users, X } from 'lucide-react';
import styled from 'styled-components';
import reservationsService, {
  type ReservationSettings, type TableReservation,
} from '../../Services/tableReservationsService';
import tablesService from '../../Services/tablesService';
import { acquireSocket } from '../../Services/socketService';
import { getAccessToken } from '../../modules/auth/session/authSession';

const Shell = styled.section`
  display: grid;
  gap: 18px;
  color: var(--text, #252525);
  .toolbar, .actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .top { display:flex; justify-content:space-between; gap:16px; align-items:center; flex-wrap:wrap; }
  .panel { border:1px solid var(--border, #e8e8e8); border-radius:18px; background:var(--surface, #fff); padding:20px; }
  h2 { margin:0 0 6px; font-size:20px; }
  p { color:var(--text-secondary, #68707a); margin:0; font-size:14px; }
  button { border:1px solid var(--border, #ddd); border-radius:10px; background:#fff; color:inherit; padding:10px 14px; cursor:pointer; font:inherit; font-weight:600; }
  button.primary { background:var(--primary, #c65d32); color:#fff; border-color:transparent; }
  button:disabled { cursor:not-allowed; opacity:.55; }
  input, textarea, select { box-sizing:border-box; width:100%; min-height:42px; border:1px solid #dedede; border-radius:10px; background:var(--surface, #fff); color:inherit; padding:9px 12px; font:inherit; }
  .fields { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:12px; }
  label { display:grid; gap:6px; font-size:13px; font-weight:650; }
  .wide { grid-column:1/-1; }
  .list {display:grid; gap:10px; margin-top:16px;}
  .item { border:1px solid var(--border,#e8e8e8); border-radius:14px; padding:15px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
  .details { display:grid; gap:5px; }
  .details strong {font-size:15px;}
  .details small {color:#64748b;}
  .status { border-radius:999px; padding:4px 9px; background:#f3f4f6; font-size:12px; font-weight:700; }
  .status.CONFIRMED { background:#dbeafe; color:#1d4ed8; }
  .status.SEATED { background:#dcfce7; color:#166534; }
  .status.COMPLETED { background:#dcfce7; color:#166534; }
  .status.CANCELED, .status.NO_SHOW { background:#f1f5f9; color:#475569; }
  .history-filters { display:flex; gap:8px; flex-wrap:wrap; margin-top:16px; }
  .history-filters button[aria-pressed="true"] { background:#f0f6ff; color:#1d4ed8; border-color:#93b4f7; }
  .history-count { margin-top:12px; font-size:13px; color:#64748b; }
  .history-controls { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:16px; }
  .error { color:#b91c1c; font-size:13px; }
  .success { color:#166534; font-size:13px; }
  @media(max-width:600px){.fields{grid-template-columns:1fr;} .panel{padding:15px;} }
`;
const labels: Record<TableReservation['status'], string> = {
  CONFIRMED: 'Confirmada', SEATED: 'Cliente chegou', CANCELED: 'Cancelada',
  NO_SHOW: 'Não compareceu', COMPLETED: 'Concluída',
};
type Table = { id: number; number: number; active: boolean; tableSessions?: Array<{ status: string }> };
type HistoryFilter = 'ALL' | 'SEATED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';
const historyFilters: Array<{value:HistoryFilter;label:string}> = [
  {value:'ALL',label:'Todas'}, {value:'SEATED',label:'Em andamento'},
  {value:'COMPLETED',label:'Concluídas'}, {value:'CANCELED',label:'Canceladas'},
  {value:'NO_SHOW',label:'Não compareceu'},
];
const HISTORY_PAGE_SIZE = 10;
function isoLocal(d: Date) {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime()-offset).toISOString().slice(0,16);
}
function message(error: unknown) {
  const e=error as {response?:{data?:{error?:string}},message?:string};
  return e.response?.data?.error || e.message || 'Não foi possível atualizar reservas.';
}
export function TableReservationsPanel({ admin = false }: { admin?: boolean }) {
  const [settings,setSettings]=useState<ReservationSettings|null>(null);
  const [rows,setRows]=useState<TableReservation[]>([]);
  const [historyFilter,setHistoryFilter]=useState<HistoryFilter>('ALL');
  const [historyRows,setHistoryRows]=useState<TableReservation[]>([]);
  const [historyTotal,setHistoryTotal]=useState(0);
  const [historyLimit,setHistoryLimit]=useState(HISTORY_PAGE_SIZE);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [historyError,setHistoryError]=useState('');
  const [historyRevision,setHistoryRevision]=useState(0);
  const [tables,setTables]=useState<Table[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [formOpen,setFormOpen]=useState(false);
  const [tableId,setTableId]=useState('');
  const [guestName,setGuestName]=useState('');
  const [guestPhone,setGuestPhone]=useState('');
  const [guestCount,setGuestCount]=useState('2');
  const [start,setStart]=useState(()=>isoLocal(new Date(Date.now()+60*60_000)));
  const [end,setEnd]=useState(()=>isoLocal(new Date(Date.now()+150*60_000)));
  const [note,setNote]=useState('');
  const invalidateHistory=useCallback(()=>{
    setHistoryRows([]);
    setHistoryLimit(HISTORY_PAGE_SIZE);
    setHistoryRevision(current=>current+1);
  },[]);
  const refresh=useCallback(async()=>{
    const [config,allTables]=await Promise.all([reservationsService.settings(),tablesService.listTables()]);
    setSettings(config);
    setTables((Array.isArray(allTables)?allTables:[]) as Table[]);
    setRows(config.enabled ? (await reservationsService.list()).filter(row => row.status === 'CONFIRMED') : []);
    invalidateHistory();
  },[invalidateHistory]);
  useEffect(()=>{
    let cancelled=false;
    void Promise.resolve().then(() => cancelled ? undefined : refresh())
      .catch(e=>{if(!cancelled)setError(message(e));})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[refresh]);
  useEffect(()=>{
    let cancelled=false;
    if(!settings?.enabled) { setHistoryRows([]); setHistoryTotal(0); return; }
    setHistoryLoading(true);
    setHistoryError('');
    void reservationsService.history(historyFilter,0)
      .then(async first=>{
        const initial=first.rows;
        // Cursorless offset pages are requested sequentially for a stable bounded UI.
        // Server totals are authoritative; a refresh invalidates this snapshot.
        let accumulated=[...initial];
        while(accumulated.length<historyLimit && accumulated.length<first.total) {
          const next=await reservationsService.history(historyFilter,accumulated.length);
          if(!next.rows.length) break;
          accumulated=[...accumulated,...next.rows];
        }
        if(!cancelled){setHistoryRows(accumulated);setHistoryTotal(first.total);}
      })
      .catch(err=>{if(!cancelled)setHistoryError(message(err));})
      .finally(()=>{if(!cancelled)setHistoryLoading(false);});
    return()=>{cancelled=true;};
  },[historyFilter,historyLimit,historyRevision,settings?.enabled]);
  useEffect(()=>{
    const token=getAccessToken();
    if(!token)return;
    const {socket,release}=acquireSocket(token,'table-reservation-history');
    const onChanged=()=>void refresh().catch(err=>setError(message(err)));
    socket.on('table:reservations-changed',onChanged);
    socket.on('table:session-closed',onChanged);
    return()=>{socket.off('table:reservations-changed',onChanged);socket.off('table:session-closed',onChanged);release();};
  },[refresh]);
  const changeHistoryFilter=(next:HistoryFilter)=>{
    setHistoryFilter(next);
    setHistoryLimit(HISTORY_PAGE_SIZE);
    setHistoryRows([]);
  };
  const run=async (operation:()=>Promise<unknown>, notice:string)=>{
    if(busy)return;
    setBusy(true);setError('');setSuccess('');
    try{await operation();await refresh();setSuccess(notice);setFormOpen(false);}
    catch(e){setError(message(e));}
    finally{setBusy(false);}
  };
  const submit=(e:FormEvent)=>{
    e.preventDefault();
    void run(()=>reservationsService.create({
      tableId:Number(tableId),guestName:guestName.trim(),guestPhone:guestPhone.replace(/\D/gu,''),
      guestCount:Number(guestCount),startsAt:new Date(start).toISOString(),
      endsAt:new Date(end).toISOString(),note:note.trim(),
    }),'Reserva confirmada.');
  };
  return <Shell aria-label="Gestão de reservas de mesas">
    <div className="panel">
      <div className="top">
        <div><h2><CalendarDays size={20} aria-hidden="true"/> Reservas de mesas</h2><p>Cadastre reservas recebidas por telefone ou WhatsApp. Clientes não criam reservas diretamente.</p></div>
        <div className="toolbar">
          <button type="button" disabled={busy} onClick={()=>void run(async()=>{},'Agenda atualizada.')}><RefreshCw size={16} aria-hidden="true"/> Atualizar</button>
          {settings?.enabled && <button className="primary" type="button" onClick={()=>setFormOpen(v=>!v)}><Plus size={16} aria-hidden="true"/> Nova reserva</button>}
        </div>
      </div>
      {admin && settings && <div className="toolbar" style={{marginTop:16}}>
        <label><input type="checkbox" style={{width:18,minHeight:18}} checked={settings.enabled} onChange={e=>setSettings({...settings,enabled:e.target.checked})}/> Ativar reservas</label>
        <label>Tolerância (minutos)
          <input type="number" min="0" max="60" style={{width:85}} value={settings.toleranceMinutes} onChange={e=>setSettings({...settings,toleranceMinutes:Number(e.target.value)})}/>
        </label>
        <button disabled={busy} type="button" onClick={()=>void run(()=>reservationsService.updateSettings(settings),'Configurações salvas.')}>Salvar configurações</button>
      </div>}
      {!settings?.enabled && !loading && <p style={{marginTop:16}}>As reservas estão desativadas. O administrador pode habilitá-las aqui.</p>}
      {error && <p className="error" role="alert" style={{marginTop:12}}>{error}</p>}
      {success && <p className="success" role="status" style={{marginTop:12}}>{success}</p>}
      {formOpen && settings?.enabled && <form className="fields panel" onSubmit={submit} style={{marginTop:16}}>
        <label>Cliente<input required minLength={2} maxLength={100} value={guestName} onChange={e=>setGuestName(e.target.value)}/></label>
        <label>Telefone<input required inputMode="tel" value={guestPhone} onChange={e=>setGuestPhone(e.target.value)}/></label>
        <label>Quantidade de pessoas<input required type="number" min="1" max="100" value={guestCount} onChange={e=>setGuestCount(e.target.value)}/></label>
        <label>Mesa<select required value={tableId} onChange={e=>setTableId(e.target.value)}>
          <option value="">Selecione uma mesa</option>
          {tables.filter(t=>t.active).map(t=><option key={t.id} value={t.id}>Mesa {t.number}</option>)}
        </select></label>
        <label>Data e horário<input required type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label>
        <label>Fim previsto<input required type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></label>
        <label className="wide">Observação (opcional)<textarea rows={2} maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></label>
        <div className="actions wide"><button className="primary" disabled={busy} type="submit">Confirmar reserva</button><button type="button" onClick={()=>setFormOpen(false)}>Cancelar</button></div>
      </form>}
    </div>
    {settings?.enabled && <div className="panel">
      <h2>Agenda</h2>
      <p>Somente funcionários autorizados podem alterar reservas.</p>
      <div className="list">{rows.map(row=><div className="item" key={row.publicId}>
        <div className="details">
          <strong>{row.guestName} <span className={`status ${row.status}`}>{labels[row.status]}</span></strong>
          <small><Clock3 size={13} aria-hidden="true"/> {new Date(row.startsAt).toLocaleString('pt-BR')} · Mesa {row.tableNumber ?? row.tableId}</small>
          <small><Users size={13} aria-hidden="true"/> {row.guestCount} pessoa(s) · <Phone size={13} aria-hidden="true"/> {row.guestPhone}</small>
          {row.note && <small>{row.note}</small>}
        </div>
        <div className="actions">{row.status==='CONFIRMED' && <>
          <button disabled={busy} className="primary" type="button" onClick={()=>void run(()=>reservationsService.checkIn(row.publicId),'Check-in realizado. Sessão da mesa aberta.')}><Check size={15}/> Check-in</button>
          <button disabled={busy} type="button" onClick={()=>void run(()=>reservationsService.status(row.publicId,'NO_SHOW'),'Ausência registrada.')}>Não compareceu</button>
          <button disabled={busy} type="button" onClick={()=>void run(()=>reservationsService.status(row.publicId,'CANCELED'),'Reserva cancelada.')}><X size={15}/> Cancelar</button>
        </>}
        {row.status==='SEATED' && <span className="status SEATED">Sessão em atendimento</span>}
        </div>
      </div>)}
      {!loading && !rows.length && <p>Nenhuma reserva encontrada no período.</p>}
      </div>
    </div>}
    {settings?.enabled && <div className="panel" aria-label="Histórico de reservas">
      <h2><History size={20} aria-hidden="true"/> Histórico de reservas</h2>
      <p>Reservas em atendimento, concluídas, canceladas e ausências. Os registros são preservados para consulta.</p>
      <div className="history-filters" role="group" aria-label="Filtrar histórico de reservas">
        {historyFilters.map(filter=><button type="button" key={filter.value}
          aria-pressed={historyFilter===filter.value} onClick={()=>changeHistoryFilter(filter.value)}>
          {filter.label}
        </button>)}
      </div>
      {historyError && <p className="error" role="alert">{historyError}</p>}
      <div className="list">
        {historyRows.map(row=><div className="item" key={row.publicId}>
          <div className="details">
            <strong>{row.guestName} <span className={`status ${row.status}`}>{labels[row.status]}</span></strong>
            <small><Clock3 size={13} aria-hidden="true"/> {new Date(row.startsAt).toLocaleString('pt-BR')} · Mesa {row.tableNumber ?? row.tableId}</small>
            <small><Users size={13} aria-hidden="true"/> {row.guestCount} pessoa(s) · <Phone size={13} aria-hidden="true"/> {row.guestPhone}</small>
            {row.note && <small>{row.note}</small>}
          </div>
        </div>)}
        {!historyLoading&&!historyRows.length&&!historyError&&<p>Nenhuma reserva neste histórico.</p>}
      </div>
      <p className="history-count" role="status">{historyLoading?'Carregando histórico...':`Exibindo ${historyRows.length} de ${historyTotal} reservas`}</p>
      <div className="history-controls">
        {historyRows.length<historyTotal && <button type="button" disabled={historyLoading}
          onClick={()=>setHistoryLimit(count=>count+HISTORY_PAGE_SIZE)}>Mostrar mais 10</button>}
        {historyLimit>HISTORY_PAGE_SIZE && <button type="button" disabled={historyLoading}
          onClick={()=>setHistoryLimit(HISTORY_PAGE_SIZE)}>Voltar para 10</button>}
      </div>
    </div>}
  </Shell>;
}
