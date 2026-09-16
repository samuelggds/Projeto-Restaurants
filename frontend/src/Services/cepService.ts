export type CepAddress = {
  cep: string;
  address: string;
  district: string;
  city: string;
  state: string;
  complement: string;
};

export async function lookupCep(cepValue: string): Promise<CepAddress> {
  const cep = String(cepValue || '').replace(/\D/g, '');
  if (!/^\d{8}$/.test(cep)) {
    throw new Error('Informe um CEP válido com 8 números.');
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Não foi possível consultar o CEP agora.');
    }

    const data = await response.json();
    if (data?.erro === true) {
      throw new Error('CEP não encontrado.');
    }

    return {
      cep: String(data.cep || cep),
      address: String(data.logradouro || ''),
      district: String(data.bairro || ''),
      city: String(data.localidade || ''),
      state: String(data.uf || '').toUpperCase(),
      complement: String(data.complemento || ''),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      ['CEP não encontrado.', 'Não foi possível consultar o CEP agora.'].includes(error.message)
    ) {
      throw error;
    }
    throw new Error(
      'Não foi possível consultar o CEP agora. Verifique sua conexão e tente novamente.',
      { cause: error },
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}
