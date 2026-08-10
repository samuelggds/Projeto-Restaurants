export type DeliveryAddressData = {
  address: string;
  number: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  complement: string;
};

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
