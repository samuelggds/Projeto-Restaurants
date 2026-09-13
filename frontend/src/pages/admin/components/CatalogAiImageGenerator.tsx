import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { CheckCircle2, ImageOff, LoaderCircle, Sparkles, TriangleAlert } from 'lucide-react';
import menuImportService, {
  type ImportedProductImageResult,
} from '../../../Services/menuImportService';
import type { AdminProduct } from '../types';

type Props = {
  products: AdminProduct[];
  onCompleted: () => void | Promise<void>;
};

type ItemResult = ImportedProductImageResult & {
  failed?: boolean;
  error?: string;
};

export function CatalogAiImageGenerator({ products, onCompleted }: Props) {
  const candidates = useMemo(
    () => products.filter((product) => !String(product.image || '').trim()),
    [products],
  );
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [currentName, setCurrentName] = useState('');

  const generated = results.filter((item) => item.status === 'GENERATED' && !item.failed).length;
  const manual = results.filter((item) => item.status === 'MANUAL_REQUIRED').length;
  const failed = results.filter((item) => item.failed).length;

  const run = async () => {
    if (running || !candidates.length) return;
    setRunning(true);
    setResults([]);
    setCurrentName('');
    let shouldStop = false;

    for (const product of candidates) {
      if (shouldStop) break;
      const productId = Number(product.id);
      if (!Number.isInteger(productId) || productId <= 0) continue;
      setCurrentName(product.name);
      try {
        const result = await menuImportService.generateImportedProductImage(productId);
        setResults((current) => [...current, result]);
      } catch (error: unknown) {
        const errorLike = error as {
          response?: { status?: number; data?: { error?: string; code?: string } };
          message?: string;
        };
        const message =
          errorLike.response?.data?.error ||
          errorLike.message ||
          'Não foi possível gerar a imagem deste produto.';
        setResults((current) => [
          ...current,
          {
            productId,
            productName: product.name,
            status: 'ALREADY_HAS_IMAGE',
            failed: true,
            error: message,
          },
        ]);
        if (
          errorLike.response?.status === 402 ||
          errorLike.response?.data?.code === 'AI_CREDITS_EXHAUSTED'
        ) {
          shouldStop = true;
        }
      }
    }

    setCurrentName('');
    setRunning(false);
    await onCompleted();
  };

  return (
    <Panel data-tour="catalog-ai-images">
      <div className="copy">
        <span className="icon"><Sparkles /></span>
        <div>
          <strong>Imagens com IA para o catálogo</strong>
          <p>
            Gere fotos apenas para produtos sem imagem. Produtos de marcas conhecidas são pulados e
            continuam exigindo a foto oficial enviada manualmente.
          </p>
        </div>
      </div>
      <div className="status">
        <b>{candidates.length}</b>
        <span>{candidates.length === 1 ? 'produto sem foto' : 'produtos sem foto'}</span>
      </div>
      <button type="button" disabled={running || candidates.length === 0} onClick={() => void run()}>
        {running ? <LoaderCircle className="spin" /> : <Sparkles />}
        {running ? `Gerando ${currentName ? `· ${currentName}` : '...'}` : 'Gerar imagens que faltam'}
      </button>

      {results.length > 0 && (
        <Result role="status">
          <span><CheckCircle2 /> {generated} geradas</span>
          <span><ImageOff /> {manual} precisam de foto oficial</span>
          {failed > 0 && <span className="error"><TriangleAlert /> {failed} falharam</span>}
        </Result>
      )}
    </Panel>
  );
}

const Panel = styled.section`
  margin-bottom: 16px;
  padding: 15px 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 14px;
  border: 1px solid #e7e1dc;
  border-radius: 16px;
  background: #fffaf7;

  .copy {
    min-width: 0;
    display: flex;
    align-items: flex-start;
    gap: 11px;
  }
  .copy .icon {
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: #fff;
    background: #e9530b;
  }
  .copy svg { width: 17px; }
  strong { color: #261f1b; font-size: 13px; }
  p { margin: 3px 0 0; color: #81756d; font-size: 10px; line-height: 1.45; }
  .status { display: grid; text-align: center; }
  .status b { color: #261f1b; font-size: 18px; }
  .status span { color: #8f8279; font-size: 8px; text-transform: uppercase; font-weight: 800; }
  > button {
    min-height: 40px;
    padding: 0 13px;
    border: 0;
    border-radius: 11px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    background: #1f2022;
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }
  > button:disabled { opacity: .55; cursor: not-allowed; }
  > button svg { width: 16px; }
  .spin { animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    .status { text-align: left; grid-template-columns: auto 1fr; gap: 7px; align-items: baseline; }
  }
`;

const Result = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding-top: 11px;
  border-top: 1px solid #eadfd8;
  color: #5d6a57;
  font-size: 9px;
  font-weight: 800;

  span { display: inline-flex; align-items: center; gap: 5px; }
  svg { width: 14px; }
  .error { color: #b42318; }
`;
