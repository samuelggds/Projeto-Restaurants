import styled, { createGlobalStyle } from "styled-components";

export const GlobalMenuStyle = createGlobalStyle`
  @import url("https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap");

  :root {
    --dm-bg: #111315;
    --dm-bg-soft: #1a1d20;
    --dm-card: rgba(35, 39, 44, 0.86);
    --dm-card-solid: #25292d;
    --dm-line: rgba(248, 236, 215, 0.2);
    --dm-text: #f8f1e4;
    --dm-muted: #cab9a4;
    --dm-brand: #f3a15d;
    --dm-brand-2: #d47344;
    --dm-warm: #ffd089;
    --dm-danger: #ef8f7a;
  }

  body {
    font-family: "Sora", "Segoe UI", sans-serif;
    color: var(--dm-text);
    background:
      repeating-linear-gradient(
        90deg,
        rgba(248, 236, 215, 0.03) 0,
        rgba(248, 236, 215, 0.03) 1px,
        transparent 1px,
        transparent 92px
      ),
      radial-gradient(circle at 14% -8%, rgba(243, 161, 93, 0.2), transparent 34%),
      radial-gradient(circle at 84% -10%, rgba(212, 115, 68, 0.18), transparent 36%),
      linear-gradient(165deg, #0f1113 0%, #171a1d 48%, #212429 100%);
    background-attachment: fixed;
  }

  * {
    box-sizing: border-box;
  }

  @keyframes riseIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulseDot {
    0% {
      transform: scale(1);
      opacity: 0.65;
    }

    100% {
      transform: scale(1.3);
      opacity: 1;
    }
  }
`;

export const Page = styled.main`
  min-height: 100vh;
  width: 100%;
  color: var(--dm-text);
`;

export const PinGateWrap = styled.section`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1rem;
`;

export const PinGateCard = styled.div`
  width: min(560px, 100%);
  border: 1px solid var(--dm-line);
  border-radius: 14px;
  background: linear-gradient(
    160deg,
    rgba(35, 39, 44, 0.95),
    rgba(28, 31, 35, 0.9)
  );
  box-shadow: 0 26px 48px rgba(0, 0, 0, 0.32);
  padding: clamp(1rem, 3vw, 1.5rem);
  animation: riseIn 0.4s ease;

  h1 {
    margin: 0.7rem 0 0.35rem;
    font-family: "Space Grotesk", "Sora", sans-serif;
    font-size: clamp(1.4rem, 5vw, 2rem);
    line-height: 1.08;
  }

  p {
    margin: 0;
    color: var(--dm-muted);
    font-size: 0.96rem;
    line-height: 1.55;
  }

  form {
    margin-top: 1rem;
  }
`;

export const PinInput = styled.input`
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--dm-line);
  background: rgba(38, 42, 47, 0.92);
  color: var(--dm-text);
  padding: 0.8rem 0.9rem;
  font-size: 1.1rem;
  letter-spacing: 0.28em;
  text-align: center;
  outline: none;
`;

export const PinError = styled.p`
  margin: 0.6rem 0 0;
  color: #ffd0c6;
  font-size: 0.86rem;
`;

export const PinSubmitButton = styled.button`
  width: 100%;
  border: none;
  border-radius: 10px;
  margin-top: 0.75rem;
  padding: 0.84rem 0.95rem;
  background: linear-gradient(135deg, var(--dm-brand), var(--dm-brand-2));
  color: #2b180c;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const Hero = styled.section`
  max-width: 1220px;
  margin: 0 auto;
  padding: clamp(1rem, 3vw, 2rem);
  padding-top: clamp(1.2rem, 4vw, 2.4rem);
`;

export const HeroCard = styled.div`
  border: 1px solid var(--dm-line);
  border-radius: 14px;
  background:
    linear-gradient(160deg, rgba(35, 39, 44, 0.96), rgba(28, 31, 35, 0.86)),
    var(--dm-card-solid);
  box-shadow: 0 30px 50px rgba(0, 0, 0, 0.34);
  padding: clamp(1rem, 3vw, 1.6rem);
  position: relative;
  overflow: hidden;
  animation: riseIn 0.45s ease;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 120px;
    height: 120px;
    clip-path: polygon(100% 0, 0 0, 100% 100%);
    background: linear-gradient(
      145deg,
      rgba(243, 161, 93, 0.24),
      rgba(212, 115, 68, 0.14)
    );
    pointer-events: none;
  }
