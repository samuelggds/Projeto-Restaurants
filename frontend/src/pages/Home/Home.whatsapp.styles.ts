import styled from 'styled-components';

export const FloatingWhatsApp = styled.a`
  position: fixed;
  right: clamp(16px, 2vw, 28px);
  bottom: clamp(18px, 2vw, 30px);
  z-index: 70;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: #1f9d4d;
  box-shadow: 0 12px 28px rgba(18, 105, 50, 0.28);
  text-decoration: none;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;

  svg {
    width: 27px;
    height: 27px;
  }

  &:hover {
    transform: translateY(-2px) scale(1.03);
    background: #17883f;
    box-shadow: 0 16px 34px rgba(18, 105, 50, 0.34);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, #1f9d4d 34%, transparent);
    outline-offset: 4px;
  }

  @media (max-width: 700px) {
    right: 14px;
    bottom: 16px;
    width: 54px;
    height: 54px;

    svg {
      width: 25px;
      height: 25px;
    }
  }
`;
