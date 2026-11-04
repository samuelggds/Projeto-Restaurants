import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { buildNfcEntryPath, getNfcEntryAction, type NfcEntryAction } from './nfcEntryNavigation';
import api from '../../Services/api';
import { useAuth } from '../../contexts/authContext';
import { rememberTenantSlug } from '../../shared/navigation/authNavigation';
import nfcRegistrationService from '../../Services/nfcRegistrationService';
import nfcOrderChallengeService from '../../Services/nfcOrderChallengeService';
import nfcComandaService from '../../Services/nfcComandaService';
import NfcCpfThreeDigits from './NfcCpfThreeDigits';
import { NfcAssistanceRequest } from './NfcAssistanceRequest';
import NfcEntryPanel, { type NfcStaffSection } from './NfcEntryPanel';
import { NfcPrepareOrder } from './NfcPrepareOrder';
import { NfcPaymentPanel } from './NfcPaymentPanel';
import { NfcStaffComanda } from './NfcStaffComanda';
import { NfcCardEnrollment, type NfcEnrollmentChoice } from './NfcCardEnrollment';

// React Router reuses page instances when only route params change. Remounting
// on card/tenant changes prevents a prior card's private form, CPF, comanda or
// order confirmation state from appearing on the next physical card.
export default function NfcIntakePage() {
  const { token = '', restaurantSlug: urlSlug = '' } = useParams();
  return <NfcCardFlow key={`${urlSlug}/${token}`} token={token} urlSlug={urlSlug} />;
}