`;

export const HeroTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
`;

export const BrandPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 8px;
  padding: 0.44rem 0.8rem;
  border: 1px solid rgba(243, 161, 93, 0.45);
  background: rgba(46, 37, 31, 0.72);
  color: var(--dm-brand);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const LivePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 8px;
  padding: 0.4rem 0.68rem;
  border: 1px solid rgba(255, 208, 137, 0.36);
  color: #ffe0b6;
  background: rgba(61, 44, 34, 0.62);
  font-size: 0.75rem;
  font-weight: 700;

  span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #f9bf76;
    animation: pulseDot 0.9s ease-in-out infinite alternate;
  }
`;

export const HeroTitle = styled.h1`
  margin: 0.85rem 0 0.3rem;
  font-family: "Space Grotesk", "Sora", sans-serif;
  font-size: clamp(1.75rem, 6vw, 3rem);
  line-height: 1.02;
  letter-spacing: -0.02em;
  max-width: 20ch;
`;

export const HeroText = styled.p`
  margin: 0;
  color: var(--dm-muted);
  max-width: 74ch;
  font-size: clamp(0.94rem, 2.3vw, 1.04rem);
  line-height: 1.58;
`;

export const TableCallout = styled.div`
  margin-top: 0.85rem;
  width: fit-content;
  border: 1px solid rgba(243, 161, 93, 0.55);
  background: linear-gradient(
    135deg,
    rgba(243, 161, 93, 0.2),
    rgba(212, 115, 68, 0.2)
  );
  color: #ffe7c4;
  border-radius: 10px;
  padding: 0.5rem 0.85rem;
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  strong {
    font-family: "Space Grotesk", "Sora", sans-serif;
    font-size: 1.05rem;
    margin-left: 0.3rem;
    color: #fff6e5;
  }
`;

export const SetupRow = styled.div`
  margin-top: 1rem;
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;

  input {
    flex: 1;
    min-width: 210px;
    border-radius: 10px;
    border: 1px solid var(--dm-line);
    background: rgba(32, 35, 39, 0.92);
    color: var(--dm-text);
    padding: 0.75rem 0.95rem;
    font-size: 0.94rem;
    outline: none;
  }
`;

export const HeroStats = styled.div`
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const HeroStatCard = styled.div`
  border: 1px solid var(--dm-line);
  background: linear-gradient(
    180deg,
    rgba(43, 47, 53, 0.94),
    rgba(31, 34, 39, 0.88)
  );
  border-radius: 10px;
  padding: 0.72rem 0.8rem;
  min-height: 70px;
  display: grid;
  gap: 0.26rem;

  strong {
    font-family: "Space Grotesk", "Sora", sans-serif;
    font-size: clamp(1.02rem, 2.8vw, 1.25rem);
    color: #fff3df;
    line-height: 1;
  }

  span {
    font-size: 0.74rem;
    color: var(--dm-muted);
    line-height: 1.35;
  }
`;

export const ActionButton = styled.button`
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, var(--dm-brand), var(--dm-brand-2));
  color: #2b180c;
  font-weight: 800;
  cursor: pointer;
  transition: filter 0.18s ease;

  &:hover {
    filter: brightness(1.06);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const Section = styled.section`
  max-width: 1220px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 3vw, 2rem) 6rem;
`;

export const CategoryBar = styled.div`
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.4rem;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(243, 161, 93, 0.3);
    border-radius: 999px;
  }
