import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PasswordRequirements } from './PasswordRequirements';

describe('PasswordRequirements', () => {
  it('permanece oculto enquanto a pessoa ainda não começou a criar a senha', () => {
    const markup = renderToStaticMarkup(
      <PasswordRequirements password="" confirmation="" id="password-help" />,
    );

    expect(markup).toBe('');
  });

  it('aparece ao começar a digitar sem exibir selos de estado', () => {
    const markup = renderToStaticMarkup(
      <PasswordRequirements password="A" confirmation="" id="password-help" />,
    );

    expect(markup).toContain('id="password-help"');
    expect(markup).toContain('aria-label="Requisitos da senha"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('Pelo menos 8 caracteres');
    expect(markup).toContain('Uma letra maiúscula');
    expect(markup).toContain('Uma letra minúscula');
    expect(markup).toContain('Um número');
    expect(markup).toContain('Um caractere especial');
    expect(markup).toContain('Confirmação igual à nova senha');
    expect(markup).toContain('data-requirement="uppercase"');
    expect(markup).toContain('data-met="true"');
    expect(markup).toContain('requisito a cumprir');
    expect(markup).not.toContain('Pendente');
    expect(markup).not.toContain('Atendido');
    expect(markup).not.toContain('72 bytes');
  });

  it('expõe o estado cumprido de forma acessível sem depender apenas de cor', () => {
    const markup = renderToStaticMarkup(
      <PasswordRequirements password="Segura#123" confirmation="Segura#123" />,
    );

    expect(markup).not.toContain('Pendente');
    expect(markup).not.toContain('Atendido');
    expect(markup).toContain('Pelo menos 8 caracteres: requisito cumprido');
    expect(markup).toContain('Confirmação igual à nova senha: requisito cumprido');
  });
});
