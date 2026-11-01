import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, CreditCard, LockKeyhole, LogIn, NotebookPen, ShieldCheck, UserRoundPlus, ConciergeBell } from 'lucide-react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

export type NfcStaffSection = 'menu' | 'registration' | 'orders' | 'payment' | 'consult';

const Shell = styled.main`
  --nfc-orange: #ce5118;
  --nfc-text: #20242b;
  --nfc-muted: #67717f;
  --nfc-border: #e4e7eb;
  min-height: 100dvh;
  background: #fafafa;
  color: var(--nfc-text);
  padding: 24px 15px 42px;
  font-family: inherit;
  *, *::before, *::after { box-sizing: border-box; }
  button, input, a { font: inherit; }
  button, a { -webkit-tap-highlight-color: transparent; }
  button:disabled { cursor: not-allowed; opacity: .55; }
  button:focus-visible, a:focus-visible, input:focus-visible { outline: 3px solid #eb8549; outline-offset: 3px; }
  h1, h2, h3, p { margin: 0; }
  .nfc-frame { width: min(100%, 460px); margin: 0 auto; }
  .nfc-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 37px; }
  .nfc-brand { display: inline-flex; align-items: center; gap: 9px; font-size: 22px; font-weight: 760; letter-spacing: -.045em; }
  .nfc-brand img { width: 32px; height: 32px; object-fit: contain; }
  .nfc-brand b { color: var(--nfc-orange); }
  .nfc-top-label { color: var(--nfc-muted); font-size: 12px; }
  .nfc-welcome { text-align: center; padding: 25px 0 25px; }
  .nfc-symbol { width: 57px; height: 57px; margin: 0 auto 16px; border-radius: 18px; background: #fff1e9;
    display: grid; place-items: center; color: var(--nfc-orange); }
  .nfc-symbol svg { width: 28px; height: 28px; }
  .nfc-ready { color: #21834d; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
  .nfc-ready svg { width: 15px; }
  .nfc-welcome h1 { font-size: clamp(28px, 7vw, 35px); letter-spacing: -.055em; margin: 17px 0 10px; }
  .nfc-welcome p { color: var(--nfc-muted); font-size: 14px; line-height: 1.6; max-width: 320px; margin: auto; }
  .nfc-options { display: grid; gap: 11px; }
  .nfc-choice { width: 100%; display: flex; align-items: center; gap: 14px; border: 1px solid var(--nfc-border);
    background: white; color: var(--nfc-text); text-decoration: none; text-align: left; border-radius: 15px;
    padding: 17px; min-height: 89px; cursor: pointer; }
  .nfc-choice.primary { color: white; border-color: #bc4615; background: linear-gradient(115deg, #df5a1e, #b63e0e); }
  .nfc-choice > svg:first-child { width: 26px; height: 26px; flex-shrink: 0; color: var(--nfc-orange); }
  .nfc-choice.primary > svg:first-child { color: white; }
  .nfc-choice > svg:last-child { width: 19px; height: 19px; flex-shrink: 0; }
  .nfc-choice span { flex: 1; min-width: 0; display: grid; gap: 5px; }
  .nfc-choice strong { font-size: 16px; }
  .nfc-choice small { color: var(--nfc-muted); font-size: 13px; line-height: 1.4; }
  .nfc-choice.primary small { color: #fff5ee; }
  .nfc-entry-link { display: flex; justify-content: center; align-items: center; gap: 8px; color: #a64418;
    border: 0; margin: 28px auto 0; padding: 12px 4px; background: transparent; font-weight: 730; font-size: 14px; cursor: pointer; }
  .nfc-entry-link svg { width: 18px; height: 18px; }
  .nfc-note { display: flex; align-items: center; justify-content: center; text-align: center; gap: 7px;
    color: var(--nfc-muted); font-size: 12px; line-height: 1.6; margin-top: 30px; }
  .nfc-note svg { width: 14px; height: 14px; flex-shrink: 0; }
  .nfc-back { display: inline-flex; align-items: center; gap: 8px; color: #b94c1c; border: 0;
    background: transparent; padding: 10px 0; margin-bottom: 29px; min-height: 44px; cursor: pointer; font-size: 14px; }
  .nfc-back svg { width: 17px; }
  .nfc-staff-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 36px; }
  .nfc-staff-tag { border: 1px solid #b9ddc8; color: #21824c; background: #e9f6ed;
    font-size: 12px; border-radius: 8px; padding: 8px 10px; display: inline-flex; align-items: center; gap: 7px; }
  .nfc-staff-tag svg { width: 15px; height: 15px; }
  .nfc-kicker { font-size: 11px; font-weight: 720; text-transform: uppercase; letter-spacing: .08em; color: #b85722; }
  .nfc-staff-title { font-size: clamp(27px, 6vw, 34px); letter-spacing: -.045em; line-height: 1.2; margin: 9px 0 9px; }
  .nfc-subtitle { color: var(--nfc-muted); font-size: 14px; line-height: 1.6; }
  .nfc-staff-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; margin-top: 23px; }
  .nfc-tile { min-width: 0; min-height: 150px; display: flex; flex-direction: column; gap: 11px; align-items: flex-start;
    text-align: left; border: 1px solid #e0e4eb; border-radius: 15px; background: white; padding: 16px;
    color: var(--nfc-text); cursor: pointer; }
  .nfc-tile .nfc-tile-icon { width: 42px; height: 42px; border-radius: 12px; background: #fff0e6;
    color: #d05c20; display: grid; place-items: center; }
  .nfc-tile .nfc-tile-icon svg { width: 22px; height: 22px; }
  .nfc-tile strong { font-size: 15px; }
  .nfc-tile small { font-size: 12px; color: var(--nfc-muted); line-height: 1.45; }
  .nfc-staff-card { border-radius: 16px; background: white; border: 1px solid var(--nfc-border); padding: 19px;
    margin-top: 23px; display: grid; gap: 15px; }
  .nfc-staff-card label { display: grid; gap: 7px; font-weight: 650; font-size: 14px; }
  .nfc-staff-card input:not([type=checkbox]), .nfc-staff-card select, .nfc-staff-card textarea {
    font-size: 16px; padding: 12px; max-width: 100%; min-width: 0; color: var(--nfc-text); background: white;
    border: 1px solid #ccd4df; border-radius: 9px; }
  .nfc-staff-card button { min-height: 44px; border-radius: 9px; padding: 10px 13px; background: #ce5118;
    color: white; font-size: 14px; font-weight: 680; border: 0; cursor: pointer; }
  .nfc-staff-card button:disabled { opacity: .55; cursor: not-allowed; }
  .nfc-staff-card h2 { font-size: 21px; }
  .nfc-staff-card p { line-height: 1.55; font-size: 14px; }
  .nfc-staff-card .error, .nfc-error { padding: 12px; border-radius: 9px; background: #fff0ed; color: #9b2b20; }
  .nfc-staff-card .success { padding: 12px; border-radius: 9px; background: #e9f5ec; color: #197743; }
  .nfc-login { display: grid; gap: 12px; margin-top: 24px; padding: 22px; border-radius: 14px; border: 1px solid var(--nfc-border); }
  .nfc-login a { display: flex; justify-content: center; align-items: center; padding: 14px;
    border-radius: 10px; color: white; text-decoration: none; background: #ce5118; font-weight: 650; }
  .nfc-login p { font-size: 13px; line-height: 1.5; color: var(--nfc-muted); }
  .nfc-staff-card .nfc-inline-muted { color: var(--nfc-muted); }
  @media (prefers-color-scheme: dark) {
    &.staff { background: #14191f; --nfc-text: #f3f5f7; --nfc-muted: #b4bdc9; --nfc-border: #394450; }
    &.staff .nfc-tile, &.staff .nfc-staff-card, &.staff .nfc-login { background: #202832; }
    &.staff .nfc-tile .nfc-tile-icon { background: #3d2c25; color: #ff9863; }
    &.staff .nfc-staff-tag { background: #153327; border-color: #294d3a; color: #8be6ae; }
    &.staff .nfc-staff-card input:not([type=checkbox]),
    &.staff .nfc-staff-card select, &.staff .nfc-staff-card textarea { background: #212b34; color: white; }
  }
  @media (max-width: 350px) {
    padding: 16px 10px 35px;
    .nfc-staff-grid { gap: 8px; }
    .nfc-tile { padding: 13px; min-height: 145px; }
    .nfc-choice { padding: 13px; }
    .nfc-top-label { font-size: 10px; }
    .nfc-brand { font-size: 19px; }
  }
  @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; transition: none!important; } }
`;

