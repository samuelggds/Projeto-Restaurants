import styled, { keyframes } from 'styled-components';

const rotate = keyframes`to { transform: rotate(360deg); }`;

export const Root = styled.div`
  --accent: #e95409;
  --accent-soft: #fff1e9;
  --ink: #151515;
  --muted: #6f6a65;
  --border: #eadfd6;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  color: var(--ink);
  background:
    linear-gradient(rgba(216, 204, 195, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(216, 204, 195, 0.18) 1px, transparent 1px),
    #fbfaf8;
  background-size: 34px 34px;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  @media (max-width: 860px) {
    display: block;
  }
`;

export const Sidebar = styled.aside`
  min-height: 100dvh;
  position: sticky;
  top: 0;
  align-self: start;
  display: flex;
  flex-direction: column;
  padding: 24px 14px 18px;
  color: #bcc1c2;
  background: linear-gradient(180deg, #171a1c 0%, #111315 100%);

  @media (max-width: 860px) {
    min-height: 0;
    position: static;
    padding: 14px 16px;
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px 21px;
  border-bottom: 1px solid #2c3133;

  > span {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
  }

  img {
    width: 46px;
    height: 42px;
    object-fit: contain;
    filter: brightness(0) invert(1);
  }

  div {
    display: grid;
    gap: 2px;
  }

  strong {
    color: #fff;
    font-size: 18px;
    font-weight: 800;
  }

  strong span {
    color: #ff6a1a;
  }

  small {
    color: #858d90;
    font-size: 9px;
  }
`;

export const RestrictionLabel = styled.div`
  margin: 18px 10px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ff9a68;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;

  @media (max-width: 860px) {
    display: none;
  }
`;

export const Navigation = styled.nav`
  display: grid;
  gap: 4px;

  button {
    min-height: 47px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 13px;
    border: 0;
    border-radius: 9px;
    color: #9ba2a4;
    background: transparent;
    font: inherit;
    font-size: 12px;
    text-align: left;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  .lock {
    margin-left: auto;
    opacity: 0.7;
  }

  button.active {
    color: #fff;
    background: linear-gradient(90deg, rgba(233, 84, 9, 0.95), rgba(130, 66, 33, 0.65));
    font-weight: 750;
  }

  @media (max-width: 860px) {
    margin-top: 10px;
    button:not(.active) {
      display: none;
    }
    button.active {
      width: 100%;
      justify-content: center;
    }
  }
`;

export const SidebarFooter = styled.div`
  margin-top: auto;
  padding: 16px 8px 0;
  border-top: 1px solid #2c3133;
  display: grid;
  gap: 10px;

  .identity {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .identity > b {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid #596064;
    border-radius: 50%;
    color: #fff;
    font-size: 11px;
  }

  .identity span {
    min-width: 0;
    display: grid;
  }

  .identity strong {
    overflow: hidden;
    color: #f5f6f6;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .identity small {
    color: #ef8c5b;
    font-size: 9px;
  }

  > button {
    min-height: 39px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    color: #aeb3b5;
    background: transparent;
    font: inherit;
    cursor: pointer;
  }

  > button:hover {
    color: #fff;
    background: #202427;
  }

  @media (max-width: 860px) {
    display: none;
  }
`;

export const Main = styled.main`
  min-width: 0;
`;

export const Topbar = styled.header`
  min-height: 72px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 12px clamp(18px, 4vw, 46px);
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(10px);
`;

export const TopbarBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  img {
    object-fit: contain;
  }

  > span {
    display: grid;
    gap: 1px;
  }

  strong {
    font-size: 15px;
    font-weight: 850;
  }

  strong em {
    color: var(--accent);
    font-style: normal;
  }

  small {
    color: #8b847f;
    font-size: 9px;
  }
`;

export const VerifyButton = styled.button`
  min-height: 42px;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid #e3d8cf;
  border-radius: 9px;
  color: #4e4843;
  background: #fff;
  font: inherit;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }

  .spin {
    animation: ${rotate} 0.9s linear infinite;
  }
`;

export const Content = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: clamp(30px, 5vw, 56px) clamp(14px, 3.5vw, 36px) 64px;
`;

export const Hero = styled.section`
  max-width: 760px;
  margin: 0 auto 26px;
  text-align: center;

  .eyebrow {
    width: fit-content;
    margin: 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 13px;
    border: 1px solid #f1c4ae;
    border-radius: 999px;
    color: #cf4d13;
    background: #fff7f2;
    font-size: 10px;
    font-weight: 850;
    text-transform: uppercase;
  }

  h1 {
    margin: 16px 0 8px;
    font-size: clamp(32px, 4.2vw, 44px);
    line-height: 1.05;
    letter-spacing: -0.035em;
  }

  p {
    max-width: 700px;
    margin: 0 auto;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.6;
  }
`;

