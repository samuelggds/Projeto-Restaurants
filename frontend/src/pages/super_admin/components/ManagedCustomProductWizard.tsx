import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Boxes, Layers3, PackagePlus, Pizza, Upload, X } from 'lucide-react';
import { createPersistentImageDataUrl } from '../../../utils/persistentImage';
import type {
  AdminCategory,
  AdminIngredient,
  AdminProduct,
} from '../../admin/types';
import {
  buildManagedCustomProductConfiguration,
  inferManagedCustomizationType,
  isManagedSimpleCustomProduct,
  managedAdditionalPrices,
  managedSelectedIngredientIds,
  managedSelectedProductIds,
  type ManagedCustomizationType,
} from '../domain/managedCustomProductConfiguration';
import * as S from './ManagedCustomProductWizard.styles';

type Props = {
  product: AdminProduct | null;
  categories: AdminCategory[];
  ingredients: AdminIngredient[];
  products: AdminProduct[];
  close: () => void;
  save: (product: AdminProduct) => Promise<void>;
};

const steps = ['Produto', 'Tipo', 'Opções', 'Revisão'] as const;

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ManagedCustomProductWizard({
  product,
  categories,
  ingredients,
  products,
  close,
  save,
}: Props) {
  const initialType = product ? inferManagedCustomizationType(product) : 'INGREDIENTS';
  const [step, setStep] = useState(0);
  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? 0);
  const [image, setImage] = useState(product?.image ?? '');
  const [price, setPrice] = useState(String(product?.price ?? ''));
  const [type, setType] = useState<ManagedCustomizationType>(initialType);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>(
    managedSelectedProductIds(product),
  );
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<number[]>(
    managedSelectedIngredientIds(product),
  );
  const [additionalPrices, setAdditionalPrices] = useState<Record<number, number>>(
    managedAdditionalPrices(product),
  );
  const inferredGroup = product?.optionGroups?.[0];
  const [groupName, setGroupName] = useState(
    inferredGroup?.name ?? (initialType === 'PORTIONS' ? 'Porções' : 'Adicionais'),
  );
  const [required, setRequired] = useState(inferredGroup?.required ?? false);
  const [minSelections, setMinSelections] = useState(
    Math.max(1, Number(inferredGroup?.minSelections ?? 1)),
  );
  const [maxSelections, setMaxSelections] = useState(
    Math.max(1, Number(inferredGroup?.maxSelections ?? 1)),
  );
  const [minPortions, setMinPortions] = useState(
    Math.max(1, Number(product?.portionConfiguration?.minPortions ?? 2)),
  );
  const [maxPortions, setMaxPortions] = useState(
    Math.max(1, Number(product?.portionConfiguration?.maxPortions ?? 2)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const simpleEditable = !product || isManagedSimpleCustomProduct(product);
  const activeIngredients = useMemo(
    () => ingredients.filter((ingredient) => ingredient.active !== false),
    [ingredients],
  );
  const selectableProducts = useMemo(
    () =>
      products.filter(
        (candidate) =>
          candidate.id !== product?.id &&
          candidate.active !== false &&
          candidate.kind !== 'COMBO' &&
          candidate.saleMode !== 'BUILDABLE' &&
          candidate.pricingMode !== 'HIGHEST_OPTION',
      ),
    [product?.id, products],
  );

  const selectedCount =
    type === 'HALF_HALF' ? selectedProductIds.length : selectedIngredientIds.length;

  function validateCurrentStep(target = step) {
    setError('');
    if (target === 0) {
      const numericPrice = Number(price);
      if (!name.trim()) {
        setError('Informe o nome do produto.');
        return false;
      }
      if (!categoryId) {
        setError('Selecione a categoria do produto.');
        return false;
      }
      if (
        type !== 'HALF_HALF' &&
        (!price.trim() || !Number.isFinite(numericPrice) || numericPrice < 0)
      ) {
        setError('Informe um preço base válido.');
        return false;
      }
    }

    if (target === 2) {
      if (type === 'HALF_HALF' && selectedProductIds.length < 2) {
        setError('Selecione pelo menos dois produtos/sabores do próprio restaurante.');
        return false;
      }
      if (type !== 'HALF_HALF' && !selectedIngredientIds.length) {
        setError('Selecione pelo menos um ingrediente/opção do próprio restaurante.');
        return false;
      }
      if (type === 'PORTIONS' && (minPortions > maxPortions || maxPortions > 8)) {
        setError('Revise a quantidade mínima e máxima de porções.');
        return false;
      }
      if (type === 'INGREDIENTS') {
        const effectiveMin = required ? minSelections : 0;
        if (
          maxSelections < 1 ||
          maxSelections > selectedIngredientIds.length ||
          effectiveMin > maxSelections
        ) {
          setError('Revise o mínimo e o máximo de escolhas.');
          return false;
        }
      }
    }
    return true;
  }

  function next() {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(3, current + 1));
  }

  async function upload(file?: File | null) {
    if (!file) return;
    setError('');
    try {
      setImage(await createPersistentImageDataUrl(file, 960));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível carregar a imagem.');
    }
  }

  function toggleNumber(
    value: number,
    selected: boolean,
    setter: Dispatch<SetStateAction<number[]>>,
  ) {
    setter((current) =>
      selected ? [...new Set([...current, value])] : current.filter((item) => item !== value),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step !== 3) {
      next();
      return;
    }
    if (!validateCurrentStep(0) || !validateCurrentStep(2)) return;

    const configuration = buildManagedCustomProductConfiguration({
      type,
      selectedProductIds,
      selectedIngredientIds,
      additionalPrices,
      groupName,
      required,
      minSelections,
      maxSelections,
      minPortions,
      maxPortions,
    });

    setBusy(true);
    setError('');
    try {
      await save({
        id: product?.id ?? '',
        categoryId,
        category: categories.find((category) => category.id === categoryId)?.name ?? '',
        name: name.trim(),
        image: image.trim(),
        description: product?.description ?? '',
        price: type === 'HALF_HALF' ? 0 : Number(price),
        stock: product?.stock ?? null,
        preparationTime: product?.preparationTime,
        active: product?.active !== false,
        featured: product?.featured === true,
        kind: 'STANDARD',
        saleMode: 'BUILDABLE',
        pricingMode: configuration.pricingMode,
        configurationVersion: product?.configurationVersion,
        optionGroups: configuration.optionGroups,
        compositionItems: [],
        portionConfiguration: configuration.portionConfiguration,
      });
    } catch (saveError) {
      const apiError = saveError as {
        response?: { data?: { error?: string; message?: string } };
      };
      setError(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          (saveError instanceof Error ? saveError.message : 'Não foi possível salvar o produto.'),
      );
      setBusy(false);
    }
  }

  if (!simpleEditable && product) {
    return (
      <S.Overlay>
        <S.Panel onSubmit={(event) => event.preventDefault()}>
          <S.Header>
            <div>
              <small>PRODUTO PERSONALIZÁVEL</small>
              <h2>Configuração avançada existente</h2>
              <p>
                Este produto possui uma estrutura mais complexa que o assistente simplificado. Para
                evitar perda de regras, use o editor completo já existente.
              </p>
            </div>
            <button aria-label="Fechar" type="button" onClick={close}><X /></button>
          </S.Header>
          <S.Body>
            <S.Error>
              O assistente simples não altera automaticamente configurações antigas com várias
              etapas, composição ou regras combinadas.
            </S.Error>
          </S.Body>
          <S.Footer>
            <span />
            <div><button type="button" onClick={close}>Fechar</button></div>
          </S.Footer>
        </S.Panel>
      </S.Overlay>
    );
  }

  return (
    <S.Overlay>
      <S.Panel onSubmit={submit}>
        <S.Header>
          <div>
            <small>WORKSPACE ASSISTIDO</small>
            <h2>{product ? 'Editar produto personalizável' : 'Cadastrar produto personalizável'}</h2>
            <p>
              Fluxo direto do SUPER_ADMIN. A persistência continua usando as mesmas regras reais do
              produto BUILDABLE e o mesmo isolamento por restaurante.
            </p>
          </div>
          <button aria-label="Fechar cadastro" type="button" onClick={close}><X /></button>
        </S.Header>

        <S.Progress aria-label="Etapas do cadastro">
          {steps.map((label, index) => (
            <button
              className={index === step ? 'active' : index < step ? 'done' : ''}
              key={label}
              type="button"
              onClick={() => {
                if (index <= step) {
                  setError('');
                  setStep(index);
                }
              }}
            >
              <i>{index + 1}</i><span>{label}</span>
            </button>
          ))}
        </S.Progress>

        <S.Body>
          {error ? <S.Error role="alert">{error}</S.Error> : null}

          {step === 0 ? (
            <S.Step>
              <header>
                <small>1 · PRODUTO</small>
                <h3>Informações principais</h3>
                <p>Cadastre apenas o necessário. O produto normal continua no formulário atual.</p>
              </header>
              <S.Fields>
                <label>
                  Nome
                  <input maxLength={120} required value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <label>
                  Categoria
                  <select required value={categoryId} onChange={(event) => setCategoryId(Number(event.target.value))}>
                    <option value={0}>Selecione</option>
                    {categories.filter((category) => category.active !== false).map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Preço base
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                  />
                  <small>No meio a meio, o valor final usa o maior preço entre os sabores escolhidos.</small>
                </label>
                <label>
                  Link da imagem
                  <input
                    placeholder="https://..."
                    value={image.startsWith('data:image/') ? '' : image}
                    onChange={(event) => setImage(event.target.value)}
                  />
                </label>
                <label className="full">
                  Imagem do produto
                  <span>
                    <input
                      accept="image/png,image/jpeg,image/webp"
                      aria-label="Escolher imagem do produto personalizável"
                      type="file"
                      onChange={(event) => void upload(event.target.files?.[0])}
                    />
                  </span>
                  <small><Upload size={12} /> JPG, PNG ou WebP. A imagem fica persistida como no fluxo atual.</small>
                </label>
              </S.Fields>
            </S.Step>
          ) : null}

          {step === 1 ? (
            <S.Step>
              <header>
                <small>2 · TIPO DE PERSONALIZAÇÃO</small>
                <h3>O que o cliente poderá montar?</h3>
                <p>Escolha um único formato. O assistente monta a estrutura real esperada pelo backend.</p>
              </header>
              <S.TypeGrid>
                <button className={type === 'HALF_HALF' ? 'active' : ''} type="button" onClick={() => setType('HALF_HALF')}>
                  <Pizza /><b>Meio a meio</b>
                  <span>Duas metades obrigatórias. O cliente escolhe produtos/sabores do próprio restaurante.</span>
                </button>
                <button className={type === 'PORTIONS' ? 'active' : ''} type="button" onClick={() => setType('PORTIONS')}>
                  <Layers3 /><b>Porções</b>
                  <span>Divide o produto em partes e permite escolher uma opção para cada porção.</span>
                </button>
                <button className={type === 'INGREDIENTS' ? 'active' : ''} type="button" onClick={() => setType('INGREDIENTS')}>
                  <Boxes /><b>Ingredientes / Adicionais</b>
                  <span>Uma etapa simples com mínimo, máximo, obrigatoriedade e acréscimo.</span>
                </button>
              </S.TypeGrid>
            </S.Step>
          ) : null}

          {step === 2 ? (
            <S.Step>
              <header>
                <small>3 · OPÇÕES</small>
                <h3>Defina as escolhas do cliente</h3>
                <p>Somente produtos e ingredientes já carregados do restaurante atual podem ser vinculados.</p>
              </header>

              {type === 'HALF_HALF' ? (
                <S.OptionBox>
                  <header>
                    <div><h4>Sabores / produtos disponíveis</h4><p>Selecione no mínimo dois. As duas metades usarão a mesma lista.</p></div>
                    <b>{selectedProductIds.length} selecionado(s)</b>
                  </header>
                  <S.ChoiceList>
                    {selectableProducts.map((candidate) => (
                      <label className="no-price" key={candidate.id}>
                        <input
                          checked={selectedProductIds.includes(Number(candidate.id))}
                          type="checkbox"
                          onChange={(event) => toggleNumber(Number(candidate.id), event.target.checked, setSelectedProductIds)}
                        />
                        <span><b>{candidate.name}</b><small>{money(Number(candidate.price || 0))}</small></span>
                      </label>
                    ))}
                  </S.ChoiceList>
                </S.OptionBox>
              ) : (
                <>
                  <S.Rules>
                    <label>
                      Nome da etapa
                      <input maxLength={80} value={groupName} onChange={(event) => setGroupName(event.target.value)} />
                    </label>
                    {type === 'INGREDIENTS' ? (
                      <>
                        <label>
                          Mínimo
                          <input min="1" max="40" type="number" value={minSelections} onChange={(event) => setMinSelections(Number(event.target.value))} />
                        </label>
                        <label>
                          Máximo
                          <input min="1" max="40" type="number" value={maxSelections} onChange={(event) => setMaxSelections(Number(event.target.value))} />
                        </label>
                        <label className="check">
                          <input checked={required} type="checkbox" onChange={(event) => setRequired(event.target.checked)} />
                          Obrigatório
                        </label>
                      </>
                    ) : (
                      <>
                        <label>
                          Mínimo de porções
                          <input min="1" max="8" type="number" value={minPortions} onChange={(event) => setMinPortions(Number(event.target.value))} />
                        </label>
                        <label>
                          Máximo de porções
                          <input min="1" max="8" type="number" value={maxPortions} onChange={(event) => setMaxPortions(Number(event.target.value))} />
                        </label>
                      </>
                    )}
                  </S.Rules>

                  <S.OptionBox>
                    <header>
                      <div><h4>Ingredientes / opções</h4><p>Marque o que ficará disponível e ajuste o acréscimo de cada opção.</p></div>
                      <b>{selectedIngredientIds.length} selecionado(s)</b>
                    </header>
                    <S.ChoiceList>
                      {activeIngredients.map((ingredient) => {
                        const selected = selectedIngredientIds.includes(ingredient.id);
                        return (
                          <label key={ingredient.id}>
                            <input
                              checked={selected}
                              type="checkbox"
                              onChange={(event) => toggleNumber(ingredient.id, event.target.checked, setSelectedIngredientIds)}
                            />
                            <span><b>{ingredient.name}</b><small>{ingredient.category}</small></span>
                            <input
                              aria-label={`Acréscimo de ${ingredient.name}`}
                              disabled={!selected}
                              min="0"
                              step="0.01"
                              type="number"
                              value={additionalPrices[ingredient.id] ?? Number(ingredient.price || 0)}
                              onChange={(event) =>
                                setAdditionalPrices((current) => ({
                                  ...current,
                                  [ingredient.id]: Number(event.target.value),
                                }))
                              }
                            />
                          </label>
                        );
                      })}
                    </S.ChoiceList>
                  </S.OptionBox>
                </>
              )}
            </S.Step>
          ) : null}

          {step === 3 ? (
            <S.Step>
              <header>
                <small>4 · REVISÃO</small>
                <h3>Como o produto será salvo</h3>
                <p>Confira a estrutura antes de persistir no restaurante.</p>
              </header>
              <S.Review>
                <article>
                  <small>PRODUTO</small>
                  <b>{name || 'Sem nome'}</b>
                  <span>{categories.find((category) => category.id === categoryId)?.name || 'Sem categoria'}</span>
                  <span>{type === 'HALF_HALF' ? 'Preço pelo maior sabor escolhido' : `Preço base: ${money(Number(price || 0))}`}</span>
                </article>
                <article>
                  <small>PERSONALIZAÇÃO</small>
                  <b>{type === 'HALF_HALF' ? 'Meio a meio' : type === 'PORTIONS' ? 'Porções' : 'Ingredientes / Adicionais'}</b>
                  <span>{selectedCount} opção(ões) vinculada(s)</span>
                  {type === 'INGREDIENTS' ? <span>{required ? `Obrigatório · ${minSelections} a ${maxSelections} escolhas` : `Opcional · até ${maxSelections} escolhas`}</span> : null}
                  {type === 'PORTIONS' ? <span>{minPortions === maxPortions ? `${minPortions} porções obrigatórias` : `Entre ${minPortions} e ${maxPortions} porções`}</span> : null}
                  {type === 'HALF_HALF' ? <span>Duas escolhas obrigatórias; uma para cada metade.</span> : null}
                </article>
                <article>
                  <small>SEGURANÇA</small>
                  <b>Mesmo backend e mesmo tenant</b>
                  <p>O assistente não cria uma regra paralela: ele envia BUILDABLE, optionGroups e portionConfiguration para os endpoints assistidos já protegidos por restaurantId.</p>
                </article>
              </S.Review>
            </S.Step>
          ) : null}
        </S.Body>

        <S.Footer>
          <div>
            <button type="button" onClick={close}>Cancelar</button>
          </div>
          <div>
            {step > 0 ? <button disabled={busy} type="button" onClick={() => { setError(''); setStep((current) => current - 1); }}>Voltar</button> : null}
            {step < 3 ? (
              <button className="primary" disabled={busy} type="button" onClick={next}>Continuar</button>
            ) : (
              <button className="primary" disabled={busy} type="submit">
                <PackagePlus size={15} /> {busy ? 'Salvando...' : product ? 'Salvar alterações' : 'Cadastrar produto'}
              </button>
            )}
          </div>
        </S.Footer>
      </S.Panel>
    </S.Overlay>
  );
}
