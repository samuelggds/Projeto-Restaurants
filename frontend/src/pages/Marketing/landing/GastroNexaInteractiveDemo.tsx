import { useState } from 'react';
import { Check } from 'lucide-react';
import './GastroNexaInteractiveDemo.css';

type Mode = 'delivery' | 'mesas' | 'gestao';
const modes: { id: Mode; title: string }[] = [
  { id: 'delivery', title: '🛵 Delivery' },
  { id: 'mesas', title: '▦ QR Code na mesa' },
  { id: 'gestao', title: '▤ Gestão de pedidos' },
];
const products = [
  { name: 'Smash da casa', emoji: '🍔', price: 3290 },
  { name: 'Batata frita', emoji: '🍟', price: 1490 },
  { name: 'Refrigerante', emoji: '🥤', price: 790 },
];
const copy: Record<Mode, string[]> = {
  delivery: ['Escolha os produtos do cardápio', 'Confira o carrinho e os valores', 'Pedido registrado na operação', 'Acompanhe o andamento'],
  mesas: ['Acesse o cardápio pelo QR da mesa', 'Confira os itens da mesa 08', 'Envie o pedido à equipe', 'Acompanhe o atendimento'],
  gestao: ['Pedido recebido pela operação', 'Confira os itens no painel', 'Encaminhe à cozinha', 'Acompanhe até a conclusão'],
};
const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function GastroNexaInteractiveDemo() {
  const [mode, setMode] = useState<Mode>('delivery');
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number[]>([0]);
  const total = selected.reduce((sum, idx) => sum + products[idx].price, 0);
  const chooseMode = (next: Mode) => { setMode(next); setStep(0); setSelected([0]); };
  const choose = (idx: number) => setSelected(old => old.includes(idx)
    ? old.length > 1 ? old.filter(item => item !== idx) : old
    : [...old, idx]);
  const move = (offset: number) => setStep(old => Math.max(0, Math.min(3, old + offset)));
  return <section className="gn-try" id="demonstracao" aria-label="Demonstração interativa GastroNexa">
    <div className="gn-try-wrap">
      <div className="gn-try-head">
        <small>EXPERIMENTE A GASTRONEXA</small>
        <h2>Veja a plataforma funcionando antes de contratar.</h2>
        <p>Escolha uma modalidade e navegue pelas etapas. Uma apresentação interativa para conhecer a experiência do restaurante.</p>
      </div>
      <div className="gn-try-modes" role="group" aria-label="Escolha uma demonstração">
        {modes.map(item => <button type="button" key={item.id} aria-pressed={mode === item.id} onClick={() => chooseMode(item.id)}>{item.title}</button>)}
      </div>
      <div className="gn-try-main">
        <div className="gn-try-copy">
          <span className="gn-try-chip">ETAPA {step + 1} DE 4 · DEMONSTRAÇÃO</span>
          <h3>{mode === 'delivery' ? 'Um delivery organizado.' : mode === 'mesas' ? 'Autoatendimento pelo QR da mesa.' : 'Cada pedido no lugar certo.'}</h3>
          <p>{mode === 'delivery' ? 'Uma experiência de compra simples para o cliente e uma operação clara para a equipe.' : mode === 'mesas' ? 'O cliente usa o cardápio da mesa, enquanto a equipe acompanha os pedidos.' : 'Veja como o pedido passa pelas etapas do restaurante.'}</p>
          <strong>{copy[mode][step]}</strong>
          <div className="gn-try-dots" aria-label="Etapas">
            {[0,1,2,3].map(idx => <button key={idx} aria-label={'Etapa ' + (idx + 1)} aria-current={step === idx ? 'step' : undefined} type="button" onClick={() => setStep(idx)}>{idx+1}</button>)}
          </div>
          <div className="gn-try-actions">
            <button className="gn-try-btn secondary" type="button" disabled={step === 0} onClick={() => move(-1)}>Anterior</button>
            <button className="gn-try-btn" type="button" onClick={() => step === 3 ? setStep(0) : move(1)}>{step === 3 ? 'Recomeçar' : 'Próxima etapa →'}</button>
          </div>
          <a href="#contato" className="gn-try-btn secondary" style={{width:'fit-content'}}>Solicitar demonstração personalizada</a>
        </div>
        <div className="gn-try-area">
          <div className="gn-try-phone">
            <div className="gn-try-phoneheader">Gastro<span>Nexa</span><small>{mode === 'mesas' ? 'Mesa 08 · QR' : mode === 'gestao' ? 'Painel de pedidos' : 'Cardápio digital'}</small></div>
            <div className="gn-try-body" key={mode + step}>
              {step === 0 && <>
                <strong style={{fontSize:13,color:'#243a2d'}}>{mode === 'gestao' ? 'Pedido recebido' : 'Escolha seus produtos'}</strong>
                {products.map((product,idx) => <button type="button" key={product.name} className="gn-try-product" onClick={() => choose(idx)} aria-pressed={selected.includes(idx)} style={{cursor:'pointer',background:selected.includes(idx)?'#fff3e6':'white'}}>
                  <span style={{fontSize:21}}>{product.emoji}</span><span style={{flex:1}}><b>{product.name}</b><small>{selected.includes(idx)?'✓ Selecionado':'Toque para escolher'}</small></span><strong>{money(product.price)}</strong>
                </button>)}
              </>}
              {step === 1 && <>
                <strong style={{fontSize:13,color:'#243a2d'}}>Resumo do pedido</strong>
                {selected.map(idx => <div className="gn-try-product" key={idx}><span style={{fontSize:21}}>{products[idx].emoji}</span><span style={{flex:1}}><b>{products[idx].name}</b><small>Quantidade 1</small></span><strong>{money(products[idx].price)}</strong></div>)}
                <div className="gn-try-product"><b>Total ilustrativo</b><strong>{money(total)}</strong></div>
              </>}
              {step === 2 && <div className="gn-try-success" role="status"><Check size={30}/><strong>Pedido recebido!</strong><p>A equipe foi notificada nesta simulação. Nenhum pedido verdadeiro foi criado.</p></div>}
              {step === 3 && <>
                <strong style={{fontSize:13,color:'#243a2d'}}>Acompanhamento</strong>
                {['Pedido recebido','Em preparo','Pronto para finalizar'].map(item => <div className="gn-try-product" key={item}><Check size={18} color="#23834b"/><b>{item}</b></div>)}
                <div className="gn-try-success"><strong>Equipe conectada</strong><p>Visualize o andamento de forma organizada.</p></div>
              </>}
            </div>
          </div>
        </div>
      </div>
      <p className="gn-try-note">Demonstração ilustrativa e animada. Não movimenta dinheiro, não consulta clientes reais nem cria pedidos no restaurante. Os recursos disponíveis variam conforme o plano contratado.</p>
    </div>
  </section>;
}
