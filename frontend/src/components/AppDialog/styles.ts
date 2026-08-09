import styled from "styled-components";

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(20, 18, 16, 0.56);
  backdrop-filter: blur(5px);
  animation: dialog-backdrop-in 180ms ease both;
  @keyframes dialog-backdrop-in { from { opacity: 0; } }
`;

export const Dialog = styled.form`
  position: relative;
  width: min(100%, 460px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 22px;
  background: #fffdfb;
  color: #211e1b;
  padding: 28px;
  box-shadow: 0 28px 80px rgba(20, 14, 10, 0.25);
  animation: app-dialog-card-in 220ms cubic-bezier(.22,.8,.35,1) both;
  @keyframes app-dialog-card-in {
    from { opacity: 0; transform: translateY(12px) scale(.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @media (max-width: 520px) { padding: 22px 18px; border-radius: 18px; }
`;

export const Icon = styled.div<{ $tone: "default" | "danger" }>`
  width: 48px;
  height: 48px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  color: ${({ $tone }) => ($tone === "danger" ? "#b42318" : "#d64d08")};
  background: ${({ $tone }) => ($tone === "danger" ? "#fff0ee" : "#fff1e9")};
  svg { width: 23px; }
`;

export const Close = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 11px;
  background: #f5f2ef;
  color: #625d58;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 160ms ease, transform 160ms ease;
  &:hover { background: #ebe6e1; transform: rotate(4deg); }
  svg { width: 18px; }
`;

export const Copy = styled.div`
  margin-top: 18px;
  h2 { margin: 0; font-size: 22px; letter-spacing: -.02em; }
  p { margin: 9px 0 0; color: #756e68; font-size: 14px; line-height: 1.55; }
`;

export const Field = styled.label`
  display: grid;
  gap: 8px;
  margin-top: 22px;
  color: #49433e;
  font-size: 12px;
  font-weight: 700;
  input {
    width: 100%; height: 52px; border: 1px solid #ded7d0; border-radius: 13px;
    background: #faf8f6; color: #211e1b; padding: 0 15px; outline: 0; font: inherit;
    transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
  }
  input:focus { border-color: #d64d08; background: #fff; box-shadow: 0 0 0 4px #d64d0818; }
`;

export const Actions = styled.footer`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 26px;
  button { height: 46px; border-radius: 12px; padding: 0 20px; font: inherit; font-weight: 700; cursor: pointer; transition: transform 160ms ease, filter 160ms ease; }
  button:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(.97); }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .cancel { border: 1px solid #ded7d0; background: #fff; color: #514b46; }
  .confirm { border: 0; background: #d64d08; color: #fff; box-shadow: 0 8px 20px #d64d082b; }
  .danger { border: 0; background: #b42318; color: #fff; box-shadow: 0 8px 20px #b4231828; }
  @media (max-width: 420px) { display: grid; grid-template-columns: 1fr 1fr; button { padding: 0 10px; } }
`;
