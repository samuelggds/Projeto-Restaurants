import styled, { keyframes } from "styled-components";

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

export const Page = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 1rem;
  padding: 1.25rem;
  background: #000;
`;

export const GearWrap = styled.div`
  display: grid;
  place-items: center;
  color: #fff;

  svg {
    animation: ${spin} 2.2s linear infinite;
  }
`;

export const Title = styled.h1`
  margin: 0;
  text-align: center;
  color: #fff;
  font-size: clamp(1.2rem, 4vw, 1.5rem);
  line-height: 1.2;
`;

export const BackButton = styled.button`
  margin-top: 0.45rem;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: transparent;
  color: #fff;
  border-radius: 999px;
  padding: 0.52rem 1rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    color 140ms ease;

  &:hover {
    background: #fff;
    color: #000;
  }
`;
