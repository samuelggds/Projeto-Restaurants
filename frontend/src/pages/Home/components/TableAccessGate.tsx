import type { FormEventHandler } from "react";
import styled from "styled-components";

type Props = {
  primaryColor: string;
  invalidQr: boolean;
  tableLabel: string | number;
  pin: string;
  pinError: string;
  validating: boolean;
  onPinChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

const Root = styled.div<{ $primary: string }>`
  --primary: ${({ $primary }) => $primary};
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #fffdf9;
  color: #191816;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
`;

const Content = styled.main`
  width: min(480px, 100%);
`;

const InvalidMessage = styled.div`
  text-align: center;
  h1 { font-size: clamp(22px, 4vw, 32px); margin: 0 0 10px; }
  p { color: #6f6a63; }
`;

const Eyebrow = styled.div`
  display: inline-block;
  margin-bottom: 12px;
  padding: 6px 14px;
  border-radius: 999px;
  background: #fdeee7;
  color: var(--primary);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Card = styled.div`
  padding: clamp(28px, 4vw, 44px);
  border: 1px solid #eadfd3;
  border-radius: 20px;
  background: #fff;
  h1 { font-size: clamp(22px, 4vw, 30px); margin: 0 0 8px; }
  > p { margin: 0 0 20px; color: #6f6a63; font-size: 14px; }
`;

const PinForm = styled.form`
  display: grid;
  gap: 10px;
  input {
    width: 100%; height: 52px; border: 2px solid #eadfd3; border-radius: 12px;
    outline: none; font: inherit; font-size: 22px; letter-spacing: 0.3em; text-align: center;
  }
  input:not(:placeholder-shown) { border-color: var(--primary); }
  small { color: #b91c1c; font-size: 13px; }
  button {
    height: 50px; border: 0; border-radius: 12px; background: var(--primary);
    color: #fff; cursor: pointer; font: inherit; font-size: 15px; font-weight: 700;
  }
  button:disabled { cursor: wait; opacity: 0.6; }
`;

export function TableAccessGate(props: Props) {
  return (
    <Root $primary={props.primaryColor}>
      <Content>
        {props.invalidQr ? (
          <InvalidMessage>
            <Eyebrow>Acesso por QR Code</Eyebrow>
            <h1>Link inválido da mesa</h1>
            <p>Escaneie o QR oficial da mesa para acessar o cardápio.</p>
          </InvalidMessage>
        ) : (
          <Card>
            <Eyebrow>Mesa {String(props.tableLabel)}</Eyebrow>
            <h1>Cardápio digital</h1>
            <p>Digite o PIN de 4 dígitos informado pelo garçom.</p>
            <PinForm onSubmit={props.onSubmit}>
              <input
                aria-label="PIN da mesa"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="PIN da mesa"
                value={props.pin}
                onChange={(event) =>
                  props.onPinChange(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
              {props.pinError && <small role="alert">{props.pinError}</small>}
              <button type="submit" disabled={props.validating}>
                {props.validating ? "Validando..." : "Liberar cardápio"}
              </button>
            </PinForm>
          </Card>
        )}
      </Content>
    </Root>
  );
}
