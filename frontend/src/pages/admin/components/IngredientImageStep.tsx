import { Check, ImageOff, LoaderCircle, RefreshCw, UploadCloud } from 'lucide-react';

import type { IngredientImageSearchResult } from '../../../Services/ingredientsService';

type IngredientImageStepProps = {
  name: string;
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

export function IngredientImageStep({
  name,
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
  const preview = results.find((result) => result.id === previewId) || results[0];
  const displayImage = uploadedImage || preview?.previewUrl || '';

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
              ? `Encontramos algumas imagens para ${name}.`
              : 'A foto é opcional e pode ser adicionada depois.'}
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
                <small>Você ainda pode enviar uma foto ou continuar sem ela.</small>
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
                  <small>Sua foto</small>
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
            <button type="button" onClick={onSearchAgain}>
              <RefreshCw /> Pesquisar novamente
            </button>
            <label>
              {uploading ? <LoaderCircle className="spin" /> : <UploadCloud />}
              {uploadedImage ? 'Trocar minha foto' : 'Enviar minha foto'}
              <input
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                type="file"
                onChange={(event) => onUpload(event.target.files?.[0])}
              />
            </label>
            <button type="button" onClick={onContinueWithoutPhoto}>
              <ImageOff /> Continuar sem foto
            </button>
          </div>
          <a
            className="pexels-credit"
            href="https://www.pexels.com"
            target="_blank"
            rel="noreferrer"
          >
            Fotos fornecidas por Pexels
          </a>
        </>
      )}
    </section>
  );
}
