import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../Services/api';
import { useAuth } from '../../contexts/authContext';
import nfcRegistrationService from '../../Services/nfcRegistrationService';
import nfcOrderChallengeService from '../../Services/nfcOrderChallengeService';
import nfcComandaService from '../../Services/nfcComandaService';
import NfcCpfThreeDigits from './NfcCpfThreeDigits';
import NfcEntryPanel from './NfcEntryPanel';
import { NfcPrepareOrder } from './NfcPrepareOrder';

export default function NfcIntakePage() {
  const { token = '' } = useParams();
  const { user, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [table, setTable] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [lookupCpf, setLookupCpf] = useState('');
  const [existingCustomerName, setExistingCustomerName] = useState('');
  const [orderPrefix, setOrderPrefix] = useState('');
  const [returnCpf, setReturnCpf] = useState('');
  const [orderChallenge, setOrderChallenge] = useState<{ id: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState('');
  const role = String(user?.role ?? '').toUpperCase();
  const subRole = String(user?.subRole ?? '').toUpperCase();
  const allowed = Number(user?.restaurantId ?? user?.restaurant?.id) > 0 &&
    (role === 'ADMIN' || (role === 'FUNCIONARIO' && ['ATENDENTE', 'GARCOM'].includes(subRole)));
  const validToken = /^[A-Za-z0-9_-]{32,128}$/u.test(token);
  const [view, setView] = useState<'home' | 'staff'>('home');
  const [staffTab, setStaffTab] = useState<'registration' | 'orders'>('registration');
  const [staffCard, setStaffCard] = useState<{ status: 'READY' | 'ACTIVE'; displayCode: string; comandaId: string | null } | null>(null);
  const [staffCardError, setStaffCardError] = useState('');
  const [cardContext, setCardContext] = useState<
    { token: string; status: 'ready' | 'error'; slug: string } | null
  >(null);
  useEffect(() => {
    if (!validToken) return;
    let active = true;
    void api.post<{ restaurantSlug: string }>('/nfc-customer-view/card-context', { token },
      { skipBaseUrlFallback: true }).then(response => {
      const slug = response.data?.restaurantSlug;
      if (!active) return;
      if (typeof slug === 'string' && /^[a-z0-9_-]{1,100}$/u.test(slug)) {
        setCardContext({ token, status: 'ready', slug });
      } else {
        setCardContext({ token, status: 'error', slug: '' });
      }
    }).catch(() => {
      if (active) setCardContext({ token, status: 'error', slug: '' });
    });
    return () => { active = false; };
  }, [token, validToken]);
  const matchingContext = cardContext?.token === token ? cardContext : null;
  const cardReady = validToken && matchingContext?.status === 'ready';
  const loginPath = cardReady ? '/' + matchingContext.slug + '/team?next=' + encodeURIComponent('/nfc/' + token) : '';
  const staffRequested = view === 'staff' || (allowed && cardReady);
  useEffect(() => {
    if (!allowed || !validToken || !cardReady || !staffRequested || isLoading) return;
    let active = true;
    void api.post<{ card: { status: 'READY' | 'ACTIVE'; displayCode: string; comandaId: string | null } }>(
      '/nfc-registration/cards/attendance-context', { token }, { skipBaseUrlFallback: true },
    ).then(response => {
      if (active) { setStaffCard(response.data.card); setStaffCardError(''); }
    }).catch(() => {
      if (active) { setStaffCard(null); setStaffCardError('Cartão não pertence ao restaurante autenticado ou está indisponível.'); }
    });
    return () => { active = false; };
  }, [allowed, validToken, cardReady, staffRequested, isLoading, token]);
  useEffect(() => { if (allowed && cardReady && !isLoading) setView('staff'); }, [allowed, cardReady, isLoading]);
  const lookup = async () => {
    setBusy(true); setMessage('');
    try {
      const found = await nfcRegistrationService.lookup(lookupCpf);
      if (!found) {
        setCustomerId(''); setExistingCustomerName('');
        setMessage('CPF ainda não cadastrado. Preencha o formulário de novo cliente.');
      } else {
        setCustomerId(found.id); setExistingCustomerName(found.name);
      }
    } catch { setMessage('CPF inválido ou não foi possível localizar o cliente.'); }
    finally { setBusy(false); }
  };
  const lookupPendingOrder = async () => {
    setBusy(true); setMessage('');
    try {
      const challenge = await nfcOrderChallengeService.pending(token);
      if (challenge) { setOrderChallenge(challenge); setMessage('Pedido aguardando confirmação do cliente.'); }
      else setMessage('Nenhum pedido aguardando confirmação deste operador para o cartão.');
    } catch { setMessage('Não foi possível consultar pedidos deste cartão.'); }
    finally { setBusy(false); }
  };
  const verifyOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (!orderChallenge || busy) return;
    setBusy(true); setMessage('');
    try {
      await nfcOrderChallengeService.verify(orderChallenge.id, token, orderPrefix);
      const order = await nfcOrderChallengeService.finalize(orderChallenge.id);
      setResult(`Pedido #${order.orderId} confirmado e enviado à operação como NÃO PAGO. A cozinha receberá o pedido conforme a capacidade do restaurante.`);
      setOrderChallenge(null); setOrderPrefix('');
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setMessage(response.response?.data?.error || 'Cartão ou dígitos do CPF não confirmados.');
      setOrderPrefix('');
    } finally { setBusy(false); }
  };
  const handleReturn = async (event: FormEvent) => {
    event.preventDefault();
    if (!allowed || !validToken || busy || returnCpf.length !== 11) return;
    setBusy(true); setMessage('');
    try {
      const returned = await nfcRegistrationService.returnPaidCard(token, returnCpf);
      setReturnCpf('');
      setResult(`Cartão ${returned.displayCode} devolvido, desvinculado e disponível para o próximo cliente. Histórico financeiro preservado.`);
      setStaffCard({ status: 'READY', displayCode: returned.displayCode, comandaId: null });
      setStaffTab('registration');
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setMessage(response.response?.data?.error || 'Não foi possível liberar o cartão. Verifique CPF completo e quitação no servidor.');
      setReturnCpf('');
    } finally { setBusy(false); }
  };
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!allowed || !validToken || busy) return;
    setBusy(true); setMessage('');
    try {
      const assignment = await nfcRegistrationService.intake({
        token,
        ...(customerId ? { customerId } : { name, cpf, phone }),
        tableNumber: table.trim() ? Number(table) : null,
      });
      try {
        const comanda = await nfcComandaService.open(assignment.customerId, assignment.cardId, assignment.tableNumber);
        let notice = '';
        if (whatsappConsent && assignment.tableNumber != null) {
          try {
            const queued = await nfcComandaService.sendVisitAccessCode(comanda.id);
            notice = queued.queued ? ' Código de acesso enfileirado para o WhatsApp autorizado.' : '';
          } catch {
            notice = ' O WhatsApp não foi enfileirado; confirme a configuração do canal e faça novo envio pelo painel.';
          }
        }
        setResult(`Cartão ${assignment.displayCode} vinculado e comanda ${comanda.id.slice(0, 8).toUpperCase()} aberta. O garçom ou atendente já pode selecionar produtos no painel NFC.${notice}`);
        setStaffCard({ status: 'ACTIVE', displayCode: assignment.displayCode, comandaId: comanda.id });
        setStaffTab('orders');
      } catch {
        setResult(`Cartão ${assignment.displayCode} vinculado. A comanda ainda não foi aberta: procure o cliente na seção "Clientes e cartões NFC" e abra a comanda antes de registrar pedidos.`);
        setStaffCard({ status: 'ACTIVE', displayCode: assignment.displayCode, comandaId: null });
      }
    } catch (error) {
      const response = error as { response?: { data?: { error?: string } } };
      setMessage(response.response?.data?.error || 'Não foi possível vincular o cartão. Confira os dados ou a situação do cartão.');
    } finally { setBusy(false); }
  };
  return <NfcEntryPanel
    view={view}
    validCard={cardReady}
    loadingCard={validToken && matchingContext === null}
    customerPath={`/nfc/cliente/${token}`}
    loginPath={loginPath}
    onStaff={() => setView('staff')}
    onBack={() => {
      setView('home');
      setName(''); setCpf(''); setPhone(''); setTable(''); setLookupCpf('');
      setCustomerId(''); setExistingCustomerName(''); setOrderPrefix('');
      setReturnCpf(''); setOrderChallenge(null); setMessage(''); setResult('');
    }}
  >
    {view === 'staff' && allowed && validToken && cardReady && !isLoading && (
      <><p role="status">Cartão NFC: {staffCard?.displayCode || 'Verificando acesso ao restaurante...'}</p>
      {staffCardError && <p className="error" role="alert">{staffCardError}</p>}
      {result && <p className="success" role="status">{result}</p>}
      {message && <p className="error" role="alert">{message}</p>}
      {staffCard && <nav aria-label="Atendimento NFC do cartão" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button type="button" aria-pressed={staffTab === 'registration'} onClick={() => setStaffTab('registration')}>Cadastro e vínculo</button>
        <button type="button" aria-pressed={staffTab === 'orders'} onClick={() => setStaffTab('orders')}>Pedidos</button>
      </nav>}
      {staffCard && staffTab === 'orders' && (staffCard.comandaId
        ? <NfcPrepareOrder comandaId={staffCard.comandaId} cardToken={token} />
        : <p role="status">É necessário cadastrar ou vincular o cliente e abrir a comanda antes de anotar pedidos.</p>)}
      {staffCard && staffTab === 'registration' && (<><p>{staffCard.status === 'READY' ? 'Cartão disponível. Cadastre o cliente ou utilize uma conta existente.' : 'Cartão já vinculado. Confira a comanda antes de cadastrar outro cliente.'}</p>
      <button type="button" onClick={() => void lookupPendingOrder()} disabled={busy}>Confirmar pedido com este cartão</button>
      <form onSubmit={event => void handleReturn(event)} style={{ display: 'grid', gap: 12, border: '1px solid #d9e3e8', borderRadius: 12, padding: 14 }}>
        <h2 style={{ fontSize: 17, margin: 0 }}>Conferir pagamento e finalizar atendimento</h2>
        <p>No caixa, após o pagamento Pix ou Point, o funcionário aproxima o cartão e o cliente digita o CPF completo. Se a comanda estiver quitada no backend, o vínculo será encerrado automaticamente.</p>
        <label>CPF completo (11 dígitos)
          <input type="password" inputMode="numeric" autoComplete="off" maxLength={11} minLength={11}
            value={returnCpf} onChange={e => setReturnCpf(e.target.value.replace(/\D/g, '').slice(0, 11))} required />
        </label>
        <button type="submit" disabled={busy || returnCpf.length !== 11}>Verificar pagamento e liberar cartão</button>
      </form>
      {orderChallenge && <form onSubmit={event => void verifyOrder(event)} style={{display:'grid',gap:12}}>
        <p>O cliente deve digitar os três primeiros números do seu CPF, sem mostrar o número completo ao funcionário. Esta confirmação expira em {new Date(orderChallenge.expiresAt).toLocaleTimeString('pt-BR')}.</p>
        <NfcCpfThreeDigits value={orderPrefix} onChange={setOrderPrefix} disabled={busy} />
        <button type="submit" disabled={busy || orderPrefix.length !== 3}>Confirmar identidade e cartão</button>
      </form>}
      
      {staffCard.status === 'READY' && <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: 14 }}>
        <label>Nome completo<input value={name} onChange={e => setName(e.target.value)} required={!customerId} disabled={Boolean(customerId)} minLength={2}/></label>
        <label>CPF<input value={cpf} onChange={e => setCpf(e.target.value)} required={!customerId} disabled={Boolean(customerId)} inputMode="numeric"/></label>
        <label>Telefone com DDD<input value={phone} onChange={e => setPhone(e.target.value)} required={!customerId} disabled={Boolean(customerId)} inputMode="tel"/></label>
        <label>Mesa (opcional)<input type="number" min="1" max="100000" value={table} onChange={e => setTable(e.target.value)}/></label>
        <label style={{display:'flex',gap:9,alignItems:'flex-start'}}><input type="checkbox" style={{width:18,height:18,marginTop:2}} checked={whatsappConsent} onChange={e=>setWhatsappConsent(e.target.checked)} />Cliente autorizou o envio do código da visita para o WhatsApp cadastrado, quando vinculado à mesa.</label>
        <details><summary>Cliente já cadastrado? Consultar CPF</summary>
          <label>CPF cadastrado<input value={lookupCpf} onChange={e => setLookupCpf(e.target.value)} inputMode="numeric" placeholder="000.000.000-00"/></label>
          <button type="button" disabled={busy || lookupCpf.replace(/\D/g, '').length !== 11} onClick={() => void lookup()}>Localizar cadastro</button>
          {existingCustomerName && <p role="status">Cliente encontrado: {existingCustomerName}. Use este cadastro para evitar duplicidade.</p>}
          {customerId && <button type="button" onClick={() => { setCustomerId(''); setExistingCustomerName(''); }}>Cadastrar outro cliente</button>}
        </details>
        <button type="submit" disabled={busy}>{busy ? 'Vinculando...' : 'Confirmar cadastro e vincular cartão'}</button>
      </form>}</>)}
      </>
    )}
  </NfcEntryPanel>;
}