export const LoadingCard = styled.div`
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);

  .spinner {
    width: 25px;
    height: 25px;
    border: 3px solid #f1d6c8;
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: ${rotate} 0.8s linear infinite;
  }

  div {
    display: grid;
    gap: 3px;
  }

  strong {
    font-size: 13px;
  }

  small {
    color: var(--muted);
    font-size: 11px;
  }
`;

export const SummaryGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 20px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const SummaryItem = styled.div`
  min-height: 112px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border-right: 1px solid var(--border);

  &:last-child {
    border-right: 0;
  }

  .icon {
    width: 44px;
    height: 44px;
    flex: 0 0 44px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--accent);
    background: var(--accent-soft);
  }

  .icon.danger {
    color: #d54226;
    background: #fff0ee;
  }

  div {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  small {
    color: #8b8580;
    font-size: 10px;
  }

  strong {
    overflow: hidden;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .danger-text {
    color: #d54226;
  }

  @media (max-width: 900px) {
    &:nth-child(2) {
      border-right: 0;
    }
    &:nth-child(-n + 2) {
      border-bottom: 1px solid var(--border);
    }
  }

  @media (max-width: 560px) {
    border-right: 0;
    border-bottom: 1px solid var(--border);
    &:last-child {
      border-bottom: 0;
    }
  }
`;

export const PaymentLayout = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.8fr);
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const PixCard = styled.article`
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
`;

export const HelpCard = styled.article`
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);

  ol {
    margin: 20px 0 0;
    padding: 0;
    display: grid;
    gap: 16px;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 11px;
    align-items: start;
  }

  li > b {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--accent);
    background: var(--accent-soft);
    font-size: 12px;
  }

  li span {
    display: grid;
    gap: 3px;
  }

  li strong {
    font-size: 12px;
  }

  li small {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.45;
  }
`;

export const SectionHeading = styled.header`
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 18px;

  .section-icon {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--accent);
    background: var(--accent-soft);
  }

  .section-icon.soft {
    color: #b55228;
    background: #fff5ef;
  }

  div {
    display: grid;
    gap: 2px;
  }

  h2 {
    margin: 0;
    font-size: 17px;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 10px;
  }
`;

export const PixArea = styled.div`
  display: grid;
  grid-template-columns: 164px minmax(0, 1fr);
  gap: 18px;
  align-items: center;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const QrWrap = styled.div`
  width: 164px;
  height: 164px;
  display: grid;
  place-items: center;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  @media (max-width: 620px) {
    margin: 0 auto;
  }
`;

export const PixDetails = styled.div`
  min-width: 0;

  label {
    display: block;
    margin-bottom: 7px;
    font-size: 10px;
    font-weight: 750;
  }

  .copy-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  input {
    min-width: 0;
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid #ddd5ce;
    border-radius: 8px;
    color: #4f4944;
    background: #fbfaf8;
    font: inherit;
    font-size: 11px;
  }

  button {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 14px;
    border: 0;
    border-radius: 8px;
    color: #fff;
    background: var(--accent);
    font: inherit;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
  }

  button.secondary {
    width: 100%;
    margin-top: 9px;
    border: 1px solid #ef8a57;
    color: var(--accent);
    background: #fff;
  }

  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  small {
    display: block;
    margin-top: 9px;
    color: #817a75;
    font-size: 9px;
    line-height: 1.45;
  }

  .spin {
    animation: ${rotate} 0.9s linear infinite;
  }

  @media (max-width: 620px) {
    .copy-row {
      grid-template-columns: 1fr;
    }
  }
`;

export const EmptyPix = styled.div`
  min-height: 166px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 18px;
  border: 1px dashed #e7c8b8;
  border-radius: 12px;
  background: #fffaf7;

  > span {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--accent);
    background: var(--accent-soft);
  }

  > div {
    display: grid;
    gap: 5px;
  }

  strong {
    font-size: 13px;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 10px;
  }

  button {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 14px;
    border: 0;
    border-radius: 8px;
    color: #fff;
    background: var(--accent);
    font: inherit;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
  }

  @media (max-width: 660px) {
    grid-template-columns: 1fr;
    text-align: center;
    > span {
      margin: 0 auto;
    }
  }
`;

export const Assurance = styled.div`
  margin-top: 20px;
  padding-top: 16px;
  display: flex;
  gap: 9px;
  border-top: 1px solid var(--border);
  color: #35664e;

  span {
    display: grid;
    gap: 2px;
  }

  strong {
    color: #2b4638;
    font-size: 11px;
  }

  small {
    color: #6a7770;
    font-size: 9px;
    line-height: 1.4;
  }
`;

export const ReleaseButton = styled.button`
  min-height: 50px;
  margin: 22px auto 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 24px;
  border: 0;
  border-radius: 9px;
  color: #fff;
  background: var(--accent);
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(233, 84, 9, 0.18);

  &:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  @media (max-width: 560px) {
    width: 100%;
  }
`;

export const ReleaseNote = styled.p`
  margin: 10px auto 0;
  color: #817a75;
  font-size: 9px;
  text-align: center;
`;
