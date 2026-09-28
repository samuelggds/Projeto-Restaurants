import styled from 'styled-components';

export const LoyaltyStack = styled.div`
  display: grid;
  gap: 32px;

  @media (max-width: 900px) {
    gap: 24px;
  }
`;

export const ProgressCard = styled.section`
  padding: 32px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--surface);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  display: grid;
  justify-items: center;
  gap: 24px;
  text-align: center;

  .ring {
    --progress: 0deg;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at center, var(--surface) 0 57%, transparent 58%),
      conic-gradient(var(--p) var(--progress), #f0ede7 0);
  }

  .ring-copy {
    display: grid;
    gap: 2px;
  }

  .ring strong {
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 32px;
    line-height: 1;
    font-weight: 800;
  }

  .ring span {
    color: var(--muted);
    font-size: 14px;
    font-weight: 600;
  }

  .copy {
    display: grid;
    gap: 6px;
  }

  h2 {
    margin: 0;
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 22px;
    font-weight: 800;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 15px;
  }

  p b {
    color: var(--p);
  }

  @media (max-width: 900px) {
    padding: 20px;
    border-radius: 16px;
    gap: 16px;

    .ring {
      width: 120px;
      height: 120px;
    }

    .ring strong {
      font-family: 'Inter', sans-serif;
      font-size: 24px;
    }

    .ring span {
      font-size: 12px;
    }

    h2 {
      display: none;
    }

    p {
      font-size: 14px;
      line-height: 20px;
    }
  }
`;

export const Block = styled.section`
  display: grid;
  gap: 16px;

  > h2 {
    margin: 0;
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 20px;
    font-weight: 800;
  }

  @media (max-width: 900px) {
    gap: 12px;

    > h2 {
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      font-weight: 700;
    }
  }
`;

export const Steps = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 10px;
  }
`;

export const Step = styled.article`
  min-height: 177px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  display: grid;
  align-content: start;
  gap: 12px;

  .icon {
    width: 40px;
    height: 40px;
    border-radius: 20px;
    background: #fdf2ec;
    color: var(--p);
    display: grid;
    place-items: center;
  }

  .icon svg {
    width: 20px;
    height: 20px;
  }

  h3 {
    margin: 0;
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 18px;
  }

  @media (max-width: 900px) {
    min-height: 64px;
    padding: 12px;
    grid-template-columns: 40px minmax(0, 1fr);
    gap: 12px;

    .copy {
      display: grid;
      gap: 2px;
      align-content: center;
    }

    h3 {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
    }

    p {
      font-size: 12px;
      line-height: 15px;
    }
  }
`;

export const History = styled.div`
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);

  .head,
  .row {
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr) 150px;
    gap: 12px;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--line);
  }

  .row:last-child {
    border-bottom: 0;
  }

  .head {
    background: #fafaf8;
    color: var(--muted);
    font-size: 13px;
    font-weight: 700;
  }

  .date {
    color: var(--muted);
    font-size: 14px;
  }

  .order {
    font-size: 14px;
    font-weight: 600;
  }

  .stamp {
    justify-self: end;
    padding: 4px 8px;
    border-radius: 6px;
    background: #eaf7ee;
    color: #268c43;
    font-size: 12px;
    font-weight: 700;
  }

  .stamp.used {
    background: #fdf2ec;
    color: var(--p);
  }

  @media (max-width: 900px) {
    padding: 4px 16px;

    .head {
      display: none;
    }

    .row {
      grid-template-columns: minmax(0, 1fr) auto;
      padding: 12px 0;
    }

    .date {
      grid-column: 1;
      grid-row: 2;
      font-size: 12px;
      color: #a09e9a;
    }

    .order {
      grid-column: 1;
      grid-row: 1;
      font-size: 14px;
    }

    .stamp {
      grid-column: 2;
      grid-row: 1 / 3;
      font-size: 13px;
    }
  }
