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
  const cep = address.zipCode.replace(/\D/g, '');
  if (cep.length !== 8) errors.zipCode = 'Informe um CEP válido com 8 números.';
  if (address.address.trim().length < 3) errors.address = 'Informe uma rua ou avenida válida.';
  else if (address.address.trim().length > 160)
    errors.address = 'A rua deve ter no máximo 160 caracteres.';
  if (!/^\d+[A-Za-z]?$/.test(address.number.trim()))
    errors.number = 'Informe o número, como 123 ou 123A.';
  if (address.district.trim().length < 2) errors.district = 'Informe um bairro válido.';
  else if (address.district.trim().length > 100)
    errors.district = 'O bairro deve ter no máximo 100 caracteres.';
  if (address.city.trim().length < 2) errors.city = 'Informe uma cidade válida.';
  else if (address.city.trim().length > 100)
    errors.city = 'A cidade deve ter no máximo 100 caracteres.';
  if (!/^[A-Za-z]{2}$/.test(address.state.trim()))
    errors.state = 'Informe a UF com duas letras, como CE.';
  if (address.complement.trim().length > 160)
    errors.complement = 'O complemento deve ter no máximo 160 caracteres.';
  return errors;
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function createDeliveryAddress(user: unknown): DeliveryAddressData {
  const customer = (user || {}) as Record<string, unknown>;
  return {
    address: String(customer.address || ''),
    number: String(customer.number || ''),
    district: String(customer.district || ''),
    city: String(customer.city || ''),
    state: String(customer.state || ''),
    zipCode: formatCep(String(customer.zipCode || '')),
    complement: String(customer.complement || ''),
  };
}


type DeliveryAddressLocation = {
  latitude: number;
  longitude: number;
};

type DeliveryAddressLocationResolver = (payload: {
  restaurantId: number;
  type: 'DELIVERY';
  address: string;
  number: string;
  district: string;
  city: string;
  state: string;
  zipCode?: string;
}) => Promise<DeliveryAddressLocation | undefined>;

export type DeliveryAddressLocationValidation =
  | { ok: true; verified: true }
  | { ok: true; verified: false; title: string; message: string }
  | { ok: false; title: string; message: string };

function addressValidationFeedback(error: unknown): DeliveryAddressLocationValidation {
  const data = (
    error as {
      response?: {
        data?: {
          code?: unknown;
        };
      };
    }
  )?.response?.data;
  const code = String(data?.code || '').trim();

  if (code === 'ADDRESS_VALIDATION_UNAVAILABLE') {
    return {
      ok: true,
      verified: false,
      title: 'Endereço não confirmado no mapa',
      message:
        'O serviço de localização está indisponível agora. Confira o endereço antes de continuar.',
    };
  }

  if (code === 'ADDRESS_NOT_GEOCODED') {
    return {
      ok: true,
      verified: false,
      title: 'Endereço não confirmado no mapa',
      message:
        'Não conseguimos confirmar este endereço no mapa. Confira rua, número, bairro, cidade e estado antes de continuar.',
    };
  }

  if (code === 'ADDRESS_INCOMPLETE') {
    return {
      ok: false,
      title: 'Endereço incompleto',
      message: 'Preencha o endereço completo antes de continuar.',
    };
  }

  return {
    ok: true,
    verified: false,
    title: 'Endereço não confirmado no mapa',
    message:
      'Não conseguimos confirmar este endereço agora. Confira os dados antes de continuar.',
  };
}

export async function validateDeliveryAddressLocationForCheckout(input: {
  restaurantId: number | null;
  address: DeliveryAddressData;
  resolveLocation: DeliveryAddressLocationResolver;
}): Promise<DeliveryAddressLocationValidation> {
  if (!input.restaurantId) {
    return {
      ok: false,
      title: 'Não foi possível validar o endereço',
      message: 'Não foi possível validar o endereço agora. Tente novamente em instantes.',
    };
  }

  try {
    const location = await input.resolveLocation({
      restaurantId: input.restaurantId,
      type: 'DELIVERY',
      address: input.address.address.trim(),
      number: input.address.number.trim(),
      district: input.address.district.trim(),
      city: input.address.city.trim(),
      state: input.address.state.trim().toUpperCase(),
      zipCode: input.address.zipCode.trim(),
    });

    if (
      !location ||
      !Number.isFinite(location.latitude) ||
      !Number.isFinite(location.longitude)
    ) {
      return {
        ok: true,
        verified: false,
        title: 'Endereço não confirmado no mapa',
        message:
          'Não conseguimos confirmar este endereço agora. Confira os dados antes de continuar.',
      };
    }

    return { ok: true, verified: true };
  } catch (error) {
    return addressValidationFeedback(error);
  }
}
