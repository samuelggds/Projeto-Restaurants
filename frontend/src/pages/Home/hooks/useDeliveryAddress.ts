import { useCallback, useEffect, useState } from 'react';
import { lookupCep } from '../../../Services/cepService';
import customerAddressService, {
  type CustomerAddress,
} from '../../../Services/customerAddressService';
import {
  createDeliveryAddress,
  formatCep,
  type DeliveryAddressData,
} from '../domain/deliveryAddress';

export type DeliveryAddress = DeliveryAddressData;
type CepStatus = 'idle' | 'loading' | 'success' | 'error';

export function useDeliveryAddress(user: unknown) {
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>(() =>
    createDeliveryAddress(user),
  );
  const [cepStatus, setCepStatus] = useState<CepStatus>('idle');
  const [cepMessage, setCepMessage] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');

  const selectSavedAddress = useCallback((address: CustomerAddress, persist = true) => {
    setSelectedAddressId(String(address.id));
    setDeliveryAddress({
      address: address.address,
      number: address.number,
      district: address.district,
      city: address.city,
      state: address.state,
      zipCode: formatCep(address.zipCode),
      complement: String(address.complement || ''),
    });
    setCepStatus('success');
    setCepMessage('Endereço selecionado.');
    if (persist) localStorage.setItem('selectedCustomerAddressId', String(address.id));
  }, []);

  useEffect(() => {
    if (!(user as { role?: string } | null)?.role) return;
    let active = true;
    customerAddressService
      .list()
      .then((items) => {
        if (!active) return;
        setSavedAddresses(items);
        const storedId = localStorage.getItem('selectedCustomerAddressId');
        const selected =
          items.find((item) => String(item.id) === storedId) ||
          items.find((item) => item.isDefault) ||
          items[0];
        if (selected) selectSavedAddress(selected, false);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectSavedAddress, user]);

  const handleSavedAddressChange = (id: string) => {
    const selected = savedAddresses.find((item) => String(item.id) === id);
    if (selected) selectSavedAddress(selected);
  };

  const handleCepLookup = async (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 8) {
      setCepStatus('error');
      setCepMessage('Digite os 8 números do CEP.');
      return;
    }

    setCepStatus('loading');
    setCepMessage('Buscando endereço...');
    try {
      const result = await lookupCep(digits);
      setDeliveryAddress((current) => ({
        ...current,
        zipCode: result.cep,
        address: result.address || current.address,
        district: result.district || current.district,
        city: result.city || current.city,
      }));
      setCepStatus('success');
      setCepMessage('Endereço localizado.');
    } catch (error) {
      setCepStatus('error');
      setCepMessage(error instanceof Error ? error.message : 'CEP inválido.');
    }
  };

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    const digits = formatted.replace(/\D/g, '');
    setDeliveryAddress((current) => ({
      ...current,
      zipCode: formatted,
      number: formatted === current.zipCode ? current.number : '',
      state: formatted === current.zipCode ? current.state : '',
      complement: formatted === current.zipCode ? current.complement : '',
    }));
    setCepStatus('idle');
    setCepMessage('');
    if (digits.length === 8) void handleCepLookup(digits);
  };

  return {
    deliveryAddress,
    setDeliveryAddress,
    cepStatus,
    cepMessage,
    handleCepLookup,
    handleCepChange,
    savedAddresses,
    selectedAddressId,
    handleSavedAddressChange,
  };
}
