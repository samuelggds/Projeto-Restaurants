export type CepAddress = {
  cep: string;
  address: string;
  district: string;
  city: string;
  state: string;
  complement: string;
};

export async function lookupCep(cepValue: string): Promise<CepAddress> {
  const cep = String(cepValue || "").replace(/\D/g, "");
  if (!/^\d{8}$/.test(cep)) {
    throw new Error("Informe um CEP válido com 8 números.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!response.ok) {
    throw new Error("Não foi possível consultar o CEP agora.");
  }

  const data = await response.json();
  if (data?.erro === true) {
    throw new Error("CEP não encontrado.");
  }

  return {
    cep: String(data.cep || cep),
    address: String(data.logradouro || ""),
    district: String(data.bairro || ""),
    city: String(data.localidade || ""),
    state: String(data.uf || "").toUpperCase(),
    complement: String(data.complemento || ""),
  };
}
