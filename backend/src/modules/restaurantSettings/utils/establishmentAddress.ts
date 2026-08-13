export type EstablishmentAddressInput = {
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
};

export type NormalizedEstablishmentAddress = Required<EstablishmentAddressInput>;

export function normalizeEstablishmentAddress(input: EstablishmentAddressInput): NormalizedEstablishmentAddress {
  return {
    address: String(input.address || "").trim(),
    number: String(input.number || "").trim(),
    complement: String(input.complement || "").trim(),
    district: String(input.district || "").trim(),
    city: String(input.city || "").trim(),
    state: String(input.state || "").trim().toUpperCase(),
    zipCode: String(input.zipCode || "").replace(/\D/g, ""),
  };
}

export function hasEstablishmentAddress(address: NormalizedEstablishmentAddress) {
  return Object.values(address).some(Boolean);
}

export function validateEstablishmentAddress(address: NormalizedEstablishmentAddress) {
  if (!hasEstablishmentAddress(address)) return null;
  if (address.zipCode.length !== 8) return "CEP do estabelecimento inválido.";
  if (address.address.length < 3) return "Rua do estabelecimento inválida.";
  if (!address.number) return "Número do estabelecimento é obrigatório.";
  if (address.district.length < 2) return "Bairro do estabelecimento inválido.";
  if (address.city.length < 2) return "Cidade do estabelecimento inválida.";
  if (!/^[A-Z]{2}$/.test(address.state)) return "UF do estabelecimento inválida.";
  if (address.complement.length > 160) return "Complemento do estabelecimento muito longo.";
  return null;
}
