import { LockKeyhole, ReceiptText } from 'lucide-react';
import styled from 'styled-components';

type Props = {
  tableNumber?: string | number;
  onOpenAccount?: () => void;
};

const Notice = styled.section`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
  padding: 16px 18px;
  border: 1px solid color-mix(in srgb, var(--home-primary) 34%, #eadfd3);
  border-radius: 20px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--home-primary) 10%, #fffdf9), #fff);
  box-shadow: 0 14px 34px rgba(78, 49, 30, 0.09);

  > span {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border-radius: 15px;
    background: var(--home-primary);
    color: #fff;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    color: #211b17;
    font-size: 17px;
  }

  p {
    margin-top: 4px;
    color: #6d625a;
    font-size: 13px;
    line-height: 1.45;
  }

  button {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 16px;
    border: 0;
    border-radius: 13px;
    background: var(--home-primary);
    color: #fff;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 850;
  }

  @media (max-width: 620px) {
    grid-template-columns: auto minmax(0, 1fr);

    button {
      grid-column: 1 / -1;
      width: 100%;
    }
  }
`;

export function TableClosingNotice({ tableNumber, onOpenAccount }: Props) {
  return (
    <Notice role="status" aria-label="Conta da mesa solicitada">
      <span>
        <LockKeyhole size={22} />
      </span>
      <div>
        <h2>Conta da mesa {String(tableNumber || '')} solicitada</h2>
        <p>
          Novos pedidos estão bloqueados. Confira os itens, escolha como pagar e acompanhe a
          finalização da mesa.
        </p>
      </div>
      <button type="button" onClick={onOpenAccount}>
        <ReceiptText size={17} /> Ver e pagar a conta
      </button>
    </Notice>
  );
}
