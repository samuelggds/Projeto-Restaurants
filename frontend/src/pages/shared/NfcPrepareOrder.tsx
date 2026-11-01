import { useEffect, useState } from 'react';
import productsService from '../../Services/productsService';
import nfcOrderChallengeService from '../../Services/nfcOrderChallengeService';
import { scanNfcCard } from './nfcWebReader';
import NfcCpfThreeDigits from './NfcCpfThreeDigits';

type Item = { id: number; name: string; price: number; stock: number | null };
type Step = 'DRAFT' | 'VERIFY' | 'SENDING' | 'SUCCESS';

export function NfcPrepareOrder({ comandaId, cardToken }: { comandaId: string; cardToken?: string }) {
  const [products, setProducts] = useState<Item[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>('DRAFT');
  const [challengeId, setChallengeId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [token, setToken] = useState(cardToken || '');
  const [prefix, setPrefix] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [observation, setObservation] = useState('');
  useEffect(() => {
    let active = true;
    void productsService.listProducts().then((data: unknown) => {
      if (!active) return;
      setProducts((Array.isArray(data) ? data : []).flatMap((item: unknown) => {
        if (!item || typeof item !== 'object') return [];
        const product = item as Record<string, unknown>;
        return Number.isSafeInteger(product.id) && product.active !== false ? [{
          id: Number(product.id), name: String(product.name || ''), price: Number(product.price) || 0,
          stock: product.stock == null ? null : Number(product.stock),
        }] : [];
      }));
    }).catch(() => { if (active) setError('Não foi possível carregar o cardápio.'); });
    return () => { active = false; };
  }, []);
  const selected = products.filter(p => (quantities[p.id] || 0) > 0);
  const filtered = products.filter(p => p.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const total = selected.reduce((sum, p) => sum + Math.round(p.price * 100) * quantities[p.id], 0);
  const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const reset = () => {
    if (busy || step === 'SENDING') return;
    setQuantities({}); setToken(cardToken || ''); setPrefix(''); setObservation(''); setSearch('');
    setChallengeId(''); setExpiresAt(''); setOrderId(null); setError(''); setStep('DRAFT');
  };
  const start = async () => {
    if (!selected.length || busy) return;
    setError(''); setBusy(true);
    try {
      const challenge = await nfcOrderChallengeService.create(comandaId,
        selected.map(p => ({ productId: p.id, quantity: quantities[p.id] })),
        crypto.randomUUID().replace(/-/g, ''), observation.trim() || undefined);
      setChallengeId(challenge.challengeId);
      setExpiresAt(challenge.expiresAt);
      setToken(cardToken || '');
      setStep('VERIFY');
    } catch { setError('Não foi possível preparar a confirmação. Confira os produtos e a comanda.'); }
    finally { setBusy(false); }
  };
  const readCard = async () => {
    if (busy) return;
    setError(''); setBusy(true);
    try { setToken(await scanNfcCard()); }
    catch { setError('Não foi possível ler o cartão neste aparelho. No iPhone, aproxime o cartão e abra a página NFC no navegador.'); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!token || !/^[0-9]{3}$/.test(prefix) || !challengeId || busy) return;
    setError(''); setBusy(true);
    try {
      await nfcOrderChallengeService.verify(challengeId, token, prefix);
      setStep('SENDING');
      const created = await nfcOrderChallengeService.finalize(challengeId);
      setOrderId(created.orderId); setPrefix(''); setStep('SUCCESS');
    } catch {
      setPrefix('');
      setError('Confirmação não concluída. Confira o cartão e os três dígitos. Se a identidade já foi validada, confira o status do pedido antes de tentar novamente.');
    } finally { setBusy(false); }
  };
  const retrySend = async () => {
    if (!challengeId || busy) return;
    setBusy(true); setError('');
    try {
      const created = await nfcOrderChallengeService.finalize(challengeId);
      setOrderId(created.orderId); setStep('SUCCESS');
    } catch { setError('Ainda não foi possível registrar o pedido. Nenhum segundo pedido será criado com esta confirmação.'); }
    finally { setBusy(false); }
  };
  return <section aria-label="Pedido por comanda NFC" style={{ display: 'grid', gap: 12 }}>
    <h4>Cardápio do restaurante · Pedido NFC</h4>
    {step === 'DRAFT' && <>
      <p>O garçom ou atendente seleciona o pedido. O cliente confirma com os três primeiros dígitos do CPF; quando o cartão já abriu esta página, não é necessária outra aproximação.</p>
      <label>Buscar no cardápio<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto" autoComplete="off" /></label>
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {filtered.map(p => <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #e9eef1' }}>
          <span>{p.name} · {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          <input type="number" aria-label={`Quantidade de ${p.name}`} min="0" max="100" style={{ width: 68 }} value={quantities[p.id] || 0}
            onChange={e => setQuantities(current => ({ ...current, [p.id]: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))} />
        </div>)}
      </div>
      <section aria-label="Sacola do cliente" style={{display:'grid',gap:9,border:'1px solid #dce3e7',borderRadius:12,padding:15}}>
        <strong>Sacola · {selected.reduce((a,p)=>a+quantities[p.id],0)} itens</strong>
        {selected.length===0 ? <p>Selecione os produtos do cliente.</p> : selected.map(p => <div key={p.id} style={{display:'flex',justifyContent:'space-between',gap:10}}><span>{quantities[p.id]}x {p.name}</span><strong>{brl(Math.round(p.price*100)*quantities[p.id])}</strong></div>)}
        <label>Observação geral do pedido (opcional)<input value={observation} maxLength={400} onChange={e=>setObservation(e.target.value)} placeholder="Ex.: entregar sem contato" /></label>
        <strong>Total deste pedido: {brl(total)}</strong>
        <small>O valor definitivo é calculado novamente no backend. Observações individuais e adicionais por produto exigem suporte específico da API.</small>
      </section>
      <button type="button" disabled={busy || !selected.length} onClick={() => void start()}>Revisar e confirmar pedido NFC</button>
    </>}
    {step === 'VERIFY' && <div style={{ display: 'grid', gap: 12 }}>
      <h4>Confirmar pedido na comanda NFC</h4>
      <p>Pedido preparado para esta comanda. Confira os itens e confirme a identidade do titular antes de enviar. Expira às {new Date(expiresAt).toLocaleTimeString('pt-BR')}.</p>
      <div style={{border:'1px solid #dce3e7',borderRadius:12,padding:14,display:'grid',gap:8}}><strong>Resumo do pedido</strong>{selected.map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',gap:12}}><span>{quantities[p.id]}x {p.name}</span><strong>{brl(Math.round(p.price*100)*quantities[p.id])}</strong></div>)}{observation.trim()&&<small>Observação geral: {observation.trim()}</small>}<strong>Total estimado: {brl(total)}</strong><small>Comanda: {comandaId.slice(0,8).toUpperCase()}. O servidor valida cartão, vínculo e valores.</small></div>
      {!cardToken && <button type="button" disabled={busy} onClick={() => void readCard()}>{token ? 'Cartão identificado · Ler novamente' : 'Aproximar cartão NFC (Android)'}</button>}
      {cardToken && <p role="status">Cartão recebido pelo link NFC. Confirme com os três dígitos do CPF do titular.</p>}
      {!cardToken && <p>Em iPhones, use o link gravado no cartão NFC para abrir o atendimento.</p>
        <NfcCpfThreeDigits value={prefix} onChange={setPrefix} disabled={busy} />
      <button type="button" disabled={busy || !token || prefix.length !== 3} onClick={() => void confirm()}>
        Confirmar identidade e enviar à cozinha como não pago
      </button>
      <button type="button" disabled={busy} onClick={reset}>Cancelar e refazer sacola</button>
    </div>}
    {step === 'SENDING' && <div role="status">
      <p>Identidade confirmada. Registrando pedido e enviando à cozinha...</p>
      <button type="button" disabled={busy} onClick={() => void retrySend()}>Verificar / reenviar com segurança</button>
    </div>}
    {step === 'SUCCESS' && <div role="status" style={{display:'grid',gap:12}}><p><strong>Pedido #{orderId} registrado — NÃO PAGO.</strong> Vinculado à comanda e encaminhado à operação conforme o backend.</p><button type="button" onClick={reset}>Novo pedido para esta comanda</button></div>}
    {error && <p role="alert" style={{ color: '#9e2626' }}>{error}</p>}
  </section>;
}
