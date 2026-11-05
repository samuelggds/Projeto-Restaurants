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
    {step === 'VERIFY' && <section className="gx-panel" aria-label="Revisar e confirmar pedido">
      <div className="gx-status-hero"><span className="gx-status-symbol"><ShieldCheck aria-hidden="true"/></span><h2>Confirmar pedido do cliente</h2>
        <p>Confira os itens. O titular confirma com os três primeiros dígitos do CPF. Expira às {new Date(expiresAt).toLocaleTimeString('pt-BR')}.</p></div>
      {selected.map(p=><div className="gx-mini-line" key={p.id}><NfcProductThumbnail source={p.image}/><span>{quantities[p.id]}× {p.name}</span><strong>{brl(Math.round(p.price*100)*quantities[p.id])}</strong></div>)}
      <div className="gx-total-row"><span>Total estimado</span><strong>{brl(total)}</strong></div>
      {observation.trim() && <p className="gx-help">Observação: {observation.trim()}</p>}
      {!cardToken && <button type="button" className="gx-button" disabled={busy} onClick={()=>void readCard()}>{token ? 'Ler cartão novamente' : 'Aproximar cartão NFC (Android)'}</button>}
      <p className="gx-line-note"><ShieldCheck aria-hidden="true"/> Cartão {cardToken ? 'identificado pelo link NFC' : 'necessário para confirmar'}. O servidor confere o titular.</p>
      <NfcCpfThreeDigits value={prefix} onChange={setPrefix} disabled={busy}/>
      <button type="button" className="gx-button gx-primary" disabled={busy||!token||prefix.length!==3} onClick={()=>void confirm()}>Confirmar identidade e enviar à cozinha</button>
      <button type="button" className="gx-button" disabled={busy} onClick={reset}>Editar a sacola</button>
    </section>}
    {step === 'SENDING' && <section className="gx-panel" role="status" aria-label="Confirmação do pedido">
      <div className="gx-status-hero"><span className="gx-status-symbol"><Clock3 aria-hidden="true"/></span>
        <h2>{busy ? 'Registrando seu pedido' : 'Confirmação pendente'}</h2><p>A identidade foi validada, mas o pedido só é considerado registrado depois de resposta do servidor.</p></div>
      <ul className="gx-steps">
        <li><span className="gx-step-icon"><CheckCircle2 aria-hidden="true"/></span><div><strong>Identidade confirmada</strong><small>O backend validou o cartão e os dígitos.</small></div></li>
        <li><span className="gx-step-icon gx-wait"><RotateCcw aria-hidden="true"/></span><div><strong>Registro {busy ? 'em andamento' : 'a confirmar'}</strong><small>Retomar a mesma tentativa, sem duplicação.</small></div></li>
        <li><span className="gx-step-icon gx-wait"><ChefHat aria-hidden="true"/></span><div><strong>Cozinha</strong><small>Aguardando registro confirmado.</small></div></li>
      </ul>
      <button type="button" className="gx-button gx-primary" disabled={busy} onClick={()=>void retrySend()}><RotateCcw aria-hidden="true"/> Verificar / reenviar com segurança</button>
      <p className="gx-mini-caption">Confirmação do pedido não significa pagamento efetuado.</p>
    </section>}
    {step === 'SUCCESS' && <section className="gx-panel" role="status"><div className="gx-status-hero gx-success">
      <span className="gx-status-symbol"><CheckCircle2 aria-hidden="true"/></span><h2>Pedido registrado</h2>
      <p>Pedido #{orderId} confirmado pelo backend e encaminhado ao restaurante como NÃO PAGO.</p></div>
      <button type="button" className="gx-button gx-primary" onClick={reset}>Fazer novo pedido</button>
    </section>}
    {error && <p role="alert" style={{ color: '#9e2626' }}>{error}</p>}
  </section>;
}
