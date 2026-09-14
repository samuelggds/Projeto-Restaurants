import styled from 'styled-components';
import GastroNexaLandingV2 from './GastroNexaLandingV2';

const LegalBar = styled.nav`
  position: relative;
  z-index: 2;
  min-height: 40px;
  margin-top: -40px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 18px;
  pointer-events: none;

  a {
    color: #a9b99d;
    font-size: 9px;
    font-weight: 700;
    text-decoration: none;
    pointer-events: auto;
  }

  a:hover,
  a:focus-visible {
    color: #eef4e7;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  @media (max-width: 760px) {
    min-height: auto;
    margin-top: 0;
    padding: 0 18px 22px;
    background: #21392d;
    justify-content: flex-start;
  }
`;

export default function GastroNexaLanding() {
  return (
    <>
      <GastroNexaLandingV2 />
      <LegalBar aria-label="Links legais da GastroNexa">
        <a href="/privacidade/">Política de Privacidade</a>
        <a href="/termos/">Termos de Serviço</a>
      </LegalBar>
    </>
  );
}
