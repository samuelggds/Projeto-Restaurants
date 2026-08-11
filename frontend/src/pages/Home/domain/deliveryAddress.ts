export type DeliveryAddressData = {
  address: string;
  number: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  complement: string;
};

export type DeliveryAddressErrors = Partial<Record<keyof DeliveryAddressData, string>>;

export function validateDeliveryAddress(address: DeliveryAddressData): DeliveryAddressErrors {
  const errors: DeliveryAddressErrors = {};
  const cep = address.zipCode.replace(/\D/g, "");
  if (cep.length !== 8) errors.zipCode = "Informe um CEP válido com 8 números.";
  if (address.address.trim().length < 3) errors.address = "Informe uma rua ou avenida válida.";
  else if (address.address.trim().length > 160) errors.address = "A rua deve ter no máximo 160 caracteres.";
  if (!/^\d+[A-Za-z]?$/.test(address.number.trim())) errors.number = "Informe o número, como 123 ou 123A.";
  if (address.district.trim().length < 2) errors.district = "Informe um bairro válido.";
  else if (address.district.trim().length > 100) errors.district = "O bairro deve ter no máximo 100 caracteres.";
  if (address.city.trim().length < 2) errors.city = "Informe uma cidade válida.";
  else if (address.city.trim().length > 100) errors.city = "A cidade deve ter no máximo 100 caracteres.";
  if (!/^[A-Za-z]{2}$/.test(address.state.trim())) errors.state = "Informe a UF com duas letras, como CE.";
  if (address.complement.trim().length > 160) errors.complement = "O complemento deve ter no máximo 160 caracteres.";
  return errors;
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5
    ? `${digits.slice(0, 5)}-${digits.slice(5)}`
    : digits;
}

export function createDeliveryAddress(user: unknown): DeliveryAddressData {
  const customer = (user || {}) as Record<string, unknown>;
  return {
    address: String(customer.address || ""),
    number: String(customer.number || ""),
    district: String(customer.district || ""),
    city: String(customer.city || ""),
    state: String(customer.state || ""),
    zipCode: formatCep(String(customer.zipCode || "")),
    complement: String(customer.complement || ""),
  };
}
