import styled from 'styled-components';

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 730;
  display: flex;
  justify-content: flex-end;
  background: rgba(24, 19, 16, 0.58);
  backdrop-filter: blur(6px);
`;

export const Panel = styled.aside`
  width: min(740px, 100%);
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid rgba(255, 255, 255, 0.45);
  background: #fffdf9;
  box-shadow: -24px 0 70px rgba(31, 21, 15, 0.25);

  @media (max-width: 700px) {
    width: 100%;
    border-left: 0;
  }
`;

export const Header = styled.header`
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 13px;
  padding: 20px clamp(15px, 4vw, 26px);
  border-bottom: 1px solid #eadfd4;
  background: linear-gradient(120deg, #1a2c35, #64443a);
  color: #fff;

  .icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 15px;
    background: rgba(255, 255, 255, 0.12);
  }

  h2 {
    margin: 0;
    font-size: clamp(19px, 3vw, 25px);
  }

  p {
    margin: 4px 0 0;
    color: rgba(255, 255, 255, 0.72);
    font-size: 11px;
  }

  button {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    cursor: pointer;
  }
`;

export const Scroll = styled.div`
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 18px clamp(13px, 4vw, 25px) calc(100px + env(safe-area-inset-bottom));
`;

export const Loading = styled.div`
  min-height: 320px;
  display: grid;
  place-items: center;
  color: #746b64;
  font-size: 13px;
  text-align: center;
`;

export const StepHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;

  > span {
    color: #6e625a;
    font-size: 12px;
    font-weight: 800;
  }

  > div {
    display: flex;
    gap: 6px;
  }

  i {
    width: 28px;
    height: 4px;
    border-radius: 999px;
    background: #e4d9d0;
  }

  i.active {
    background: var(--home-primary);
  }
`;

export const BalanceHero = styled.section`
  padding: 20px;
  border: 1px solid #e7dbd0;
  border-radius: 18px;
  background: #fff;
  text-align: center;

  small,
  span,
  strong {
    display: block;
  }

  small {
    color: #8a7e75;
    font-size: 11px;
    font-weight: 800;
  }

  span {
    margin-top: 12px;
    color: #655a52;
    font-size: 13px;
  }

  strong {
    margin-top: 4px;
    color: #202d34;
    font-size: clamp(30px, 8vw, 42px);
    line-height: 1.1;
  }
`;

export const DetailsRegion = styled.div`
  margin-top: 14px;
`;

export const DetailsToggle = styled.button`
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 12px;
  border: 0;
  background: transparent;
  color: #5f554e;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 800;

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 22%, transparent);
    outline-offset: 2px;
  }
`;

