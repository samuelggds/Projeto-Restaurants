import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../contexts/authContext';
import nfcRegistrationService from '../../Services/nfcRegistrationService';

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
  const [customerId, setCustomerId] = useState('');
  const [lookupCpf, setLookupCpf] = useState('');
  const [existingCustomerName, setExistingCustomerName] = useState('');
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
      setResult(`Cartão ${assignment.displayCode} vinculado com sucesso ao cliente.`);
    } catch (error) {
      const response = error as { response?: { data?: { error?: string } } };
      setMessage(response.response?.data?.error || 'Não foi possível vincular o cartão. Confira os dados ou a situação do cartão.');
    } finally { setBusy(false); }
  };
  return <Frame><section className="surface" aria-label="Recepção de cartão NFC">
    <h1>GastroNexa · Recepção NFC</h1>
    {isLoading ? <p>Verificando acesso...</p> :
      !user ? <><p>Para proteger os clientes, faça login como administrador, garçom ou atendente. Depois, aproxime novamente o cartão para voltar a esta tela.</p><Link to="/restaurant-required">Acessar seu restaurante</Link></> :
      !allowed ? <p role="alert">Esta conta não tem autorização para cadastrar clientes NFC.</p> :
      !validToken ? <p role="alert">O cartão não contém um identificador NFC válido.</p> :
      result ? <p className="success" role="status">{result} A comanda deverá ser aberta no fluxo de atendimento.</p> :
      <><p>Cartão identificado. Cadastre o cliente ou localize um cadastro existente pelo CPF no painel de clientes NFC.</p>
      <form onSubmit={(e) => void handleSubmit()} style={{ display: 'grid', gap: 14 }}>
        <label>Nome completo<input value={name} onChange={e => setName(e.target.value)} required={!customerId} disabled={Boolean(customerId)} minLength={2}/></label>
        <label>CPF<input value={cpf} onChange={e => setCpf(e.target.value)} required={!customerId} disabled={Boolean(customerId)} inputMode="numeric"/></label>
        <label>Telefone com DDD<input value={phone} onChange={e => setPhone(e.target.value)} required={!customerId} disabled={Boolean(customerId)} inputMode="tel"/></label>
        <label>Mesa (opcional)<input type="number" min="1" max="100000" value={table} onChange={e => setTable(e.target.value)}/></label>
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
