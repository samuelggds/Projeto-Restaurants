import { useState } from 'react';
import styled from 'styled-components';
import nfcRegistrationService, { type NfcCustomerRecord } from '../../Services/nfcRegistrationService';
import nfcComandaService, { type NfcComanda } from '../../Services/nfcComandaService';
import { scanNfcCard } from './nfcWebReader';

const Section = styled.section`
  display:grid;gap:16px;border:1px solid #e3e9ec;background:white;border-radius:16px;padding:22px;
  h2,p{margin:0} h2{font-size:21px} p{color:#61717c;font-size:13px;line-height:1.5}
  label{display:grid;gap:7px;font-size:13px;font-weight:700}
  input,select{padding:12px;border:1px solid #d3dde3;border-radius:9px;min-width:0;width:100%;color:#24323c;background:white;font:inherit}
  button{font:inherit;cursor:pointer;border:1px solid #ccd5dc;background:white;padding:12px 17px;border-radius:9px;font-weight:750}
  button:disabled{opacity:.5;cursor:not-allowed}
  .cta{background:#ca5117;color:white;border-color:#ca5117}
  .info{padding:12px;background:#f0f8f3;color:#246346;border-radius:9px}
  .error{padding:12px;background:#fff1ef;color:#a22e28;border-radius:9px}
  .actions{display:flex;flex-wrap:wrap;gap:9px}
`;

export function NfcLostCardRecovery({ onBack }: { onBack: () => void }) {
  const [lookupCpf,setLookupCpf]=useState('');
  const [customer,setCustomer]=useState<NfcCustomerRecord|null>(null);
  const [comandas,setComandas]=useState<NfcComanda[]>([]);
  const [comandaId,setComandaId]=useState('');
  const [cpf,setCpf]=useState('');
  const [phone,setPhone]=useState('');
  const [documentChecked,setDocumentChecked]=useState(false);
  const [revocationConfirmed,setRevocationConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const lookup = async () => {
    if(busy || lookupCpf.replace(/[^0-9]/g,'').length!==11)return;
    setBusy(true);setError('');setNotice('');setCustomer(null);setComandas([]);setComandaId('');
    try{
      const person=await nfcRegistrationService.lookup(lookupCpf);
      if(!person)throw new Error('Cliente não encontrado.');
      const data=await nfcComandaService.customerComandas(person.id);
      setCustomer(person);
      setComandas(data.comandas.filter(item=>(item.status==='OPEN'||item.status==='UNPAID')&&item.cardId!==null));
    }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível consultar o cliente.');}
    finally{setBusy(false);}
  };
  const recover = async () => {
    if(!customer||!comandaId||cpf.length!==11||!phone.trim()||!documentChecked||!revocationConfirmed||busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      const replacementToken=await scanNfcCard();
      const recovered=await nfcRegistrationService.recoverLostCard({
        customerId:customer.id,comandaId,replacementToken,cpf,phone,
        identityDocumentChecked:true,confirmLostCardRevocation:true,
      });
      setNotice('Cartão '+recovered.displayCode+' vinculado à comanda existente. A dívida e os pagamentos foram preservados.');
      setComandaId('');setCpf('');setPhone('');setDocumentChecked(false);setRevocationConfirmed(false);
    }catch(cause){
      const response=cause as {response?:{data?:{error?:string}}};
      setError(response.response?.data?.error||(cause instanceof Error?cause.message:'Não foi possível recuperar o cartão.'));
    }finally{setBusy(false);}
  };
  return <Section aria-label="Recuperação segura de cartão perdido">
    <div className="actions"><button type="button" onClick={onBack}>Voltar aos clientes</button></div>
    <h2>Recuperar cartão perdido</h2>
    <p>Use um cartão previamente gravado e disponível. O backend revoga o anterior e transfere a mesma comanda, sem alterar consumo, saldo ou pagamentos.</p>
    <label>CPF do cliente cadastrado<input type="text" inputMode="numeric" autoComplete="off" value={lookupCpf} onChange={e=>setLookupCpf(e.target.value)} placeholder="CPF completo"/></label>
    <button type="button" disabled={busy||lookupCpf.replace(/[^0-9]/g,'').length!==11} onClick={()=>void lookup()}>Localizar cliente e comandas</button>
    {customer && <>
      <p className="info">Cliente: {customer.name} · CPF: {customer.cpfMasked}</p>
      <label>Comanda existente
        <select value={comandaId} onChange={e=>setComandaId(e.target.value)}>
          <option value="">Selecione uma comanda</option>
          {comandas.map(item=><option key={item.id} value={item.id}>{item.id.slice(0,8).toUpperCase()} · Saldo {(item.outstandingCents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</option>)}
        </select>
      </label>
      <label>CPF completo conferido presencialmente<input type="password" autoComplete="off" inputMode="numeric" maxLength={11} value={cpf} onChange={e=>setCpf(e.target.value.replace(/[^0-9]/g,'').slice(0,11))}/></label>
      <label>Telefone cadastrado com DDD<input type="tel" autoComplete="off" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
      <label><span><input type="checkbox" checked={documentChecked} onChange={e=>setDocumentChecked(e.target.checked)} style={{width:'auto'}}/> Documento e identidade conferidos presencialmente</span></label>
      <label><span><input type="checkbox" checked={revocationConfirmed} onChange={e=>setRevocationConfirmed(e.target.checked)} style={{width:'auto'}}/> Confirmo perda e revogação do cartão anterior</span></label>
      <button type="button" className="cta" disabled={busy||!comandaId||cpf.length!==11||!phone.trim()||!documentChecked||!revocationConfirmed} onClick={()=>void recover()}>
        Ler cartão substituto e transferir comanda
      </button>
    </>}
    {notice&&<p role="status" className="info">{notice}</p>}
    {error&&<p role="alert" className="error">{error}</p>}
  </Section>;
}
