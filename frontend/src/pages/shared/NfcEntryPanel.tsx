import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, LockKeyhole, LogIn, ShieldCheck, ShoppingBag, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Shell = styled.main`
  --entry-bg: #f7f8fa; --entry-surface: #fff; --entry-text: #232b35;
  --entry-muted: #637181; --entry-border: #e2e7ee; --entry-soft: #f0f3f7;
  --entry-orange: #ba3f10; --entry-on-orange: #fff; --entry-tint: #fff2e8;
  --entry-green: #267345; --entry-green-bg: #edf8f0;
  background: var(--entry-bg); color: var(--entry-text); min-height: 100dvh;
  padding: clamp(20px, 5vw, 29px) 16px 30px; box-sizing: border-box;
  *, *::before, *::after { box-sizing: border-box; }
  .entry-shell { width: min(100%, 500px); margin: 0 auto; }
  .entry-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 28px; }
  .entry-logo { display: inline-flex; align-items: center; min-width: 0; gap: 8px; font-size: clamp(21px, 5vw, 25px);
    font-weight: 650; letter-spacing: -.06em; white-space: nowrap; }
  .entry-logo img { width: 37px; height: 37px; object-fit: contain; }
  .entry-logo span span { color: var(--entry-orange); }
  .entry-tag { font-size: 11px; border-radius: 5px; padding: 6px 9px; color: var(--entry-muted);
    background: var(--entry-soft); white-space: nowrap; }
  .entry-card { padding: 25px 23px 22px; background: var(--entry-surface); border: 1px solid var(--entry-border);
    border-radius: 15px; }
  h1, p { margin: 0; } h1 { font-size: clamp(24px, 6vw, 29px); line-height: 1.2;
    letter-spacing: -.035em; font-weight: 650; }
  .entry-ready { display: inline-flex; align-items: center; gap: 7px; color: var(--entry-green);
    background: var(--entry-green-bg); border-radius: 6px; padding: 7px 9px; font-size: 11px; }
  .entry-ready svg { width: 15px; height: 15px; }
  .entry-heading { margin-top: 20px; max-width: 340px; }
  .entry-description { color: var(--entry-muted); font-size: 13px; line-height: 1.55; margin: 11px 0 23px; }
  .entry-options { display: grid; gap: 12px; }
  .entry-choice { display: flex; align-items: center; gap: 13px; min-height: 93px; width: 100%;
    padding: 15px 16px; border: 1px solid var(--entry-border); background: var(--entry-surface);
    border-radius: 12px; text-align: left; text-decoration: none; color: var(--entry-text); font: inherit;
    cursor: pointer; transition: border-color .16s, transform .16s; }
  .entry-choice:hover { border-color: var(--entry-orange); }
  .entry-choice-client { background: var(--entry-orange); border-color: var(--entry-orange); color: var(--entry-on-orange); }
  .entry-choice-client:hover { border-color: var(--entry-orange); opacity: .96; }
  .entry-choice-icon { width: 36px; flex: 0 0 36px; display: grid; place-items: center; }
  .entry-choice-icon svg { width: 24px; height: 24px; stroke-width: 1.6; }
  .entry-choice-staff .entry-choice-icon { color: var(--entry-orange); }
  .entry-choice-copy { display: grid; flex: 1; min-width: 0; gap: 5px; }
  .entry-choice-copy strong { font-size: 15px; line-height: 1.35; }
  .entry-choice-copy small { font-size: 11px; line-height: 1.45; opacity: .84; }
  .entry-choice-staff .entry-choice-copy small { color: var(--entry-muted); }
  .entry-choice > svg { width: 17px; height: 17px; flex-shrink: 0; }
  .entry-choice:disabled { opacity: .55; cursor: not-allowed; }
  .entry-note, .entry-footer { color: var(--entry-muted); font-size: 11px;
    display: flex; align-items: center; justify-content: center; gap: 7px; text-align: center; }
  .entry-note { margin-top: 20px; }
  .entry-note svg, .entry-footer svg { height: 15px; width: 15px; flex-shrink: 0; }
  .entry-footer { margin-top: 23px; }
  .entry-back { display: flex; align-items: center; gap: 7px; color: var(--entry-orange); background: transparent;
    border: none; font: inherit; font-size: 12px; min-height: 44px; padding: 0; margin: -9px 0 17px;
    cursor: pointer; }
  .entry-back svg { width: 17px; height: 17px; }
  .entry-staff-icon { display: grid; place-items: center; width: 49px; height: 49px;
    background: var(--entry-tint); color: var(--entry-orange); border-radius: 12px; margin-bottom: 21px; }
  .entry-staff-label { font-size: 11px; letter-spacing: .07em; color: var(--entry-muted); margin-bottom: 10px; }
  .entry-staff-card h1 { margin-bottom: 15px; }
  .entry-staff-card p { color: var(--entry-muted); line-height: 1.7; font-size: 13px; }
  .entry-staff-card p + p { margin-top: 12px; }
  .entry-login { margin-top: 24px; display: flex; width: 100%; align-items: center; justify-content: center;
    gap: 8px; background: var(--entry-orange); color: var(--entry-on-orange); text-decoration: none;
    font-size: 13px; font-weight: 650; border-radius: 9px; min-height: 48px; padding: 12px; }
  .entry-login svg { width: 17px; height: 17px; }
  .entry-unavailable { color: var(--entry-muted); border: 1px dashed var(--entry-border); padding: 11px;
    border-radius: 9px; margin-top: 20px; font-size: 12px; }
  .entry-hint { font-size: 11px!important; text-align: center; margin-top: 10px!important; }
  .entry-operations { margin-top: 20px; padding: 22px; background: var(--entry-surface);
    border: 1px solid var(--entry-border); border-radius: 15px; display: grid; gap: 14px; }
  .entry-operations h2 { font-size: 18px; margin: 0; }
  .entry-operations p { color: var(--entry-muted); line-height: 1.5; }
  .entry-operations form { min-width: 0; }
  .entry-operations label { display: grid; gap: 7px; font-size: 13px; font-weight: 600; }
  .entry-operations input:not([type=checkbox]) { width: 100%; min-width: 0; padding: 12px;
    border: 1px solid var(--entry-border); border-radius: 9px; font: inherit; background: var(--entry-surface);
    color: var(--entry-text); }
  .entry-operations input[type=checkbox] { flex-shrink: 0; }
  .entry-operations button { min-height: 45px; padding: 11px 13px; background: var(--entry-orange);
    border: 0; border-radius: 9px; color: var(--entry-on-orange); font: inherit; font-weight: 600; cursor: pointer; }
  .entry-operations button:disabled { opacity: .6; cursor: not-allowed; }
  .entry-operations .error { padding: 12px; border-radius: 8px; background: #fff0ef; color: #992d21; }
  .entry-operations .success { padding: 12px; border-radius: 8px; background: var(--entry-green-bg); color: var(--entry-green); }
  a:focus-visible, button:focus-visible { outline: 3px solid var(--entry-orange); outline-offset: 3px; }
  @media (prefers-color-scheme: dark) {
    --entry-bg: #151a20; --entry-surface: #202731; --entry-text: #f1f4f8; --entry-muted: #b3bdca;
    --entry-border: #3c4552; --entry-soft: #2a3441; --entry-orange: #ff9b69;
    --entry-on-orange: #2b1508; --entry-tint: #3b2b23; --entry-green: #8ad9a8;
    --entry-green-bg: #243c30;
  }
  @media (max-width: 360px) {
    padding-inline: 11px;
    .entry-card { padding: 21px 17px; }
    .entry-choice { padding: 13px 11px; gap: 9px; }
    .entry-choice-copy strong { font-size: 14px; }
    .entry-logo { font-size: 21px; }
    .entry-tag { font-size: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .entry-choice { transition: none; }
  }
`;

