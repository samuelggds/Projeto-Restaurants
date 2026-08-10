import { useState } from "react";
import { lookupCep } from "../../../Services/cepService";
import {
  createDeliveryAddress,
  formatCep,
  type DeliveryAddressData,
} from "../domain/deliveryAddress";

export type DeliveryAddress = DeliveryAddressData;
type CepStatus = "idle" | "loading" | "success" | "error";

export function useDeliveryAddress(user: unknown) {
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>(() =>
    createDeliveryAddress(user),
  );
  const [cepStatus, setCepStatus] = useState<CepStatus>("idle");
  const [cepMessage, setCepMessage] = useState("");

  const handleCepLookup = async (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepStatus("error");
      setCepMessage("Digite os 8 números do CEP.");
      return;
    }

    setCepStatus("loading");
    setCepMessage("Buscando endereço...");
    try {
      const result = await lookupCep(digits);
      setDeliveryAddress((current) => ({
        ...current,
        zipCode: result.cep,
        address: result.address || current.address,
        district: result.district || current.district,
        city: result.city || current.city,
        state: result.state || current.state,
        complement: current.complement || result.complement,
      }));
      setCepStatus("success");
      setCepMessage("Endereço localizado.");
    } catch (error) {
      setCepStatus("error");
      setCepMessage(error instanceof Error ? error.message : "CEP inválido.");
    }
  };

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    const digits = formatted.replace(/\D/g, "");
    setDeliveryAddress((current) => ({ ...current, zipCode: formatted }));
    setCepStatus("idle");
    setCepMessage("");
    if (digits.length === 8) void handleCepLookup(digits);
  };

  return {
    deliveryAddress,
    setDeliveryAddress,
    cepStatus,
    cepMessage,
    handleCepLookup,
    handleCepChange,
  };
}
