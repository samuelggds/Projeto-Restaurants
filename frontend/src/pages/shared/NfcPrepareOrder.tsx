import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import productsService from '../../Services/productsService';
import { useAuth } from '../../contexts/authContext';
import nfcOrderChallengeService from '../../Services/nfcOrderChallengeService';
import { scanNfcCard } from './nfcWebReader';
import NfcCpfThreeDigits from './NfcCpfThreeDigits';
import { NfcProductThumbnail } from './NfcProductThumbnail';
import { nfcFriendlyError } from './nfcFriendlyMessages';
import { CheckCircle2, Clock3, ChefHat, Minus, Plus, RotateCcw, Search, ShoppingBag, ShieldCheck } from 'lucide-react';


// A reusable fallback for the order builder outside the staff-only visual wrapper.
// The staff screen keeps its higher-specificity reference styles unchanged.
const OrderLayout = styled.section`
  &.nfc-order {
    --gx-ink: #26313c; --gx-muted: #6a7682; --gx-line: #e4e9ee;
    --gx-brand: #bd4414; --gx-soft: #fff3ed; --gx-bg: #f7f9fa;
    display: grid; gap: 15px; min-width: 0; color: var(--gx-ink);
    color-scheme: light;
  }
  &.nfc-order *, &.nfc-order *::before, &.nfc-order *::after { box-sizing: border-box; }
  &.nfc-order h2, &.nfc-order h3, &.nfc-order h4, &.nfc-order p { margin: 0; }
  &.nfc-order > h4 { font-size: 15px; line-height: 1.35; }
  &.nfc-order .gx-order-workspace {
    display: grid; grid-template-columns: minmax(0, 1fr) minmax(250px, 300px);
    gap: 16px; min-width: 0; align-items: start;
  }
  &.nfc-order .gx-catalog { display: grid; gap: 11px; min-width: 0; }
  &.nfc-order .gx-inline-context {
    display: flex; align-items: center; gap: 11px; padding: 11px 13px;
    background: var(--gx-bg); border: 1px solid var(--gx-line); border-radius: 12px;
  }
  &.nfc-order .gx-avatar {
    flex: none; display: grid; place-items: center; width: 40px; height: 40px;
    border-radius: 11px; background: var(--gx-soft); color: var(--gx-brand);
  }
  &.nfc-order .gx-avatar svg { width: 19px; height: 19px; }
  &.nfc-order .gx-inline-context strong { display: block; font-size: 13px; }
  &.nfc-order .gx-inline-context small { display: block; font-size: 11px; color: var(--gx-muted); overflow-wrap: anywhere; }
  &.nfc-order .gx-inline-context > svg { flex: none; margin-left: auto; width: 18px; color: #178253; }
  &.nfc-order .gx-search { position: relative; display: block; }
  &.nfc-order .gx-search > svg { position: absolute; top: 13px; left: 13px; height: 19px; width: 19px; color: var(--gx-muted); pointer-events: none; }
  &.nfc-order input:not([type="checkbox"]), &.nfc-order textarea {
    width: 100%; max-width: 100%; min-width: 0; min-height: 44px;
    padding: 10px 12px; font: inherit; font-size: 14px; color: var(--gx-ink);
    background: #fff; border: 1px solid #cbd5dd; border-radius: 10px;
  }
  &.nfc-order .gx-search input { padding-left: 43px; }
  &.nfc-order textarea { min-height: 80px; resize: vertical; }
  &.nfc-order .gx-categories { display: flex; gap: 7px; flex-wrap: wrap; }
  &.nfc-order .gx-categories button {
    min-height: 38px; padding: 7px 12px; border-radius: 9px; cursor: pointer;
    border: 1px solid var(--gx-line); color: var(--gx-ink); background: #fff;
    font: inherit; font-size: 12px; font-weight: 700;
  }
  &.nfc-order .gx-categories button[aria-pressed="true"] { background: var(--gx-soft); border-color: var(--gx-brand); color: var(--gx-brand); }
  &.nfc-order .gx-list-meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; color: var(--gx-muted); font-size: 12px; }
  &.nfc-order .gx-products {
    display: grid; border: 1px solid var(--gx-line); border-radius: 12px;
    background: #fff; overflow-y: auto; max-height: 470px; overscroll-behavior: contain;
  }
  &.nfc-order .gx-product { display: grid; grid-template-columns: 68px minmax(0, 1fr); gap: 12px; padding: 13px; align-items: center; min-width: 0; }
  &.nfc-order .gx-product + .gx-product { border-top: 1px solid var(--gx-line); }
  &.nfc-order .gx-product .gx-photo { width: 68px; height: 68px; flex-basis: 68px; border-radius: 10px; }
  &.nfc-order .gx-product-body { min-width: 0; }
  &.nfc-order .gx-product h3 { font-size: 14px; font-weight: 750; line-height: 1.3; overflow-wrap: anywhere; }
  &.nfc-order .gx-product p { margin-top: 3px; font-size: 11px; line-height: 1.45; color: var(--gx-muted); overflow-wrap: anywhere; }
  &.nfc-order .gx-product-bottom { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 8px; }
  &.nfc-order .gx-price { white-space: nowrap; font-size: 13px; color: #29333f; }
  &.nfc-order .gx-quantity { display: inline-flex; flex: none; align-items: center; gap: 0; border: 1px solid #dce3e9; border-radius: 9px; background: #f8fafc; overflow: hidden; }
  &.nfc-order .gx-quantity button { display: grid; place-items: center; width: 37px; height: 38px; padding: 0; border: 0; background: transparent; color: var(--gx-brand); cursor: pointer; }
  &.nfc-order .gx-quantity button:hover:not(:disabled) { background: var(--gx-soft); }
  &.nfc-order .gx-quantity button:disabled { color: #a3adb7; cursor: not-allowed; }
  &.nfc-order .gx-quantity svg { width: 16px; height: 16px; }
  &.nfc-order .gx-quantity output { min-width: 25px; text-align: center; font-size: 13px; font-weight: 800; }
  &.nfc-order .gx-panel { display: grid; gap: 12px; min-width: 0; border: 1px solid var(--gx-line); border-radius: 14px; padding: 17px; background: #fff; }
  &.nfc-order .gx-cart { position: sticky; top: 0; background: #fcfdfd; }
  &.nfc-order .gx-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  &.nfc-order .gx-section-heading h2 { font-size: 17px; line-height: 1.3; }
  &.nfc-order .gx-count { font-size: 12px; font-weight: 700; color: #51606d; background: #eaf0f4; padding: 5px 9px; border-radius: 8px; white-space: nowrap; }
  &.nfc-order .gx-cart-empty { display: flex; align-items: center; gap: 10px; padding: 10px 0; color: var(--gx-muted); font-size: 13px; }
  &.nfc-order .gx-cart-empty svg { width: 20px; flex: none; }
  &.nfc-order .gx-mini-line { display: flex; align-items: center; gap: 9px; padding: 9px 0; border-bottom: 1px solid var(--gx-line); font-size: 12px; }
  &.nfc-order .gx-mini-line .gx-photo { width: 40px; height: 40px; flex-basis: 40px; border-radius: 8px; }
  &.nfc-order .gx-mini-line > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  &.nfc-order .gx-mini-line > strong { white-space: nowrap; font-size: 12px; }
  &.nfc-order .gx-field { display: grid; gap: 6px; color: #43505d; font-size: 12px; font-weight: 750; }
  &.nfc-order .gx-total-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; border-top: 1px solid var(--gx-line); padding: 13px 0 0; font-size: 12px; color: var(--gx-muted); }
  &.nfc-order .gx-total-row strong { color: var(--gx-ink); font-size: 20px; }
  &.nfc-order .gx-button {
    display: inline-flex; justify-content: center; align-items: center; gap: 8px;
    width: 100%; min-height: 44px; padding: 10px 14px; background: #fff;
    color: var(--gx-ink); border: 1px solid #cbd5dd; border-radius: 10px;
    cursor: pointer; font: inherit; font-size: 13px; font-weight: 750;
  }
  &.nfc-order .gx-button.gx-primary { color: #fff; background: var(--gx-brand); border-color: var(--gx-brand); }
  &.nfc-order .gx-button.gx-primary:hover:not(:disabled) { background: #943410; }
  &.nfc-order .gx-button:disabled { background: #e7ebef; border-color: #e7ebef; color: #64707b; cursor: not-allowed; opacity: 1; }
  &.nfc-order .gx-mini-caption, &.nfc-order .gx-help, &.nfc-order .gx-line-note { font-size: 12px; color: var(--gx-muted); line-height: 1.55; }
  &.nfc-order .gx-line-note { display: flex; align-items: center; gap: 7px; }
  &.nfc-order .gx-line-note svg { width: 16px; flex: none; }
  &.nfc-order .gx-empty { display: grid; place-items: center; text-align: center; gap: 8px; padding: 26px 10px; }
  &.nfc-order .gx-empty svg { width: 24px; }
  &.nfc-order .gx-empty h3 { font-size: 15px; }
  &.nfc-order .gx-empty p { font-size: 12px; color: var(--gx-muted); }
  &.nfc-order .gx-status-hero { display: grid; justify-items: center; text-align: center; gap: 12px; padding: 8px 0; }
  &.nfc-order .gx-status-symbol { display: grid; place-items: center; width: 54px; height: 54px; color: #90601b; background: #fff5e2; border-radius: 16px; }
  &.nfc-order .gx-status-symbol svg { width: 28px; height: 28px; }
  &.nfc-order .gx-status-hero h2 { font-size: 20px; }
  &.nfc-order .gx-status-hero p { max-width: 440px; font-size: 13px; color: var(--gx-muted); }
  &.nfc-order .gx-status-hero.gx-success .gx-status-symbol { color: #207749; background: #e7f6ec; }
  &.nfc-order .gx-steps { list-style: none; padding: 0; margin: 0; }
  &.nfc-order .gx-steps li { display: flex; align-items: flex-start; gap: 10px; padding: 12px 0; }
  &.nfc-order .gx-steps li + li { border-top: 1px solid var(--gx-line); }
  &.nfc-order .gx-step-icon { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; flex: none; color: #258454; background: #eaf6ee; }
  &.nfc-order .gx-step-icon.gx-wait { color: #966421; background: #fff5e2; }
  &.nfc-order .gx-step-icon svg { width: 16px; height: 16px; }
  &.nfc-order .gx-steps small { display: block; font-size: 12px; color: var(--gx-muted); }
  &.nfc-order .gx-order-cpf-confirmation { display: flex; justify-content: center; width: 100%; margin: 12px 0 16px; }
  &.nfc-order .gx-order-cpf-confirmation > label { width: min(100%, 270px); }
  &.nfc-order button:focus-visible, &.nfc-order input:focus-visible, &.nfc-order textarea:focus-visible { outline: 3px solid #e9a27d; outline-offset: 2px; }
  @media (max-width: 850px) {
    &.nfc-order .gx-order-workspace { grid-template-columns: minmax(0, 1fr); }
    &.nfc-order .gx-products { max-height: 390px; }
    &.nfc-order .gx-cart { position: static; }
  }
  @media (max-width: 480px) {
    &.nfc-order .gx-panel { padding: 13px; }
    &.nfc-order .gx-product { grid-template-columns: 56px minmax(0, 1fr); gap: 10px; padding: 11px; }
    &.nfc-order .gx-product .gx-photo { width: 56px; height: 58px; flex-basis: 56px; }
    &.nfc-order .gx-products { max-height: none; }
    &.nfc-order .gx-product-bottom { align-items: flex-start; }
    &.nfc-order .gx-quantity button { width: 39px; min-height: 42px; }
    &.nfc-order .gx-categories button { min-height: 44px; }
  }
  @media (prefers-reduced-motion: reduce) {
    &.nfc-order *, &.nfc-order *::before, &.nfc-order *::after { transition: none; }
  }
`;

