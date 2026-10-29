import { useEffect, useState } from 'react';
import productsService from '../../Services/productsService';
import nfcOrderChallengeService from '../../Services/nfcOrderChallengeService';
import { scanNfcCard } from './nfcWebReader';

type Item = { id: number; name: string; price: number; stock: number | null };
type Step = 'DRAFT' | 'VERIFY' | 'SENDING' | 'SUCCESS';

export function NfcPrepareOrder({ comandaId }: { comandaId: string }) {
  const [products, setProducts] = useState<Item[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>('DRAFT');
  const [challengeId, setChallengeId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [token, setToken] = useState('');
  const [prefix, setPrefix] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
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
  const start = async () => {
    if (!selected.length || busy) return;
    setError(''); setBusy(true);
    try {
      const challenge = await nfcOrderChallengeService.create(comandaId,
        selected.map(p => ({ productId: p.id, quantity: quantities[p.id] })),
        crypto.randomUUID().replace(/-/g, ''));
      setChallengeId(challenge.challengeId);
      setExpiresAt(challenge.expiresAt);
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
      <p>O garçom ou atendente seleciona o pedido do cliente. Ao enviar, será necessário aproximar o cartão e confirmar os três primeiros dígitos do CPF.</p>
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {products.map(p => <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #e9eef1' }}>
          <span>{p.name} · {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          <input type="number" aria-label={`Quantidade de ${p.name}`} min="0" max="100" style={{ width: 68 }} value={quantities[p.id] || 0}
            onChange={e => setQuantities(current => ({ ...current, [p.id]: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))} />
        </div>)}
      </div>
      <button type="button" disabled={busy || !selected.length} onClick={() => void start()}>Enviar pedido à cozinha</button>
    </>}
    {step === 'VERIFY' && <div style={{ display: 'grid', gap: 12 }}>
      <p>Pedido preparado. Confirme o cartão NFC e a identidade do cliente. Expira às {new Date(expiresAt).toLocaleTimeString('pt-BR')}.</p>
      <button type="button" disabled={busy} onClick={() => void readCard()}>{token ? 'Cartão identificado · Ler novamente' : 'Aproximar cartão NFC (Android)'}</button>
      <p>Em iPhones, aproxime o cartão do aparelho e abra o link NFC da GastroNexa para confirmar.</p>
      <label>Três primeiros dígitos do CPF
        <input type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{3}" minLength={3} maxLength={3}
          value={prefix} onChange={e => setPrefix(e.target.value.replace(/\D/g, '').slice(0, 3))} />
      </label>
      <button type="button" disabled={busy || !token || prefix.length !== 3} onClick={() => void confirm()}>
        Confirmar identidade e enviar à cozinha como não pago
      </button>
    </div>}
    {step === 'SENDING' && <div role="status">
      <p>Identidade confirmada. Registrando pedido e enviando à cozinha...</p>
      <button type="button" disabled={busy} onClick={() => void retrySend()}>Verificar / reenviar com segurança</button>
    </div>}
    {step === 'SUCCESS' && <p role="status"><strong>Pedido #{orderId} enviado à operação — NÃO PAGO.</strong> O pedido foi lançado na comanda e seguirá a fila de capacidade da cozinha.</p>}
    {error && <p role="alert" style={{ color: '#9e2626' }}>{error}</p>}
  </section>;
}
