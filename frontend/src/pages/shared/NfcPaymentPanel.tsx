import { useState, type FormEvent } from 'react';
import api from '../../Services/api';
import nfcRegistrationService from '../../Services/nfcRegistrationService';

type PaymentContext = {
  card: { status: 'READY' | 'ACTIVE'; displayCode: string };
  comanda: null | { id: string; status: 'OPEN' | 'UNPAID' | 'PAID'; totalCents: number; paidCents: number; outstandingCents: number };
  pixEnabled: boolean;
  pointEnabled: boolean;
  reason: string;
};
const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function NfcPaymentPanel({ token, status, displayCode, onReleased }: {
  token: string; status: 'READY' | 'ACTIVE'; displayCode: string; onReleased: (code: string) => void;
}) {
  const [data, setData] = useState<PaymentContext | null>(null);
  const [loading, setLoading] = useState(true);
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
      const response = cause as { response?: { data?: { error?: string } } };
      setError(response.response?.data?.error || 'Não foi possível validar o CPF do titular.');
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
      setMessage('Comanda quitada no servidor. Cartão liberado, mantendo o link gravado.');
      onReleased(returned.displayCode);
      setData(null);
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setError(response.response?.data?.error || 'Liberação não autorizada. Confira o CPF completo e a quitação no servidor.');
      setCpf('');
    } finally { setBusy(false); }
  };
  return <section aria-label="Pagamentos da comanda NFC" style={{ display: 'grid', gap: 12 }}>
    <h2>Pagamento da comanda NFC</h2>
    <p>Cartão {displayCode}. O cliente deve informar o CPF completo para desbloquear os dados da comanda. Nenhuma segunda leitura NFC é necessária no Safari.</p>
    {!data ? <form onSubmit={event => void verify(event)} style={{ display: 'grid', gap: 10 }}>
      <label>CPF completo do titular (11 dígitos)
        <input type="password" value={cpf} inputMode="numeric" autoComplete="off" minLength={11} maxLength={11}
          onChange={event => setCpf(event.target.value.replace(/\D/gu, '').slice(0, 11))} required />
      </label>
      <button type="submit" disabled={loading || cpf.length !== 11}>{loading ? 'Validando titular...' : 'Verificar CPF e acessar pagamentos'}</button>
      {error && <p role="alert">{error}</p>}
    </form> : <>
      {!data.comanda ? <p role="status">Nenhuma comanda vinculada a este cartão. Cadastre o cliente e abra a comanda primeiro.</p> : <>
        <div style={{ display: 'grid', gap: 8, border: '1px solid #dce3e7', borderRadius: 12, padding: 15 }}>
          <strong>Situação: {data.comanda.status === 'PAID' ? 'Quitada' : 'Em atendimento / pagamento pendente'}</strong>
          <span>Total do consumo: {brl(data.comanda.totalCents)}</span>
          <span>Pagamentos confirmados: {brl(data.comanda.paidCents)}</span>
          <strong>Saldo a pagar: {brl(data.comanda.outstandingCents)}</strong>
        </div>
        <div style={{ display: 'grid', gap: 9 }}>
          <strong>Formas de pagamento</strong>
          <button type="button" disabled>Pix {data.pixEnabled ? '' : '· Indisponível'}</button>
          <button type="button" disabled>Cartão na maquininha Point {data.pointEnabled ? '' : '· Indisponível'}</button>
          <p role="status">{data.reason}</p>
        </div>
        {data.comanda.outstandingCents === 0 && <form onSubmit={event => void finish(event)} style={{ display: 'grid', gap: 10 }}>
          <p>Após confirmar a quitação integral no servidor, o cliente informa o CPF completo para desvincular o cartão. O link gravado permanece igual.</p>
          <label>CPF completo (11 dígitos)
            <input type="password" value={cpf} inputMode="numeric" autoComplete="off" minLength={11} maxLength={11}
              onChange={event => setCpf(event.target.value.replace(/\D/gu, '').slice(0, 11))} required />
          </label>
          <button type="submit" disabled={busy || cpf.length !== 11}>{busy ? 'Conferindo...' : 'Verificar quitação e liberar cartão'}</button>
        </form>}
      </>}
      <button type="button" onClick={() => { setLoading(true); void load(verifiedCpf).catch(() => { setData(null); setVerifiedCpf(''); setError('Falha na verificação. Informe o CPF novamente.'); }).finally(() => setLoading(false)); }} disabled={loading || busy}>Atualizar saldo no servidor</button>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </>}
  </section>;
}