export const Alert = styled.div<{ $error?: boolean; $info?: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid ${({ $error, $info }) => ($error ? '#f0c4bd' : $info ? '#cbdceb' : '#cce3d2')};
  border-radius: 13px;
  background: ${({ $error, $info }) => ($error ? '#fff3f0' : $info ? '#f1f7fc' : '#eff9f1')};
  color: ${({ $error, $info }) => ($error ? '#9d3329' : $info ? '#315f82' : '#286b39')};
  font-size: 12px;
  line-height: 1.4;

  button {
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-weight: 800;
  }
`;

export const Summary = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) repeat(3, minmax(100px, 0.7fr));
  gap: 10px;
  margin-bottom: 16px;

  article {
    min-width: 0;
    padding: 15px;
    border: 1px solid #e9ded4;
    border-radius: 16px;
    background: #fff;
  }

  article:first-child {
    border-color: color-mix(in srgb, var(--home-primary) 30%, #e9ded4);
    background: color-mix(in srgb, var(--home-primary) 6%, white);
  }

  small,
  strong {
    display: block;
  }

  small {
    color: #81776f;
    font-size: 10px;
    font-weight: 700;
  }

  strong {
    margin-top: 5px;
    color: #211b17;
    font-size: clamp(16px, 3vw, 23px);
  }

  article:first-child strong {
    color: var(--home-primary);
  }

  @media (max-width: 520px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const SummaryNote = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: -7px 2px 16px;
  color: #7a7068;
  font-size: 11px;
  line-height: 1.4;

  svg {
    flex: 0 0 auto;
    color: var(--home-primary);
  }
`;

export const Card = styled.section`
  margin-top: 13px;
  padding: clamp(14px, 3vw, 18px);
  border: 1px solid #e8ddd2;
  border-radius: 18px;
  background: #fff;

  > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 13px;
  }

  h3 {
    margin: 0;
    color: #241e19;
    font-size: 15px;
  }

  header p {
    margin: 4px 0 0;
    color: #7d736b;
    font-size: 11px;
    line-height: 1.4;
  }

  header span {
    flex: 0 0 auto;
    padding: 5px 8px;
    border-radius: 999px;
    background: #f5eee8;
    color: #6d5d52;
    font-size: 10px;
    font-weight: 800;
  }
`;

export const Participants = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;

  span {
    padding: 7px 10px;
    border-radius: 999px;
    background: #f5f1ed;
    color: #514943;
    font-size: 11px;
    font-weight: 700;
  }

  span.current {
    background: color-mix(in srgb, var(--home-primary) 11%, white);
    color: var(--home-primary);
  }
`;

export const ContextNote = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: -2px 0 11px;
  padding: 9px 10px;
  border-radius: 11px;
  background: #f8f4f0;
  color: #70655c;
  font-size: 11px;
  line-height: 1.4;

  svg {
    flex: 0 0 auto;
    color: var(--home-primary);
  }
`;

export const Items = styled.div`
  display: grid;
  gap: 7px;
`;

export const Item = styled.label<{
  $selectable?: boolean;
  $selected?: boolean;
  $unavailable?: boolean;
}>`
  min-width: 0;
  display: grid;
  grid-template-columns: ${({ $selectable }) => ($selectable ? '22px ' : '')}minmax (0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid ${({ $selected }) => ($selected ? 'var(--home-primary)' : '#eee5dd')};
  border-radius: 12px;
  background: ${({ $selected }) =>
    $selected ? 'color-mix(in srgb, var(--home-primary) 6%, white)' : '#fffdfb'};
  cursor: ${({ $selectable }) => ($selectable ? 'pointer' : 'default')};
  opacity: ${({ $unavailable }) => ($unavailable ? 0.68 : 1)};

  input {
    width: 17px;
    height: 17px;
    accent-color: var(--home-primary);
  }

  b,
  small {
    display: block;
  }

  b {
    overflow-wrap: anywhere;
    color: #312a25;
    font-size: 12px;
    line-height: 1.35;
  }

  small {
    margin-top: 3px;
    color: #887e75;
    font-size: 10px;
  }

  strong {
    color: #312a25;
    font-size: 12px;
  }

  .item-state {
    text-align: right;
  }

  em {
    display: block;
    margin-top: 4px;
    color: ${({ $unavailable }) => ($unavailable ? '#8b5149' : '#397044')};
    font-size: 9px;
    font-style: normal;
    font-weight: 800;
  }
`;

export const Modes = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  button {
    min-height: 64px;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 18px;
    align-items: center;
    gap: 8px;
    padding: 11px;
    border: 1px solid #e2d8ce;
    border-radius: 13px;
    background: #fff;
    color: #352e29;
    cursor: pointer;
    font: inherit;
    text-align: left;
  }

  button b,
  button small {
    display: block;
  }

  .mode-copy {
    min-width: 0;
  }

  .mode-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: #f5efea;
    color: #695c53;
  }

  button[aria-pressed='true'] .mode-icon {
    background: var(--home-primary);
    color: #fff;
  }

  button b {
    font-size: 11px;
  }

  button small {
    margin-top: 3px;
    color: #847970;
    font-size: 10px;
    line-height: 1.3;
  }

  button[aria-pressed='true'] {
    border-color: var(--home-primary);
    background: color-mix(in srgb, var(--home-primary) 7%, white);
    color: var(--home-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--home-primary) 10%, transparent);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

export const SelectionBox = styled.div`
  margin-top: 11px;
  padding: 11px;
  border: 1px solid color-mix(in srgb, var(--home-primary) 24%, #e5d9cf);
  border-radius: 14px;
  background: #fffaf7;

  > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 9px;
    margin-bottom: 9px;
  }

  h4,
  p {
    margin: 0;
  }

  h4 {
    color: #342b25;
    font-size: 11px;
  }

  p {
    margin-top: 3px;
    color: #82776e;
    font-size: 10px;
  }

  header > span {
    flex: 0 0 auto;
    padding: 5px 7px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--home-primary) 10%, white);
    color: var(--home-primary);
    font-size: 10px;
    font-weight: 850;
  }
`;

