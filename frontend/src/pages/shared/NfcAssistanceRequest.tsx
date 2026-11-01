import { useState, type FormEvent } from 'react';
import api from '../../Services/api';
import NfcCpfThreeDigits from './NfcCpfThreeDigits';

export function NfcAssistanceRequest({ token }: { token: string }) {
  const [prefix, setPrefix] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || prefix.length !== 3) return;
    setBusy(true); setError('');
    try {
      const verified = await api.post<{sessionToken:string}>('/nfc-customer-view/verify', {token, cpfPrefix:prefix});
      const result = await api.post<{status:string;duplicate:boolean}>('/nfc-customer-view/assistance',
        {token,sessionToken:verified.data.sessionToken});
      if (!['WAITING','IN_PROGRESS'].includes(result.data.status)) throw new Error('Chamado não confirmado.');
      setMessage(result.data.duplicate ? 'Já existe um chamado desta comanda aguardando atendimento.' : 'Chamado enviado à equipe do restaurante.');
    } catch (cause) {
      const failure = cause as {response?:{status?:number;data?:{error?:string}}};
      setError(failure.response?.status===429?'Aguarde o desbloqueio das tentativas de CPF.':
        failure.response?.data?.error||'Não foi possível confirmar o chamado. Tente novamente.');
    } finally { setBusy(false); setPrefix(''); }
  }
  return <form onSubmit={event=>void submit(event)} style={{display:'grid',gap:12}}>
    <p>Confirme os três primeiros dígitos do CPF do titular para chamar a equipe da comanda ativa.</p>
    {!message && <><NfcCpfThreeDigits value={prefix} onChange={setPrefix} disabled={busy}/>
      <button type="submit" disabled={busy||prefix.length!==3}>{busy?'Enviando...':'Chamar garçom'}</button></>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </form>;
}
