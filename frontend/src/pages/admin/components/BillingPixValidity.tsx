import { Clock3 } from 'lucide-react';
import styled from 'styled-components';
import type { getBillingPixExpiry } from './useBillingPixExpiry';

const Notice = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 10px;
  margin: 18px 0;
  padding: 13px;
  border: 1px solid #e0e8d7;
  border-radius: 10px;
  background: #f4f7ed;
  color: #36583e;
  text-align: left;
  > svg {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    margin-top: 2px;
  }
  strong {
    display: block;
    font-size: 13px;
    line-height: 1.6;
  }
  [role='timer'] {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  small {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    line-height: 1.6;
    color: #5e7059;
  }
`;

export function BillingPixValidity({
  validity,
}: {
  validity: ReturnType<typeof getBillingPixExpiry>;
}) {
  if (validity.status !== 'valid') return null;
  return (
    <Notice>
      <Clock3 aria-hidden="true" />
      <span>
        <strong>
          Tempo para pagar:{' '}
          <span role="timer" aria-live="off" aria-label="Tempo restante do código Pix">
            {validity.remainingLabel}
          </span>
        </strong>
        <small>
          Válido até {validity.expiresLabel}. Ao zerar, o código será ocultado e você poderá gerar
          outro.
        </small>
      </span>
    </Notice>
  );
}