export const SelectionHelp = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 10px;
  padding: 10px 11px;
  border-left: 3px solid var(--home-primary);
  border-radius: 0 11px 11px 0;
  background: color-mix(in srgb, var(--home-primary) 5%, white);
  color: #655b53;

  svg {
    flex: 0 0 auto;
    color: var(--home-primary);
  }

  b,
  small {
    display: block;
  }

  b {
    color: #3d342e;
    font-size: 10px;
  }

  small {
    margin-top: 2px;
    font-size: 10px;
    line-height: 1.4;
  }
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;

  label {
    display: grid;
    gap: 5px;
    color: #625951;
    font-size: 10px;
    font-weight: 800;
  }

  select,
  input[type='number'] {
    width: 100%;
    height: 42px;
    padding: 0 11px;
    border: 1px solid #ddd2c8;
    border-radius: 11px;
    background: #fff;
    color: #2d2723;
    font: inherit;
    font-size: 12px;
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const SplitControl = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #e5dad0;
  border-radius: 12px;
  background: #fffaf7;

  b,
  small {
    display: block;
  }

  b {
    color: #3c332d;
    font-size: 11px;
  }

  small {
    max-width: 270px;
    margin-top: 3px;
    color: #83786f;
    font-size: 10px;
    line-height: 1.4;
  }

  > div {
    display: grid;
    grid-template-columns: 38px minmax(82px, auto) 38px;
    align-items: center;
    gap: 5px;
  }

  button {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid #dcd0c6;
    border-radius: 9px;
    background: #fff;
    color: #4b413a;
    cursor: pointer;
  }

  output {
    color: #302923;
    font-size: 11px;
    font-weight: 850;
    text-align: center;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  @media (max-width: 480px) {
    align-items: stretch;
    flex-direction: column;

    > div {
      grid-template-columns: 42px minmax(0, 1fr) 42px;
    }

    button {
      width: 42px;
    }
  }
`;

export const MethodHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 17px;

  h3,
  p {
    margin: 0;
  }

  h3 {
    color: #2d251f;
    font-size: 13px;
  }

  p {
    margin-top: 3px;
    color: #81766e;
    font-size: 10px;
    line-height: 1.4;
  }

  > svg {
    flex: 0 0 auto;
    color: var(--home-primary);
  }
`;

export const ReviewSummary = styled.section`
  padding: 13px;
  border: 1px solid #dfd4ca;
  border-radius: 12px;
  background: #faf7f4;

  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  header small,
  header b {
    display: block;
  }

  header small {
    color: #8a7e75;
    font-size: 9px;
    font-weight: 750;
  }

  header b {
    margin-top: 2px;
    color: #332b25;
    font-size: 12px;
  }

  header em {
    color: var(--home-primary);
    font-size: 10px;
    font-style: normal;
    font-weight: 850;
  }

  > div:not(${ContextNote}) {
    display: grid;
    gap: 6px;
  }

  > div:not(${ContextNote}) > span {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    color: #746961;
    font-size: 10px;
  }

  > div:not(${ContextNote}) > span:last-child {
    padding-top: 7px;
    border-top: 1px solid #e5dbd2;
    color: #332b25;
    font-size: 11px;
    font-weight: 800;
  }

  ${ContextNote} {
    margin: 11px 0 0;
    background: #fff4dc;
    color: #735718;
  }
`;

export const BackButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #594e46;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 800;

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 22%, transparent);
    outline-offset: 2px;
  }
`;

export const Methods = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;

  button {
    min-width: 0;
    min-height: 72px;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) 18px;
    align-items: center;
    gap: 9px;
    padding: 10px;
    border: 1px solid #e2d7cd;
    border-radius: 13px;
    background: #fff;
    color: #3b332d;
    cursor: pointer;
    font: inherit;
    text-align: left;
  }

  button[aria-pressed='true'] {
    border-color: var(--home-primary);
    background: color-mix(in srgb, var(--home-primary) 6%, white);
    color: var(--home-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--home-primary) 9%, transparent);
  }

  .method-icon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: #f5efea;
    color: #675a50;
  }

  button[aria-pressed='true'] .method-icon {
    background: var(--home-primary);
    color: #fff;
  }

  b,
  small {
    display: block;
  }

  b {
    font-size: 11px;
  }

  small {
    margin-top: 3px;
    color: #82776e;
    font-size: 10px;
    line-height: 1.35;
  }

  @media (max-width: 470px) {
    grid-template-columns: 1fr;
  }
`;

