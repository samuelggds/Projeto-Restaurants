import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { ContactRound, CreditCard, ShieldCheck, UserPlus } from 'lucide-react';



import { NfcLinkedCustomers } from './NfcLinkedCustomers';
import { NfcCustomerRegistry } from './NfcCustomerRegistry';
import { NfcCardInventory } from './NfcCardInventory';
import { NfcBackendRegistration } from './NfcBackendRegistration';
import { NfcCardPreparation } from './NfcCardPreparation';
import { NfcLostCardRecovery } from './NfcLostCardRecovery';
import nfcRegistrationService from '../../Services/nfcRegistrationService';
import { NfcReceptionAnimation } from './NfcReceptionAnimation';


const Wrap = styled.section`

  --nfc-ink: #20272b;
  --nfc-muted: #68727b;
  --nfc-border: #e4e9ed;
  --nfc-orange: #e7631b;
  color: var(--nfc-ink);
  display: grid;
  gap: 20px;
  width: 100%;
  max-width: 1320px;
  min-width: 0;
  margin: 0 auto;
  box-sizing: border-box;
  & *, & *::before, & *::after { box-sizing: border-box; }
  h2, h3, p { margin: 0; }
  p, small { line-height: 1.5; color: var(--nfc-muted); }
  .nfc-hero {
    padding: clamp(22px, 3.2vw, 34px);
    border-radius: 22px;
    color: #fff;
    background: linear-gradient(115deg, #202b31 0%, #303a3f 70%, #3b342d 100%);
    box-shadow: 0 12px 34px #18212712;
  }
  .nfc-hero p { color: #d7dfe1; max-width: 660px; }
  .nfc-hero-top, .nfc-hero-content { display: flex; justify-content: space-between; align-items: center; gap: 18px; }
  .nfc-hero-content { align-items: flex-end; margin-top: 24px; }
  .nfc-eyebrow { text-transform: uppercase; letter-spacing: .14em; font-size: 11px; font-weight: 850; color: #ffaf7b; }
  .nfc-trust { display: inline-flex; align-items: center; gap: 7px; padding: 7px 10px; border: 1px solid #ffffff2c; border-radius: 100px; font-size: 11px; color: #f2f7f7; }
  .nfc-trust svg { width: 15px; height: 15px; color: #96e2bc; }
  .nfc-hero h2 { font-size: clamp(24px, 3.3vw, 33px); letter-spacing: -.04em; margin-bottom: 9px; color: #fff; }
  .nfc-hero-icon { width: 68px; height: 68px; display: grid; place-items: center; border-radius: 19px; flex-shrink: 0; background: #ffffff16; border: 1px solid #ffffff20; }
  .nfc-hero-icon svg { width: 34px; height: 34px; color: #ffae70; }
  .nfc-layout { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(270px, 1fr); align-items: start; gap: 18px; min-width: 0; }
  .nfc-main, .nfc-aside { display: grid; gap: 18px; min-width: 0; }
  .surface { border: 1px solid var(--nfc-border); padding: clamp(18px, 2.2vw, 25px); border-radius: 19px; background: #fff; display: grid; gap: 16px; min-width: 0; box-shadow: 0 5px 22px #18212708; }
  .nfc-section-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  .nfc-section-heading h3 { font-size: 18px; font-weight: 800; letter-spacing: -.025em; color: var(--nfc-ink); }
  .nfc-section-heading p { margin-top: 5px; font-size: 13px; }
  .nfc-section-icon { border-radius: 13px; background: #fff0e5; padding: 11px; display: inline-grid; place-items: center; flex-shrink: 0; }
  .nfc-section-icon svg { width: 24px; height: 24px; color: var(--nfc-orange); }
  .nfc-section-title { display: flex; gap: 13px; align-items: center; }
  .nfc-actions, .nfc-reader-actions, .nfc-lookup, .nfc-pagination, .nfc-financial-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
  .nfc-actions button, .nfc-reader-actions button, .nfc-form button, .nfc-lookup button,
  .nfc-pagination button, .nfc-section-heading > button, .nfc-person-actions button, .nfc-financial-heading > button, .nfc-payment-note button {
    min-height: 44px; padding: 10px 15px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    border: 1px solid var(--nfc-orange); border-radius: 11px; color: #fff; background: var(--nfc-orange);
    font: inherit; font-size: 13px; font-weight: 760; line-height: 1.2; cursor: pointer; text-decoration: none;
  }
  .nfc-actions button:focus-visible, .nfc-reader-actions button:focus-visible, .nfc-tabs button:focus-visible,
  .nfc-form button:focus-visible, .nfc-lookup button:focus-visible, .nfc-pagination button:focus-visible,
  .nfc-section-heading > button:focus-visible, .nfc-person-actions button:focus-visible,
  .nfc-financial-heading > button:focus-visible, .nfc-payment-note button:focus-visible, input:focus-visible {
    outline: 3px solid #f6ad79; outline-offset: 2px;
  }
  button:disabled { opacity: .58; cursor: not-allowed; }
  .nfc-actions .secondary, .nfc-reader-actions .secondary, .nfc-person-actions .secondary,
  .nfc-person-actions .danger, .nfc-pagination .secondary, .nfc-section-heading > .secondary, .nfc-financial-heading > .secondary {
    color: #36434d; background: #fff; border-color: #ccd5dc;
  }
  .nfc-person-actions .danger { color: #ae332f; border-color: #f0d1ce; }
  .nfc-actions button svg, .nfc-reader-actions button svg, .nfc-section-heading button svg,
  .nfc-payment-note button svg { width: 17px; height: 17px; }
  .nfc-tabs { display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 6px; background: #f3f5f6; border-radius: 13px; padding: 5px; }
  .nfc-tabs button { border: 0; border-radius: 9px; background: transparent; min-height: 47px; display: inline-flex; gap: 8px; align-items: center; justify-content: center; padding: 9px; color: #6a7277; font: inherit; font-weight: 750; font-size: 13px; cursor: pointer; }
  .nfc-tabs button[aria-selected="true"], .nfc-tabs button[aria-pressed="true"] { background: #fff; color: #c34f12; box-shadow: 0 2px 9px #20272b12; }
  .nfc-tabs button svg { width: 17px; height: 17px; }
  .nfc-form { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; align-items: end; }
  .nfc-form .nfc-wide { grid-column: 1 / -1; }
  label { display: grid; gap: 7px; font-size: 12px; font-weight: 800; color: #344049; }
  input:not([type="checkbox"]) { width: 100%; min-width: 0; min-height: 46px; padding: 11px 12px; border: 1px solid #cdd6dc; border-radius: 10px; color: #202a30; background: #fff; font: inherit; font-size: 14px; }
  input::placeholder { color: #97a0a7; }
  .nfc-form button { justify-self: start; }
  .nfc-hint { font-size: 12px; }
  .nfc-lookup input { flex: 1 1 210px; }
  .nfc-found { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; border-radius: 12px; padding: 14px; background: #f6faf7; border: 1px solid #cde6d5; }
  .nfc-found strong { display: block; font-size: 14px; color: #284d36; }
  .nfc-found small { display: block; font-size: 12px; margin-top: 4px; }
  .nfc-aside .nfc-guide { gap: 18px; }
  .nfc-guide-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 17px; }
  .nfc-guide-list li { display: flex; gap: 12px; align-items: flex-start; }
  .nfc-step { display: grid; place-items: center; width: 30px; height: 30px; flex-shrink: 0; border-radius: 10px; color: #bb4d17; background: #fff0e5; font-size: 11px; font-weight: 850; }
  .nfc-guide-list strong { display: block; font-size: 13px; color: #26323a; }
  .nfc-guide-list p { font-size: 12px; margin-top: 3px; }
  .nfc-payment-note { border-radius: 19px; background: #ecf7f0; border: 1px solid #cce9d6; padding: 21px; display: grid; gap: 11px; }
  .nfc-payment-note > svg { width: 28px; height: 28px; color: #188454; }
  .nfc-payment-note h3 { font-size: 17px; color: #1b5939; }
  .nfc-payment-note p { font-size: 12px; color: #466f58; }
  .nfc-payment-note button { background: #fff; color: #176c45; border-color: #bbdfc9; justify-self: start; }
  .nfc-message { border: 1px solid #f4d3bb; border-radius: 13px; padding: 13px 15px; background: #fff7f0; font-size: 13px; color: #81421d; }
  .nfc-message p { font-size: 12px; margin-top: 7px; }
  .nfc-message code { display: block; overflow-wrap: anywhere; padding: 10px; border-radius: 8px; background: #fff; margin: 12px 0; }
  .nfc-message svg { vertical-align: middle; width: 16px; height: 16px; }
  .nfc-message[role="alert"] { border-color: #edc6c2; background: #fff2f2; color: #9f2c2c; }
  .nfc-customers { gap: 11px; }
  .nfc-customer-list { display: grid; }
  .nfc-person { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 17px 0; border-bottom: 1px solid #ebeff2; }
  .nfc-person:last-child { border-bottom: 0; }
  .nfc-person-info { display: grid; gap: 6px; min-width: 0; }
  .nfc-person-info strong, .nfc-person-info small { overflow-wrap: anywhere; }
  .nfc-person-info strong { font-size: 14px; }
  .nfc-person-info small { font-size: 12px; }
  .nfc-cards { display: flex; gap: 6px; flex-wrap: wrap; }
  .nfc-cards span { border-radius: 7px; padding: 6px 8px; background: #f0f3f5; color: #49555e; font-size: 11px; font-weight: 700; }
  .nfc-person-actions { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }
  .nfc-person-actions button { min-height: 38px; padding: 8px 11px; font-size: 12px; }
  .nfc-financial { border: 1px solid #cfdfd5; background: #f8fcf9; border-radius: 14px; padding: 17px; margin-top: 11px; display: grid; gap: 15px; min-width: 0; }
  .nfc-financial-heading { justify-content: space-between; }
  .nfc-financial-heading h3 { color: #21593b; }
  .nfc-pagination { justify-content: flex-end; padding-top: 6px; }
  .nfc-pagination small { font-size: 12px; margin: 0 3px; }
  @media (max-width: 1120px) { .nfc-layout { grid-template-columns: minmax(0,1fr) 290px; } }
  @media (max-width: 900px) { .nfc-layout { grid-template-columns: minmax(0,1fr); } .nfc-aside { grid-template-columns: repeat(2,minmax(0,1fr)); align-items: stretch; } }
  .nfc-mobile-animation { display: none; }
  @media (max-width: 760px) {
    .nfc-hero { display: none; }
    .nfc-mobile-animation { display: block; }
  }
  @media (max-width: 650px) {
    gap: 13px;
    .nfc-hero { padding: 21px; border-radius: 17px; }
    .nfc-hero-icon { width: 44px; height: 44px; border-radius: 12px; }
    .nfc-hero-icon svg { width: 25px; height: 25px; }
    .nfc-hero h2 { font-size: 24px; }
    .nfc-hero-content { align-items: flex-start; margin-top: 19px; }
    .nfc-trust { font-size: 10px; padding: 6px 8px; }
    .nfc-aside { grid-template-columns: minmax(0,1fr); }
    .surface { padding: 16px; border-radius: 15px; }
    .nfc-section-heading { align-items: flex-start; }
    .nfc-section-heading h3 { font-size: 16px; }
    .nfc-form { grid-template-columns: 1fr; gap: 12px; }
    .nfc-form .nfc-wide { grid-column: auto; }
    .nfc-actions, .nfc-reader-actions, .nfc-lookup, .nfc-person-actions, .nfc-pagination { display: grid; grid-template-columns: minmax(0,1fr); width: 100%; }
    .nfc-actions button, .nfc-reader-actions button, .nfc-form button,
    .nfc-lookup button, .nfc-person-actions button, .nfc-pagination button { width: 100%; justify-self: stretch; }
    .nfc-person { display: grid; gap: 13px; }
    .nfc-financial-heading { align-items: flex-start; }
    .nfc-financial-heading button { flex-shrink: 0; }
    .nfc-tabs button { font-size: 12px; }
    .nfc-pagination { justify-items: stretch; }
    .nfc-payment-note button { width: 100%; }
  }

`;
type Props = { roleLabel?: string };
export function NfcRegistrationPanel(props: Props) {
  const [access, setAccess] = useState<'checking' | 'allowed' | 'blocked' | 'error'>('checking');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    void nfcRegistrationService.featureAccess().then(enabled => {
      if (live) setAccess(enabled ? 'allowed' : 'blocked');
    }).catch((error: unknown) => {
      if (!live) return;
      const response = error as { response?: { status?: number; data?: { code?: string } } };
      setAccess(response.response?.status === 403 &&
        response.response?.data?.code === 'PREMIUM_NFC_PLAN_REQUIRED' ? 'blocked' : 'error');
    });
    return () => { live = false; };
  }, [retry]);
  if (access === 'checking') return <div role="status">Verificando disponibilidade dos cartões NFC no plano contratado...</div>;
  if (access === 'error') return <div role="alert">
    Não foi possível consultar o plano NFC do restaurante.
    <button type="button" onClick={() => { setAccess('checking'); setRetry(current => current + 1); }}>Tentar novamente</button>
  </div>;
  if (access === 'blocked') return <div role="status" style={{
    padding: 28, borderRadius: 18, border: '1px solid #f1d8c8', background: '#fff8f3',
    display: 'grid', gap: 12, color: '#30251f',
  }}>
    <h2 style={{ margin: 0 }}>Cartões NFC: recurso Premium</h2>
    <p style={{ margin: 0 }}>Para cadastrar, preparar ou utilizar cartões NFC, o restaurante precisa do plano Premium ou Gestão Total ativo ou em teste.</p>
    <p style={{ margin: 0 }}>O sistema de delivery permanece no Básico. O atendimento por QR Code segue as regras do plano de mesas.</p>
    <a href="/admin?area=subscriptions&billing=plans" style={{ color: '#ce5918', fontWeight: 800 }}>Conhecer os planos</a>
    <small>Se você possui uma comanda anterior a uma mudança de plano, procure o administrador para regularizar o pagamento e devolver o cartão.</small>
  </div>;
  return <NfcRegistrationWorkspace {...props} />;
}
function NfcRegistrationWorkspace({ roleLabel = 'equipe' }: Props) {
  const [screen, setScreen] = useState<'registration' | 'registry' | 'linked' | 'inventory' | 'prepare' | 'recover'>('registration');
  const [inventoryRefresh, setInventoryRefresh] = useState(0);
  return <Wrap aria-label="Clientes e cartões NFC" data-nfc-ui="unified">
    <header className="nfc-hero">
      <div className="nfc-hero-top"><span className="nfc-eyebrow">GastroNexa · Cashless NFC</span>
        <span className="nfc-trust"><ShieldCheck aria-hidden="true" /> Dados protegidos</span>
      </div>
      <div className="nfc-hero-content">
        <div><h2>Clientes e cartões NFC</h2>
          <p>Cadastre clientes, vincule cartões e acompanhe comandas. Área de {roleLabel} com acesso restrito ao restaurante autenticado.</p></div>
        <span className="nfc-hero-icon"><ContactRound aria-hidden="true" /></span>
      </div>
    </header>
    <div className="nfc-mobile-animation"><NfcReceptionAnimation /></div>
    {screen !== 'prepare' && screen !== 'recover' && <nav className="nfc-tabs" aria-label="Áreas do atendimento NFC">
      <button type="button" aria-pressed={screen === 'registration'} onClick={() => setScreen('registration')}><UserPlus aria-hidden="true" /> Atendimento</button>
      <button type="button" aria-pressed={screen === 'registry'} onClick={() => setScreen('registry')}><ContactRound aria-hidden="true" /> Cadastro de clientes</button>
      <button type="button" aria-pressed={screen === 'linked'} onClick={() => setScreen('linked')}><ContactRound aria-hidden="true" /> Clientes vinculados</button>
      <button type="button" aria-pressed={screen === 'inventory'} onClick={() => setScreen('inventory')}><CreditCard aria-hidden="true" /> Cartões</button>
    </nav>}
    {screen === 'recover' ? <NfcLostCardRecovery onBack={() => setScreen('linked')} /> :
      screen === 'prepare' ? <NfcCardPreparation onBack={() => setScreen('inventory')} onPrepared={() => setInventoryRefresh(v => v + 1)} /> :
      screen === 'inventory' ? <NfcCardInventory refreshKey={inventoryRefresh}
        onPrepare={() => setScreen('prepare')} onRegister={() => setScreen('prepare')} /> :
      screen === 'registry' ? <NfcCustomerRegistry /> :
      screen === 'linked' ? <><div className="nfc-actions" style={{ justifyContent: 'flex-end' }}><button type="button" className="secondary" onClick={() => setScreen('recover')}>Recuperar cartão perdido</button></div><NfcLinkedCustomers /></> :
      <NfcBackendRegistration onCompleted={() => setInventoryRefresh(v => v + 1)} onBackToPanel={() => setScreen('linked')} />}
  </Wrap>;
}