function NfcCardFlow({ token, urlSlug }: { token: string; urlSlug: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const action = getNfcEntryAction(location.search);
  const { user, isLoading } = useAuth();
  const [orderPrefix, setOrderPrefix] = useState('');
  const [returnCpf, setReturnCpf] = useState('');
  const [orderChallenge, setOrderChallenge] = useState<{ id: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [helpVisible, setHelpVisible] = useState(false);
  const [result, setResult] = useState('');
  const role = String(user?.role ?? '').toUpperCase();
  const subRole = String(user?.subRole ?? '').toUpperCase();
  const allowed = Number(user?.restaurantId ?? user?.restaurant?.id) > 0 &&
    (role === 'ADMIN' || (role === 'FUNCIONARIO' && ['ATENDENTE', 'GARCOM'].includes(subRole)));
  const validToken = /^[A-Za-z0-9_-]{32,128}$/u.test(token);
  const view: 'home' | 'staff' = action ? 'staff' : 'home';
  const [staffTab, setStaffTab] = useState<NfcStaffSection>(action === 'order' ? 'orders' : action === 'payment' ? 'payment' : 'menu');
  type CardContext = { status: 'PENDING_WRITE' | 'READY' | 'ACTIVE'; displayCode: string; comandaId: string | null; cardId?: string; customerId?: string | null; customerName?: string | null; canOpenComanda?: boolean; hasUnsettledComanda?: boolean; needsCardReturn?: boolean };
  const [staffCard, setStaffCard] = useState<CardContext | null>(null);
  const [confirmPhysicalWrite, setConfirmPhysicalWrite] = useState(false);
  const [confirmingWrite, setConfirmingWrite] = useState(false);
  const [staffCardError, setStaffCardError] = useState('');
  const [staffRetry, setStaffRetry] = useState(0);
  const [retryContextVersion, setRetryContextVersion] = useState(0);
  const [cardContext, setCardContext] = useState<
    { token: string; status: 'ready' | 'invalid' | 'unavailable'; slug: string } | null
  >(null);
  useEffect(() => {
    if (!validToken) return;
    let active = true;
    void api.post<{ restaurantSlug: string }>('/nfc-customer-view/card-context', { token, ...(urlSlug ? { restaurantSlug: urlSlug } : {}) },
      { skipBaseUrlFallback: true }).then(response => {
      const slug = response.data?.restaurantSlug;
      if (!active) return;
      if (typeof slug === 'string' && /^[a-z0-9_-]{1,100}$/u.test(slug)) {
        // Persist only the server-verified restaurant slug for future session recovery.
        rememberTenantSlug(slug);
        setCardContext({ token, status: 'ready', slug });
      } else {
        setCardContext({ token, status: 'unavailable', slug: '' });
      }
    }).catch((cause: { response?: { status?: number } }) => {
      if (active) setCardContext({ token, status: cause.response?.status === 404 || cause.response?.status === 422 ? 'invalid' : 'unavailable', slug: '' });
    });
    return () => { active = false; };
  }, [token, validToken, retryContextVersion, urlSlug]);
  const matchingContext = cardContext?.token === token ? cardContext : null;
  const cardReady = validToken && matchingContext?.status === 'ready' && (!urlSlug || matchingContext.slug === urlSlug);
  // Only a verified card context may select the tenant login route. A remembered
  // browser tenant is not trustworthy enough to authorize another card.
  const loginPath = cardReady && action ? '/' + matchingContext.slug + '/team?next=' + encodeURIComponent(buildNfcEntryPath(token, action, matchingContext.slug)) : '';
  const cardContextError = !validToken || matchingContext?.status === 'invalid' ? 'Cartão NFC inválido, revogado ou não encontrado. Confira o link gravado.' : matchingContext?.status === 'unavailable' ? 'Não foi possível consultar o servidor. Verifique a conexão e tente novamente.' : '';
  const retryCardContext = () => { setCardContext(null); setRetryContextVersion(value => value + 1); };
  const staffRequested = view === 'staff';
  useEffect(() => {
    if (!allowed || !validToken || !cardReady || !staffRequested || isLoading) return;
    let active = true;
    void api.post<{ card: CardContext }>(
      '/nfc-registration/cards/attendance-context', { token }, { skipBaseUrlFallback: true },
    ).then(response => {
      if (active) { setStaffCard(response.data.card); setStaffCardError(''); }
    }).catch((error: { response?: { status?: number; data?: { error?: string } } }) => {
      if (active) {
        setStaffCard(null);
        const status = error.response?.status;
        setStaffCardError(status === 404 ? 'Cartão não disponível para este restaurante ou ainda não preparado.' :
          status === 403 ? error.response?.data?.error || 'Seu restaurante não possui acesso à operação NFC.' :
          status === 401 ? 'Sua sessão expirou. Entre novamente na mesma aba para continuar.' :
          'Não foi possível verificar o cartão no servidor. Tente novamente.');
      }
    });
    return () => { active = false; };
  }, [allowed, validToken, cardReady, staffRequested, isLoading, token, staffRetry]);

  const confirmPendingCard = async () => {
    if (!confirmPhysicalWrite || staffCard?.status !== 'PENDING_WRITE' || confirmingWrite) return;
    setConfirmingWrite(true);
    setStaffCardError('');
    try {
      const response = await api.post<{ card: { status: 'READY'; displayCode: string; comandaId: null } }>(
        '/nfc-registration/cards/confirm-encoded-write',
        { token, confirmPhysicalWrite: true },
        { skipBaseUrlFallback: true },
      );
      if (response.data?.card?.status !== 'READY') throw new Error('Preparação não confirmada no servidor.');
      setStaffCard(response.data.card);
      setConfirmPhysicalWrite(false);
      setStaffTab('registration');
      setResult('Cartão confirmado no banco e pronto para cadastrar ou vincular um cliente.');
    } catch (error) {
      const cause = error as { response?: { data?: { error?: string } } };
      setStaffCardError(cause.response?.data?.error || 'Não foi possível confirmar a preparação. Confira o cartão e tente novamente.');
    } finally {
      setConfirmingWrite(false);
    }
  };
  const chooseAction = (next: NfcEntryAction) => {
    setStaffCard(null); setStaffCardError(''); setMessage(''); setResult('');
    setStaffTab(next === 'order' ? 'orders' : next === 'payment' ? 'payment' : 'menu');
    navigate(buildNfcEntryPath(token, next, urlSlug || matchingContext?.slug));
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
  const handleSubmit = async (payload: NfcEnrollmentChoice) => {
    if (!allowed || !validToken || busy || staffCard?.status !== 'READY') throw new Error('Cartão NFC indisponível para cadastro.');
    setBusy(true);setMessage('');setResult('');
    try {
      const assignment = await nfcRegistrationService.intake({
        token,
        ...(payload.customerId ? { customerId: payload.customerId } :
          { name: payload.name || '', cpf: payload.cpf || '', phone: payload.phone || '' }),
        tableNumber: payload.tableNumber,
      });
      try {
        const comanda = await nfcComandaService.open(assignment.customerId, assignment.cardId, assignment.tableNumber);
        let notice = '';
        if (payload.whatsappConsent && assignment.tableNumber != null) {
          try {
            const queued = await nfcComandaService.sendVisitAccessCode(comanda.id);
            notice = queued.queued ? ' Código de acesso enviado à fila do WhatsApp autorizado.' : '';
          } catch {
            notice = ' Não foi possível enfileirar a mensagem WhatsApp; faça nova tentativa pelo painel.';
          }
        }
        setStaffCard({status:'ACTIVE',displayCode:assignment.displayCode,cardId:assignment.cardId,customerId:assignment.customerId,comandaId:comanda.id,canOpenComanda:false});
        setResult('Cartão vinculado e comanda aberta. Atendimento pronto.' + notice);
        setStaffTab('menu');
      } catch (cause) {
        const err = cause as {response?:{data?:{error?:string}}};
        setStaffCard({status:'ACTIVE',displayCode:assignment.displayCode,cardId:assignment.cardId,customerId:assignment.customerId,comandaId:null,canOpenComanda:true});
        setMessage(err.response?.data?.error || 'Cliente vinculado, mas não foi possível abrir a comanda. Confira as permissões e tente abrir a comanda deste cartão.');
      }
      return assignment;
    } finally {setBusy(false);}
  };
  const recoverComanda = async () => {
    if (!staffCard?.canOpenComanda || !staffCard.customerId || !staffCard.cardId || busy) return;
    setBusy(true);setMessage('');setResult('');
    try {
      const comanda = await nfcComandaService.open(staffCard.customerId,staffCard.cardId,null);
      setStaffCard({...staffCard,comandaId:comanda.id,canOpenComanda:false});
      setResult('Comanda aberta com sucesso para o cliente já vinculado.');
      setStaffTab('menu');
    } catch (cause) {
      const err = cause as {response?:{data?:{error?:string}}};
      setMessage(err.response?.data?.error||'Não foi possível abrir a comanda. Verifique se existe visita ou pendência financeira.');
    } finally {setBusy(false);}
  };
  return <NfcEntryPanel
    view={view}
    validCard={cardReady}
    loadingCard={validToken && matchingContext === null}
    customerPath={`/nfc/cliente/${token}`}
    loginPath={loginPath}
    cardContextError={cardContextError}
    onRetryCardContext={retryCardContext}
    staffAuthorized={allowed && !isLoading && Boolean(staffCard)}
    staffLoggedIn={!isLoading && allowed}
    staffChecking={isLoading || (validToken && matchingContext === null) || (cardReady && !staffCardError && !staffCard)}
    staffError={staffCardError || (!cardReady ? cardContextError : '')}
    onRetryStaff={() => { setStaffCardError(''); setStaffCard(null); retryCardContext(); setStaffRetry(v => v + 1); }}
    staffRole={subRole === 'GARCOM' ? 'Garçom' : subRole === 'ATENDENTE' ? 'Atendente' : 'Administrador'}
    cardDisplayCode={staffCard?.displayCode}
    restaurantName={(matchingContext?.slug || urlSlug || '').split('-').map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '').join(' ')}
    staffSection={staffTab}
    pendingCard={staffCard?.status === 'PENDING_WRITE' ? <div style={{display:'grid',gap:13}}>
      <p><strong>{staffCard.displayCode}</strong> está aguardando confirmação da gravação. O link já pertence ao restaurante autenticado, mas o cartão ainda não pode receber clientes ou pedidos.</p>
      <label style={{display:'flex',alignItems:'flex-start',gap:10}}>
        <input type="checkbox" checked={confirmPhysicalWrite} onChange={event => setConfirmPhysicalWrite(event.target.checked)} disabled={confirmingWrite}/>
        <span>Confirmei que abri este endereço aproximando o cartão físico NFC, e não apenas copiando o link.</span>
      </label>
      <button type="button" disabled={!confirmPhysicalWrite || confirmingWrite} onClick={() => void confirmPendingCard()}>
        {confirmingWrite ? 'Confirmando no servidor...' : 'Confirmar gravação e cadastrar cliente'}
      </button>
      {staffCardError && <p role="alert" className="error">{staffCardError}</p>}
      <small>Esta confirmação é registrada no histórico do restaurante. Nunca confirme um cartão que não tenha sido efetivamente gravado.</small>
    </div> : null}
    onStaff={() => { setHelpVisible(false); chooseAction('staff'); }}
    onHelp={() => setHelpVisible(value => !value)}
    helpVisible={helpVisible}
    helpContent={helpVisible ? <NfcAssistanceRequest key={token} token={token} /> : null}
    onSelectSection={setStaffTab}
    onBack={() => {
      if (staffTab !== 'menu') { setStaffTab('menu'); setOrderPrefix(''); setOrderChallenge(null); setReturnCpf(''); setMessage(''); setResult(''); return; }
      navigate(buildNfcEntryPath(token, undefined, urlSlug || matchingContext?.slug));
      setOrderPrefix('');
      setReturnCpf(''); setOrderChallenge(null); setMessage(''); setResult(''); setStaffTab('menu');
    }}
  >
    {view === 'staff' && allowed && validToken && cardReady && !isLoading && (
      <><p role="status">Cartão NFC: {staffCard?.displayCode || 'Verificando acesso ao restaurante...'}</p>
      {staffCardError && <p className="error" role="alert">{staffCardError}</p>}
      {result && <p className="success" role="status">{result}</p>}
      {message && <p className="error" role="alert">{message}</p>}

      {staffCard && staffTab === 'payment' && <NfcPaymentPanel key={token} token={token} displayCode={staffCard.displayCode} onReleased={displayCode => { setStaffCard({ status: 'READY', displayCode, comandaId: null }); setStaffTab('registration'); }} />}
      {staffCard && staffTab === 'consult' && <NfcStaffComanda token={token} />}
      {staffCard && staffTab === 'orders' && (staffCard.status === 'ACTIVE' && staffCard.comandaId
        ? <NfcPrepareOrder comandaId={staffCard.comandaId} cardToken={token} />
        : <div role="status"><p>Este cartão ainda não possui uma comanda aberta. Identifique o cliente para continuar.</p><button type="button" onClick={()=>setStaffTab('registration')}>Ir para Cadastro NFC</button></div>)}
      {staffCard && staffTab === 'registration' && (staffCard.status === 'READY'
        ? <NfcCardEnrollment key={token} cardCode={staffCard.displayCode} restaurantName={urlSlug || matchingContext?.slug || 'Restaurante autenticado'} onEnroll={handleSubmit}/>
        : <section style={{display:'grid',gap:13}}>
          <h2>Cliente vinculado ao cartão</h2>
          <p><strong>{staffCard.customerName || 'Cliente cadastrado'}</strong></p>
          <p>O cartão {staffCard.displayCode} já possui vínculo. Não é permitido cadastrar outro cliente sem a devolução e liberação do cartão.</p>
          {staffCard.comandaId ? <>
            <p role="status">A comanda deste cartão está aberta para atendimento.</p>
            <button type="button" onClick={()=>setStaffTab('consult')}>Consultar comanda</button>
            <button type="button" onClick={()=>setStaffTab('orders')}>Fazer pedido</button>
          </> : staffCard.canOpenComanda ? <>
            <p role="status">Este cliente já está vinculado, mas ainda não possui comanda aberta.</p>
            <button type="button" disabled={busy} onClick={()=>void recoverComanda()}>{busy?'Abrindo comanda...':'Abrir comanda deste cartão'}</button>
          </> : <p role="status">{staffCard.hasUnsettledComanda ? 'Existe outra comanda em aberto ou não quitada. Regularize o atendimento antes de abrir uma nova.' : staffCard.needsCardReturn ? 'Esta visita já possui comanda anterior. Confirme quitação e CPF completo para devolver o cartão antes de iniciar outro atendimento.' : 'Confira a situação do cliente antes de prosseguir.'}</p>}
          <button type="button" onClick={()=>void lookupPendingOrder()} disabled={busy}>Consultar confirmação de pedido pendente</button>
          <form onSubmit={event=>void handleReturn(event)} style={{display:'grid',gap:12,border:'1px solid #d9e3e8',borderRadius:12,padding:14}}>
            <h2 style={{fontSize:17}}>Conferir quitação e liberar cartão</h2>
            <p>O cliente digita o CPF completo. Somente o backend pode liberar o cartão após verificar todas as pendências e pagamentos.</p>
            <label>CPF completo (11 dígitos)
              <input type="password" inputMode="numeric" autoComplete="off" maxLength={11} minLength={11}
                value={returnCpf} onChange={e=>setReturnCpf(e.target.value.replace(/\D/g,'').slice(0,11))} required/>
            </label>
            <button type="submit" disabled={busy||returnCpf.length!==11}>Verificar pagamento e liberar cartão</button>
          </form>
        </section>)}
      {orderChallenge && <form onSubmit={event=>void verifyOrder(event)} style={{display:'grid',gap:12}}>
        <p>O cliente digita os três primeiros dígitos do CPF para confirmar o pedido.</p>
        <NfcCpfThreeDigits value={orderPrefix} onChange={setOrderPrefix} disabled={busy}/>
        <button type="submit" disabled={busy||orderPrefix.length!==3}>Confirmar pedido</button>
      </form>}
      </>
    )}
  </NfcEntryPanel>;
}