export const ConfirmationInfo = styled.div<{ $manual?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 11px;
  padding: 11px 12px;
  border: 1px solid ${({ $manual }) => ($manual ? '#ead7a8' : '#cfe1d2')};
  border-radius: 12px;
  background: ${({ $manual }) => ($manual ? '#fff9e9' : '#f1f8f2')};
  color: ${({ $manual }) => ($manual ? '#785b18' : '#326741')};

  svg {
    flex: 0 0 auto;
  }

  b,
  small {
    display: block;
  }

  b {
    font-size: 10px;
  }

  small {
    margin-top: 3px;
    font-size: 10px;
    line-height: 1.45;
  }
`;

export const Fee = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  background: #f7f3ef;
  color: #5f554e;
  font-size: 11px;
  line-height: 1.4;

  input {
    width: 17px;
    height: 17px;
    flex: 0 0 auto;
    accent-color: var(--home-primary);
  }
`;

export const Submit = styled.button`
  width: 100%;
  min-height: 49px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 13px;
  border: 0;
  border-radius: 13px;
  background: var(--home-primary);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 850;

  &:disabled {
    cursor: not-allowed;
    filter: grayscale(0.15);
    opacity: 0.52;
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 24%, transparent);
    outline-offset: 2px;
  }
`;

export const ActionSummary = styled.div`
  display: grid;
  grid-template-columns: auto minmax(220px, 1fr);
  align-items: center;
  gap: 14px;
  margin-top: 13px;

  > span small,
  > span strong {
    display: block;
  }

  > span small {
    color: #80756c;
    font-size: 9px;
    font-weight: 750;
  }

  > span strong {
    margin-top: 3px;
    color: #2e2823;
    font-size: 16px;
  }

  ${Submit} {
    margin-top: 0;
  }

  @media (max-width: 470px) {
    position: sticky;
    bottom: calc(8px + env(safe-area-inset-bottom));
    z-index: 2;
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 10px;
    border: 1px solid #e0d4ca;
    border-radius: 12px;
    background: rgba(255, 253, 249, 0.96);
    box-shadow: 0 12px 30px rgba(48, 34, 25, 0.16);

    > span {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    > span strong {
      margin-top: 0;
    }

    ${Submit} {
      position: static;
      box-shadow: none;
    }
  }
`;

export const IconButton = styled.button`
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid #e3d8ce;
  border-radius: 10px;
  background: #fff;
  color: #675c54;
  cursor: pointer;

  &:hover {
    border-color: var(--home-primary);
    color: var(--home-primary);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 20%, transparent);
    outline-offset: 2px;
  }
`;

export const PaymentList = styled.div`
  display: grid;
  gap: 7px;

  article {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 9px;
    padding: 10px 11px;
    border: 1px solid #eee4dc;
    border-radius: 11px;
    background: #fffdfb;
  }

  article[data-status='PAID'] {
    border-color: #c9e4cf;
    background: #f4fbf5;
  }

  article[data-status='PROCESSING'],
  article[data-status='RESERVED'] {
    border-color: #ead8a7;
    background: #fffbef;
  }

  article[data-status='FAILED'],
  article[data-status='CANCELED'],
  article[data-status='EXPIRED'] {
    background: #faf7f4;
    opacity: 0.82;
  }

  b,
  small {
    display: block;
  }

  time {
    display: block;
    margin-top: 3px;
    color: #9a8e84;
    font-size: 10px;
  }

  article[data-status='PAID'] .status-label {
    color: #2b7a43;
  }

  article[data-status='PROCESSING'] .status-label,
  article[data-status='RESERVED'] .status-label {
    color: #8b6717;
  }

  b {
    color: #3b332e;
    font-size: 11px;
  }

  small {
    margin-top: 3px;
    color: #887e75;
    font-size: 10px;
  }

  strong {
    color: #342d28;
    font-size: 11px;
  }

  button {
    padding: 7px 9px;
    border: 1px solid #e6bdb6;
    border-radius: 9px;
    background: #fff;
    color: #ac3e34;
    cursor: pointer;
    font: inherit;
    font-size: 10px;
    font-weight: 800;
  }

  @media (max-width: 430px) {
    article {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    article button {
      grid-column: 1 / -1;
    }
  }
`;

export const StatusLegend = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin-top: 10px;

  span {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 8px 9px;
    border-radius: 10px;
    background: #f7f3ef;
    color: #796e65;
    font-size: 10px;
    line-height: 1.35;
  }

  b {
    color: #4a4039;
  }

  svg {
    flex: 0 0 auto;
    color: var(--home-primary);
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const Empty = styled.p`
  margin: 0;
  padding: 14px;
  border: 1px dashed #e4d8ce;
  border-radius: 12px;
  color: #81766d;
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
`;
