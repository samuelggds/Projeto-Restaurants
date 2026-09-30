/* eslint-disable react-refresh/only-export-components -- isolated read-only document */
import { createRoot } from 'react-dom/client';
import styled from 'styled-components';
import { installReadOnlyHelpPreview } from './readOnlyHelpPreview';

const Shell = styled.main`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  background: #f5f7f6;
  color: #213f32;
  font-family: Inter, system-ui, sans-serif;

  aside {
    min-height: 100vh;
    padding: 24px 18px;
    background: #17372a;
    color: white;
  }

  aside strong {
    display: block;
    margin-bottom: 22px;
    font-size: 18px;
  }

  aside span {
    display: block;
    padding: 10px 12px;
    border-radius: 10px;
    opacity: 0.88;
  }

  aside span.active {
    background: rgba(255, 255, 255, 0.14);
    opacity: 1;
  }

  section {
    min-width: 0;
    padding: 30px;
  }

  .content {
    width: min(100%, 980px);
    margin: 0 auto;
  }

  h1 {
    margin: 0 0 8px;
    font-size: 30px;
  }

  .intro {
    margin: 0 0 24px;
    color: #66756e;
    line-height: 1.6;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  article {
    min-height: 170px;
    padding: 20px;
    border: 1px solid #dce4de;
    border-radius: 16px;
    background: white;
    box-shadow: 0 8px 24px rgba(24, 55, 42, 0.05);
  }

  article h2 {
    margin: 0 0 10px;
    font-size: 18px;
  }

  article p,
  article li {
    color: #617069;
    line-height: 1.55;
  }

  .list {
    display: grid;
    gap: 12px;
    margin-top: 18px;
  }

  .row {
    min-height: 72px;
    padding: 16px;
    border: 1px solid #dce4de;
    border-radius: 14px;
    background: white;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;

    aside {
      min-height: auto;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 14px;
    }

    aside strong {
      display: none;
    }

    aside span {
      white-space: nowrap;
    }

    section {
      padding: 20px 16px 48px;
    }

    .grid {
      grid-template-columns: 1fr;
    }
  }
`;

const area = new URLSearchParams(location.search).get('area') || 'overview';
const title = area
  .replace(/^settings-/u, 'Configurações · ')
  .replaceAll('-', ' ')
  .replace(/\b\w/gu, (letter) => letter.toUpperCase());

function Preview() {
  return (
    <Shell aria-label="Prévia visual somente leitura">
      <aside>
        <strong>GastroNexa</strong>
        <span className="active">Visão geral</span>
        <span>Pedidos</span>
        <span>Operação</span>
        <span>Configurações</span>
      </aside>
      <section>
        <div className="content">
          <h1>{title}</h1>
          <p className="intro">
            Exemplo ilustrativo somente leitura. Use esta prévia para reconhecer a organização da
            tela antes de abrir o painel real.
          </p>
          <div className="grid">
            <article>
              <h2>Resumo</h2>
              <p>Indicadores e informações principais aparecem agrupados por prioridade.</p>
            </article>
            <article>
              <h2>Próximas ações</h2>
              <p>As ações reais ficam disponíveis apenas no painel autenticado do restaurante.</p>
            </article>
          </div>
          <div className="list">
            {Array.from({ length: 10 }, (_, index) => (
              <div className="row" key={index}>
                <strong>Item de exemplo {index + 1}</strong>
                <p>Conteúdo visual fictício para demonstrar hierarquia, espaçamento e rolagem.</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}

const root = document.getElementById('root')!;
installReadOnlyHelpPreview(root);
createRoot(root).render(<Preview />);