type Item = { id: number; name: string; price: number; stock: number | null; image: string | null; description: string; category: string };
type Step = 'DRAFT' | 'VERIFY' | 'SENDING' | 'SUCCESS';

export function NfcPrepareOrder({ comandaId, cardToken }: { comandaId: string; cardToken?: string }) {
  const { user } = useAuth();
  const tenantId = Number(user?.restaurantId ?? user?.restaurant?.id ?? 0);
  const [products, setProducts] = useState<Item[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>('DRAFT');
  const draftKeyRef = useRef<{ key: string; fingerprint: string } | null>(null);
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
    if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
      return () => { active = false; };
    }
    void productsService.listProducts(tenantId).then((data: unknown) => {
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
  }, [tenantId]);
  const selected = products.filter(p => (quantities[p.id] || 0) > 0);
  const categories = ['Todos', ...new Set(products.map(p => p.category))];
  const filtered = products.filter(p => (category === 'Todos' || p.category === category) && p.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const total = selected.reduce((sum, p) => sum + Math.round(p.price * 100) * quantities[p.id], 0);
  const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const reset = () => {
    if (busy || step === 'SENDING') return;
    setQuantities({}); setToken(cardToken || ''); setPrefix(''); setObservation(''); setSearch(''); setCategory('Todos');
    draftKeyRef.current = null;
    setChallengeId(''); setExpiresAt(''); setOrderId(null); setError(''); setStep('DRAFT');
  };
  const start = async () => {
    if (!selected.length || busy) return;
    setError(''); setBusy(true);
    try {
      // A network retry must keep its key only while the submitted payload
      // is identical. Changing an item, quantity or note is a NEW draft.
      const items = selected.map(p => ({ productId: p.id, quantity: quantities[p.id] }));
      const note = observation.trim() || undefined;
      const fingerprint = JSON.stringify({ comandaId, items, ...(note ? { observation: note } : {}) });
      const previous = draftKeyRef.current;
      const key = previous?.fingerprint === fingerprint ? previous.key : crypto.randomUUID().replace(/-/g, '');
      draftKeyRef.current = { fingerprint, key };
      const challenge = await nfcOrderChallengeService.create(comandaId, items, key, note);
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
  const serverError = nfcFriendlyError;
  const confirm = async () => {
    if (!token || !/^[0-9]{3}$/.test(prefix) || !challengeId || busy) return;
    setError(''); setBusy(true);
    try {
      const checked = await nfcOrderChallengeService.verify(challengeId, token, prefix);
      if (checked.verified !== true) throw new Error('Não foi possível confirmar sua identidade.');
    } catch (cause) {
      setPrefix('');
      setError(serverError(cause, 'Não foi possível confirmar seus dados. Confira o cartão e o CPF e tente novamente.'));
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
      setError(serverError(cause, 'A confirmação foi feita, mas o pedido ainda não foi concluído. Toque em “Verificar pedido” para continuar.'));
    } finally { setBusy(false); }
  };
  const retrySend = async () => {
    if (!challengeId || busy) return;
    setBusy(true); setError('');
    try {
      const created = await nfcOrderChallengeService.finalize(challengeId);
      setOrderId(created.orderId); setStep('SUCCESS');
    } catch (cause) {
      setError(serverError(cause, 'Não foi possível concluir seu pedido. Você pode tentar novamente com segurança.'));
    } finally { setBusy(false); }
  };
  return <OrderLayout className="nfc-order" aria-label="Pedido por comanda NFC">
    <h4>Cardápio do restaurante · Pedido NFC</h4>
    {step === 'DRAFT' && <div className="gx-order-workspace">
      <div className="gx-catalog">
      <div className="gx-inline-context"><span className="gx-avatar"><ShoppingBag aria-hidden="true"/></span><div><strong>Comanda identificada</strong><small>#{comandaId.slice(0,8).toUpperCase()} · Atendimento do restaurante</small></div><CheckCircle2 aria-hidden="true"/></div>
      <label className="gx-search" aria-label="Buscar produtos"><Search aria-hidden="true"/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar no cardápio..."/></label>
      <div className="gx-categories" aria-label="Categorias do cardápio">
        {categories.map(name=><button type="button" key={name} aria-pressed={category===name} onClick={()=>setCategory(name)}>{name}</button>)}
      </div>
      <div className="gx-list-meta"><span>{filtered.length} produtos</span><span>Cardápio do restaurante</span></div>
      {(!Number.isSafeInteger(tenantId) || tenantId <= 0) && <p role="alert" className="gx-error">Não foi possível identificar o restaurante. Entre novamente para continuar.</p>}
      {loadingProducts && tenantId > 0 && <p role="status">Carregando produtos...</p>}
      {!loadingProducts && filtered.length===0 && <div className="gx-empty"><span><Search aria-hidden="true"/></span><h3>Nenhum produto encontrado</h3><p>Pesquise novamente ou escolha outra categoria.</p></div>}
      <div className="gx-products">{filtered.map(item=><article className="gx-product" key={item.id}>
        <NfcProductThumbnail className="gx-photo" source={item.image}/>
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
      </div>
      <section className="gx-panel gx-cart" aria-label="Sacola do cliente">
        <div className="gx-section-heading"><h2>Sacola do cliente</h2><span className="gx-count">{selected.reduce((a,p)=>a+quantities[p.id],0)} itens</span></div>
        {selected.length===0 ? <div className="gx-cart-empty"><ShoppingBag aria-hidden="true"/> Selecione os produtos do cliente.</div> : selected.map(p=><div className="gx-mini-line" key={p.id}><NfcProductThumbnail source={p.image}/><span>{quantities[p.id]}× {p.name}</span><strong>{brl(Math.round(p.price*100)*quantities[p.id])}</strong></div>)}
        <label className="gx-field gx-note-field">Observação geral do pedido (opcional)<textarea value={observation} maxLength={400} onChange={e=>setObservation(e.target.value)} placeholder="Ex.: entregar sem contato"/></label>
        <div className="gx-total-row"><span>Total estimado</span><strong>{brl(total)}</strong></div>
        <button type="button" className="gx-button gx-primary" disabled={busy||!selected.length} onClick={()=>void start()}>Revisar pedido</button>
        <p className="gx-mini-caption">O total será confirmado ao registrar o pedido. O pagamento será feito separadamente.</p>
      </section>
    </div>}
    {step === 'VERIFY' && <section className="gx-panel" aria-label="Revisar e confirmar pedido">
      <div className="gx-status-hero"><span className="gx-status-symbol"><ShieldCheck aria-hidden="true"/></span><h2>Confirmar pedido do cliente</h2>
        <p>Confira os itens. O titular confirma com os três primeiros dígitos do CPF. Expira às {new Date(expiresAt).toLocaleTimeString('pt-BR')}.</p></div>
      {selected.map(p=><div className="gx-mini-line" key={p.id}><NfcProductThumbnail source={p.image}/><span>{quantities[p.id]}× {p.name}</span><strong>{brl(Math.round(p.price*100)*quantities[p.id])}</strong></div>)}
      <div className="gx-total-row"><span>Total estimado</span><strong>{brl(total)}</strong></div>
      {observation.trim() && <p className="gx-help">Observação: {observation.trim()}</p>}
      {!cardToken && <button type="button" className="gx-button" disabled={busy} onClick={()=>void readCard()}>{token ? 'Ler cartão novamente' : 'Aproximar cartão NFC (Android)'}</button>}
      <p className="gx-line-note"><ShieldCheck aria-hidden="true"/> Cartão {cardToken ? 'identificado com sucesso' : 'necessário para confirmar'}. Confira os dados do cliente.</p>
      <div className="gx-order-cpf-confirmation">
        <NfcCpfThreeDigits value={prefix} onChange={setPrefix} disabled={busy}/>
      </div>
      <button type="button" className="gx-button gx-primary" disabled={busy||!token||prefix.length!==3} onClick={()=>void confirm()}>Confirmar identidade e enviar à cozinha</button>
      <button type="button" className="gx-button" disabled={busy} onClick={reset}>Editar a sacola</button>
    </section>}
    {step === 'SENDING' && <section className="gx-panel" role="status" aria-label="Confirmação do pedido">
      <div className="gx-status-hero"><span className="gx-status-symbol"><Clock3 aria-hidden="true"/></span>
        <h2>{busy ? 'Registrando seu pedido' : 'Confirmação pendente'}</h2><p>Sua identidade foi confirmada. Estamos finalizando seu pedido.</p></div>
      <ul className="gx-steps">
        <li><span className="gx-step-icon"><CheckCircle2 aria-hidden="true"/></span><div><strong>Identidade confirmada</strong><small>Cartão e CPF conferidos com sucesso.</small></div></li>
        <li><span className="gx-step-icon gx-wait"><RotateCcw aria-hidden="true"/></span><div><strong>Registro {busy ? 'em andamento' : 'a confirmar'}</strong><small>Você pode continuar de onde parou.</small></div></li>
        <li><span className="gx-step-icon gx-wait"><ChefHat aria-hidden="true"/></span><div><strong>Cozinha</strong><small>Aguardando a confirmação do pedido.</small></div></li>
      </ul>
      <button type="button" className="gx-button gx-primary" disabled={busy} onClick={()=>void retrySend()}><RotateCcw aria-hidden="true"/> Verificar pedido</button>
      <p className="gx-mini-caption">O pagamento será realizado separadamente, conforme as opções disponíveis.</p>
    </section>}
    {step === 'SUCCESS' && <section className="gx-panel" role="status"><div className="gx-status-hero gx-success">
      <span className="gx-status-symbol"><CheckCircle2 aria-hidden="true"/></span><h2>Pedido registrado</h2>
      <p>Pedido #{orderId} recebido com sucesso! A equipe já pode iniciar o preparo. O pagamento continua pendente.</p></div>
      <button type="button" className="gx-button gx-primary" onClick={reset}>Fazer novo pedido</button>
    </section>}
    {error && <p role="alert" style={{ color: '#9e2626' }}>{error}</p>}
  </OrderLayout>;
}
