import { useEffect, useState, type FormEvent } from 'react';
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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    const response = await api.post<PaymentContext>('/nfc-registration/cards/payment-context',
      { token }, { skipBaseUrlFallback: true });
    setData(response.data);
    setError('');
  };
  useEffect(() => {
    let active = true;
    void api.post<PaymentContext>('/nfc-registration/cards/payment-context',
      { token }, { skipBaseUrlFallback: true }).then(response => {
      if (active) { setData(response.data); setError(''); }
    }).catch(() => {
      if (active) setError('Não foi possível verificar a comanda no servidor.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, status]);
  const finish = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || cpf.length !== 11 || !data?.comanda || data.comanda.outstandingCents !== 0) return;
    setBusy(true); setMessage(''); setError('');
    try {
      const returned = await nfcRegistrationService.returnPaidCard(token, cpf, data.comanda.id);
      setCpf('');
      setMessage('Comanda quitada no servidor. Cartão liberado, mantendo o link gravado.');
      onReleased(returned.displayCode);
      await load();
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setError(response.response?.data?.error || 'Liberação não autorizada. Confira o CPF completo e a quitação no servidor.');
      setCpf('');
    } finally { setBusy(false); }
  };
  return <section aria-label="Pagamentos da comanda NFC" style={{ display: 'grid', gap: 12 }}>
    <h2>Pagamento da comanda NFC</h2>
    <p>Cartão {data?.card.displayCode || displayCode}. O funcionário acessa a comanda sem exigir uma segunda leitura NFC no Safari.</p>
    {loading ? <p role="status">Consultando valores no servidor...</p> : !data ? <p role="alert">{error}</p> : <>
      {!data.comanda ? <p role="status">Nenhuma comanda vinculada a este cartão. Cadastre o cliente e abra a comanda primeiro.</p> : <>
        <div style={{ display: 'grid', gap: 8, border: '1px solid #dce3e7', borderRadius: 12, padding: 15 }}>
          <strong>Situação: {data.comanda.status === 'PAID' ? 'Quitada' : 'Em atendimento / pagamento pendente'}</strong>
          <span>Total do consumo: {brl(data.comanda.totalCents)}</span>
          <span>Pagamentos confirmados: {brl(data.comanda.paidCents)}</span>
          <strong>Saldo a pagar: {brl(data.comanda.outstandingCents)}</strong>
        </div>
        <div style={{ display: 'grid', gap: 9 }}>
          <strong>Formas de pagamento</strong>
          <button type="button" disabled={!data.pixEnabled}>Pix {data.pixEnabled ? '' : '· Indisponível'}</button>
          <button type="button" disabled={!data.pointEnabled}>Cartão na maquininha Point {data.pointEnabled ? '' : '· Indisponível'}</button>
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
      <button type="button" onClick={() => { setLoading(true); void load().catch(() => setError('Falha ao atualizar a comanda.')).finally(() => setLoading(false)); }} disabled={loading || busy}>Atualizar saldo no servidor</button>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </>}
  </section>;
}
