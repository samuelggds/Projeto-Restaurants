import styled from 'styled-components';

type Provider = 'MERCADO_PAGO' | 'PAGARME' | 'ASAAS';

const providerColors: Record<Provider, { main: string; soft: string }> = {
  MERCADO_PAGO: { main: '#087fbd', soft: '#e9f7ff' },
  PAGARME: { main: '#5b21b6', soft: '#f3efff' },
  ASAAS: { main: '#087f5b', soft: '#eafaf3' },
};

export const Page = styled.div`
  container: payment-settings / inline-size;
  display: grid;
  gap: 22px;
  min-width: 0;
`;

export const Hero = styled.section`
  overflow: hidden;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 28px;
  min-height: 190px;
  padding: 34px;
  border-radius: 12px;
  color: #252a31;
  background: #fff;
  box-shadow: 0 2px 8px rgba(25, 35, 45, 0.05);

  @media (max-width: 850px) {
    grid-template-columns: 1fr;
    padding: 26px;
  }

  @container payment-settings (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
    padding: 24px;
  }

  @media (max-width: 560px) {
    padding: 22px 17px;
    border-radius: 12px;
  }

  color: #252a31;
  box-shadow: none;
  &::before, &::after { display: none; }
  button { background: var(--admin-accent, #b94a17); color: #fff; border: 1px solid transparent; min-height: 42px; }
  button:hover { background: #9e3c10; color: #fff; }
`;

