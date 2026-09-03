import styled from 'styled-components';

export const Page = styled.div`
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    repeating-linear-gradient(
      -45deg,
      transparent 0,
      transparent 22px,
      rgba(78, 63, 48, 0.035) 22px,
      rgba(78, 63, 48, 0.035) 23px
    ),
    linear-gradient(135deg, ${(p) => p.theme.bgA}, ${(p) => p.theme.bgB});

  @media (max-width: 480px) {
    place-items: start center;
    padding: 16px 12px;
  }
`;

export const Card = styled.section`
  width: min(760px, 100%);
  border: 1px solid ${(p) => p.theme.border};
  background: ${(p) => p.theme.card};
  color: ${(p) => p.theme.text};
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 30px 80px rgba(16, 10, 6, 0.35);
  position: relative;
  z-index: 2;

  @media (max-width: 480px) {
    padding: 22px 18px;
    border-radius: 18px;
  }
`;

export const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid ${(p) => p.theme.border};
  border-radius: 999px;
  color: ${(p) => p.theme.muted};
  font-size: 13px;
`;

export const IconWrap = styled.div`
  margin-top: 18px;
  width: 72px;
  height: 72px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: #1f1a16;
  background: linear-gradient(135deg, ${(p) => p.theme.accent}, ${(p) => p.theme.accentAlt});
`;

export const Title = styled.h1`
  margin: 18px 0 10px;
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.05;
`;

export const Description = styled.p`
  margin: 0;
  color: ${(p) => p.theme.muted};
  font-size: 16px;
  line-height: 1.6;
`;

export const InfoBox = styled.div`
  margin-top: 20px;
  border: 1px dashed ${(p) => p.theme.border};
  border-radius: 14px;
  padding: 14px 16px;
  color: ${(p) => p.theme.muted};
  background: rgba(255, 255, 255, 0.03);
`;

export const Actions = styled.div`
  margin-top: 22px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;

  @media (max-width: 480px) {
    display: grid;
    grid-template-columns: 1fr;

    > button {
      width: 100%;
      justify-content: center;
    }
  }
`;

export const PrimaryButton = styled.button`
  height: 48px;
  border: none;
  border-radius: 12px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(135deg, ${(p) => p.theme.accent}, ${(p) => p.theme.accentAlt});
  color: #1b130a;

  &:disabled {
    cursor: wait;
    opacity: 0.68;
  }
`;

export const SecondaryButton = styled.button`
  height: 48px;
  border: 1px solid ${(p) => p.theme.border};
  border-radius: 12px;
  padding: 0 18px;
  font-weight: 700;
  cursor: pointer;
  background: transparent;
  color: ${(p) => p.theme.text};
`;

export const GhostButton = styled.button`
  height: 48px;
  border: none;
  border-radius: 12px;
  padding: 0 18px;
  font-weight: 700;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
  color: ${(p) => p.theme.text};

  &:disabled {
    cursor: wait;
    opacity: 0.68;
  }
`;
