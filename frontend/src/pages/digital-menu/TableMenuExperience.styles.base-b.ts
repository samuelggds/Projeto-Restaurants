import styled from 'styled-components';

export const OrderItems = styled.section`
  margin-top: 16px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: #fff;

  h2 { margin-top: 0; }
  article {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
  }
  article div { display: grid; gap: 3px; }
  article small { color: var(--muted); }
`;
