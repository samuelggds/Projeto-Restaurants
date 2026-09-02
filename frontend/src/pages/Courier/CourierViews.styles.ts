import styled from 'styled-components';

type ViewTone = 'pickup' | 'route' | 'history';

const toneColor: Record<ViewTone, string> = {
  pickup: '#b86b13',
  route: '#176b87',
  history: '#35734a',
};

const toneBackground: Record<ViewTone, string> = {
  pickup: '#fff8e9',
  route: '#edf8fb',
  history: '#eff8f1',
};

export const ViewStack = styled.section`
  display: grid;
  gap: 14px;
`;

export const ContextBand = styled.header<{ $tone: ViewTone }>`
  min-height: 104px;
  padding: 18px 20px;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 15px;
  border: 1px solid var(--courier-line);
  border-left: 4px solid ${(props) => toneColor[props.$tone]};
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);

  @media (max-width: 580px) {
    min-height: 0;
    padding: 15px;
    grid-template-columns: 42px minmax(0, 1fr);
  }
`;

export const ContextIcon = styled.span<{ $tone: ViewTone }>`
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  color: ${(props) => toneColor[props.$tone]};
  background: ${(props) => toneBackground[props.$tone]};

  svg {
    width: 22px;
  }

  @media (max-width: 580px) {
    width: 42px;
    height: 42px;
  }
`;

export const ContextCopy = styled.div`
  min-width: 0;

  small {
    display: block;
    margin-bottom: 3px;
    color: #7a847f;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    color: var(--courier-ink);
    font-size: 18px;
    letter-spacing: 0;
  }

  p {
    margin: 4px 0 0;
    color: var(--courier-muted);
    font-size: 12px;
    line-height: 1.45;
  }
`;

export const ContextCount = styled.div<{ $tone: ViewTone }>`
  min-width: 100px;
  padding-left: 18px;
  border-left: 1px solid var(--courier-line);
  text-align: right;

  strong {
    display: block;
    color: ${(props) => toneColor[props.$tone]};
    font-size: 28px;
    line-height: 1;
  }

  span {
    display: block;
    margin-top: 4px;
    color: #7a847f;
    font-size: 10px;
  }

  @media (max-width: 580px) {
    grid-column: 1 / -1;
    min-width: 0;
    padding: 10px 0 0;
    border-top: 1px solid var(--courier-line);
    border-left: 0;
    display: flex;
    align-items: baseline;
    gap: 6px;
    text-align: left;

    strong {
      font-size: 20px;
    }
  }
`;

export const Toolbar = styled.div`
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  @media (max-width: 540px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const SearchField = styled.label`
  width: min(420px, 100%);
  height: 44px;
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--courier-line);
  border-radius: 7px;
  color: #7b8680;
  background: #fff;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;

  &:focus-within {
    border-color: color-mix(in srgb, var(--courier-primary) 60%, #708078);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--courier-primary) 10%, transparent);
  }

  svg {
    width: 18px;
    flex: 0 0 auto;
  }

  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    color: var(--courier-ink);
    background: transparent;
    font: inherit;
    font-size: 12px;
  }

  @media (max-width: 540px) {
    width: 100%;
  }
`;

export const ListSurface = styled.div`
  min-width: 0;
`;

export const ProfileFrame = styled.section`
  display: grid;
  grid-template-columns: minmax(210px, 0.42fr) minmax(0, 1fr);
  gap: 14px;
  align-items: start;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

export const ProfileAside = styled.aside`
  padding: 22px;
  display: grid;
  gap: 16px;
  border: 1px solid var(--courier-line);
  border-radius: 8px;
  color: #f6faf7;
  background: #1d2823;

  & > svg {
    width: 44px;
    height: 44px;
    padding: 10px;
    border-radius: 7px;
    color: #1d2823;
    background: #d8f06a;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: 18px;
  }

  p {
    color: #aab8b0;
    font-size: 12px;
    line-height: 1.5;
  }

  ul {
    margin: 0;
    padding: 14px 0 0;
    display: grid;
    gap: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #d8e1dc;
    font-size: 11px;
  }

  li::before {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #77c98e;
    content: '';
  }
`;

export const HelpFrame = styled.div`
  min-width: 0;

  & > section {
    max-width: none;
    gap: 12px;
  }

  & > section > header,
  & > section > article,
  & > section > form {
    border-color: var(--courier-line);
    border-radius: 8px;
    box-shadow: none;
  }

  & > section > header {
    border-left: 4px solid #176b87;
    background: #fff;
  }
`;