export const HeroCopy = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 17px;
  min-width: 0;

  > div:last-child {
    min-width: 0;
  }

  span {
    display: block;
    margin-bottom: 7px;
    color: #b94a17;
    font-size: 12px;
    font-weight: 650;
    letter-spacing: 0.13em;
  }

  h2 {
    margin: 0;
    max-width: 580px;
    font-size: clamp(21px, 2vw, 28px);
    line-height: 1.08;
  }

  p {
    max-width: 630px;
    margin: 11px 0 0;
    color: #68717d;
    font-size: 13px;
    line-height: 1.55;
  }

  color: #252a31;
  box-shadow: none;
  &::before, &::after { display: none; }
  button { background: var(--admin-accent, #b94a17); color: #fff; border: 1px solid transparent; min-height: 42px; }
  button:hover { background: #9e3c10; color: #fff; }
`;

export const HeroIcon = styled.div`
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 15px;
  background: #f7f8fa;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.12);

  svg {
    width: 25px;
    height: 25px;
    color: #b94a17;
  }

  @media (max-width: 560px) {
    display: none;
  }

  color: #252a31;
  box-shadow: none;
  &::before, &::after { display: none; }
  button { background: var(--admin-accent, #b94a17); color: #fff; border: 1px solid transparent; min-height: 42px; }
  button:hover { background: #9e3c10; color: #fff; }
`;

export const Summary = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(100px, 1fr));
  gap: 9px;
  min-width: 270px;

  > div {
    min-height: 70px;
    display: grid;
    align-content: center;
    gap: 3px;
    padding: 12px 15px;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    background: #f7f8fa;
    backdrop-filter: blur(8px);
  }

  strong {
    font-size: 22px;
  }

  span {
    color: #68717d;
    font-size: 12px;
  }

  @media (max-width: 850px) {
    min-width: 0;
    max-width: 460px;
  }

  color: #252a31;
  box-shadow: none;
  &::before, &::after { display: none; }
  button { background: var(--admin-accent, #b94a17); color: #fff; border: 1px solid transparent; min-height: 42px; }
  button:hover { background: #9e3c10; color: #fff; }
`;

export const ReadyStatus = styled.div<{ $ready: boolean }>`
  && {
    grid-column: 1 / -1;
    min-height: 44px;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 8px;
    border-color: ${({ $ready }) => ($ready ? '#bde5cd' : '#eed9bd')};
    background: ${({ $ready }) => ($ready ? '#eefaf2' : '#fff8ed')};
  }

  svg {
    width: 17px;
    height: 17px;
    color: ${({ $ready }) => ($ready ? '#166b3a' : '#92521d')};
  }

  span {
    color: ${({ $ready }) => ($ready ? '#166b3a' : '#92521d')};
    font-weight: 750;
  }
`;

export const Guide = styled.section`
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  padding: 21px 24px;
  border: 1px solid #e8dfd7;
  border-radius: 12px;
  background: linear-gradient(125deg, #fff 0%, #fffaf6 100%);

  ol {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    min-width: 0;
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 12px;
    border: 1px solid #eee6df;
    border-radius: 13px;
    background: #fff;
  }

  li > b {
    flex: 0 0 25px;
    width: 25px;
    height: 25px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: #c9512f;
    background: #fff0e9;
    font-size: 12px;
  }

  li div {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  li strong {
    color: #211d19;
    font-size: 12px;
  }

  li span {
    color: #716961;
    font-size: 12px;
    line-height: 1.4;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }

  @container payment-settings (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
  }

  @container payment-settings (max-width: 600px) {
    ol { grid-template-columns: minmax(0, 1fr); }
  }

  @media (max-width: 670px) {
    padding: 17px;

    ol {
      grid-template-columns: 1fr;
    }
  }
`;

export const GuideTitle = styled.div`
  span {
    color: #cd5734;
    font-size: 12px;
    font-weight: 650;
    letter-spacing: 0.12em;
  }

  h3 {
    margin: 5px 0 0;
    color: #211d19;
    font-size: 18px;
  }
`;

export const SectionHeading = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 5px;

  > span {
    flex: 0 0 34px;
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: #c94f2d;
    background: #fff0e9;
    font-size: 12px;
    font-weight: 650;
  }

  h3 {
    margin: 0;
    color: #211d19;
    font-size: 17px;
  }

  p {
    margin: 3px 0 0;
    color: #68717d;
    font-size: 12px;
  }
`;

export const MethodGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
  gap: 16px;
`;

export const MethodCard = styled.section<{ $enabled: boolean }>`
  min-width: 0;
  overflow: hidden;
  border: 1px solid ${({ $enabled }) => ($enabled ? '#e5d2c6' : '#e8e4df')};
  border-radius: 12px;
  background: ${({ $enabled }) => ($enabled ? '#fff' : '#fbfaf9')};
  box-shadow: ${({ $enabled }) => ($enabled ? '0 12px 30px rgba(55, 37, 24, 0.06)' : 'none')};
  transition: 180ms ease;
`;

export const MethodHeader = styled.header`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 13px;
  min-height: 116px;
  padding: 19px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #fff 0%, #f8f9fb 100%);

  > div:nth-child(2) {
    min-width: 0;
  }

  > label {
    grid-column: 1 / -1;
    justify-self: stretch;
  }

  > div > span {
    color: #cf5935;
    font-size: 12px;
    font-weight: 650;
    letter-spacing: 0.11em;
  }

  h3 {
    margin: 4px 0 2px;
    font-size: 19px;
    line-height: 1.35;
  }

  p {
    margin: 0;
    color: #756e67;
    font-size: 12px;
    line-height: 1.45;
  }

  @media (max-width: 490px) {
    grid-template-columns: auto minmax(0, 1fr);

    > label {
      grid-column: 1 / -1;
      justify-self: stretch;
    }
  }
`;

export const MethodIcon = styled.div`
  width: 43px;
  height: 43px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: #d35733;
  background: #fff0e9;

  svg {
    width: 21px;
    height: 21px;
  }
`;

export const SwitchLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  cursor: pointer;

  span {
    color: #5e5750;
    font-size: 12px;
    font-weight: 750;
  }

  input {
    flex: 0 0 auto;
    appearance: none;
    width: 44px;
    height: 24px;
    margin: 0;
    border: 0;
    border-radius: 999px;
    outline: 0;
    background: #d7d1cb;
    position: relative;
    cursor: pointer;
    transition: background 180ms ease;
  }

  input::after {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    left: 3px;
    top: 3px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 5px #0002;
    transition: transform 180ms ease;
  }

  input:checked {
    background: #d45a35;
  }

  input:checked::after {
    transform: translateX(20px);
  }

  input:focus-visible {
    box-shadow: 0 0 0 4px rgba(212, 90, 53, 0.15);
  }
`;

export const ControlGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 19px 20px 22px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    padding: 16px;
  }
`;

export const Field = styled.label<{ $full?: boolean }>`
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 7px;
  ${({ $full }) => $full && 'grid-column: 1 / -1;'}

  > span {
    color: #332e2a;
    font-size: 12px;
    font-weight: 650;
  }

  input,
  select {
    width: 100%;
    min-width: 0;
    height: 47px;
    border: 1px solid #e5e7eb;
    border-radius: 11px;
    outline: 0;
    padding: 0 12px;
    color: #28231f;
    background: #fff;
    font-size: 12px;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease;
  }

  select {
    cursor: pointer;
  }

  input:focus,
  select:focus {
    border-color: #d05a36;
    box-shadow: 0 0 0 4px rgba(208, 90, 54, 0.11);
  }

  input:disabled,
  select:disabled {
    cursor: not-allowed;
    color: #99918a;
    background: #f4f2f0;
  }

  input[aria-invalid='true'],
  select[aria-invalid='true'] {
    border-color: #c13f35;
    background: #fff9f8;
  }

  small {
    min-height: 27px;
    color: #7d756e;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.45;
  }

  input[aria-invalid='true'] + small,
  select[aria-invalid='true'] + small {
    color: #a3342c;
    font-weight: 650;
  }
`;

export const OpenFinanceStatus = styled.div<{ $ready: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 58px;
  padding: 12px;
  border: 1px solid ${({ $ready }) => ($ready ? '#bde5cd' : '#ead8cb')};
  border-radius: 11px;
  background: ${({ $ready }) => ($ready ? '#eefaf2' : '#fff7f2')};
  color: ${({ $ready }) => ($ready ? '#166b3a' : '#925039')};

  > svg {
    flex: 0 0 auto;
    width: 18px;
    height: 18px;
    margin-top: 1px;
  }

  > div {
    display: grid;
    gap: 3px;
  }

  strong {
    font-size: 12px;
  }

  small {
    min-height: 0;
    color: inherit;
    font-size: 12px;
    line-height: 1.4;
  }
`;

export const ProviderGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 14px;
`;

export const ProviderCard = styled.section<{ $selected: boolean }>`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 19px;
  border: 1px solid ${({ $selected }) => ($selected ? '#dcc6b8' : '#e8e3df')};
  border-radius: 12px;
  background: ${({ $selected }) => ($selected ? '#fff' : '#faf9f8')};
  box-shadow: ${({ $selected }) => ($selected ? '0 10px 26px rgba(57, 37, 22, 0.06)' : 'none')};
  opacity: ${({ $selected }) => ($selected ? 1 : 0.78)};

  h4 {
    margin: 2px 0 -5px;
    color: #201c19;
    font-size: 16px;
  }

  > p {
    min-height: 47px;
    margin: 0;
    color: #68717d;
    font-size: 12px;
    line-height: 1.5;
  }

  @media (max-width: 980px) {
    > p {
      min-height: 0;
    }
  }
`;

export const ProviderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

export const ProviderLogo = styled.div<{ $provider: Provider }>`
  width: 54px;
  height: 42px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 13px;
  background: ${({ $provider }) => providerColors[$provider].soft};

  img {
    width: 30px;
    height: 30px;
    object-fit: contain;
  }
`;

export const ConnectionBadge = styled.span<{ $connected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 27px;
  padding: 0 9px;
  border: 1px solid ${({ $connected }) => ($connected ? '#bde5cd' : '#ead8cb')};
  border-radius: 999px;
  color: ${({ $connected }) => ($connected ? '#166b3a' : '#9a4f33')};
  background: ${({ $connected }) => ($connected ? '#eefaf2' : '#fff6f0')};
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;

  svg {
    width: 12px;
    height: 12px;
  }
`;

export const UsedFor = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 8px 10px;
  border-radius: 10px;
  color: ${({ $selected }) => ($selected ? '#42382f' : '#837c76')};
  background: ${({ $selected }) => ($selected ? '#f7f2ee' : '#f1efed')};
  font-size: 12px;
  font-weight: 700;

  svg {
    flex: 0 0 auto;
    width: 14px;
    height: 14px;
  }
`;

export const AsaasFields = styled.div`
  padding-top: 3px;
`;

export const ConnectButton = styled.button<{ $provider: Provider }>`
  width: 100%;
  min-height: 43px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: auto;
  border: 0;
  border-radius: 11px;
  padding: 8px 12px;
  color: #fff;
  background: ${({ $provider }) => providerColors[$provider].main};
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition:
    transform 160ms ease,
    filter 160ms ease,
    opacity 160ms ease;

  svg {
    width: 15px;
    height: 15px;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(0.96);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

export const DisconnectButton = styled.button`
  width: 100%;
  min-height: 39px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #e3b8b3;
  border-radius: 11px;
  padding: 8px 12px;
  color: #9a332c;
  background: #fff8f7;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover:not(:disabled) {
    background: #fff0ee;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export const InactiveHint = styled.div`
  min-height: 43px;
  display: grid;
  place-items: center;
  margin-top: auto;
  border: 1px dashed #ddd7d1;
  border-radius: 11px;
  padding: 8px 12px;
  color: #817a74;
  background: #fff;
  font-size: 12px;
  text-align: center;
`;

export const ErrorAlert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 15px 17px;
  border: 1px solid #efc7c2;
  border-radius: 14px;
  color: #8f2f27;
  background: #fff5f4;

  > svg {
    flex: 0 0 auto;
    width: 19px;
    height: 19px;
  }

  div {
    display: grid;
    gap: 3px;
  }

  strong {
    font-size: 12px;
  }

  span {
    font-size: 12px;
    line-height: 1.45;
  }
`;

export const SecurityNotes = styled.section`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;

  > div {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    min-width: 0;
    padding: 15px 17px;
    border: 1px solid #e4e7e5;
    border-radius: 14px;
    background: #f8fbf9;
  }

  svg {
    flex: 0 0 auto;
    width: 20px;
    height: 20px;
    color: #24744b;
  }

  p {
    display: grid;
    gap: 3px;
    margin: 0;
    color: #617067;
    font-size: 12px;
    line-height: 1.5;
  }

  strong {
    color: #254633;
    font-size: 12px;
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const CurrentChoice = styled.footer`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 15px;
  border: 1px solid #ebe5df;
  border-radius: 13px;
  background: #fff;

  span {
    margin-right: 3px;
    color: #756e68;
    font-size: 12px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  b {
    padding: 6px 9px;
    border-radius: 8px;
    color: #4a413a;
    background: #f5f1ed;
    font-size: 12px;
  }
`;

export const ConnectionTools = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #615c56;
  font-size: 12px;

  button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 8px 14px;
    border: 1px solid #ddd6ce;
    border-radius: 10px;
    background: #fff;
    color: #254633;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  button:focus-visible {
    outline: 2px solid #254633;
    outline-offset: 3px;
  }
`;

export const OnboardingLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  color: #254633;
  font-size: 12px;
  font-weight: 700;
  text-underline-offset: 3px;
`;
