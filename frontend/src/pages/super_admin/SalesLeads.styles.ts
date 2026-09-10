import styled from 'styled-components';

export const Inbox = styled.div`
  display: grid;
  gap: 18px;
  min-width: 0;
`;

export const Filters = styled.form`
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  gap: 12px;
  label {
    display: grid;
    gap: 7px;
    font-size: 12px;
    font-weight: 700;
    min-width: 0;
  }
  label:first-child {
    flex: 1 1 280px;
  }
  input,
  select {
    min-width: 0;
    width: 100%;
    min-height: 42px;
    border: 1px solid var(--border);
    border-radius: 9px;
    padding: 0 12px;
    background: #fff;
    color: var(--ink);
    font-size: 13px;
  }
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid #e9530b35;
    outline-offset: 2px;
  }
  @media (max-width: 550px) {
    label {
      flex: 1 1 100%;
    }
    button {
      flex: 1;
    }
  }
`;

export const Summary = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
  b {
    color: var(--ink);
  }
`;

export const List = styled.div`
  display: grid;
  gap: 12px;
`;

export const LeadCard = styled.article`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(130px, 1fr) minmax(140px, 1fr) auto;
  align-items: center;
  gap: 18px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 18px;
  .identity,
  .interest,
  .progress {
    display: grid;
    gap: 6px;
    min-width: 0;
    justify-items: start;
  }
  h3 {
    font-size: 15px;
    margin: 0;
    overflow-wrap: anywhere;
  }
  p,
  time,
  small {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .email-state {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--muted);
    font-size: 11px;
  }
  .email-state.failed {
    color: #ae2c20;
  }
  @media (max-width: 1180px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    button {
      justify-self: start;
    }
  }
  @media (max-width: 540px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
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
  font-size: 12px;
  flex-wrap: wrap;
  @media (max-width: 540px) {
    justify-content: center;
  }
`;

export const DetailGrid = styled.dl`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
  margin: 22px 0;
  > div {
    min-width: 0;
  }
  dt {
    color: var(--muted);
    font-size: 11px;
    margin-bottom: 6px;
  }
  dd {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }
  .wide {
    grid-column: 1 / -1;
  }
  .message {
    background: #f7f5f1;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px;
    white-space: pre-wrap;
  }
  @media (max-width: 500px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const StatusForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 10px;
  padding: 18px 0;
  border-top: 1px solid var(--border);
  label {
    display: grid;
    gap: 7px;
    font-size: 12px;
    font-weight: 700;
    flex: 1 1 180px;
  }
  select {
    width: 100%;
    min-height: 42px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: #fff;
  }
`;
