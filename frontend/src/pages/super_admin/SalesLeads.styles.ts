import styled from 'styled-components';

export const Inbox = styled.div`
  display: grid;
  gap: 24px;
  min-width: 0;
`;

export const Filters = styled.form`
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  gap: 16px 12px;
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--border, #dfe5dd);
  border-radius: 18px;
  background: var(--surface, #fff);
  box-shadow: 0 3px 14px #233f3204;
  label {
    display: grid;
    gap: 8px;
    color: var(--ink, #1c3028);
    font-size: 12px;
    font-weight: 750;
    min-width: 0;
  }
  label:first-child {
    flex: 1 1 280px;
  }
  input,
  select {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    min-height: 46px;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 12px;
    padding: 0 13px;
    background: #fbfcf9;
    color: var(--ink, #1c3028);
    font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.5;
  }
  input::placeholder {
    color: #738075;
    opacity: 1;
  }
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid var(--focus, #63836b);
    outline-offset: 3px;
    border-color: var(--brand, #233f32);
    background: #fff;
  }
  @media (max-width: 550px) {
    padding: 18px 16px;
    label {
      flex: 1 1 100%;
    }
    input,
    select {
      font-size: 16px;
    }
    button {
      flex: 1 1 auto;
    }
  }
`;

export const Summary = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 16px;
  color: var(--muted, #637169);
  font-size: 12px;
  line-height: 1.6;
  b {
    color: var(--ink, #1c3028);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
`;

export const List = styled.div`
  display: grid;
  gap: 14px;
  min-width: 0;
`;

export const LeadCard = styled.article`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(130px, 1fr) minmax(140px, 1fr) auto;
  align-items: center;
  gap: 22px;
  min-width: 0;
  border: 1px solid var(--border, #dfe5dd);
  border-radius: 18px;
  background: var(--surface, #fff);
  padding: 24px;
  box-shadow: 0 3px 14px #233f3204;
  .identity,
  .interest,
  .progress {
    display: grid;
    gap: 7px;
    min-width: 0;
    justify-items: start;
  }
  .identity {
    padding-left: 14px;
    border-left: 3px solid #b8cba7;
  }
  h3 {
    color: var(--ink, #1c3028);
    font-size: 16px;
    font-weight: 750;
    line-height: 1.4;
    letter-spacing: -0.025em;
    margin: 0;
    overflow-wrap: anywhere;
  }
  p,
  time,
  small {
    margin: 0;
    color: var(--muted, #637169);
    font-size: 12px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }
  .identity p:first-of-type {
    color: #41594a;
    font-weight: 650;
  }
  time {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  .email-state {
    display: inline-flex;
    align-items: flex-start;
    gap: 6px;
    color: var(--muted, #637169);
    font-size: 11px;
    line-height: 1.55;
    overflow-wrap: anywhere;
    svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
  }
  .email-state.failed {
    color: #a4382a;
  }
  &:focus-within {
    border-color: #a2b59c;
  }
  @media (max-width: 1180px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    button {
      justify-self: start;
    }
  }
  @media (max-width: 540px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
    padding: 20px 16px;
    .interest {
      padding-top: 16px;
      border-top: 1px solid #e9ede5;
    }
    button {
      width: 100%;
    }
  }
`;

export const Pagination = styled.nav`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-width: 0;
  padding-top: 20px;
  color: var(--muted, #637169);
  font-size: 12px;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
  flex-wrap: wrap;
  @media (max-width: 540px) {
    justify-content: center;
    gap: 10px;
  }
`;

export const DetailGrid = styled.dl`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 22px 24px;
  margin: 26px 0;
  min-width: 0;
  font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  > div {
    min-width: 0;
  }
  dt {
    color: var(--muted, #637169);
    font-size: 11px;
    line-height: 1.5;
    margin-bottom: 7px;
  }
  dd {
    margin: 0;
    color: var(--ink, #1c3028);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }
  .wide {
    grid-column: 1 / -1;
  }
  .message {
    background: #f5f7f0;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 14px;
    padding: 17px;
    font-weight: 500;
    white-space: pre-wrap;
  }
  @media (max-width: 500px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }
`;

export const StatusForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 14px;
  min-width: 0;
  padding: 24px 0;
  border-top: 1px solid var(--border, #dfe5dd);
  label {
    display: grid;
    gap: 8px;
    min-width: 0;
    color: var(--ink, #1c3028);
    font-size: 12px;
    font-weight: 750;
    line-height: 1.5;
    flex: 1 1 180px;
  }
  select {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    min-height: 46px;
    padding: 0 13px;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 12px;
    background: #fbfcf9;
    color: var(--ink, #1c3028);
    font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.5;
  }
  select:focus-visible {
    outline: 3px solid var(--focus, #63836b);
    outline-offset: 3px;
    border-color: var(--brand, #233f32);
  }
  select:disabled {
    background: #f5f6f2;
    color: var(--muted, #637169);
  }
  @media (max-width: 500px) {
    select {
      font-size: 16px;
    }
    button {
      width: 100%;
    }
  }
`;