`;

export const CategoryChip = styled.button`
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(243, 161, 93, 0.78)" : "var(--dm-line)"};
  border-radius: 10px;
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(180deg, rgba(243, 161, 93, 0.34), rgba(212, 115, 68, 0.34))"
      : "rgba(34, 38, 43, 0.88)"};
  color: ${({ $active }) => ($active ? "#fff2df" : "var(--dm-muted)")};
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.52rem 0.85rem;
  white-space: nowrap;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;

  small {
    display: inline-grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    border-radius: 6px;
    font-size: 0.7rem;
    background: ${({ $active }) =>
      $active ? "rgba(57, 43, 34, 0.46)" : "rgba(243, 161, 93, 0.2)"};
    color: ${({ $active }) => ($active ? "#ffefda" : "#ffd7ab")};
  }
`;

export const Grid = styled.div`
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(245px, 1fr));
  gap: 0.8rem;
`;

export const ProductCard = styled.article`
  background: linear-gradient(
    180deg,
    rgba(39, 43, 48, 0.95),
    rgba(30, 33, 38, 0.96)
  );
  border: 1px solid var(--dm-line);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
  animation: riseIn 0.45s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(243, 161, 93, 0.52);
  }
`;

export const ProductImage = styled.div`
  height: 150px;
  background: ${({ $image }) =>
    $image
      ? `linear-gradient(180deg, rgba(20, 16, 13, 0.08), rgba(20, 16, 13, 0.58)), url(${$image}) center / cover`
      : "linear-gradient(130deg, #5a3f31, #3c2e26)"};
  border-bottom: 1px solid var(--dm-line);
`;

export const ProductBody = styled.div`
  padding: 0.85rem;
  display: grid;
  gap: 0.62rem;

  h3 {
    margin: 0;
    font-size: 1rem;
    line-height: 1.3;
  }

  p {
    margin: 0;
    color: var(--dm-muted);
    font-size: 0.86rem;
    line-height: 1.48;
    min-height: 40px;
  }
`;

export const ProductCategory = styled.span`
  display: inline-flex;
  width: fit-content;
  border-radius: 6px;
  padding: 0.24rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #ffe8c8;
  border: 1px solid rgba(243, 161, 93, 0.34);
  background: rgba(243, 161, 93, 0.14);
`;

export const ProductMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
`;

export const Price = styled.strong`
  color: var(--dm-warm);
  font-size: 1rem;
`;

export const AddButton = styled.button`
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.72rem;
  background: rgba(243, 161, 93, 0.16);
  border: 1px solid rgba(243, 161, 93, 0.4);
  color: #ffd5a8;
  font-weight: 700;
  cursor: pointer;
`;

export const FloatingCart = styled.button`
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  border: 1px solid rgba(39, 22, 10, 0.24);
  border-radius: 10px;
  padding: 0.78rem 0.96rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--dm-brand), var(--dm-brand-2));
  color: #2b180c;
  box-shadow: 0 14px 28px rgba(2, 12, 27, 0.34);
  font-weight: 800;
  cursor: pointer;
  z-index: 30;

  b {
    font-size: 0.82rem;
    padding: 0.14rem 0.42rem;
    border-radius: 6px;
    background: rgba(39, 22, 10, 0.22);
    border: 1px solid rgba(39, 22, 10, 0.24);
    color: #311b0e;
  }

  @media (max-width: 520px) {
    left: 0.8rem;
    right: 0.8rem;
    justify-content: center;
    bottom: 0.8rem;
  }
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 10, 0.56);
  backdrop-filter: blur(2px);
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition: opacity 0.22s ease;
  z-index: 70;
`;

export const Drawer = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  width: min(520px, 100vw);
  height: 100vh;
  background: linear-gradient(
    175deg,
    rgba(28, 31, 36, 0.98),
    rgba(23, 26, 30, 0.98)
  );
  border-left: 1px solid var(--dm-line);
  transform: translateX(${({ $open }) => ($open ? "0" : "106%")});
  transition: transform 0.26s ease;
  z-index: 90;
  display: flex;
  flex-direction: column;
`;

export const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.95rem;
  border-bottom: 1px solid var(--dm-line);

  h2 {
    margin: 0;
    font-size: 1.04rem;
  }

  button {
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(243, 161, 93, 0.16);
    color: var(--dm-text);
    cursor: pointer;
  }
`;

