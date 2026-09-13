import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleAlert,
  FileImage,
  FolderOpen,
  ImagePlus,
  Link2,
  LockKeyhole,
  PackageOpen,
  ScanLine,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';

import menuImportService, {
  type ImportedProductImageResult,
  type MenuImportSummary,
} from '../../../Services/menuImportService';
import { createPersistentImageDataUrl } from '../../../utils/persistentImage';
import * as I from '../styles/AdminMenuImport.styles';

type AdminMenuImportProps = {
  onClose: () => void;
  onImported: () => void | Promise<void>;
};

function importErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return 'Não foi possível importar o cardápio.';
  const response = (error as { response?: { data?: { error?: unknown } } }).response;
  return String(response?.data?.error || 'Não foi possível importar o cardápio.');
}

function isPublicIfoodUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLocaleLowerCase('pt-BR');
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === '443') &&
      (hostname === 'ifood.com.br' || hostname.endsWith('.ifood.com.br'))
    );
  } catch {
    return false;
  }
}

export function AdminMenuImport({ onClose, onImported }: AdminMenuImportProps) {
  const [method, setMethod] = useState<'ifood' | 'photo'>('ifood');
  const [ifoodUrl, setIfoodUrl] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState('');
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MenuImportSummary | null>(null);
  const [generateProductImages, setGenerateProductImages] = useState(true);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageResults, setImageResults] = useState<ImportedProductImageResult[]>([]);
  const [imageGenerationError, setImageGenerationError] = useState('');

  const changeMethod = (nextMethod: 'ifood' | 'photo') => {
    setMethod(nextMethod);
    setError('');
    setResult(null);
    setImageResults([]);
    setImageGenerationError('');
  };

  const generateImagesForImportedProducts = async (summary: MenuImportSummary) => {
    if (!generateProductImages || !summary.createdProducts.length) return;

    setGeneratingImages(true);
    setImageGenerationError('');
    const generated: ImportedProductImageResult[] = [];

    try {
      for (const product of summary.createdProducts) {
        try {
          const productResult = await menuImportService.generateImportedProductImage(product.id);
          generated.push(productResult);
          setImageResults([...generated]);
        } catch (generationError) {
          setImageGenerationError(importErrorMessage(generationError));
        }
      }
    } finally {
      setGeneratingImages(false);
      await Promise.resolve(onImported()).catch(() => undefined);
    }
  };

  const finishImport = async (summary: MenuImportSummary) => {
    setResult(summary);
    setImageResults([]);
    setImageGenerationError('');
    await Promise.resolve(onImported()).catch(() => undefined);
    await generateImagesForImportedProducts(summary);
  };

  const importFromIfood = async () => {
    const url = ifoodUrl.trim();
    if (!isPublicIfoodUrl(url)) {
      setError('Cole um link público HTTPS válido do restaurante no iFood.');
      return;
    }
    setBusy(true);
    setError('');
    setResult(null);
    setImageResults([]);
    try {
      await finishImport(await menuImportService.importIfoodMenu({ url }));
    } catch (importError) {
      setError(importErrorMessage(importError));
    } finally {
      setBusy(false);
    }
  };

  const choosePhoto = async (file?: File) => {
    if (!file) return;
    setProcessingPhoto(true);
    setError('');
    setResult(null);
    setImageResults([]);
    try {
      setPhoto(await createPersistentImageDataUrl(file, 1600));
      setPhotoName(file.name);
    } catch (photoError) {
      setError(
        photoError instanceof Error ? photoError.message : 'Não foi possível ler esta imagem.',
      );
    } finally {
      setProcessingPhoto(false);
    }
  };

  const importFromPhoto = async () => {
    if (!photo) {
      setError('Selecione uma foto nítida do cardápio para continuar.');
      return;
    }
    setBusy(true);
    setError('');
    setResult(null);
    setImageResults([]);
    try {
      await finishImport(await menuImportService.importMenuFromImage({ imageUrl: photo }));
    } catch (importError) {
      setError(importErrorMessage(importError));
    } finally {
      setBusy(false);
    }
  };

  const generatedImages = imageResults.filter((item) => item.status === 'GENERATED');
  const manualImages = imageResults.filter((item) => item.status === 'MANUAL_REQUIRED');

  const imageGenerationOption = (
    <I.ImportNotice role="note">
      <CircleAlert />
      <span>
        <b>Imagens automáticas com IA</b>
        <small>
          Pratos e produtos genéricos podem receber uma imagem criada pela IA. Produtos com marca
          registrada, como Coca-Cola, Pepsi, Heineken e similares, não terão imagem gerada: nesses
          casos você deverá enviar a foto oficial manualmente.
        </small>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            marginTop: 5,
            fontSize: 10,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          <input
            checked={generateProductImages}
            disabled={busy || generatingImages}
            type="checkbox"
            onChange={(event) => setGenerateProductImages(event.target.checked)}
          />
          Gerar imagens com IA para os produtos importados sem marca
        </label>
      </span>
    </I.ImportNotice>
  );

  const resultPanel = (
    <>
      <I.StatGrid>
        <article>
          <span>
            <FolderOpen />
          </span>
          <div>
            <strong>{result?.categoriesCreated ?? '—'}</strong>
            <b>Categorias novas</b>
            <small>Agrupamentos criados</small>
          </div>
        </article>
        <article>
          <span>
            <PackageOpen />
          </span>
          <div>
            <strong>{result?.productsCreated ?? '—'}</strong>
            <b>Produtos novos</b>
            <small>Itens adicionados ao cardápio</small>
          </div>
        </article>
      </I.StatGrid>

      {error && (
        <I.ImportNotice $tone="error" role="alert">
          <CircleAlert />
          <span>
            <b>Não foi possível concluir</b>
            <small>{error}</small>
          </span>
        </I.ImportNotice>
      )}

      {result ? (
        <>
          <I.ImportNotice $tone="success" role="status">
            <CheckCircle2 />
            <span>
              <b>
                {result.demoNotice
                  ? 'Simulação de importação concluída'
                  : 'Cardápio importado com sucesso'}
              </b>
              <small>
                {result.demoNotice ??
                  'Os itens novos já foram persistidos como produtos prontos e o catálogo foi atualizado.'}
              </small>
            </span>
          </I.ImportNotice>

          {generatingImages && (
            <I.ImportNotice role="status">
              <Sparkles />
              <span>
                <b>Gerando imagens dos produtos</b>
                <small>
                  A IA está preparando as fotos uma a uma. Você pode acompanhar o resultado abaixo.
                </small>
              </span>
            </I.ImportNotice>
          )}

          {generatedImages.length > 0 && (
            <I.ImportNotice $tone="success" role="status">
              <CheckCircle2 />
              <span>
                <b>{generatedImages.length} imagem(ns) gerada(s) com IA</b>
                <small>As novas imagens já foram vinculadas aos respectivos produtos.</small>
              </span>
            </I.ImportNotice>
          )}

          {manualImages.length > 0 && (
            <I.ImportNotice $tone="error" role="alert">
              <CircleAlert />
              <span>
                <b>{manualImages.length} produto(s) com marca precisam de imagem manual</b>
                <small>
                  Para preservar a identidade real da marca, envie a foto oficial desses produtos no
                  cadastro de cada item.
                </small>
              </span>
            </I.ImportNotice>
          )}

          {imageGenerationError && (
            <I.ImportNotice $tone="error" role="alert">
              <CircleAlert />
              <span>
                <b>Algumas imagens não puderam ser geradas</b>
                <small>{imageGenerationError}</small>
              </span>
            </I.ImportNotice>
          )}

          {manualImages.length > 0 && (
            <I.CreatedList>
              <header>
                <b>Imagem manual necessária</b>
                <span>{manualImages.length} item(ns)</span>
              </header>
              <ul>
                {manualImages.map((product) => (
                  <li key={product.productId}>
                    <CircleAlert /> {product.productName}
                  </li>
                ))}
              </ul>
            </I.CreatedList>
          )}

          <I.CreatedList>
            <header>
              <b>Produtos adicionados</b>
              <span>{result.createdProducts.length} item(ns)</span>
            </header>
            <ul>
              {result.createdProducts.map((product) => (
                <li key={product.id}>
                  <Check /> {product.name}
                </li>
              ))}
            </ul>
          </I.CreatedList>
        </>
      ) : (
        !error && (
          <I.ImportNotice>
            <Sparkles />
            <span>
              <b>Resultado da importação</b>
              <small>
                Depois da análise, categorias e produtos efetivamente criados aparecerão aqui.
              </small>
            </span>
          </I.ImportNotice>
        )
      )}
    </>
  );

  return (
    <I.Workspace aria-label="Importação de cardápio">
      <I.MethodBar>
        <button className="back" type="button" onClick={onClose}>
          <ArrowLeft /> Voltar ao cardápio
        </button>
        <div className="methods" role="tablist" aria-label="Origem do cardápio">
          <button
            aria-selected={method === 'ifood'}
            className={method === 'ifood' ? 'active' : ''}
            role="tab"
            type="button"
            onClick={() => changeMethod('ifood')}
          >
            <Link2 /> Link do iFood
          </button>
          <button
            aria-selected={method === 'photo'}
            className={method === 'photo' ? 'active' : ''}
            role="tab"
            type="button"
            onClick={() => changeMethod('photo')}
          >
            <FileImage /> Foto do cardápio
          </button>
        </div>
      </I.MethodBar>

      <I.StepBanner>
        <div className="step-icon">{method === 'ifood' ? <Link2 /> : <ScanLine />}</div>
        <div>
          <small>PASSO 1 DE 2</small>
          <b>
            {method === 'ifood' ? 'Informe o link público do iFood' : 'Envie a foto do cardápio'}
          </b>
          <span>
            {method === 'ifood'
              ? 'Analisaremos categorias e produtos disponíveis publicamente.'
              : 'A IA fará a leitura dos itens visíveis e organizará o resultado.'}
          </span>
        </div>
        <div className="step-track" aria-label="Progresso da importação">
          <i className={result ? 'done' : 'active'}>1</i>
          <em />
          <i className={result ? 'active' : ''}>2</i>
        </div>
      </I.StepBanner>

      {method === 'ifood' ? (
        <I.ImportGrid>
          <I.SourceCard
            onSubmit={(event) => {
              event.preventDefault();
              void importFromIfood();
            }}
          >
            <div>
              <h3>Link do restaurante no iFood</h3>
              <p>Use o endereço público que seus clientes já acessam.</p>
            </div>
            <div className="ifood-mark" aria-label="iFood">
              iFood
            </div>
            <label>
              Link do restaurante
              <span className="url-field">
                <Link2 />
                <input
                  aria-label="Link público do restaurante no iFood"
                  inputMode="url"
                  placeholder="https://www.ifood.com.br/delivery/..."
                  value={ifoodUrl}
                  onChange={(event) => setIfoodUrl(event.target.value)}
                />
              </span>
            </label>
            <div className="security-note">
              <LockKeyhole />
              <span>
                <b>Seus dados estão seguros</b>
                <small>
                  A análise aceita somente páginas públicas HTTPS do domínio oficial do iFood.
                </small>
              </span>
            </div>
            {imageGenerationOption}
            <button className="submit-import" disabled={busy || generatingImages} type="submit">
              <Search /> {busy ? 'Analisando cardápio...' : 'Analisar e importar'}
            </button>
          </I.SourceCard>
          <I.ResultCard aria-live="polite">
            <header>
              <h3>Resumo do cardápio encontrado</h3>
              <p>Mostramos apenas os registros novos efetivamente persistidos.</p>
            </header>
            {resultPanel}
          </I.ResultCard>
        </I.ImportGrid>
      ) : (
        <I.PhotoLayout>
          <I.PhotoSource>
            <h3>Foto do cardápio</h3>
            {photo ? (
              <>
                <div className="photo-preview">
                  <img src={photo} alt={`Prévia de ${photoName || 'cardápio enviado'}`} />
                </div>
                <div className="photo-actions">
                  <label>
                    <Upload /> Trocar foto
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      disabled={processingPhoto || busy}
                      type="file"
                      onChange={(event) => void choosePhoto(event.target.files?.[0])}
                    />
                  </label>
                  <button
                    disabled={busy}
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoName('');
                      setResult(null);
                      setImageResults([]);
                    }}
                  >
                    <Trash2 /> Remover
                  </button>
                </div>
              </>
            ) : (
              <label className="photo-picker">
                <ImagePlus />
                <b>{processingPhoto ? 'Preparando imagem...' : 'Arraste ou selecione uma foto'}</b>
                <span>JPG, PNG ou WEBP</span>
                <small>Tamanho máximo: 5 MB</small>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  disabled={processingPhoto || busy}
                  type="file"
                  onChange={(event) => void choosePhoto(event.target.files?.[0])}
                />
              </label>
            )}
          </I.PhotoSource>

          <I.AnalysisCard aria-live="polite">
            <header>
              <Sparkles /> <h3>Itens identificados pela IA</h3>
            </header>
            <div className="analysis-stages">
              <div className={photo ? 'done' : ''}>
                <i>{photo ? <Check /> : 1}</i>
                <span>
                  <b>Lendo imagem</b>
                  <small>
                    {photo ? 'Imagem pronta para análise.' : 'Aguardando uma foto nítida.'}
                  </small>
                </span>
              </div>
              <div className={result ? 'done' : busy ? 'active' : ''}>
                <i>{result ? <Check /> : 2}</i>
                <span>
                  <b>Identificando categorias e produtos</b>
                  <small>
                    {busy
                      ? 'Extraindo nomes, descrições e preços...'
                      : 'A IA organiza os itens visíveis.'}
                  </small>
                </span>
              </div>
              <div className={result ? 'done' : ''}>
                <i>{result ? <Check /> : 3}</i>
                <span>
                  <b>Atualizando o catálogo</b>
                  <small>
                    {generatingImages
                      ? 'Gerando imagens dos produtos sem marca...'
                      : result
                        ? 'Novos registros persistidos.'
                        : 'Itens existentes serão preservados.'}
                  </small>
                </span>
              </div>
            </div>
            {imageGenerationOption}
            {resultPanel}
            <button
              className="analyze-photo"
              disabled={!photo || busy || processingPhoto || generatingImages}
              type="button"
              onClick={() => void importFromPhoto()}
            >
              <ScanLine /> {busy ? 'Analisando imagem...' : 'Analisar e importar'}
            </button>
          </I.AnalysisCard>
        </I.PhotoLayout>
      )}
    </I.Workspace>
  );
}
