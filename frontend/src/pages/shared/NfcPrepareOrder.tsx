import { useEffect, useState } from 'react';
import productsService from '../../Services/productsService';
import nfcOrderChallengeService from '../../Services/nfcOrderChallengeService';
import { scanNfcCard } from './nfcWebReader';
import NfcCpfThreeDigits from './NfcCpfThreeDigits';
import { NfcProductThumbnail } from './NfcProductThumbnail';
import { CheckCircle2, Clock3, ChefHat, Minus, Plus, RotateCcw, Search, ShoppingBag, ShieldCheck } from 'lucide-react';

type Item = { id: number; name: string; price: number; stock: number | null; image: string | null; description: string; category: string };
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
  const [category, setCategory] = useState('Todos');
  const [loadingProducts, setLoadingProducts] = useState(true);
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
          image: typeof product.image === 'string' ? product.image : null,
          description: String(product.description || ''), category: String((product.category as {name?:string}|null)?.name || 'Outros'),
        }] : [];
      }));
    }).catch(() => { if (active) setError('Não foi possível carregar o cardápio.'); }).finally(() => { if (active) setLoadingProducts(false); });
    return () => { active = false; };
  }, []);
  const selected = products.filter(p => (quantities[p.id] || 0) > 0);
  const categories = ['Todos', ...new Set(products.map(p => p.category))];
  const filtered = products.filter(p => (category === 'Todos' || p.category === category) && p.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const total = selected.reduce((sum, p) => sum + Math.round(p.price * 100) * quantities[p.id], 0);
  const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const reset = () => {
    if (busy || step === 'SENDING') return;
    setQuantities({}); setToken(cardToken || ''); setPrefix(''); setObservation(''); setSearch(''); setCategory('Todos');
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
  const serverError = (cause: unknown, fallback: string) => {
    const response = cause as { response?: { data?: { error?: string } } };
    return response.response?.data?.error || fallback;
  };
  const confirm = async () => {
    if (!token || !/^[0-9]{3}$/.test(prefix) || !challengeId || busy) return;
    setError(''); setBusy(true);
    try {
      const checked = await nfcOrderChallengeService.verify(challengeId, token, prefix);
      if (checked.verified !== true) throw new Error('Confirmação não recebida do backend.');
    } catch (cause) {
      setPrefix('');
      setError(serverError(cause, 'O servidor não confirmou o cartão e os dígitos do CPF. Confira o vínculo e tente novamente.'));
      setBusy(false);
      return;
    }
    // Once verified, never re-send CPF: the existing idempotent challenge
    // is the only allowed route for finalizing this exact order.
    setPrefix(''); setStep('SENDING');
    try {
      const created = await nfcOrderChallengeService.finalize(challengeId);
      setOrderId(created.orderId); setStep('SUCCESS');
    } catch (cause) {
      setError(serverError(cause, 'Identidade confirmada, mas o pedido não foi registrado. Confira o resultado antes de tentar novamente.'));
    } finally { setBusy(false); }
  };
  const retrySend = async () => {
    if (!challengeId || busy) return;
    setBusy(true); setError('');
    try {
      const created = await nfcOrderChallengeService.finalize(challengeId);
      setOrderId(created.orderId); setStep('SUCCESS');
    } catch (cause) {
      setError(serverError(cause, 'Não foi possível concluir este pedido. Nenhuma nova confirmação será criada.'));
    } finally { setBusy(false); }
  };
  return <section aria-label="Pedido por comanda NFC" style={{ display: 'grid', gap: 12 }}>
    <h4>Cardápio do restaurante · Pedido NFC</h4>
    {step === 'DRAFT' && <>
      <div className="gx-inline-context"><span className="gx-avatar"><ShoppingBag aria-hidden="true"/></span><div><strong>Comanda identificada</strong><small>#{comandaId.slice(0,8).toUpperCase()} · restaurante autenticado</small></div><CheckCircle2 aria-hidden="true"/></div>
      <label className="gx-search" aria-label="Buscar produtos"><Search aria-hidden="true"/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar no cardápio..."/></label>
      <div className="gx-categories" aria-label="Categorias do cardápio">
        {categories.map(name=><button type="button" key={name} aria-pressed={category===name} onClick={()=>setCategory(name)}>{name}</button>)}
      </div>
      <div className="gx-list-meta"><span>{filtered.length} produtos</span><span>Cardápio do restaurante</span></div>
      {loadingProducts && <p role="status">Carregando produtos...</p>}
      {!loadingProducts && filtered.length===0 && <div className="gx-empty"><span><Search aria-hidden="true"/></span><h3>Nenhum produto encontrado</h3><p>Pesquise novamente ou escolha outra categoria.</p></div>}
      <div className="gx-products">{filtered.map(item=><article className="gx-product" key={item.id}>
        <NfcProductThumbnail source={item.image}/>
        <div className="gx-product-body"><h3>{item.name}</h3><p>{item.description}</p>
          <div className="gx-product-bottom"><strong className="gx-price">{brl(Math.round(item.price*100))}</strong>
            <div className="gx-quantity">
              <button type="button" aria-label={`Diminuir quantidade de ${item.name}`} disabled={(quantities[item.id]||0)===0} onClick={()=>setQuantities(q=>({...q,[item.id]:Math.max(0,(q[item.id]||0)-1)}))}><Minus aria-hidden="true"/></button>
              <output aria-label={`Quantidade de ${item.name}`}>{quantities[item.id]||0}</output>
              <button type="button" aria-label={`Aumentar quantidade de ${item.name}`} disabled={(quantities[item.id]||0)>=100||(item.stock!==null&&(quantities[item.id]||0)>=item.stock)} onClick={()=>setQuantities(q=>({...q,[item.id]:Math.min(100,(q[item.id]||0)+1)}))}><Plus aria-hidden="true"/></button>
            </div>
          </div>
        </div>
      </article>)}</div>
      <section className="gx-panel gx-cart" aria-label="Sacola do cliente">
        <div className="gx-section-heading"><h2>Sacola do cliente</h2><span className="gx-count">{selected.reduce((a,p)=>a+quantities[p.id],0)} itens</span></div>
        {selected.length===0 ? <div className="gx-cart-empty"><ShoppingBag aria-hidden="true"/> Selecione os produtos do cliente.</div> : selected.map(p=><div className="gx-mini-line" key={p.id}><NfcProductThumbnail source={p.image}/><span>{quantities[p.id]}× {p.name}</span><strong>{brl(Math.round(p.price*100)*quantities[p.id])}</strong></div>)}
        <label className="gx-field gx-note-field">Observação geral do pedido (opcional)<textarea value={observation} maxLength={400} onChange={e=>setObservation(e.target.value)} placeholder="Ex.: entregar sem contato"/></label>
        <div className="gx-total-row"><span>Total estimado</span><strong>{brl(total)}</strong></div>
        <button type="button" className="gx-button gx-primary" disabled={busy||!selected.length} onClick={()=>void start()}>Revisar pedido</button>
        <p className="gx-mini-caption">Valor definitivo validado pelo backend. Nenhum pagamento é realizado nesta tela.</p>
      </section>
    </>}
    {step === 'VERIFY' && <div style={{ display: 'grid', gap: 12 }}>
      <h4>Confirmar pedido na comanda NFC</h4>
      <p>Pedido preparado para esta comanda. Confira os itens e confirme a identidade do titular antes de enviar. Expira às {new Date(expiresAt).toLocaleTimeString('pt-BR')}.</p>
      <div style={{border:'1px solid #dce3e7',borderRadius:12,padding:14,display:'grid',gap:8}}><strong>Resumo do pedido</strong>{selected.map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',gap:12}}><span>{quantities[p.id]}x {p.name}</span><strong>{brl(Math.round(p.price*100)*quantities[p.id])}</strong></div>)}{observation.trim()&&<small>Observação geral: {observation.trim()}</small>}<strong>Total estimado: {brl(total)}</strong><small>Comanda: {comandaId.slice(0,8).toUpperCase()}. O servidor valida cartão, vínculo e valores.</small></div>
      {!cardToken && <button type="button" disabled={busy} onClick={() => void readCard()}>{token ? 'Cartão identificado · Ler novamente' : 'Aproximar cartão NFC (Android)'}</button>}
      {cardToken && <p role="status">Cartão recebido pelo link NFC. Confirme com os três dígitos do CPF do titular.</p>}
      {!cardToken && <p>Em iPhones, use o link gravado no cartão NFC para abrir o atendimento.</p>}
        <NfcCpfThreeDigits value={prefix} onChange={setPrefix} disabled={busy} />
      <button type="button" disabled={busy || !token || prefix.length !== 3} onClick={() => void confirm()}>
        Confirmar identidade e enviar à cozinha como não pago
      </button>
      <button type="button" disabled={busy} onClick={reset}>Cancelar e refazer sacola</button>
    </div>}
    {step === 'SENDING' && <div role="status">
      <p>Identidade confirmada pelo servidor. {busy ? 'Registrando pedido...' : 'Confira o estado abaixo e conclua usando a mesma confirmação.'}</p>
      <button type="button" disabled={busy} onClick={() => void retrySend()}>Verificar / reenviar com segurança</button>
    </div>}
    {step === 'SUCCESS' && <div role="status" style={{display:'grid',gap:12}}><p><strong>Pedido #{orderId} registrado — NÃO PAGO.</strong> Vinculado à comanda e encaminhado à operação conforme o backend.</p><button type="button" onClick={reset}>Novo pedido para esta comanda</button></div>}
    {error && <p role="alert" style={{ color: '#9e2626' }}>{error}</p>}
  </section>;
}
