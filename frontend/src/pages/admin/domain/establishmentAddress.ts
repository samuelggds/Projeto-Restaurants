import type { AdminSettings } from '../types';

type AddressKeys =
  | 'businessZipCode'
  | 'businessAddress'
  | 'businessAddressNumber'
  | 'businessAddressDistrict'
  | 'businessCity'
  | 'businessState'
  | 'businessAddressComplement';
export type EstablishmentAddressErrors = Partial<Record<AddressKeys, string>>;
const onlyDigits = (value: string) => value.replace(/\D/g, '');

export function formatEstablishmentCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

export function validateEstablishmentAddress(settings: AdminSettings): EstablishmentAddressErrors {
  const errors: EstablishmentAddressErrors = {};
  if (onlyDigits(settings.businessZipCode).length !== 8)
    errors.businessZipCode = 'Informe um CEP válido com 8 números.';
  if (settings.businessAddress.trim().length < 3)
    errors.businessAddress = 'Informe a rua ou avenida.';
  if (!settings.businessAddressNumber.trim()) errors.businessAddressNumber = 'Informe o número.';
  if (settings.businessAddressDistrict.trim().length < 2)
    errors.businessAddressDistrict = 'Informe o bairro.';
  if (settings.businessCity.trim().length < 2) errors.businessCity = 'Informe a cidade.';
  if (!/^[A-Za-z]{2}$/.test(settings.businessState.trim()))
    errors.businessState = 'Use a sigla do estado, por exemplo CE.';
  if (settings.businessAddressComplement.trim().length > 160)
    errors.businessAddressComplement = 'O complemento pode ter até 160 caracteres.';
  return errors;
}

export function formatEstablishmentAddress(
  address: Pick<
    AdminSettings,
    | 'businessAddress'
    | 'businessAddressNumber'
    | 'businessAddressDistrict'
    | 'businessCity'
    | 'businessState'
  >,
) {
  const street = [address.businessAddress.trim(), address.businessAddressNumber.trim()]
    .filter(Boolean)
    .join(', ');
  const city = [address.businessCity.trim(), address.businessState.trim().toUpperCase()]
    .filter(Boolean)
    .join(' - ');
  return [street, address.businessAddressDistrict.trim(), city].filter(Boolean).join(' • ');
}
