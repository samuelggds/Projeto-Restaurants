import api from "./api";

export type CustomerAddress = {
  id: number;
  label: string;
  address: string;
  number: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  complement?: string | null;
  isDefault: boolean;
};

export type CustomerAddressInput = Omit<CustomerAddress, "id">;

class CustomerAddressService {
  async list(): Promise<CustomerAddress[]> {
    const response = await api.get("/customer-addresses");
    return Array.isArray(response.data?.addresses) ? response.data.addresses : [];
  }

  async create(payload: CustomerAddressInput): Promise<CustomerAddress> {
    const response = await api.post("/customer-addresses", payload);
    return response.data.address;
  }

  async makeDefault(id: number): Promise<CustomerAddress> {
    const response = await api.put(`/customer-addresses/${id}/default`);
    return response.data.address;
  }
}

export default new CustomerAddressService();
