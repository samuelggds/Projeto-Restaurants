import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  Check,
  CheckCircle2,
  FolderPlus,
  Image,
  Lightbulb,
  Plus,
  Tag,
  X,
} from 'lucide-react';

import { useAppDialog } from '../../../components/AppDialog/context';
import ingredientsService, {
  type IngredientImageSearchResponse,
  type IngredientImageSearchResult,
} from '../../../Services/ingredientsService';
import { createPersistentImageDataUrl } from '../../../utils/persistentImage';
import { validateIngredientDraft } from '../domain/productCustomizationValidation';
import type { AdminIngredient } from '../types';
import { IngredientImageStep } from './IngredientImageStep';
import * as W from './IngredientWizard.styles';

type IngredientDraft = Omit<AdminIngredient, 'id'> & { imageSelectionToken?: string };

type IngredientWizardProps = {
  ingredients: AdminIngredient[];
  categories: string[];
  initialCategory?: string;
  mode?: 'CATALOG' | 'INLINE';
  onClose: () => void;
  onCreate: (
    ingredient: IngredientDraft,
  ) => AdminIngredient | void | Promise<AdminIngredient | void>;
  onCreated?: (ingredient: AdminIngredient) => void;
  onUseInProduct?: () => void;
  onSearchImages?: (input: {
    name: string;
    category?: string;
    page?: number;
  }) => Promise<IngredientImageSearchResponse>;
};

