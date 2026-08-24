import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { EmployeeDrawer } from './EmployeeDrawer';

describe('EmployeeDrawer', () => {
  it('solicita telefone e confirmação de senha sem prometer permissões inexistentes', () => {
    const markup = renderToStaticMarkup(
      <EmployeeDrawer employee={null} close={vi.fn()} save={vi.fn()} />,
    );

    expect(markup).toContain('Telefone com DDD');
    expect(markup).toContain('Confirmar senha');
    expect(markup).toContain('Motoqueiro');
    expect(markup).toContain('O cargo define automaticamente');
    expect(markup).not.toContain('Gerenciar mesas e códigos QR');
    expect(markup).not.toContain('Mudar status dos pedidos');
  });
});
