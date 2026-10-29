import { useState, type FormEvent } from 'react';
import api from '../../Services/api';

type Account = {
  id: string;
  tableNumber: number;
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  items: Array<{ id: string; description: string; quantity: number; totalCents: number }>;
};
function tableSessionToken() {
  try {
    const data = JSON.parse(localStorage.getItem('tableSession') || '{}');
    return String(localStorage.getItem('tableSessionToken') || data.sessionToken || '');
  } catch { return ''; }
}
const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function NfcCashlessGuestAccess() {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [code, setCode] = useState('');
  const [account, setAccount] = useState<Account | null>(null);
  const [visitToken, setVisitToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (import.meta.env.VITE_NFC_CASHLESS_HOMOLOGATION !== 'true') return null;
  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setAccount(null);
    try {
      const session = tableSessionToken();
      if (!session) throw new Error('Escaneie o QR oficial da mesa novamente.');
      const verified = await api.post<{ sessionToken: string }>('/nfc-cashless/guest/verify', {
        comandaId: reference.trim(), code: code.trim(),
      }, { headers: { 'x-session-token': session } });
      const token = verified.data.sessionToken;
      const response = await api.get<{ comanda: Account }>('/nfc-cashless/guest/account', {
        headers: { 'x-session-token': session, 'x-nfc-visit-token': token },
      });
      setVisitToken(token);
      setAccount(response.data.comanda);
      setCode('');
    } catch {
      setError('Não foi possível validar a visita. Confira o código recebido, sua mesa e o prazo de acesso.');
    } finally { setBusy(false); }
  }
  async function reload() {
    setBusy(true); setError('');
    try {
      const response = await api.get<{ comanda: Account }>('/nfc-cashless/guest/account', {
        headers: { 'x-session-token': tableSessionToken(), 'x-nfc-visit-token': visitToken },
      });
      setAccount(response.data.comanda);
    } catch { setAccount(null); setVisitToken(''); setError('A sessão expirou. Solicite um novo código ao funcionário.'); }
    finally { setBusy(false); }
  }
  return (
    <section aria-label="Acesso à comanda cashless" style={{ padding: '12px 16px', textAlign: 'center' }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ borderRadius: 9, padding: '10px 16px', border: '1px solid #bd5014', background: '#fff', color: '#a04413', fontWeight: 700 }}>
        {open ? 'Fechar acesso cashless' : 'Acessar minha comanda NFC'}
      </button>
      {open && <div style={{ maxWidth: 460, margin: '12px auto', textAlign: 'left', padding: 18, border: '1px solid #ddd', borderRadius: 12, background: '#fff' }}>
        <h2 style={{ fontSize: 18 }}>Minha comanda individual</h2>
        {!account ? (
          <form onSubmit={verify} style={{ display: 'grid', gap: 10 }}>
            <label>Referência da comanda recebida no WhatsApp
              <input required value={reference} onChange={e => setReference(e.target.value)}
                maxLength={36} autoComplete="off" style={{ display: 'block', width: '100%', padding: 10 }} />
            </label>
            <label>Código temporário de 6 dígitos
              <input required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code"
                style={{ display: 'block', width: '100%', padding: 10 }} />
            </label>
            <button type="submit" disabled={busy}>{busy ? 'Verificando...' : 'Consultar comanda'}</button>
          </form>
        ) : (
          <div>
            <p><strong>Mesa {account.tableNumber}</strong></p>
            {account.items.map(item => <p key={item.id}>{item.quantity}× {item.description} — {money(item.totalCents)}</p>)}
            <p>Total: <strong>{money(account.totalCents)}</strong></p>
            <p>Pago: {money(account.paidCents)}</p>
            <p>Saldo pendente: <strong>{money(account.outstandingCents)}</strong></p>
            <button type="button" disabled={busy} onClick={() => void reload()}>Atualizar consumo</button>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button type="button" disabled aria-label="Pagamento Pix NFC em homologação">Pix · Em homologação</button>
              <button type="button" disabled aria-label="Pagamento NFC cartão em homologação">Cartão · Em homologação</button>
            </div>
            <p style={{ fontSize: 12 }}>Os pagamentos NFC continuam indisponíveis até conciliação e homologação real. O funcionário pode orientar o pagamento presencial.</p>
          </div>
        )}
        {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
      </div>}
    </section>
  );
}
