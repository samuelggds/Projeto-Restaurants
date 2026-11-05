import { useState, type FormEvent } from 'react';
import api from '../../Services/api';
import nfcRegistrationService from '../../Services/nfcRegistrationService';
import { nfcFriendlyError } from './nfcFriendlyMessages';
import { CheckCircle2, CreditCard, LockKeyhole, RotateCcw, ShieldCheck, Wallet } from 'lucide-react';

type PaymentContext = {
  card: { status: 'READY' | 'ACTIVE'; displayCode: string };
  comanda: null | { id: string; status: 'OPEN' | 'UNPAID' | 'PAID'; totalCents: number; paidCents: number; outstandingCents: number };
  pixEnabled: boolean;
  pointEnabled: boolean;
  reason: string;
};
const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function NfcPaymentPanel({ token, displayCode, onReleased }: {
  token: string; displayCode: string; onReleased: (code: string) => void;
}) {
  const [data, setData] = useState<PaymentContext | null>(null);
  // No request runs on mount: enable the first CPF validation immediately.
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cpf, setCpf] = useState('');
  const [verifiedCpf, setVerifiedCpf] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = async (confirmedCpf: string) => {
    const response = await api.post<PaymentContext>('/nfc-registration/cards/payment-context',
      { token, cpf: confirmedCpf }, { skipBaseUrlFallback: true });
    setData(response.data);
    setVerifiedCpf(confirmedCpf);
    setError('');
  };
  // The parent keys this component by physical card and action; a fresh mount
  // resets the private CPF and financial state without an effect.
  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || busy || !/^\d{11}$/u.test(cpf)) return;
    setLoading(true); setError(''); setMessage('');
    try { await load(cpf); setCpf(''); }
    catch (cause) {
      setError(nfcFriendlyError(cause, 'Não foi possível conferir o CPF. Confira os números e tente novamente.'));
      setCpf(''); setVerifiedCpf(''); setData(null);
    } finally { setLoading(false); }
  };
  const finish = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || cpf.length !== 11 || !data?.comanda || data.comanda.outstandingCents !== 0) return;
    setBusy(true); setMessage(''); setError('');
    try {
      const returned = await nfcRegistrationService.returnPaidCard(token, cpf, data.comanda.id);
      setCpf(''); setVerifiedCpf('');
      setMessage('Pagamento conferido! Cartão liberado e pronto para um novo atendimento.');
      onReleased(returned.displayCode);
      setData(null);
    } catch (cause) {
      setError(nfcFriendlyError(cause, 'Não foi possível liberar o cartão. Confira o CPF e os pagamentos pendentes.'));
      setCpf('');
    } finally { setBusy(false); }
  };
  return <section className="gx-payment" aria-label="Pagamentos da comanda NFC">
    {!data ? <section className="gx-panel">
      <div className="gx-status-hero">
        <span className="gx-status-symbol"><LockKeyhole aria-hidden="true"/></span>
        <h2>Pagamento da comanda</h2>
        <p>Cartão {displayCode}. O titular deve informar seu CPF completo para consultar saldo e pagamentos. Nenhuma nova leitura é necessária no Safari.</p>
      </div>
      <form onSubmit={event=>void verify(event)} className="gx-actions">
        <label className="gx-field">CPF completo do titular (11 dígitos)
          <input type="password" inputMode="numeric" autoComplete="off" value={cpf}
            minLength={11} maxLength={11} onChange={event=>setCpf(event.target.value.replace(/\D/gu,'').slice(0,11))} required />
        </label>
        <button type="submit" className="gx-button gx-primary" disabled={loading || cpf.length!==11}>
          <ShieldCheck aria-hidden="true"/>{loading ? 'Validando titular...' : 'Verificar CPF e acessar pagamentos'}
        </button>
      </form>
      {error && <p className="gx-error" role="alert">{error}</p>}
      <p className="gx-line-note"><ShieldCheck aria-hidden="true"/> Seus dados são conferidos com segurança.</p>
    </section> : <>
      <div className="gx-inline-context"><span className="gx-avatar"><CreditCard aria-hidden="true"/></span>
        <div><strong>Cartão {data.card.displayCode}</strong><small>Identidade verificada no restaurante autenticado</small></div>
        <CheckCircle2 aria-hidden="true"/>
      </div>
      {!data.comanda ? <section className="gx-panel gx-empty"><span><Wallet aria-hidden="true"/></span>
        <h2>Sem comanda vinculada</h2><p>Consulte o vínculo do cliente e abra uma comanda antes de registrar pagamentos.</p>
      </section> : <>
        <div className="gx-balance" aria-label="Saldo da comanda">
          <div className="gx-balance-label"><span>Saldo a pagar</span><span className="gx-pill">{data.comanda.status==='PAID' ? 'Quitada' : 'Em atendimento'}</span></div>
          <strong>{brl(data.comanda.outstandingCents)}</strong>
          <dl><div><dt>Total consumido</dt><dd>{brl(data.comanda.totalCents)}</dd></div>
          <div><dt>Total pago</dt><dd>{brl(data.comanda.paidCents)}</dd></div></dl>
        </div>
        <section className="gx-panel">
          <h2>Formas de pagamento</h2>
          <p className="gx-help">O pagamento aparecerá como concluído após a confirmação.</p>
          <button type="button" className="gx-button" disabled><Wallet aria-hidden="true"/> Pix {data.pixEnabled ? '· Temporariamente indisponível' : '· Indisponível'}</button>
          <button type="button" className="gx-button" disabled><CreditCard aria-hidden="true"/> Maquininha Point {data.pointEnabled ? '· Temporariamente indisponível' : '· Indisponível'}</button>
          <p className="gx-line-note">{data.reason}</p>
        </section>
        {data.comanda.outstandingCents===0 && <section className="gx-panel">
          <h2>Conferir quitação e liberar cartão</h2>
          <p className="gx-help">Antes da devolução, será necessário conferir se todos os valores foram pagos.</p>
          <form className="gx-actions" onSubmit={event=>void finish(event)}>
            <label className="gx-field">Confirmar CPF completo para devolução
              <input type="password" inputMode="numeric" autoComplete="off" value={cpf} minLength={11} maxLength={11}
                onChange={event=>setCpf(event.target.value.replace(/\D/gu,'').slice(0,11))} required/>
            </label>
            <button type="submit" className="gx-button gx-primary" disabled={busy || cpf.length!==11}>
              <ShieldCheck aria-hidden="true"/>{busy?'Conferindo...' : 'Verificar quitação e liberar cartão'}
            </button>
          </form>
        </section>}
      </>}
      <button type="button" className="gx-button" disabled={loading || busy} onClick={()=>{
        setLoading(true);void load(verifiedCpf).catch(()=>{setData(null);setVerifiedCpf('');setError('Falha na verificação. Informe o CPF novamente.');}).finally(()=>setLoading(false));
      }}><RotateCcw aria-hidden="true"/>{loading ? 'Atualizando...' : 'Atualizar saldo no servidor'}</button>
      {message && <p role="status" className="gx-pill">{message}</p>}
      {error && <p role="alert" className="gx-error">{error}</p>}
    </>}
    <p className="gx-line-note"><ShieldCheck aria-hidden="true"/> Consulte aqui as informações atualizadas dos seus pagamentos.</p>
  </section>;
}
