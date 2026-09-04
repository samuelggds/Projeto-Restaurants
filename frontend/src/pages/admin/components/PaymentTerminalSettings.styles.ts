import styled from 'styled-components';

export const Section = styled.section`
  margin-top: 28px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
`;

export const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;

  h3 {
    margin: 5px 0 6px;
    color: #0f172a;
    font-size: 20px;
  }

  p {
    margin: 0;
    max-width: 680px;
    color: #64748b;
    line-height: 1.55;
  }

  > div > span {
    color: #d64d08;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  @media (max-width: 700px) {
    flex-direction: column;
  }
`;

export const SyncButton = styled.button`
  flex: 0 0 auto;
  min-height: 42px;
  padding: 0 16px;
  border: 0;
  border-radius: 12px;
  background: #0f172a;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const Notice = styled.div<{ $error?: boolean }>`
  margin-bottom: 18px;
  padding: 13px 14px;
  border-radius: 12px;
  border: 1px solid ${({ $error }) => ($error ? '#fecaca' : '#bfdbfe')};
  background: ${({ $error }) => ($error ? '#fef2f2' : '#eff6ff')};
  color: ${({ $error }) => ($error ? '#991b1b' : '#1e40af')};
  font-size: 14px;
  line-height: 1.45;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
`;

export const Card = styled.article<{ $active: boolean }>`
  padding: 17px;
  border: 1px solid ${({ $active }) => ($active ? '#dbe3ec' : '#e2e8f0')};
  border-radius: 16px;
  background: ${({ $active }) => ($active ? '#fff' : '#f8fafc')};
  opacity: ${({ $active }) => ($active ? 1 : 0.7)};
`;

export const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  strong {
    display: block;
    color: #0f172a;
    font-size: 16px;
  }

  small {
    display: block;
    margin-top: 4px;
    color: #64748b;
  }
`;

export const Badge = styled.span<{ $ok: boolean }>`
  padding: 5px 8px;
  border-radius: 999px;
  background: ${({ $ok }) => ($ok ? '#ecfdf3' : '#f1f5f9')};
  color: ${({ $ok }) => ($ok ? '#15803d' : '#64748b')};
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
`;

export const Meta = styled.div`
  display: grid;
  gap: 7px;
  margin: 15px 0;
  color: #475569;
  font-size: 13px;

  span {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  b {
    color: #0f172a;
    text-align: right;
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 7px;
  color: #475569;
  font-size: 12px;
  font-weight: 800;

  select {
    width: 100%;
    min-height: 42px;
    padding: 0 11px;
    border: 1px solid #cbd5e1;
    border-radius: 11px;
    background: #fff;
    color: #0f172a;
    outline: none;
  }

  select:focus {
    border-color: #d64d08;
    box-shadow: 0 0 0 3px rgba(214, 77, 8, 0.1);
  }

  select:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
  }
`;

export const Empty = styled.div`
  padding: 22px;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  text-align: center;
  color: #64748b;
  line-height: 1.5;
`;