type Props = {
  view: 'home' | 'staff';
  validCard: boolean;
  loadingCard: boolean;
  customerPath: string;
  loginPath: string;
  staffAuthorized: boolean;
  staffRole?: string;
  staffSection: NfcStaffSection;
  onStaff: () => void;
  onHelp: () => void;
  onSelectSection: (section: Exclude<NfcStaffSection, 'menu'>) => void;
  onBack: () => void;
  children?: ReactNode;
};
const sections = [
  { section: 'registration', title: 'Cadastro NFC', hint: 'Identificar e vincular', icon: UserRoundPlus },
  { section: 'orders', title: 'Fazer pedido', hint: 'Itens e cozinha', icon: NotebookPen },
  { section: 'payment', title: 'Pagamentos', hint: 'Pix e Point', icon: CreditCard },
  { section: 'consult', title: 'Consultar comanda', hint: 'Pedidos e saldo', icon: ClipboardList },
] as const;

export default function NfcEntryPanel({
  view, validCard, loadingCard, customerPath, loginPath, staffAuthorized,
  staffRole, staffSection, onStaff, onHelp, onSelectSection, onBack, children,
}: Props) {
  return <Shell className={view === 'staff' ? 'staff' : undefined}>
    <div className="nfc-frame">
      {view === 'home' ? <>
        <div className="nfc-top">
          <span className="nfc-brand"><img src="/gastronexa-logo.svg" alt="" /> Gastro<b>Nexa</b></span>
          <span className="nfc-top-label">Cartão de consumo NFC</span>
        </div>
        <section className="nfc-welcome" aria-label="Entrada do cliente">
          <span className="nfc-symbol"><CreditCard aria-hidden="true" /></span>
          <span className="nfc-ready"><CheckCircle2 aria-hidden="true" />
            {loadingCard ? 'Verificando cartão' : validCard ? 'Cartão NFC reconhecido' : 'Cartão NFC indisponível'}</span>
          <h1>Bem-vindo!</h1>
          <p>Consulte sua comanda ou solicite o atendimento da nossa equipe.</p>
        </section>
        <div className="nfc-options">
          {validCard ? <Link className="nfc-choice primary" to={customerPath}>
            <ClipboardList aria-hidden="true" /><span><strong>Ver minha comanda</strong><small>Consulte seus pedidos e consumo</small></span><ArrowRight aria-hidden="true" />
          </Link> : <button type="button" className="nfc-choice primary" disabled>
            <ClipboardList aria-hidden="true" /><span><strong>Ver minha comanda</strong><small>Cartão indisponível</small></span><ArrowRight aria-hidden="true" />
          </button>}
          <button type="button" className="nfc-choice" onClick={onHelp} disabled={!validCard}>
            <ConciergeBell aria-hidden="true" /><span><strong>Solicitar atendimento</strong><small>Chamar garçom ou atendente</small></span><ArrowRight aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="nfc-entry-link" onClick={onStaff}>
          <LockKeyhole aria-hidden="true" /> Área da equipe — Entrar <ArrowRight aria-hidden="true" />
        </button>
      </> : <>
        <button className="nfc-back" type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" /> {staffSection === 'menu' ? 'Voltar à entrada' : 'Voltar ao menu da equipe'}
        </button>
        <div className="nfc-staff-head">
          <span className="nfc-brand"><img src="/gastronexa-logo.svg" alt="" /> Gastro<b>Nexa</b></span>
          {staffAuthorized && <span className="nfc-staff-tag"><ShieldCheck aria-hidden="true" /> {staffRole || 'Equipe'} autenticado</span>}
        </div>
        {!staffAuthorized ? <>
          <span className="nfc-kicker">ACESSO EXCLUSIVO À EQUIPE</span>
          <h1 className="nfc-staff-title">Entre no seu painel.</h1>
          <p className="nfc-subtitle">Somente profissionais autenticados do restaurante podem cadastrar cartões, registrar pedidos ou acessar pagamentos.</p>
          <section className="nfc-login">
            {loginPath ? <Link to={loginPath}><LogIn aria-hidden="true" /> Entrar como funcionário</Link> :
              <p role="status">{loadingCard ? 'Verificando cartão...' : 'Restaurante indisponível ou cartão inválido.'}</p>}
            <p>Depois do login no mesmo navegador, o atendimento deste cartão será retomado sem outra aproximação.</p>
          </section>
        </> : staffSection === 'menu' ? <>
          <span className="nfc-kicker">ATENDIMENTO GASTRONEXA</span>
          <h1 className="nfc-staff-title">O que vamos fazer?</h1>
          <p className="nfc-subtitle">Escolha uma das opções para continuar.</p>
          <nav className="nfc-staff-grid" aria-label="Ações autorizadas da equipe NFC">
            {sections.map(item => <button type="button" className="nfc-tile" key={item.section}
              onClick={() => onSelectSection(item.section)}>
              <span className="nfc-tile-icon"><item.icon aria-hidden="true" /></span>
              <strong>{item.title}</strong><small>{item.hint}</small>
            </button>)}
          </nav>
        </> : <>
          <span className="nfc-kicker">ATENDIMENTO GASTRONEXA</span>
          <h1 className="nfc-staff-title">
            {staffSection === 'registration' ? 'Cadastro NFC' : staffSection === 'orders' ? 'Fazer pedido' :
              staffSection === 'payment' ? 'Pagamentos da comanda' : 'Comanda do cliente'}
          </h1>
          <p className="nfc-subtitle">Cartão e visita identificados no restaurante da equipe autenticada.</p>
          <section className="nfc-staff-card" aria-label="Atendimento NFC autenticado">{children}</section>
        </>}
      </>}
      <footer className="nfc-note"><ShieldCheck aria-hidden="true" /> Acesso protegido · GastroNexa NFC</footer>
    </div>
  </Shell>;
}
