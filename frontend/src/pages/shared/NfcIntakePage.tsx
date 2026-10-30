import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../contexts/authContext';
import nfcRegistrationService from '../../Services/nfcRegistrationService';
import nfcOrderChallengeService from '../../Services/nfcOrderChallengeService';
import nfcComandaService from '../../Services/nfcComandaService';

const Frame = styled.main`
  min-height: 100dvh; display: grid; place-items: center; padding: 20px;
  background: linear-gradient(145deg, #17212c, #333e4c); color: #1f2933;
  .surface { width: min(100%, 500px); display: grid; gap: 15px; background: white; padding: 25px; border-radius: 20px; }
  h1, p { margin: 0; } h1 { font-size: 23px; } p { color: #607080; line-height: 1.55; }
  label { display: grid; gap: 6px; font-weight: 650; font-size: 14px; }
  input { padding: 12px; border: 1px solid #cbd5df; border-radius: 9px; font: inherit; width: 100%; }
  button { padding: 13px 15px; background: #e86419; color: white; border: 0; border-radius: 10px; font: inherit; font-weight: 800; }
  button:disabled { opacity: .6; }
  .error { background: #fff0ef; padding: 12px; color: #992d21; border-radius: 8px; }
  .success { background: #e5f5ec; padding: 12px; color: #145e3e; border-radius: 8px; }
`;

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
      } catch {
        setResult(`Cartão ${assignment.displayCode} vinculado. A comanda ainda não foi aberta: procure o cliente na seção "Clientes e cartões NFC" e abra a comanda antes de registrar pedidos.`);
      }
    } catch (error) {
      const response = error as { response?: { data?: { error?: string } } };
      setMessage(response.response?.data?.error || 'Não foi possível vincular o cartão. Confira os dados ou a situação do cartão.');
    } finally { setBusy(false); }
  };
  return <Frame><section className="surface" aria-label="Recepção de cartão NFC">
    <h1>GastroNexa · Recepção NFC</h1>
    {isLoading ? <p>Verificando acesso...</p> :
      !user ? <><p>Cliente: consulte os pedidos e valores da sua visita em modo somente leitura.</p><Link to={`/nfc/cliente/${token}`}>Visualizar minha comanda NFC</Link><p>Funcionários: para vincular cartão, confirmar pedidos ou liberar a comanda, faça login no painel autorizado.</p><Link to="/restaurant-required">Acessar painel do restaurante</Link></> :
      !allowed ? <p role="alert">Esta conta não tem autorização para cadastrar clientes NFC.</p> :
      !validToken ? <p role="alert">O cartão não contém um identificador NFC válido.</p> :
      result ? <p className="success" role="status">{result}</p> :
      <><p>Cartão identificado. Cadastre o cliente ou confirme um pedido que o funcionário já preparou.</p>
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
        <label>Três primeiros dígitos do CPF<input autoComplete="off" type="password" inputMode="numeric" pattern="[0-9]{3}" minLength={3} maxLength={3} value={orderPrefix} onChange={event => setOrderPrefix(event.target.value.replace(/\D/g,'').slice(0,3))} required /></label>
        <button type="submit" disabled={busy || orderPrefix.length !== 3}>Confirmar identidade e cartão</button>
      </form>}
      
      <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: 14 }}>
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
        {message && <p className="error" role="alert">{message}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Vinculando...' : 'Confirmar cadastro e vincular cartão'}</button>
      </form></>}
  </section></Frame>;
}
