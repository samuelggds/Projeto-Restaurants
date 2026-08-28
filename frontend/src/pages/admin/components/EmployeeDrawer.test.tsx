import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { EmployeeDrawer } from './EmployeeDrawer';

describe('EmployeeDrawer', () => {
  it('oculta os requisitos até a digitação e bloqueia a criação enquanto a senha é inválida', () => {
    const markup = renderToStaticMarkup(
      <EmployeeDrawer employee={null} close={vi.fn()} save={vi.fn()} />,
    );

    expect(markup).toContain('Telefone com DDD');
    expect(markup).toContain('Confirmar senha');
    expect(markup.match(/minLength="8"/g)).toHaveLength(2);
    expect(markup.match(/aria-describedby="employee-password-requirements"/g)).toHaveLength(2);
    expect(markup).not.toContain('aria-label="Requisitos da senha"');
    expect(markup).not.toContain('A nova senha precisa ter:');
    expect(markup).toMatch(/<button[^>]*class="[^"]*primary[^"]*"[^>]*disabled=""/);
    expect(markup).toContain('Motoqueiro');
    expect(markup).toContain('O cargo define automaticamente');
    expect(markup).not.toContain('Gerenciar mesas e códigos QR');
    expect(markup).not.toContain('Mudar status dos pedidos');
  });
});
