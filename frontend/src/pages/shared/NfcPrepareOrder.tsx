import { useEffect, useState } from 'react';
import productsService from '../../Services/productsService';
import nfcOrderChallengeService from '../../Services/nfcOrderChallengeService';

type Item = { id: number; name: string; price: number; stock: number | null };
export function NfcPrepareOrder({ comandaId }: { comandaId: string }) {
  const [products, setProducts] = useState<Item[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [challengeId, setChallengeId] = useState('');
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
    }).catch(() => { if (active) setError('Não foi possível carregar os produtos.'); });
    return () => { active = false; };
  }, []);
  const selected = products.filter(p => (quantities[p.id] || 0) > 0);
  const submit = async () => {
    setError(''); setBusy(true);
    try {
      const response = await nfcOrderChallengeService.create(comandaId,
        selected.map(p => ({ productId: p.id, quantity: quantities[p.id] })),
        crypto.randomUUID().replace(/-/g, ''));
      setChallengeId(response.challengeId); setExpiresAt(response.expiresAt);
    } catch { setError('Não foi possível preparar a confirmação. Confira os itens e a comanda.'); }
    finally { setBusy(false); }
  };
  return <section aria-label="Preparar pedido NFC" style={{display:'grid',gap:12}}>
    <h4>Preparar pedido para confirmação NFC</h4>
    <p>Selecione os itens. O cliente deverá aproximar o cartão e informar os três primeiros dígitos do CPF. O pedido ainda não será lançado na cozinha.</p>
    {!challengeId ? <>
      <div style={{maxHeight:240,overflowY:'auto'}}>
        {products.map(p => <div key={p.id} style={{display:'flex',alignItems:'center',gap:9,justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #e9eef1'}}>
          <span>{p.name} · {p.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>
          <input type="number" aria-label={`Quantidade de ${p.name}`} min="0" max="100" style={{width:68}} value={quantities[p.id] || 0}
            onChange={e => setQuantities(current => ({...current,[p.id]:Math.min(100,Math.max(0,Number(e.target.value)||0))}))} />
        </div>)}
      </div>
      <button type="button" disabled={busy || selected.length===0} onClick={() => void submit()}>
        {busy ? 'Preparando...' : 'Solicitar confirmação pelo cartão'}
      </button>
    </> : <div role="status" style={{padding:12,background:'#edf6ef',borderRadius:10}}>
      Confirmação iniciada. Aproxime o cartão NFC no Android ou iPhone deste operador e toque em "Confirmar pedido com este cartão".
      Válida até {new Date(expiresAt).toLocaleTimeString('pt-BR')}.
      <p>Identificador da verificação: {challengeId.slice(0,8)}</p>
    </div>}
    {error && <p role="alert" style={{color:'#9e2626'}}>{error}</p>}
  </section>;
}
