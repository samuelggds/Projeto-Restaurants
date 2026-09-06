import { createPortal } from 'react-dom';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { FloatingWhatsApp } from './Home.whatsapp.styles';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: ReactNode;
};

/**
 * Mantém o atalho de atendimento fora da pilha de avisos/status do pedido.
 * O portal garante que transformações/arraste do painel de avisos não movam o
 * botão do WhatsApp, que permanece fixo na viewport durante toda a rolagem.
 */
export function FloatingWhatsAppPortal({ children, ...props }: Props) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <FloatingWhatsApp data-testid="floating-whatsapp-contact" {...props}>
      {children}
    </FloatingWhatsApp>,
    document.body,
  );
}
