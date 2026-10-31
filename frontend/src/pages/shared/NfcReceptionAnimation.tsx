import styled from 'styled-components';
import { Wifi } from 'lucide-react';

const Illustration = styled.aside`
  display: grid;
  align-content: center;
  gap: 18px;
  min-width: 0;
  min-height: 415px;
  padding: 25px;
  background: linear-gradient(145deg, #faf9f7 0%, #fff0e7 100%);
  border-left: 1px solid #f0e9e5;
  color: #26333a;
  *, *::before, *::after { box-sizing: border-box; }
  h3, p { margin: 0; }
  .eyebrow { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #9f785f; font-weight: 850; }
  h3 { font-size: 18px; color: #26333a; line-height: 1.3; }
  p { font-size: 12px; color: #7b716c; line-height: 1.55; }
  .devices { min-height: 230px; position: relative; display: flex; justify-content: center; align-items: center; }
  .phone {
    height: 224px; width: 126px; border: 5px solid #28323b; border-radius: 23px;
    background: #fff; box-shadow: 0 15px 24px #b4795226;
    padding: 23px 9px 14px; display: grid; align-content: start; gap: 11px;
    transform: rotate(2deg);
  }
  .phone b { color: #cb5219; font-size: 9px; }
  .phone strong { color: #26323b; font-size: 13px; line-height: 1.15; }
  .phone i { display: block; background: #f0f2f4; height: 9px; border-radius: 4px; }
  .phone i:nth-of-type(2) { width: 75%; }
  .floating-card {
    width: 123px; height: 79px; border-radius: 12px; background: #fff;
    position: absolute; top: 85px; left: 5%;
    box-shadow: 0 11px 24px #8f776b3b; padding: 13px; color: #ba4a16;
    transform: rotate(-16deg); display: grid; align-content: space-between;
    animation: nfc-hover 3s ease-in-out infinite alternate;
  }
  .floating-card b { color: #222e37; font-size: 11px; }
  .floating-card small { font-size: 8px; color: #7b716c; }
  .waves { position: absolute; right: 4%; top: 46%; color: #dd8b5b; }
  .safety { border-top: 1px solid #efdfd2; padding-top: 14px; }
  .safety strong { font-size: 12px; color: #88522e; }
  @keyframes nfc-hover { to { transform: translateY(-9px) rotate(-11deg); } }
  @media (prefers-reduced-motion: reduce) { .floating-card { animation: none; } }
  @media (max-width: 860px) {
    min-height: 270px;
    border-left: 0;
    border-top: 1px solid #f0e9e5;
    .devices { min-height: 190px; }
    .floating-card { left: 20%; top: 75px; }
  }
  @media (max-width: 760px) {
    min-height: 420px;
    padding: 23px 20px 20px;
    gap: 14px;
    border: 1px solid #f3e3da;
    border-radius: 18px;
    box-shadow: 0 6px 20px #1821270b;
    .devices { min-height: 220px; }
    .floating-card { left: 5%; top: 87px; }
    .safety { margin-top: 2px; }
  }
  @media (max-width: 380px) {
    padding: 20px 16px;
    min-height: 400px;
    .devices { min-height: 207px; }
    .floating-card { left: 0; width: 114px; }
    .phone { height: 212px; width: 121px; }
    .waves { right: 1%; }
  }
`;

/** A single illustration, reused by the desktop form and the mobile NFC header. */
export function NfcReceptionAnimation({ decorative = false }: { decorative?: boolean }) {
  return <Illustration aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : 'Recepção NFC'}>
    <span className="eyebrow">Recepção NFC</span>
    <h3>Um começo simples.</h3>
    <p>Identifique o cliente e aproxime o cartão da visita.</p>
    <div className="devices" aria-hidden="true">
      <div className="floating-card"><b>GastroNexa</b><small>Comanda individual <Wifi size={11} /></small></div>
      <div className="phone"><b>GastroNexa</b><strong>Recepção<br />de cliente</strong><i /><i /><i /></div>
      <Wifi className="waves" size={30} />
    </div>
    <div className="safety">
      <strong>Uma visita. Uma comanda.</strong>
      <p>O cartão identifica a visita; o consumo e os pagamentos são controlados pelo servidor.</p>
    </div>
  </Illustration>;
}
