import { useRef, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { Bike, ChevronDown, MapPin, Search, CheckCircle2 } from 'lucide-react';
import api from '../../../Services/api';
import { lookupCep } from '../../../Services/cepService';

const Surface = styled.section`
  max-width: 1060px; margin: 14px auto 24px; color: #2d2928;
  button { cursor: pointer; font: inherit; }
  .trigger { background: #fff; border: 1px solid #e6e4e2; border-radius: 14px; padding: 14px 17px; width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 9px; color: #302c29; font-weight: 800; text-align: left; }
  .trigger span { display: flex; align-items: center; gap: 9px; }
  .trigger svg, .heading svg { width: 19px; height: 19px; color: #ff4b4b; }
  .body { display: grid; gap: 13px; margin-top: 9px; padding: 20px; background: white; border: 1px solid #e8e5e2; border-radius: 17px; box-shadow: 0 12px 36px #0000000b; }
  .heading { display: flex; gap: 10px; align-items: center; }
  h3 { font-size: 17px; margin: 0; font-weight: 850; }
  p { margin: 3px 0 0; font-size: 12px; color: #697078; }
  .grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
  label { display: grid; gap: 5px; color: #505963; font-size: 11px; font-weight: 700; min-width: 0; }
  .wide { grid-column: 1/-1; }
  input { background: white; color: #242629; font: inherit; font-size: 16px; border: 1px solid #dadfe3; border-radius: 9px; padding: 10px; min-width: 0; width: 100%; height: 44px; box-sizing: border-box; }
  .cep { display: flex; gap: 9px; align-items: end; }
  .cep label { flex: 1; }
  .lookup { border: 1px solid #ffd5d5; background: #fff5f5; color: #b93232; border-radius: 9px; height: 44px; padding: 0 14px; font-weight: 800; }
  .calculate { display: flex; align-items: center; justify-content: center; gap: 8px; border: none; border-radius: 10px; background: #ff4b4b; color: white; min-height: 46px; font-weight: 850; }
  .calculate svg { width: 18px; }
  button:disabled { cursor: not-allowed; opacity: .55; }
  button:focus-visible, input:focus-visible { outline: 2px solid #ff4b4b; outline-offset: 2px; }
  .result { background: #f2fff4; border: 1px solid #b5ebc5; border-radius: 12px; padding: 13px; display: grid; gap: 9px; }
  .success { color: #138e43; display: flex; align-items: center; gap: 7px; font-weight: 800; font-size: 13px; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .columns span { display: grid; gap: 3px; font-size: 11px; color: #65716a; }
  .columns strong { color: #1e2d25; font-size: 19px; }
  .columns .price { color: #07883c; }
  .alert { padding: 10px; background: #fff4f1; color: #ad422a; border-radius: 8px; font-size: 12px; }
  @media (max-width: 600px) { margin: 10px 12px 18px; .body { padding: 14px; } }
`;
const money = (n: number) => n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
type Address = {cep:string;address:string;number:string;district:string;city:string;state:string};
const empty: Address = {cep:'',address:'',number:'',district:'',city:'',state:''};

export function HomeDeliveryEstimator({ restaurantId, deliveryFeeMode, fixedFee, enabled }: {
  restaurantId: number | null; deliveryFeeMode?: 'FIXED'|'DISTANCE'; fixedFee?: number; enabled: boolean;
}) {
  const [open,setOpen]=useState(false);
  const [address,setAddress]=useState<Address>(empty);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [looking,setLooking]=useState(false);
  const [estimate,setEstimate]=useState<{fee:number;meters:number|null;key:string}|null>(null);
  const seq=useRef(0);
  const mode=deliveryFeeMode === 'DISTANCE'?'DISTANCE':'FIXED';
  const key=[restaurantId,mode,...Object.values(address)].join('|');
  const update=(field:keyof Address,value:string)=>{seq.current++;setAddress(a=>({...a,[field]:value}));setEstimate(null);setNotice('');};
  const findCep=async()=>{
    const digits=address.cep.replace(/\D/g,'');
    if(digits.length!==8){setNotice('Informe um CEP válido com oito números.');return;}
    const request=++seq.current;setLooking(true);setNotice('');setEstimate(null);
    try {
      const found=await lookupCep(digits);
      if(request!==seq.current)return;
      setAddress(a=>({...a,cep:digits,address:found.address,district:found.district,city:found.city,state:found.state,number:''}));
      setNotice('Endereço encontrado. Informe o número e confira todos os campos.');
    } catch(e) {if(request===seq.current)setNotice(e instanceof Error?e.message:'CEP não encontrado.');}
    finally {if(request===seq.current)setLooking(false);}
  };
  const calculate=async()=>{
    const request=++seq.current;
    if(!restaurantId){setNotice('Restaurante não identificado.');return;}
    if(address.cep.replace(/\D/g,'').length!==8||!address.address.trim()||!address.number.trim()||!address.district.trim()||!address.city.trim()||!/^[A-Z]{2}$/i.test(address.state.trim())){
      setNotice('Informe CEP e endereço completo, incluindo número, para calcular a rota.');return;
    }
    setBusy(true);setNotice('');
    try {
      const {data}=await api.post('/orders/delivery-fee',{restaurantId,type:'DELIVERY',address:address.address,number:address.number,district:address.district,city:address.city,state:address.state});
      if(request!==seq.current)return;
      const fee=Number(data.deliveryFeeAmount);
      if(!Number.isFinite(fee)||fee<0)throw new Error('Taxa inválida retornada pelo servidor.');
      setEstimate({fee,meters:data.deliveryDistanceMeters===null?null:Number(data.deliveryDistanceMeters),key});
    } catch(e) {
      if(request!==seq.current)return;
      const server=axios.isAxiosError(e)?e.response?.data?.error:null;
      setNotice(typeof server==='string'?server.slice(0,220):e instanceof Error?e.message:'Não foi possível calcular a taxa.');
    } finally {if(request===seq.current)setBusy(false);}
  };
  if(!enabled)return null;
  return <Surface aria-label="Consulta de entrega">
    <button type="button" className="trigger" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      <span><MapPin aria-hidden="true"/>{mode==='DISTANCE'?'Informe seu endereço e consulte a taxa':'Taxa fixa de entrega'}</span><ChevronDown aria-hidden="true"/>
    </button>
    {open&&<div className="body">
      <div className="heading"><Bike aria-hidden="true"/><div><h3>Calcular taxa de entrega</h3><p>{mode==='FIXED'?'Este restaurante utiliza taxa fixa.':'Informe seu endereço para consultar a taxa real por distância.'}</p></div></div>
      {mode==='FIXED'?<div className="result"><span className="success"><CheckCircle2/> Taxa fixa configurada</span><div className="columns"><span>Taxa padrão<strong className="price">{money(Number(fixedFee||0))}</strong></span><span>Modalidade<strong>Entrega</strong></span></div><p>Cupons e benefícios são verificados no checkout.</p></div>:<>
        <div className="cep"><label>CEP<input inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={address.cep} onChange={e=>update('cep',e.target.value.replace(/\D/g,'').slice(0,8))}/></label><button type="button" className="lookup" disabled={looking} onClick={()=>void findCep()}><Search size={15}/> {looking?'Buscando...':'Consultar'}</button></div>
        <div className="grid">
          <label className="wide">Rua<input autoComplete="address-line1" value={address.address} onChange={e=>update('address',e.target.value)}/></label>
          <label>Número<input autoComplete="address-line2" value={address.number} onChange={e=>update('number',e.target.value)}/></label>
          <label>Bairro<input value={address.district} onChange={e=>update('district',e.target.value)}/></label>
          <label>Cidade<input autoComplete="address-level2" value={address.city} onChange={e=>update('city',e.target.value)}/></label>
          <label>UF<input maxLength={2} autoComplete="address-level1" value={address.state} onChange={e=>update('state',e.target.value.toUpperCase())}/></label>
        </div>
        <button type="button" className="calculate" disabled={busy||looking} onClick={()=>void calculate()}><Bike aria-hidden="true"/>{busy?'Calculando...':'Calcular taxa de entrega'}</button>
        {notice&&<div className="alert" role="status">{notice}</div>}
        {estimate?.key===key&&<div className="result" role="status"><span className="success"><CheckCircle2/> Taxa calculada pelo servidor</span><div className="columns"><span>Distância da rota<strong>{estimate.meters===null?'Indisponível':(estimate.meters/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' km'}</strong></span><span>Taxa padrão<strong className="price">{money(estimate.fee)}</strong></span></div><p>O valor final será recalculado no checkout, com as regras e cupons do restaurante.</p></div>}
      </>}
    </div>}
  </Surface>;
}