type Props = {
  view: 'home' | 'staff';
  validCard: boolean;
  loadingCard: boolean;
  customerPath: string;
  loginPath: string;
  onStaff: () => void;
  onOrder: () => void;
  onPayment: () => void;
  staffMode?: 'staff' | 'order' | 'payment';
  onBack: () => void;
  children?: ReactNode;
};

export default function NfcEntryPanel({ view, validCard, loadingCard, customerPath, loginPath, onStaff, onOrder, onPayment, onBack, staffMode = 'staff', children }: Props) {
  return <Shell><div className="entry-shell">
    <header className="entry-header">
      <div className="entry-logo"><img src="/gastronexa-logo.svg" alt="" /> <span>Gastro<span>Nexa</span></span></div>
      <span className="entry-tag">Acesso NFC protegido</span>
    </header>
    {view === 'home' ? <section className="entry-card" aria-label="Escolha de acesso NFC">
      <span className="entry-ready"><CheckCircle2 />
        {loadingCard ? 'Verificando cartão NFC' : validCard ? 'Cartão NFC identificado' : 'Cartão não confirmado'}
      </span>
      <h1 className="entry-heading">Como você quer continuar?</h1>
      <p className="entry-description">Escolha o acesso para o seu atendimento.</p>
      <div className="entry-options">
        {validCard ? <Link className="entry-choice entry-choice-client" to={customerPath}>
          <span className="entry-choice-icon"><ClipboardList /></span>
          <span className="entry-choice-copy"><strong>Ver minha comanda</strong><small>Pedidos e valores da sua visita</small></span>
          <ArrowRight aria-hidden="true" />
        </Link> : <button type="button" className="entry-choice entry-choice-client" disabled>
          <span className="entry-choice-icon"><ClipboardList /></span>
          <span className="entry-choice-copy"><strong>Ver minha comanda</strong><small>Pedidos e valores da sua visita</small></span>
          <ArrowRight aria-hidden="true" />
        </button>}
        <button type="button" className="entry-choice entry-choice-staff" onClick={onStaff}>
          <span className="entry-choice-icon"><ShieldCheck /></span>
          <span className="entry-choice-copy"><strong>Acessar painel do restaurante</strong><small>Exclusivo para a equipe autorizada</small></span>
          <ArrowRight aria-hidden="true" />
        </button>
        <button type="button" className="entry-choice entry-choice-staff" onClick={onOrder} disabled={!validCard}>
          <span className="entry-choice-icon"><ShoppingBag /></span>
          <span className="entry-choice-copy"><strong>Fazer pedido</strong><small>O garçom ou atendente prepara o pedido e o cliente confirma com 3 dígitos do CPF</small></span>
          <ArrowRight aria-hidden="true" />
        </button>
        <button type="button" className="entry-choice entry-choice-staff" onClick={onPayment} disabled={!validCard}>
          <span className="entry-choice-icon"><CreditCard /></span>
          <span className="entry-choice-copy"><strong>Pagamentos</strong><small>Consulte o saldo da comanda e as opções Pix ou maquininha com segurança</small></span>
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
      <p className="entry-note"><LockKeyhole /> Cada acesso tem sua própria confirmação.</p>
    </section> : <>
      <button className="entry-back" type="button" onClick={onBack}><ArrowLeft /> Voltar às opções de acesso</button>
      <section className="entry-card entry-staff-card" aria-label="Acesso da equipe NFC">
        <div className="entry-staff-icon"><ShieldCheck /></div>
        <p className="entry-staff-label">ACESSO DA EQUIPE</p>
        <h1>{staffMode === 'order' ? 'Fazer pedido NFC' : staffMode === 'payment' ? 'Pagamentos NFC' : 'Painel do restaurante'}</h1>
        <p>{staffMode === 'order' ? 'Entre como garçom ou atendente para registrar o pedido deste cartão.' : staffMode === 'payment' ? 'Entre como garçom ou atendente para consultar e finalizar a comanda deste cartão.' : 'Use o login do restaurante para continuar.'}</p>
        <p>O login acontece no painel oficial, com o acesso da equipe autorizada.</p>
        {loginPath ? <Link className="entry-login" to={loginPath}>
          <LogIn /> Ir para login do restaurante
        </Link> : <div className="entry-unavailable" role="status">
          {loadingCard ? 'Identificando o restaurante do cartão...' : 'Não foi possível identificar o restaurante. Confira o cartão NFC.'}
        </div>}
        {loginPath && <p className="entry-hint">Após o login, você voltará ao atendimento deste cartão.</p>}
      </section>
      {children && <section className="entry-operations" aria-label="Atendimento NFC autenticado">{children}</section>}
    </>}
    <footer className="entry-footer"><ShieldCheck /> Consulta protegida · dados do restaurante.</footer>
  </div></Shell>;
}
