import { useState } from 'react';
import { Check, ImageOff, LoaderCircle, RefreshCw, UploadCloud } from 'lucide-react';
import type { IngredientImageSearchResult } from '../../../Services/ingredientsService';
import ingredientsService from '../../../Services/ingredientsService';
import { ChatGptLogo } from '../../../components/ChatGptLogo';

type IngredientImageStepProps = {
  name: string;
  provider?: 'Pexels' | 'Demo';
  results: IngredientImageSearchResult[];
  previewId: string | null;
  selectedResultId: string | null;
  uploadedImage: string | null;
  loading: boolean;
  uploading: boolean;
  searchError: string;
  onPreview: (id: string) => void;
  onUseSuggested: (result: IngredientImageSearchResult) => void;
  onUpload: (file?: File) => void;
  onSearchAgain: () => void;
  onContinueWithoutPhoto: () => void;
};

async function dataUrlToFile(dataUrl: string, name: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const safeName =
    name
      .trim()
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'ingrediente';
  return new File([blob], `${safeName}-ia.png`, { type: blob.type || 'image/png' });
}

export function IngredientImageStep({
  name,
  provider = 'Pexels',
  results,
  previewId,
  selectedResultId,
  uploadedImage,
  loading,
  uploading,
  searchError,
  onPreview,
  onUseSuggested,
  onUpload,
  onSearchAgain,
  onContinueWithoutPhoto,
}: IngredientImageStepProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const preview = results.find((result) => result.id === previewId) || results[0];
  const displayImage = uploadedImage || preview?.previewUrl || '';

  const generateWithAi = async () => {
    if (!name.trim() || aiLoading || uploading) return;
    setAiLoading(true);
    setAiError('');
    try {
      const result = await ingredientsService.generateAiImage({ name: name.trim() });
      if (!result.image) throw new Error('A IA não retornou uma imagem.');
      onUpload(await dataUrlToFile(result.image, name));
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      setAiError(
        apiError.response?.data?.error ||
          apiError.message ||
          'Não foi possível gerar a imagem com IA agora.',
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <section aria-labelledby="ingredient-wizard-title" className="image-step">
      <div className="step-heading">
        <h3 id="ingredient-wizard-title" tabIndex={-1}>
          Escolha uma foto
        </h3>
        <p>
          {loading
            ? `Estamos procurando imagens para ${name}.`
            : results.length
              ? `Encontramos algumas imagens para ${name}. Você também pode criar uma imagem exclusiva com IA.`
              : provider === 'Demo'
                ? 'Ainda não temos uma foto de exemplo para este nome. Gere com IA, envie sua foto ou continue sem ela.'
                : 'A foto é opcional. Você pode gerar com IA, enviar a sua ou adicionar depois.'}
        </p>
      </div>

      {loading ? (
        <div className="image-loading" role="status" aria-live="polite">
          <LoaderCircle />
          <b>Procurando uma boa imagem...</b>
          <span>Isso deve levar apenas alguns segundos.</span>
        </div>
      ) : (
        <>
          {searchError && (
            <div className="image-search-error" role="status">
              <ImageOff />
              <span>
                <b>{searchError}</b>
                <small>Você ainda pode gerar com IA, enviar uma foto ou continuar sem ela.</small>
              </span>
            </div>
          )}

          {aiError && (
            <div className="image-search-error" role="alert">
              <ImageOff />
              <span>
                <b>Não foi possível gerar a imagem</b>
                <small>{aiError}</small>
              </span>
            </div>
          )}

          {displayImage && (
            <div className="recommended-image">
              <img
                src={displayImage}
                alt={uploadedImage ? `Foto enviada para ${name}` : preview?.alt || name}
              />
              <div>
                <b>{name}</b>
                {uploadedImage ? (
                  <small>Sua foto ou imagem gerada</small>
                ) : preview?.source === 'Demo' ? (
                  <small>Foto demonstrativa GastroNexa</small>
                ) : (
                  <small>
                    Foto de{' '}
                    {preview?.photographerUrl ? (
                      <a href={preview.photographerUrl} target="_blank" rel="noreferrer">
                        {preview.photographer}
                      </a>
                    ) : (
                      preview?.photographer
                    )}{' '}
                    no{' '}
                    <a href={preview?.sourceUrl} target="_blank" rel="noreferrer">
                      Pexels
                    </a>
                  </small>
                )}
              </div>
              {!uploadedImage && preview && (
                <button
                  className={selectedResultId === preview.id ? 'selected' : ''}
                  type="button"
                  onClick={() => onUseSuggested(preview)}
                >
                  <Check />
                  {selectedResultId === preview.id ? 'Foto selecionada' : 'Usar esta foto'}
                </button>
              )}
            </div>
          )}

          {!!results.length && !uploadedImage && (
            <div className="other-images">
              <span>Outras opções</span>
              <div>
                {results.map((result) => (
                  <button
                    aria-label={`Ver foto de ${result.photographer}`}
                    className={`${preview?.id === result.id ? 'previewing' : ''} ${selectedResultId === result.id ? 'selected' : ''}`}
                    key={result.id}
                    type="button"
                    onClick={() => onPreview(result.id)}
                  >
                    <img src={result.thumbnailUrl} alt="" />
                    {selectedResultId === result.id && <Check />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="image-actions">
            <button
              type="button"
              disabled={aiLoading || uploading || !name.trim()}
              onClick={() => void generateWithAi()}
            >
              {aiLoading ? <LoaderCircle className="spin" /> : <ChatGptLogo />}
              {aiLoading ? 'Gerando com IA...' : 'Gerar com IA'}
            </button>
            <button type="button" disabled={aiLoading} onClick={onSearchAgain}>
              <RefreshCw /> Pesquisar novamente
            </button>
            <label>
              {uploading ? <LoaderCircle className="spin" /> : <UploadCloud />}
              {uploadedImage ? 'Trocar minha foto' : 'Enviar minha foto'}
              <input
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading || aiLoading}
                type="file"
                onChange={(event) => onUpload(event.target.files?.[0])}
              />
            </label>
            <button type="button" disabled={aiLoading} onClick={onContinueWithoutPhoto}>
              <ImageOff /> Continuar sem foto
            </button>
          </div>
          {provider !== 'Demo' && preview?.source !== 'Demo' && (
            <a className="pexels-credit" href="https://www.pexels.com" target="_blank" rel="noreferrer">
              Fotos fornecidas por Pexels
            </a>
          )}
        </>
      )}
    </section>
  );
}