`;

export const RewardCard = styled.article<{ $locked?: boolean }>`
  min-height: 96px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  opacity: ({ $locked }) => ($locked ? 0.6 : 1);

  .visual {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    background: #f7f5f0;
    color: ({ $locked }) => ($locked ? '#72706b' : 'var(--p)');
    display: grid;
    place-items: center;
  }

  .visual svg {
    width: 30px;
    height: 30px;
  }

  .copy {
    display: grid;
    gap: 4px;
  }

  h3 {
    margin: 0;
    font-size: 15px;
  }

  .tag {
    width: max-content;
    padding: 4px 8px;
    border-radius: 8px;
    background: #f7f5f0;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
  }

  button {
    min-height: 36px;
    padding: 0 14px;
    border: 0;
    border-radius: 999px;
    background: var(--p);
    color: #fff;
    font-size: 12px;
    font-weight: 700;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 900px) {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 16px;

    button {
      grid-column: 1 / -1;
      width: 100%;
    }
  }
`;

export const RedeemCard = styled.section`
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  display: grid;
  gap: 16px;

  h2 {
    margin: 0;
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 700;
  }

  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
  }

  input {
    min-height: 42px;
    padding: 0 16px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: #fafaf8;
    color: var(--text);
    outline: none;
  }

  input:focus {
    border-color: var(--p);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--p) 10%, transparent);
  }

  button {
    min-width: 100px;
    min-height: 42px;
    padding: 0 24px;
    border: 0;
    border-radius: 10px;
    background: var(--p);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
  }

  .message {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }

  .message.error {
    color: #d03636;
  }

  @media (max-width: 900px) {
    padding: 16px;
    gap: 12px;

    h2 {
      font-family: 'Inter', sans-serif;
      font-size: 15px;
    }

    .row {
      grid-template-columns: minmax(0, 1fr) 92px;
      gap: 8px;
    }

    input {
      min-width: 0;
      padding: 0 14px;
    }

    button {
      min-width: 92px;
      padding: 0 12px;
    }
  }
`;

export const CouponGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

export const CouponCard = styled.article<{ $inactive?: boolean }>`
  min-height: 100px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  opacity: ({ $inactive }) => ($inactive ? 0.55 : 1);

  .value {
    padding: 12px;
    background: ({ $inactive }) => ($inactive ? '#fafaf8' : '#fdf2ec');
    color: ({ $inactive }) => ($inactive ? '#72706b' : 'var(--p)');
    display: grid;
    place-items: center;
    text-align: center;
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 20px;
    font-weight: 800;
    border-right: 1px dashed var(--line);
  }

  .content {
    min-width: 0;
    padding: 16px;
    display: grid;
    gap: 8px;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  h3 {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: 'Gabarito', 'Inter', sans-serif;
    font-size: 16px;
  }

  .state {
    flex: 0 0 auto;
    padding: 4px 8px;
    border-radius: 6px;
    background: ({ $inactive }) => ($inactive ? '#efece6' : '#eaf7ee');
    color: ({ $inactive }) => ($inactive ? '#72706b' : '#268c43');
    font-size: 11px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 16px;
  }

  small {
    color: var(--muted);
    font-size: 11px;
  }

  @media (max-width: 900px) {
    grid-template-columns: 94px minmax(0, 1fr);

    .value {
      font-family: 'Inter', sans-serif;
      font-size: 16px;
    }

    h3 {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
    }
  }
`;

export const Info = styled.div`
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fafaf8;
  color: var(--muted);
  display: flex;
  gap: 12px;
  align-items: flex-start;
  font-size: 14px;
  line-height: 20px;

  svg {
    flex: 0 0 20px;
    color: var(--p);
  }

  @media (max-width: 900px) {
    padding: 14px;
    font-size: 12px;
    line-height: 17px;
  }
`;

export const Empty = styled.div`
  padding: 28px;
  border: 1px dashed var(--line);
  border-radius: 16px;
  background: var(--surface);
  color: var(--muted);
  text-align: center;
  font-size: 13px;
`;
