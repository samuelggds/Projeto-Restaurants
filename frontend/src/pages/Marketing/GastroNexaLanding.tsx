import styled from 'styled-components';
import GastroNexaLandingV2 from './GastroNexaLandingV2';

const LegalBar = styled.nav`
  border-top: 1px solid #405537;
  background: #21392d;
  padding: 0 24px 22px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 18px;

  a {
    color: #b5c4aa;
    font-size: 10px;
    font-weight: 700;
    text-decoration: none;
  }

  a:hover,
  a:focus-visible {
    color: #eef4e7;
    text-decoration: underline;
    text-underline-offset: 4px;
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
