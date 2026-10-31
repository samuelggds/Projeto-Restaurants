import { useState } from 'react';
import styled from 'styled-components';
import { ArrowLeft, Check, ClipboardCopy, CreditCard, Smartphone, ShieldCheck } from 'lucide-react';
import nfcRegistrationService from '../../Services/nfcRegistrationService';
import { extractNfcToken, scanNfcCard, writeNfcCard } from './nfcWebReader';

const Frame = styled.section`
  background: #fff; border: 1px solid #e4e8ec; border-radius: 16px; overflow: hidden;
  color: #28323a; display: grid; gap: 0; min-width: 0;
  *, *::before, *::after { box-sizing: border-box; }
  h2, p { margin: 0; }
  button { font: inherit; cursor: pointer; border: 1px solid #dce3e8; border-radius: 10px; padding: 12px 16px; background: #fff; font-weight: 750; }
  button:disabled { cursor: not-allowed; opacity: .55; }
  .head { padding: 24px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; border-bottom: 1px solid #e7ebee; }
  .head small { color: #8b6b54; text-transform: uppercase; letter-spacing: .12em; font-weight: 800; }
  .head h2 { font-size: 23px; margin-top: 6px; }
  .back { display: flex; align-items: center; gap: 8px; }
  .steps { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); padding: 20px 24px; gap: 10px; border-bottom: 1px solid #e7ebee; }
  .step { color: #7a8790; display: flex; align-items: center; gap: 8px; font-size: 12px; }
  .step b { display: grid; place-items: center; background: #f2f3f5; border-radius: 50%; width: 24px; height: 24px; flex: 0 0 24px; }
  .step[data-active="true"] { color: #be4d15; font-weight: 800; }
  .step[data-active="true"] b { background: #fff0e6; }
  .body { padding: 24px; display: grid; gap: 17px; }
  .description { color: #6c7881; font-size: 13px; }
  .link-label { font-size: 12px; font-weight: 800; }
  .link-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 9px; }
  .link-row input { width: 100%; min-width: 0; padding: 12px; border-radius: 10px; border: 1px solid #dce3e8; background: #f9fafb; color: #34424c; }
  .copy, .notice { display: flex; align-items: center; gap: 8px; }
  .notice { color: #586579; font-size: 12px; border-radius: 10px; background: #f4f5f8; padding: 13px; }
  .primary { background: #c64c15; color: white; border: 0; }
  .success { background: #edf9f0; border: 1px solid #cbe8d2; color: #236748; padding: 13px; border-radius: 10px; font-size: 13px; }
  .error { background: #fff1ef; border: 1px solid #f0ccc5; color: #9d2b21; padding: 13px; border-radius: 10px; font-size: 13px; }
  .actions { display: flex; flex-wrap: wrap; gap: 9px; }
  .actions button { flex: 1 1 170px; }
  @media(max-width:580px) {
    .head, .body { padding: 17px; } .steps { padding: 16px; gap: 4px; }
    .step { display: grid; justify-items: center; text-align: center; font-size: 10px; }
    .link-row { grid-template-columns: 1fr; }
  }
`;
type Props = { onBack: () => void; onPrepared: () => void };
export function NfcCardPreparation({ onBack, onPrepared }: Props) {
  const [cardId, setCardId] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [url, setUrl] = useState('');
  const [stage, setStage] = useState<1|2|3|4>(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [written, setWritten] = useState(false);

  const create = async () => {
    if (busy || cardId) return;
    setBusy(true); setError('');
    try {
      const data = await nfcRegistrationService.provision();
      setCardId(data.card.id); setCardCode(data.card.displayCode);
      setUrl(data.ndefUrl); setStage(1); setMessage('Identificador exclusivo recebido do servidor. O cartão ainda não está disponível.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível gerar o cartão.'); }
    finally { setBusy(false); }
  };
  const write = async () => {
    if (!cardId || !url || busy || written) return;
    setBusy(true); setError(''); setStage(2);
    try {
      await writeNfcCard(url);
      setWritten(true); setStage(3);
      setMessage('Gravação realizada. Aproxime o mesmo cartão novamente para confirmar a leitura.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível gravar o cartão.'); }
    finally { setBusy(false); }
  };
  const verify = async () => {
    if (!cardId || !url || !written || busy) return;
    setBusy(true); setError('');
    try {
      const token = await scanNfcCard();
      if (token !== extractNfcToken(url)) throw new Error('O identificador lido não corresponde ao cartão preparado.');
      const card = await nfcRegistrationService.prepare(cardId, token);
      if (card.status !== 'READY') throw new Error('O servidor não confirmou a disponibilidade do cartão.');
      setStage(4); setMessage('Cartão '+cardCode+' gravado, conferido e disponível para cadastro.');
      onPrepared();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível confirmar o cartão.'); }
    finally { setBusy(false); }
  };
  return <Frame aria-label="Preparar cartão NFC virgem">
    <header className="head"><div><small>Antes do atendimento</small><h2>Preparar cartão virgem</h2></div>
      <button type="button" className="back" onClick={onBack}><ArrowLeft size={17} /> Voltar para cartões</button></header>
    <div className="steps">
      {(['Link','Gravar','Conferir','Disponível'] as const).map((label,index) =>
        <div key={label} className="step" data-active={index+1 === stage}>
          <b>{index+1 < stage ? <Check size={15} /> : index+1}</b>{label}
        </div>)}
    </div>
    <div className="body">
      <p className="description">Grave o cartão NFC e confirme a leitura física. Somente depois da confirmação do backend ele entra no estoque como disponível.</p>
      {!url && <button type="button" className="primary" disabled={busy} onClick={() => void create()}>{busy ? 'Gerando...' : 'Gerar identificador individual do cartão'}</button>}
      {url && <>
        <label className="link-label" htmlFor="nfc-ndef-url">Link individual do cartão {cardCode}</label>
        <div className="link-row"><input id="nfc-ndef-url" readOnly value={url} />
          <button type="button" className="copy" onClick={() => void navigator.clipboard?.writeText(url)}><ClipboardCopy size={16}/> Copiar link</button></div>
        <p className="description">Copiar o link não confirma a gravação. O cartão ainda precisa ser gravado e lido no Android com Chrome e NFC.</p>
        <div className="notice"><Smartphone size={17} /> Para gravar: Android com NFC habilitado e Chrome atualizado em HTTPS.</div>
        {stage < 4 ? <div className="actions">
          {!written && <button type="button" className="primary" disabled={busy} onClick={() => void write()}><CreditCard size={17}/> {busy ? 'Gravando...' : 'Gravar no cartão físico'}</button>}
          {written && <button type="button" className="primary" disabled={busy} onClick={() => void verify()}><ShieldCheck size={17}/> {busy ? 'Conferindo...' : 'Conferir leitura e disponibilizar'}</button>}
        </div> : <button type="button" className="primary" onClick={onBack}>Ver cartão no estoque</button>}
      </>}
      {message && <p className="success" role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  </Frame>;
}
