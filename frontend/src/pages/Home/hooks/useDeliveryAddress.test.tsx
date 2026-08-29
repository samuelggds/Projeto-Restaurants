import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import customerAddressService from '../../../Services/customerAddressService';
import { useDeliveryAddress } from './useDeliveryAddress';

vi.mock('../../../Services/customerAddressService', () => ({
  default: {
    list: vi.fn(),
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type ProbeProps = {
  user: Record<string, unknown> | null;
};

function Probe({ user }: ProbeProps) {
  const state = useDeliveryAddress(user);
  return (
    <output
      data-addresses={state.savedAddresses.length}
      data-selected={state.selectedAddressId}
      data-street={state.deliveryAddress.address}
      data-number={state.deliveryAddress.number}
    />
  );
}

describe('useDeliveryAddress', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('remove imediatamente o endereço privado depois do logout', async () => {
    vi.mocked(customerAddressService.list).mockResolvedValueOnce([
      {
        id: 7,
        label: 'Casa',
        address: 'Rua privada',
        number: '77',
        district: 'Centro',
        city: 'Fortaleza',
        state: 'CE',
        zipCode: '60000000',
        isDefault: true,
      },
    ]);

    await act(async () => {
      root.render(<Probe user={{ id: 1, role: 'CLIENTE' }} />);
    });

    const output = container.querySelector('output') as HTMLOutputElement;
    expect(output.dataset).toMatchObject({
      addresses: '1',
      selected: '7',
      street: 'Rua privada',
      number: '77',
    });

    await act(async () => root.render(<Probe user={null} />));

    expect(output.dataset).toMatchObject({
      addresses: '0',
      selected: '',
      street: '',
      number: '',
    });
  });

  it('não consulta nem mantém endereços em contas que não são de cliente', () => {
    act(() => root.render(<Probe user={{ id: 2, role: 'ADMIN' }} />));

    const output = container.querySelector('output') as HTMLOutputElement;
    expect(customerAddressService.list).not.toHaveBeenCalled();
    expect(output.dataset).toMatchObject({
      addresses: '0',
      selected: '',
      street: '',
      number: '',
    });
  });
});
