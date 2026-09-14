import { useCallback, useEffect, useState } from 'react';
import {
  Armchair,
  BellRing,
  ClipboardList,
  Headphones,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  PackagePlus,
  Truck,
  X,
} from 'lucide-react';
import styled from 'styled-components';
import { useDialogFocusManagement } from '../../shared/hooks/useDialogFocusManagement';
import type { AttendantView } from './types';

type Props = {
  view: AttendantView;
  name: string;
  onGo: (view: AttendantView) => void;
  onLogout: () => void;
};
const primary = [
  ['overview', 'Visão geral', LayoutDashboard],
  ['orders', 'Pedidos', ClipboardList],
  ['create', 'Novo pedido', PackagePlus],
  ['calls', 'Chamados', BellRing],
] as const;
const secondary = [
  ['support', 'Atendimento', Headphones],
  ['deliveries', 'Entregas', Truck],
  ['tables', 'Mesas', Armchair],
] as const;

export function AttendantMobileNavigation({ view, name, onGo, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const panel = useDialogFocusManagement<HTMLElement>(close, open);
  useEffect(() => {
    if (!open) return;
    const closeOnDesktop = () => {
      if (window.innerWidth > 900) close();
    };
    window.addEventListener('resize', closeOnDesktop);
    return () => window.removeEventListener('resize', closeOnDesktop);
  }, [close, open]);
  const secondaryActive = secondary.some(([id]) => id === view);
  return (
    <>
      <MobileNav aria-label="Navegação móvel do atendente" inert={open}>
        {primary.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            aria-current={view === id ? 'page' : undefined}
            onClick={() => onGo(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          aria-label="Mais opções do atendente"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? 'attendant-mobile-options' : undefined}
          className={secondaryActive ? 'active' : undefined}
          onClick={() => setOpen(true)}
        >
          <MoreHorizontal aria-hidden="true" />
          <span>Mais</span>
        </button>
      </MobileNav>
      {open && (
        <Backdrop
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <Sheet
            id="attendant-mobile-options"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Opções do atendente"
          >
            <header>
              <div>
                <b>{name}</b>
                <small>Área do atendente</small>
              </div>
              <button type="button" onClick={close} aria-label="Fechar opções do atendente">
                <X />
              </button>
            </header>
            {secondary.map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                aria-current={view === id ? 'page' : undefined}
                onClick={() => {
                  close();
                  onGo(id);
                }}
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
            <button type="button" className="logout" onClick={onLogout}>
              <LogOut aria-hidden="true" />
              Sair da conta
            </button>
          </Sheet>
        </Backdrop>
      )}
    </>
  );
}

const MobileNav = styled.nav`
  display: none;
  @media (max-width: 900px) {
    position: fixed;
    inset: auto 0 0;
    z-index: 20;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
    padding: 8px 6px calc(8px + env(safe-area-inset-bottom));
    background: #153729;
    button {
      min-width: 0;
      min-height: 60px;
      padding: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border: 0;
      border-radius: 12px;
      color: #e0eae4;
      background: transparent;
      font: inherit;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
    }
    button[aria-current='page'],
    button.active {
      background: #ffffff1a;
      color: #fff;
      box-shadow: inset 0 3px var(--brand);
    }
    button:focus-visible {
      outline: 3px solid #fff;
      outline-offset: -3px;
    }
    svg {
      width: 20px;
      height: 20px;
    }
  }
`;
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #18231d80;
  backdrop-filter: blur(2px);
`;
const Sheet = styled.section`
  position: absolute;
  bottom: calc(84px + env(safe-area-inset-bottom));
  right: 8px;
  left: 8px;
  max-height: calc(100dvh - 100px - env(safe-area-inset-bottom));
  overflow-y: auto;
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 14px;
  background: #fff;
  color: #18231d;
  box-shadow: 0 18px 50px #18231d40;
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  header div {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  b,
  small {
    display: block;
  }
  small {
    margin-top: 3px;
    color: #637369;
    font-size: 12px;
  }
  button {
    min-height: 48px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: 1px solid #dce4df;
    border-radius: 10px;
    background: #f5f8f6;
    color: inherit;
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
  }
  header button {
    flex-shrink: 0;
    width: 48px;
    justify-content: center;
    padding: 10px;
  }
  button[aria-current='page'] {
    background: #e3f0e7;
  }
  button:focus-visible {
    outline: 3px solid #3b7354;
    outline-offset: 2px;
  }
  button.logout {
    color: #993d34;
    background: #fff7f6;
    border-color: #ead0cc;
  }
  svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }
`;
