import styled from 'styled-components';

export const FilterBar = styled.div`
  margin-bottom: 18px;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(180px, 240px);
  gap: 10px;

  label {
    position: relative;
    min-width: 0;
  }

  label > svg {
    position: absolute;
    top: 50%;
    left: 14px;
    width: 17px;
    color: #718087;
    transform: translateY(-50%);
    pointer-events: none;
  }

  input,
  select {
    width: 100%;
    height: 46px;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--ink);
    background: #fff;
    font: inherit;
    font-size: 12px;
  }

  input {
    padding: 0 14px 0 42px;
  }

  select {
    padding: 0 12px;
  }

  input:focus,
  select:focus {
    outline: 3px solid color-mix(in srgb, var(--brand) 14%, transparent);
    border-color: color-mix(in srgb, var(--brand) 55%, var(--border));
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const Workspace = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
  align-items: start;
  gap: 18px;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
  }
`;

export const Section = styled.section`
  min-width: 0;

  > header {
    min-height: 54px;
    margin-bottom: 11px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  > header > div {
    min-width: 0;
  }

  h2 {
    margin: 0;
    font-size: 18px;
  }

  header p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.4;
  }
`;

export const SectionCount = styled.span`
  min-width: 36px;
  height: 32px;
  padding: 0 9px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--brand) 28%, var(--border));
  border-radius: 7px;
  color: var(--brand);
  background: color-mix(in srgb, var(--brand) 7%, #fff);
  font-size: 12px;
  font-weight: 800;
`;

export const List = styled.div`
  display: grid;
  gap: 10px;
`;

export const PendingPayment = styled.article<{ $method: 'CASH' | 'CARD_MACHINE' }>`
  min-height: 116px;
  padding: 15px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid ${(p) => (p.$method === 'CASH' ? '#b9ddc4' : '#c8d7e3')};
  border-radius: 8px;
  background: ${(p) => (p.$method === 'CASH' ? '#f8fcf8' : '#f7fafc')};
  box-shadow: 0 5px 16px rgba(24, 43, 48, 0.05);

  .method-icon {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: ${(p) => (p.$method === 'CASH' ? '#247744' : '#35647b')};
    background: ${(p) => (p.$method === 'CASH' ? '#e2f3e6' : '#e5eff4')};
  }

  .method-icon svg {
    width: 21px;
  }

  .identity {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .identity b {
    font-size: 14px;
  }

  .identity span,
  .identity small {
    color: var(--muted);
    font-size: 10px;
  }

  .value {
    display: grid;
    justify-items: end;
    gap: 6px;
  }

  .value strong {
    font-size: 18px;
  }

  .value span {
    padding: 4px 7px;
    border-radius: 999px;
    color: #8b5b22;
    background: #fff1d8;
    font-size: 8px;
    font-weight: 800;
    text-transform: uppercase;
  }

  button {
    grid-column: 2 / -1;
    min-height: 42px;
    border: 0;
    border-radius: 7px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #fff;
    background: #187543;
    font: inherit;
    font-size: 11px;
    font-weight: 800;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.62;
  }

  button svg {
    width: 17px;
  }

  @media (max-width: 520px) {
    padding: 13px;
    grid-template-columns: 40px minmax(0, 1fr) auto;

    .method-icon {
      width: 40px;
      height: 40px;
    }

    .value strong {
      font-size: 15px;
    }
  }
`;

export const AccountCard = styled.article`
  padding: 15px;
  display: grid;
  gap: 13px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 5px 16px rgba(24, 43, 48, 0.045);

  > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  h3 {
    margin: 0;
    font-size: 15px;
  }

  header p {
    margin: 3px 0 0;
    color: var(--muted);
    font-size: 10px;
  }

  header > span {
    padding: 5px 7px;
    border-radius: 6px;
    color: #9a4b22;
    background: #fff0e7;
    font-size: 8px;
    font-weight: 850;
    text-transform: uppercase;
  }

  header > span.closing {
    color: #805d13;
    background: #fff3cf;
  }

  .amounts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .amounts span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .amounts small {
    color: var(--muted);
    font-size: 9px;
  }

  .amounts b {
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
  }

  .amounts .paid b {
    color: #237445;
  }

  .amounts .remaining b {
    color: #b94f2d;
  }

  .progress {
    height: 6px;
    overflow: hidden;
    border-radius: 999px;
    background: #edf0ee;
  }

  .progress i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #3c9a61;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 7px 12px;
    color: #67747a;
    font-size: 9px;
  }

  .meta span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .meta svg {
    width: 13px;
  }

  > button {
    min-height: 40px;
    border: 1px solid #b8cbd3;
    border-radius: 7px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    color: #2e5668;
    background: #f5f9fa;
    font: inherit;
    font-size: 11px;
    font-weight: 750;
  }

  > button svg {
    width: 16px;
  }
`;

export const Error = styled.p`
  margin: 0 0 12px;
  padding: 10px 12px;
  border: 1px solid #efc6bd;
  border-radius: 7px;
  color: #9b3327;
  background: #fff4f2;
  font-size: 11px;
`;