export const DrawerTotal = styled.strong`
  margin-left: auto;
  margin-right: 0.55rem;
  color: var(--dm-warm);
  font-size: 0.96rem;
`;

export const DrawerTabs = styled.div`
  margin: 0.85rem 0.95rem 0;
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  background: rgba(42, 45, 51, 0.92);
  border: 1px solid var(--dm-line);
  border-radius: 10px;
  padding: 0.18rem;
`;

export const DrawerTab = styled.button`
  border: none;
  border-radius: 8px;
  padding: 0.54rem 0.66rem;
  font-weight: 700;
  cursor: pointer;
  color: ${({ $active }) => ($active ? "#2d180c" : "var(--dm-muted)")};
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(135deg, var(--dm-brand), var(--dm-brand-2))"
      : "transparent"};
`;

export const DrawerContent = styled.div`
  padding: 0.9rem 0.95rem 1.2rem;
  overflow: auto;
  flex: 1;

  &::-webkit-scrollbar {
    width: 7px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(243, 161, 93, 0.38);
    border-radius: 999px;
  }
`;

export const CartLine = styled.div`
  border: 1px solid var(--dm-line);
  border-radius: 10px;
  padding: 0.72rem;
  background: rgba(38, 42, 47, 0.86);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;

  & + & {
    margin-top: 0.62rem;
  }
`;

export const QtyWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;

  button {
    border: 1px solid var(--dm-line);
    width: 26px;
    height: 26px;
    border-radius: 7px;
    background: rgba(50, 54, 61, 0.96);
    color: var(--dm-text);
    cursor: pointer;
  }

  strong {
    min-width: 14px;
    text-align: center;
  }
`;

export const Summary = styled.div`
  margin-top: 0.84rem;
  border: 1px dashed rgba(243, 161, 93, 0.4);
  background: rgba(44, 39, 35, 0.72);
  border-radius: 10px;
  padding: 0.78rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.92rem;

  strong {
    color: var(--dm-warm);
    font-size: 1.12rem;
  }
`;

export const InputGrid = styled.div`
  margin-top: 0.62rem;
  display: grid;
  gap: 0.62rem;

  input,
  textarea,
  select {
    width: 100%;
    border-radius: 10px;
    border: 1px solid var(--dm-line);
    background: rgba(38, 42, 47, 0.92);
    color: var(--dm-text);
    padding: 0.72rem 0.82rem;
    font-size: 0.94rem;
    outline: none;
  }

  textarea {
    min-height: 90px;
    resize: vertical;
  }
`;

export const Label = styled.label`
  display: grid;
  gap: 0.32rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--dm-muted);
`;

export const EmptyHint = styled.div`
  border: 1px dashed rgba(243, 161, 93, 0.34);
  border-radius: 10px;
  padding: 0.95rem;
  color: var(--dm-muted);
  text-align: center;
`;

export const CheckoutButton = styled.button`
  width: 100%;
  border: none;
  border-radius: 10px;
  margin-top: 0.85rem;
  padding: 0.82rem 0.95rem;
  background: linear-gradient(135deg, var(--dm-brand), var(--dm-brand-2));
  color: #2b180c;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    filter: brightness(1.06);
  }
`;

export const InlineInfo = styled.div`
  margin-top: 0.74rem;
  border-radius: 9px;
  border: 1px solid rgba(243, 161, 93, 0.4);
  background: rgba(243, 161, 93, 0.1);
  color: #ffe4bf;
  padding: 0.58rem 0.72rem;
  font-size: 0.8rem;
`;

export const StepDots = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;

  span {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: rgba(243, 161, 93, 0.34);

    &.on {
      background: linear-gradient(130deg, var(--dm-brand), var(--dm-brand-2));
    }
  }
`;

export const SectionHead = styled.div`
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;

  h2 {
    margin: 0;
    font-size: clamp(1.03rem, 3.3vw, 1.24rem);
    font-family: "Space Grotesk", "Sora", sans-serif;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0;
    color: var(--dm-muted);
    font-size: 0.84rem;
  }
`;

export const Tiny = styled.span`
  color: var(--dm-muted);
  font-size: 0.76rem;
`;
