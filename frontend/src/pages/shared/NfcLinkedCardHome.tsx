import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, ClipboardList, CreditCard, LockKeyhole, RotateCcw, ShoppingBag, ShieldCheck } from 'lucide-react';
import api from '../../Services/api';

type CardDetails = { card: { displayCode: string; status: string };
  customer: { name: string } | null;
  comanda: { id: string; status: string; tableNumber: number | null;
    totalCents: number; paidCents: number; outstandingCents: number } | null };

export function NfcLinkedCardHome({ token, code, customerName, comandaId, canOpenComanda,
  hasUnsettledComanda, needsCardReturn, busy, error, onOpenComanda, onOrder, onConsult,
  onPendingOrder, onReturn }: {
  token: string; code: string; customerName?: string | null; comandaId: string | null;
  canOpenComanda?: boolean; hasUnsettledComanda?: boolean; needsCardReturn?: boolean;
  busy: boolean; error?: string; onOpenComanda: () => void; onOrder: () => void;
  onConsult: () => void; onPendingOrder: () => void;
  onReturn: (cpf: string) => Promise<void>;
}) {
  const [details, setDetails] = useState<CardDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [cpf, setCpf] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    let active = true;
    void api.post<CardDetails>('/nfc-registration/cards/staff-comanda', { token },
      { skipBaseUrlFallback:true }).then(response => {
      if (active) { setDetails(response.data); setLoadError(''); }
    }).catch(() => { if (active) setLoadError('Não conseguimos carregar a comanda agora. Tente novamente.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, comandaId]);
  const current = details?.comanda;
  const name = details?.customer?.name || customerName || 'Cliente cadastrado';
  const initials = name.split(/\s+/u).filter(Boolean).slice(0,2).map(part=>part.charAt(0)).join('').toUpperCase();
  const release = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || busy || cpf.length !== 11 || !confirmed) return;
    setSubmitting(true);
    try { await onReturn(cpf); setCpf(''); setConfirmed(false); }
    finally { setSubmitting(false); }
  };
  return <section aria-label="Cliente vinculado ao cartão">
    <div className="gx-panel">
      <div className="gx-person-top">
        <span className="gx-avatar" aria-hidden="true">{initials || 'NFC'}</span>
        <div><span className="gx-person-label">Cliente vinculado</span><h2 className="gx-person-name">{name}</h2></div>
      </div>
      <div className="gx-status-row"><span className="gx-pill"><CheckCircle2 aria-hidden="true" /> Cartão ativo</span><span>Identificação confirmada pelo restaurante</span></div>
      <dl className="gx-definition">
        <div><dt>Cartão NFC</dt><dd>{code}</dd></div>
        <div><dt>Comanda</dt><dd>{current ? current.id.slice(0,8).toUpperCase() : comandaId ? comandaId.slice(0,8).toUpperCase() : 'Não aberta'}</dd></div>
        <div><dt>Mesa</dt><dd>{current?.tableNumber ? String(current.tableNumber).padStart(2,'0') : 'Não informada'}</dd></div>
        <div><dt>Situação</dt><dd>{current ? current.status === 'PAID' ? 'Quitada' : current.status === 'UNPAID' ? 'Pagamento pendente' : 'Em atendimento' : 'Aguardando abertura'}</dd></div>
      </dl>
      {loading && <p className="gx-line-note" role="status">Carregando informações da comanda...</p>}
      {loadError && <p role="alert" className="gx-error">{loadError}</p>}
    </div>
    <h3 className="gx-action-title">ATENDIMENTO</h3>
    <div className="gx-actions">
      <button className="gx-button gx-primary gx-action-row" type="button" onClick={onOrder} disabled={!comandaId || busy || Boolean(hasUnsettledComanda && !comandaId)}>
        <ShoppingBag aria-hidden="true"/><span>Fazer pedido<small>Selecionar produtos e enviar à cozinha</small></span><ArrowRight aria-hidden="true"/>
      </button>
      <button className="gx-button gx-action-row" type="button" onClick={onConsult} disabled={busy}>
        <ClipboardList aria-hidden="true"/><span>Consultar comanda<small>Pedidos, consumo e pagamentos</small></span><ArrowRight aria-hidden="true"/>
      </button>
      {canOpenComanda && <button className="gx-button gx-action-row" type="button" onClick={onOpenComanda} disabled={busy}>
        <CreditCard aria-hidden="true"/><span>Abrir comanda deste cartão<small>Pronto para iniciar o atendimento</small></span><ArrowRight aria-hidden="true"/>
      </button>}
      <button type="button" className="gx-button gx-action-row" onClick={onPendingOrder} disabled={busy}>
        <RotateCcw aria-hidden="true"/><span>Consultar confirmação pendente<small>Continuar a confirmação do pedido</small></span><ArrowRight aria-hidden="true"/>
      </button>
    </div>
    {needsCardReturn || hasUnsettledComanda ? <p className="gx-alert" role="status">Existe pendência de comanda ou devolução. Consulte o saldo antes de liberar o cartão.</p> : null}
    <p className="gx-line-note"><ShieldCheck aria-hidden="true"/> Seus dados são protegidos durante todo o atendimento.</p>
    <details className="gx-release">
      <summary><LockKeyhole aria-hidden="true"/><span>Devolver e liberar cartão</span><ChevronDown aria-hidden="true"/></summary>
      <form className="gx-release-content" onSubmit={event => void release(event)}>
        <p>Para devolver o cartão, informe o CPF completo. A liberação só será realizada quando não houver pagamentos pendentes.</p>
        <label className="gx-field">CPF completo do titular
          <input type="password" inputMode="numeric" autoComplete="off" maxLength={11}
            value={cpf} onChange={event=>setCpf(event.target.value.replace(/\D/gu,'').slice(0,11))}
            placeholder="11 números do CPF" required />
        </label>
        <label className="gx-line-note"><input type="checkbox" checked={confirmed}
          onChange={event=>setConfirmed(event.target.checked)}/>
          Confirmo a devolução do cartão e solicito a conferência dos pagamentos.
        </label>
        <button type="submit" className="gx-button gx-primary" disabled={busy || submitting || cpf.length!==11 || !confirmed}>
          {submitting ? 'Conferindo pagamentos...' : 'Verificar quitação e liberar cartão'}
        </button>
        {error && <p className="gx-error" role="alert">{error}</p>}
      </form>
    </details>
    <p className="gx-line-note"><ShieldCheck aria-hidden="true"/> O cartão permanecerá vinculado até a quitação da comanda.</p>
  </section>;
}
