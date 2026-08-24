import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tablesService from '../../Services/tablesService';
import DigitalMenuEntryPage from './DigitalMenuEntryPage';

vi.mock('../../Services/tablesService', () => ({
  default: {
    resolvePublicTable: vi.fn(),
  },
}));

vi.mock('../Home/Home', () => ({
  default: () => <div>Fluxo funcional do cardápio</div>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('DigitalMenuEntryPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('resolve tableNumber no restaurante e abre o fluxo funcional com o id interno correto', async () => {
    vi.mocked(tablesService.resolvePublicTable).mockResolvedValue({
      id: 91,
      number: 12,
      restaurantId: 7,
      restaurantSlug: 'restaurante-teste',
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/restaurante-teste/mesa/12']}>
          <Routes>
            <Route path="/:restaurantSlug/mesa/:tableNumber" element={<DigitalMenuEntryPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(tablesService.resolvePublicTable).toHaveBeenCalledWith(
      expect.objectContaining({ tableNumber: 12, slug: 'restaurante-teste' }),
    );
    expect(container.textContent).toContain('Fluxo funcional do cardápio');
  });

  it('não abre cardápio quando o backend retorna outra mesa', async () => {
    vi.mocked(tablesService.resolvePublicTable).mockResolvedValue({
      id: 91,
      number: 13,
      restaurantId: 7,
      restaurantSlug: 'restaurante-teste',
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/restaurante-teste/mesa/12']}>
          <Routes>
            <Route path="/:restaurantSlug/mesa/:tableNumber" element={<DigitalMenuEntryPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('não corresponde ao QR Code');
    expect(container.textContent).not.toContain('Fluxo funcional do cardápio');
  });
});
