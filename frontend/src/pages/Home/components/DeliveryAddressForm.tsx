import type { Dispatch, SetStateAction } from "react";
import type { DeliveryAddress } from "../hooks/useDeliveryAddress";
import * as S from "../../Home/Home.styles";

type Props = {
  address: DeliveryAddress;
  setAddress: Dispatch<SetStateAction<DeliveryAddress>>;
  cepStatus: "idle" | "loading" | "success" | "error";
  cepMessage: string;
  onCepChange: (value: string) => void;
  onCepLookup: (value: string) => Promise<void>;
};

export function DeliveryAddressForm(props: Props) {
  const update = (field: keyof DeliveryAddress, value: string) =>
    props.setAddress((current) => ({ ...current, [field]: value }));

  return (
    <S.AddressForm>
      <S.AddressField className="cep-field">
        <span>CEP</span>
        <input aria-label="CEP" inputMode="numeric" placeholder="00000-000" maxLength={9} value={props.address.zipCode} onBlur={(event) => void props.onCepLookup(event.target.value)} onChange={(event) => props.onCepChange(event.target.value)} />
        {props.cepMessage && <small className={props.cepStatus}>{props.cepMessage}</small>}
      </S.AddressField>
      <S.AddressField className="street"><span>Rua ou avenida</span><input aria-label="Rua" placeholder="Ex.: Rua das Flores" value={props.address.address} onChange={(event) => update("address", event.target.value)} /></S.AddressField>
      <S.AddressField><span>Número</span><input aria-label="Número" inputMode="text" placeholder="123" value={props.address.number} onChange={(event) => update("number", event.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 10))} /></S.AddressField>
      <S.AddressField><span>Bairro</span><input aria-label="Bairro" placeholder="Seu bairro" value={props.address.district} onChange={(event) => update("district", event.target.value)} /></S.AddressField>
      <S.AddressField className="city"><span>Cidade</span><input aria-label="Cidade" placeholder="Sua cidade" value={props.address.city} onChange={(event) => update("city", event.target.value)} /></S.AddressField>
      <S.AddressField className="state"><span>UF</span><input aria-label="Estado" placeholder="CE" maxLength={2} value={props.address.state} onChange={(event) => update("state", event.target.value.replace(/[^A-Za-z]/g, "").toUpperCase())} /></S.AddressField>
      <S.AddressField className="full"><span>Complemento <i>(opcional)</i></span><input aria-label="Complemento" placeholder="Apartamento, bloco ou referência" value={props.address.complement} onChange={(event) => update("complement", event.target.value)} /></S.AddressField>
    </S.AddressForm>
  );
}
