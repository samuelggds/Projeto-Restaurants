import { useState } from 'react';
import styled from 'styled-components';

const Form = styled.form`
  display:grid;
  gap:8px;
  label{color:#1f1e1a;font-size:13px;font-weight:650}
  .row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
  input{min-height:44px;padding:0 14px;border:1px solid #efece6;border-radius:12px;background:#fff;color:#1f1e1a;outline:0}
  input:focus{border-color:var(--checkout-primary,#e85a2b);box-shadow:0 0 0 3px color-mix(in srgb,var(--checkout-primary,#e85a2b) 10%,transparent)}
  button{min-width:82px;border:0;border-radius:10px;background:#1f1e1a;color:#fff;font-weight:700;font-size:12px}
  small{color:#72706b;font-size:11px}
`;

export function FigmaCouponControl({
  appliedCode,
  onApply,
}: {
  appliedCode?: string | null;
  onApply: (code: string) => void;
}) {
  const [code, setCode] = useState(appliedCode || '');

  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        const normalized = code.trim();
        if (normalized) onApply(normalized);
      }}
    >
      <label htmlFor="checkout-coupon">Cupom de desconto</label>
      <div className="row">
        <input
          id="checkout-coupon"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Cupom de desconto..."
          autoComplete="off"
        />
        <button type="submit" disabled={!code.trim()}>
          Aplicar
        </button>
      </div>
      {appliedCode ? <small>Cupom aplicado: {appliedCode}</small> : null}
    </Form>
  );
}
