import { ShoppingBag, Truck } from "lucide-react";
import * as S from "../../Home/Home.styles";

type Props = {
  value: "delivery" | "pickup";
  onChange: (value: "delivery" | "pickup") => void;
};

export function DeliveryMethodSelector({ value, onChange }: Props) {
  return (
    <>
      <S.CartSectionLabel>Como deseja receber?</S.CartSectionLabel>
      <S.DeliveryToggle>
        <S.DeliveryBtn type="button" $active={value === "delivery"} onClick={() => onChange("delivery")} aria-pressed={value === "delivery"}>
          <span className="btn-icon"><Truck size={16} aria-hidden="true" /></span>
          Delivery
        </S.DeliveryBtn>
        <S.DeliveryBtn type="button" $active={value === "pickup"} onClick={() => onChange("pickup")} aria-pressed={value === "pickup"}>
          <span className="btn-icon"><ShoppingBag size={16} aria-hidden="true" /></span>
          Retirada
        </S.DeliveryBtn>
      </S.DeliveryToggle>
    </>
  );
}