type IngredientWizardStep = 1 | 2 | 3 | 4 | 'SUCCESS';
type SelectedImage =
  { kind: 'provider'; result: IngredientImageSearchResult } | { kind: 'upload'; dataUrl: string };

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function IngredientWizard({
  ingredients,
  categories,
  initialCategory = '',
  mode = 'CATALOG',
  onClose,
  onCreate,
  onCreated,
  onUseInProduct,
  onSearchImages,
}: IngredientWizardProps) {
  const { confirmDialog } = useAppDialog();
  const [step, setStep] = useState<IngredientWizardStep>(1);
  const [category, setCategory] = useState(initialCategory);
  const [creatingCategory, setCreatingCategory] = useState(!categories.length && !initialCategory);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0');
  const [hasAdditionalPrice, setHasAdditionalPrice] = useState(false);
  const [imageResults, setImageResults] = useState<IngredientImageSearchResult[]>([]);
  const [imagePage, setImagePage] = useState(1);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageSearchError, setImageSearchError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);
  const draft = useMemo(
    () => ({
      name: name.trim(),
      category: category.trim(),
      price: hasAdditionalPrice ? Number(price) : 0,
      active: true,
      image:
        selectedImage?.kind === 'upload'
          ? selectedImage.dataUrl
          : selectedImage?.kind === 'provider'
            ? undefined
            : null,
      imageSelectionToken:
        selectedImage?.kind === 'provider' ? selectedImage.result.selectionToken : undefined,
    }),
    [category, hasAdditionalPrice, name, price, selectedImage],
  );
  const categoryLocked = mode === 'INLINE' && Boolean(initialCategory.trim());
  const hasChanges = Boolean(
    name.trim() ||
    selectedImage ||
    hasAdditionalPrice ||
    price !== '0' ||
    category !== initialCategory,
  );

  const requestClose = useCallback(async () => {
    if (!hasChanges || step === 'SUCCESS') {
      onClose();
      return;
    }
    const confirmed = await confirmDialog({
      title: 'Descartar ingrediente?',
      description: 'Os dados preenchidos ainda não foram cadastrados.',
      confirmLabel: 'Descartar',
      tone: 'danger',
    });
    if (confirmed) onClose();
  }, [confirmDialog, hasChanges, onClose, step]);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('#ingredient-wizard-title')?.focus();
  }, [step]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        void requestClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ) ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  const searchImages = useCallback(
    async (requestedPage: number, searchCategory?: string) => {
      setImageLoading(true);
      setImageSearchError('');
      setError('');
      try {
        const response = onSearchImages
          ? await onSearchImages({
              name: name.trim(),
              category: searchCategory,
              page: requestedPage,
            })
          : await ingredientsService.searchImages({
              name: name.trim(),
              category: searchCategory,
              page: requestedPage,
            });
        setImageResults(response.results);
        setImagePage(response.page);
        setPreviewImageId(response.results[0]?.id ?? null);
        setSelectedImage(null);
      } catch {
        setImageResults([]);
        setPreviewImageId(null);
        setImageSearchError('Não conseguimos buscar imagens agora.');
      } finally {
        setImageLoading(false);
      }
    },
    [name, onSearchImages],
  );

  const uploadOwnImage = async (file?: File) => {
    if (!file) return;
    setImageUploading(true);
    setError('');
    try {
      const dataUrl = await createPersistentImageDataUrl(file, 512, {
        targetWidth: 512,
        targetHeight: 512,
      });
      setSelectedImage({ kind: 'upload', dataUrl });
      setImageSearchError('');
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Não foi possível carregar a imagem.',
      );
    } finally {
      setImageUploading(false);
    }
  };

  const continueWizard = () => {
    setError('');
    if (step === 1) {
      const errors = validateIngredientDraft(
        { ...draft, category: category.trim() || 'Categoria pendente', price: 0 },
        ingredients,
      );
      if (errors.length) {
        setError(errors[0]);
        return;
      }
      setStep(2);
      void searchImages(1, categoryLocked ? initialCategory : undefined);
      return;
    }
    if (step === 2) {
      if (!selectedImage) {
        setError('Escolha uma foto, envie a sua ou use “Continuar sem foto”.');
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!category.trim()) {
        setError('Escolha uma categoria ou crie uma nova para continuar.');
        return;
      }
      if (category.trim().length > 60) {
        setError('A categoria deve ter no máximo 60 caracteres.');
        return;
      }
      setStep(4);
      return;
    }
  };

  const returnWizard = () => {
    setError('');
    setStep((current) => (current === 4 ? 3 : current === 3 ? 2 : 1));
  };

  const createIngredient = async () => {
    const errors = validateIngredientDraft(draft, ingredients);
    if (errors.length) {
      setError(errors[0]);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await onCreate(draft);
      if (mode === 'INLINE') {
        if (created) onCreated?.(created);
        onClose();
        return;
      }
      setStep('SUCCESS');
    } catch (createError) {
      const apiError = createError as {
        response?: { data?: { error?: string; message?: string } };
      };
      setError(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          'Não foi possível cadastrar o ingrediente.',
      );
    } finally {
      setBusy(false);
    }
  };

  const createAnother = () => {
    setName('');
    setCategory(initialCategory);
    setCreatingCategory(!categories.length && !initialCategory);
    setPrice('0');
    setHasAdditionalPrice(false);
    setImageResults([]);
    setImagePage(1);
    setPreviewImageId(null);
    setSelectedImage(null);
    setImageSearchError('');
    setError('');
    setStep(1);
  };

  return createPortal(
    <W.Overlay
      aria-labelledby="ingredient-wizard-title"
      aria-modal="true"
      data-ingredient-wizard
      role="dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) void requestClose();
      }}
    >
      <W.Dialog
        noValidate
        ref={dialogRef}
        onSubmit={(event) => {
          event.preventDefault();
          if (step === 4) void createIngredient();
          else if (step !== 'SUCCESS') continueWizard();
        }}
      >
        <header className="wizard-header">
          <h2>{mode === 'INLINE' ? 'Novo ingrediente para o produto' : 'Novo ingrediente'}</h2>
          <div className="header-actions">
            {step !== 'SUCCESS' && <small>{step} de 4</small>}
            <button
              aria-label="Fechar cadastro de ingrediente"
              type="button"
              onClick={() => void requestClose()}
            >
              <X />
            </button>
          </div>
        </header>

        {step !== 'SUCCESS' && (
          <nav aria-label="Progresso do cadastro do ingrediente">
            {[1, 2, 3, 4].map((number) => (
              <span
                aria-current={step === number ? 'step' : undefined}
                className={typeof step === 'number' && step >= number ? 'active' : ''}
                key={number}
              />
            ))}
          </nav>
        )}

        {error && (
          <div className="wizard-error" role="alert">
            {error}
          </div>
        )}

        <main className={step === 'SUCCESS' ? 'success-main' : ''}>
          <div className="wizard-stage">
            {step === 1 && (
              <section aria-labelledby="ingredient-wizard-title">
                <div className="step-heading">
                  <h3 id="ingredient-wizard-title" ref={headingRef} tabIndex={-1}>
                    Qual é o nome do ingrediente?
                  </h3>
                  <p>Use um nome claro e fácil de identificar.</p>
                </div>
                <label className="primary-field">
                  Nome do ingrediente
                  <input
                    autoFocus
                    maxLength={80}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex.: Bacon"
                  />
                </label>
              </section>
            )}

            {step === 2 && (
              <IngredientImageStep
                loading={imageLoading}
                name={name}
                previewId={previewImageId}
                results={imageResults}
                searchError={imageSearchError}
                selectedResultId={
                  selectedImage?.kind === 'provider' ? selectedImage.result.id : null
                }
                uploadedImage={selectedImage?.kind === 'upload' ? selectedImage.dataUrl : null}
                uploading={imageUploading}
                onContinueWithoutPhoto={() => {
                  setSelectedImage(null);
                  setError('');
                  setStep(3);
                }}
                onPreview={setPreviewImageId}
                onSearchAgain={() => void searchImages(imagePage + 1, category || undefined)}
                onUpload={(file) => void uploadOwnImage(file)}
                onUseSuggested={(result) => {
                  setSelectedImage({ kind: 'provider', result });
                  setPreviewImageId(result.id);
                  setError('');
                }}
              />
            )}

            {step === 3 && (
              <section aria-labelledby="ingredient-wizard-title">
                <div className="step-heading">
                  <h3 id="ingredient-wizard-title" ref={headingRef} tabIndex={-1}>
                    Em qual categoria ele fica?
                  </h3>
                  <p>Organize ingredientes parecidos para encontrá-los rapidamente nos produtos.</p>
                </div>
                {categoryLocked ? (
                  <div className="locked-category" role="status">
                    <Tag />
                    <span>
                      <b>{initialCategory}</b>
                      <small>Categoria definida pela etapa do produto</small>
                    </span>
                    <CheckCircle2 />
                  </div>
                ) : (
                  <>
                    {!!categories.length && (
                      <label className="primary-field">
                        Categoria
                        <select
                          aria-label="Categoria do ingrediente"
                          autoFocus
                          value={creatingCategory ? '' : category}
                          onChange={(event) => {
                            setCategory(event.target.value);
                            setCreatingCategory(false);
                            setError('');
                          }}
                        >
                          <option value="">Selecione uma categoria</option>
                          {categories.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <button
                      aria-expanded={creatingCategory}
                      className="new-category-action"
                      type="button"
                      onClick={() => {
                        setCreatingCategory(true);
                        setCategory('');
                      }}
                    >
                      <FolderPlus /> Criar nova categoria
                    </button>
                    {creatingCategory && (
                      <label className="new-category-field">
                        Nome da nova categoria
                        <input
                          autoFocus
                          maxLength={60}
                          value={category}
                          onChange={(event) => setCategory(event.target.value)}
                          placeholder="Ex.: Molhos"
                        />
                        <small>A categoria será criada como parte deste ingrediente.</small>
                      </label>
                    )}
                  </>
                )}
                {!categoryLocked && category.trim() && (
                  <button
                    className="search-with-category"
                    type="button"
                    onClick={() => {
                      setStep(2);
                      void searchImages(1, category);
                    }}
                  >
                    Buscar outras fotos usando esta categoria
                  </button>
                )}
              </section>
            )}

            {step === 4 && (
              <section aria-labelledby="ingredient-wizard-title">
                <div className="step-heading">
                  <h3 id="ingredient-wizard-title" ref={headingRef} tabIndex={-1}>
                    Ele normalmente aumenta o preço?
                  </h3>
                  <p>Defina se este ingrediente tem um valor sugerido adicional.</p>
                </div>
                <div className="price-choice" role="radiogroup" aria-label="Impacto no preço">
                  <button
                    aria-checked={!hasAdditionalPrice}
                    className={!hasAdditionalPrice ? 'active' : ''}
                    role="radio"
                    type="button"
                    onClick={() => {
                      setHasAdditionalPrice(false);
                      setError('');
                    }}
                  >
                    Não
                  </button>
                  <button
                    aria-checked={hasAdditionalPrice}
                    className={hasAdditionalPrice ? 'active' : ''}
                    role="radio"
                    type="button"
                    onClick={() => {
                      setHasAdditionalPrice(true);
                      setError('');
                    }}
                  >
                    Sim
                  </button>
                </div>
                {hasAdditionalPrice && (
                  <label className="primary-field">
                    Preço sugerido
                    <span className="money-field">
                      R$
                      <input
                        aria-label="Valor adicional padrão"
                        type="number"
                        min="0"
                        max="9999"
                        step="0.01"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                      />
                    </span>
                    <small>
                      Esse será o valor sugerido. Você poderá alterá-lo em cada produto.
                    </small>
                  </label>
                )}
                <p className="default-price-note">
                  O preço sugerido ajuda no cadastro, mas não cria escolhas em nenhum produto.
                </p>
              </section>
            )}

            {step === 'SUCCESS' && (
              <section className="success-step" aria-labelledby="ingredient-wizard-title">
                <CheckCircle2 />
                <h3 id="ingredient-wizard-title" ref={headingRef} tabIndex={-1}>
                  Ingrediente criado com sucesso!
                </h3>
                <p>
                  <b>{name}</b> já está disponível para uso nos produtos do seu cardápio.
                </p>
                <div className="ingredient-summary">
                  <span>
                    {selectedImage ? (
                      <img
                        src={
                          selectedImage.kind === 'upload'
                            ? selectedImage.dataUrl
                            : selectedImage.result.previewUrl
                        }
                        alt=""
                      />
                    ) : (
                      name.trim().charAt(0).toLocaleUpperCase('pt-BR') || 'I'
                    )}
                  </span>
                  <div>
                    <h4>{name}</h4>
                    <p>{category}</p>
                  </div>
                  <strong>{money(draft.price)}</strong>
                </div>
                <div>
                  <button type="button" onClick={createAnother}>
                    <Plus /> Cadastrar outro ingrediente
                  </button>
                  {onUseInProduct && (
                    <button
                      className="primary"
                      type="button"
                      onClick={() => {
                        onClose();
                        onUseInProduct();
                      }}
                    >
                      Usar em um produto
                    </button>
                  )}
                  <button type="button" onClick={onClose}>
                    Voltar aos ingredientes
                  </button>
                </div>
              </section>
            )}
          </div>

          {step !== 'SUCCESS' && (
            <aside className="wizard-aside" aria-label="Benefícios do cadastro de ingrediente">
              <div className="aside-intro">
                <CheckCircle2 />
                <h3>Ingrediente pronto para ser reutilizado</h3>
                <p>
                  Após o cadastro, ele ficará disponível para uso em diferentes produtos do
                  cardápio.
                </p>
              </div>
              <div className="aside-benefits">
                <div>
                  <span className="green">
                    <Tag />
                  </span>
                  <p>
                    <b>Reutilização inteligente</b>
                    <small>Use o mesmo ingrediente em quantos produtos precisar.</small>
                  </p>
                </div>
                <div>
                  <span className="orange">
                    <BadgeDollarSign />
                  </span>
                  <p>
                    <b>Controle de preço</b>
                    <small>Defina se a opção altera o preço final do produto.</small>
                  </p>
                </div>
                <div>
                  <span className="blue">
                    <Image />
                  </span>
                  <p>
                    <b>Imagem opcional</b>
                    <small>Escolha uma sugestão, envie a sua ou continue sem foto.</small>
                  </p>
                </div>
              </div>
              <div className="aside-tip">
                <Lightbulb />
                <p>
                  <b>Dica</b>
                  <small>Você poderá editar todas essas informações quando precisar.</small>
                </p>
              </div>
            </aside>
          )}
        </main>

        {step !== 'SUCCESS' && (
          <footer>
            <button disabled={step === 1 || busy} type="button" onClick={returnWizard}>
              <ArrowLeft /> Voltar
            </button>
            {step === 4 ? (
              <button className="primary" disabled={busy} type="submit">
                {busy ? 'Cadastrando...' : 'Concluir'} <Check />
              </button>
            ) : (
              <button className="primary" disabled={busy} type="submit">
                Continuar <ArrowRight />
              </button>
            )}
          </footer>
        )}
      </W.Dialog>
    </W.Overlay>,
    document.body,
  );
}
