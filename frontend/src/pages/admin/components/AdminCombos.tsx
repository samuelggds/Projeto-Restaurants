import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Image as ImageIcon, Info, Plus, Sparkles, Trash2, Upload, WandSparkles, X } from 'lucide-react';
import productComboService, {
  type ComboGroupInput,
  type ComboInput,
  type ComboRecord,
} from '../../../Services/productComboService';
import imageEnhancementService from '../../../Services/imageEnhancementService';
import { createPersistentImageDataUrl } from '../../../utils/persistentImage';
import type { AdminProduct } from '../types';
import * as C from '../styles/AdminCombos.styles';

type Props = {
  products: AdminProduct[];
  money: (value: number) => string;
  onChanged: () => void | Promise<void>;
};

const emptyGroup = (): ComboGroupInput => ({
  name: 'Produtos do combo',
  description: 'Produtos incluídos neste combo.',
  minSelections: 0,
  maxSelections: 1,
  active: true,
  options: [],
});

const emptyCombo = (): ComboInput => ({
  name: '',
  description: '',
  image: '',
  price: 0,
  active: true,
  featured: true,
  groups: [emptyGroup()],
});

function errorMessage(error: unknown, fallback: string) {
  const response = (error as { response?: { data?: { error?: string; message?: string } } })?.response;
  return String(response?.data?.error || response?.data?.message || (error instanceof Error ? error.message : fallback));
}

function toInput(combo: ComboRecord): ComboInput {
  return {
    name: combo.name,
    description: combo.description || '',
    image: combo.image || '',
    price: Number(combo.price || 0),
    active: combo.active !== false,
    featured: combo.featured !== false,
    groups: combo.comboGroups.map((group) => ({
      name: group.name,
      description: group.description || '',
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      active: group.active !== false,
      options: group.options.map((option) => ({
        componentProductId: option.componentProductId,
        additionalPrice: Number(option.additionalPrice || 0),
        minQuantity: option.minQuantity,
        maxQuantity: option.maxQuantity,
        defaultQuantity: option.defaultQuantity,
        locked: option.locked,
        active: option.active !== false,
      })),
    })),
  };
}

function normalizeSimpleComboDraft(input: ComboInput): ComboInput {
  const selectedOptions = input.groups
    .flatMap((group) => group.options)
    .filter((option) => option.componentProductId > 0)
    .map((option) => ({
      ...option,
      additionalPrice: 0,
      minQuantity: 1,
      maxQuantity: 1,
      defaultQuantity: 1,
      locked: true,
      active: true,
    }));

  const count = selectedOptions.length;
  return {
    ...input,
    groups: [
      {
        name: 'Produtos do combo',
        description: 'Produtos incluídos neste combo.',
        minSelections: count,
        maxSelections: Math.max(1, count),
        active: true,
        options: selectedOptions,
      },
    ],
  };
}

export function AdminCombos({ products, money, onChanged }: Props) {
  const [combos, setCombos] = useState<ComboRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null | undefined>();
  const [draft, setDraft] = useState<ComboInput>(emptyCombo());
  const [busy, setBusy] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const availableProducts = useMemo(
    () =>
      products.filter(
        (product) => product.id && product.active !== false && product.kind !== 'COMBO',
      ),
    [products],
  );

  const selectedOptions = draft.groups.flatMap((group) => group.options);
  const selectedProductIds = new Set(
    selectedOptions.map((option) => String(option.componentProductId)),
  );
  const selectedProducts = selectedOptions
    .map((option) =>
      availableProducts.find((product) => String(product.id) === String(option.componentProductId)),
    )
    .filter((product): product is AdminProduct => Boolean(product));
  const canGenerateImage = draft.name.trim().length >= 2 && selectedProducts.length > 0;

  const load = async () => {
    setLoading(true);
    try {
      setCombos(await productComboService.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    productComboService
      .list()
      .then((items) => {
        if (active) setCombos(items);
      })
      .catch(() => {
        if (active) setFeedback({ tone: 'error', message: 'Não foi possível carregar os combos.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openNew = () => {
    setDraft(emptyCombo());
    setEditingId(null);
    setFeedback(null);
  };

  const openEdit = (combo: ComboRecord) => {
    setDraft(toInput(combo));
    setEditingId(combo.id);
    setFeedback(null);
  };

  const close = () => {
    if (busy) return;
    setEditingId(undefined);
    setFeedback(null);
  };

  const updateGroup = (index: number, patch: Partial<ComboGroupInput>) => {
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group, groupIndex) =>
        groupIndex === index ? { ...group, ...patch } : group,
      ),
    }));
  };

  const updateOption = (
    groupIndex: number,
    optionIndex: number,
    patch: Partial<ComboGroupInput['options'][number]>,
  ) => {
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group, currentGroupIndex) =>
        currentGroupIndex === groupIndex
          ? {
              ...group,
              options: group.options.map((option, currentOptionIndex) =>
                currentOptionIndex === optionIndex ? { ...option, ...patch } : option,
              ),
            }
          : group,
      ),
    }));
  };


  const addSelectedProduct = () => {
    const productId = Number(selectedProductId);
    if (!productId) {
      setFeedback({ tone: 'error', message: 'Escolha um produto da lista para adicionar ao combo.' });
      return;
    }
    if (selectedProductIds.has(String(productId))) {
      setFeedback({ tone: 'error', message: 'Este produto já faz parte do combo.' });
      return;
    }
    setDraft((current) =>
      normalizeSimpleComboDraft({
        ...current,
        groups: [
          {
            ...(current.groups[0] || emptyGroup()),
            options: [
              ...(current.groups.flatMap((group) => group.options) || []),
              {
                componentProductId: productId,
                additionalPrice: 0,
                minQuantity: 1,
                maxQuantity: 1,
                defaultQuantity: 1,
                locked: true,
                active: true,
              },
            ],
          },
        ],
      }),
    );
    setSelectedProductId('');
    setFeedback(null);
  };

  const removeSelectedProduct = (productId: string | number) => {
    setDraft((current) =>
      normalizeSimpleComboDraft({
        ...current,
        groups: [
          {
            ...(current.groups[0] || emptyGroup()),
            options: current.groups
              .flatMap((group) => group.options)
              .filter((option) => String(option.componentProductId) !== String(productId)),
          },
        ],
      }),
    );
  };

  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    setBusy('photo');
    setFeedback(null);
    try {
      const image = await createPersistentImageDataUrl(file, 1024, {
        targetWidth: 1024,
        targetHeight: 1024,
      });
      setDraft((current) => ({ ...current, image }));
      setFeedback({ tone: 'success', message: 'Foto carregada. Você pode melhorar a apresentação com IA antes de salvar.' });
    } catch (error) {
      setFeedback({ tone: 'error', message: errorMessage(error, 'Não foi possível carregar a foto.') });
    } finally {
      setBusy('');
    }
  };

  const enhancePhoto = async () => {
    if (!draft.image) return;
    setBusy('enhance');
    setFeedback(null);
    try {
      const improved = await imageEnhancementService.enhanceComboImage(draft.image);
      if (!improved) throw new Error('A IA não retornou uma imagem.');
      setDraft((current) => ({ ...current, image: improved }));
      setFeedback({ tone: 'success', message: 'Foto melhorada com IA. Revise a prévia e salve quando estiver satisfeito.' });
    } catch (error) {
      setFeedback({ tone: 'error', message: errorMessage(error, 'Não foi possível melhorar a foto.') });
    } finally {
      setBusy('');
    }
  };

  const generatePhoto = async () => {
    if (!canGenerateImage) {
      setFeedback({
        tone: 'error',
        message: 'Para criar a foto com IA, informe o nome do combo e adicione pelo menos um produto.',
      });
      return;
    }
    setBusy('generate');
    setFeedback(null);
    try {
      const generated = await productComboService.generatePreviewImage(draft);
      setDraft((current) => ({ ...current, image: generated }));
      setFeedback({ tone: 'success', message: 'A IA criou uma foto a partir do nome, descrição, preço e itens do combo.' });
    } catch (error) {
      setFeedback({ tone: 'error', message: errorMessage(error, 'Preencha o combo antes de gerar a foto com IA.') });
    } finally {
      setBusy('');
    }
  };

  const save = async () => {
    setBusy('save');
    setFeedback(null);
    try {
      if (!draft.name.trim()) throw new Error('Informe o nome do combo.');
      if (!(draft.price > 0)) throw new Error('Informe um preço maior que zero.');
      if (!selectedProducts.length) {
        throw new Error('Escolha pelo menos um produto para o combo.');
      }
      const payload = normalizeSimpleComboDraft(draft);
      if (editingId) await productComboService.update(editingId, payload);
      else await productComboService.create(payload);
      await Promise.all([load(), onChanged()]);
      setEditingId(undefined);
    } catch (error) {
      setFeedback({ tone: 'error', message: errorMessage(error, 'Não foi possível salvar o combo.') });
    } finally {
      setBusy('');
    }
  };

  const remove = async (combo: ComboRecord) => {
    if (!window.confirm(`Remover “${combo.name}”? Se já houver pedidos, ele será apenas desativado.`)) return;
    setBusy(`delete-${combo.id}`);
    try {
      await productComboService.remove(combo.id);
      await Promise.all([load(), onChanged()]);
    } catch (error) {
      setFeedback({ tone: 'error', message: errorMessage(error, 'Não foi possível remover o combo.') });
    } finally {
      setBusy('');
    }
  };

  if (loading) return <p role="status">Carregando combos...</p>;

  return (
    <C.Workspace>
      <C.Hero>
        <div>
          <h2>Combos</h2>
          <p>
            Crie combos usando os produtos que já estão cadastrados. Escolha os itens, informe o preço e escreva uma descrição simples para o cliente.
          </p>
        </div>
        <button type="button" onClick={openNew}><Plus size={18} /> Novo combo</button>
      </C.Hero>

      {combos.length ? (
        <C.Grid>
          {combos.map((combo) => (
            <C.Card key={combo.id}>
              <div className="image">
                {combo.image ? <img src={combo.image} alt="" /> : <span className="placeholder"><ImageIcon /></span>}
                <span className="status">{combo.active ? 'Disponível' : 'Desativado'}</span>
              </div>
              <div className="body">
                <div>
                  <h3>{combo.name}</h3>
                  <p>{combo.description || 'Sem descrição.'}</p>
                </div>
                <div className="meta">
                  <span className="price">{money(Number(combo.price))}</span>
                  <span className="groups">{combo.comboGroups.length} etapa(s)</span>
                </div>
                <div className="actions">
                  <button className="primary" type="button" onClick={() => openEdit(combo)}>Editar combo</button>
                  <button className="danger" type="button" aria-label={`Remover ${combo.name}`} onClick={() => void remove(combo)}><Trash2 size={16} /></button>
                </div>
              </div>
            </C.Card>
          ))}
        </C.Grid>
      ) : (
        <C.Empty>
          <Sparkles />
          <h3>Crie seu primeiro combo</h3>
          <p>Junte produtos do cardápio, defina o que é fixo e o que o cliente pode escolher, e deixe a IA ajudar na foto.</p>
        </C.Empty>
      )}

      {editingId !== undefined && (
        <C.Overlay role="presentation">
          <C.Editor role="dialog" aria-modal="true" aria-label={editingId ? 'Editar combo' : 'Novo combo'}>
            <div className="head">
              <div>
                <h2>{editingId ? 'Editar combo' : 'Criar novo combo'}</h2>
                <p>É simples: escolha os produtos, dê um nome, defina o preço e salve.</p>
              </div>
              <button className="close" type="button" aria-label="Fechar" onClick={close}><X /></button>
            </div>

            <div className="content">
              <div className="combo-guide" role="note">
                <Info size={18} />
                <div>
                  <strong>Como funciona</strong>
                  <p>
                    O combo usa produtos que já existem no seu cardápio. Você não precisa configurar
                    regras complicadas: selecione os produtos abaixo e escreva como deseja apresentar
                    a oferta para o cliente.
                  </p>
                </div>
              </div>

              {feedback && <div className={`feedback ${feedback.tone}`} role="status">{feedback.message}</div>}

              <section className="section">
                <header><div><span className="step">PASSO 1</span><h3>Nome, preço e descrição</h3><p>Essas informações aparecem para o cliente no cardápio.</p></div></header>
                <div className="grid2">
                  <label>Nome do combo
                    <small>Ex.: Combo Casal, Combo Família ou Combo Executivo.</small>
                    <input value={draft.name} maxLength={100} onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))} placeholder="Ex.: Combo Casal" />
                  </label>
                  <label>Preço final do combo
                    <small>Digite o valor que o cliente pagará pelo combo completo.</small>
                    <input type="number" min="0.01" step="0.01" value={draft.price || ''} onChange={(e) => setDraft((current) => ({ ...current, price: Number(e.target.value) }))} placeholder="59,90" />
                  </label>
                </div>
                <label>Descrição do combo
                  <small>Explique de forma simples quais produtos fazem parte da oferta.</small>
                  <textarea value={draft.description} maxLength={600} onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))} placeholder="Ex.: 2 burgers, batata grande e 2 bebidas para compartilhar." />
                </label>
                <div className="grid2">
                  <label><span><input type="checkbox" checked={draft.active} onChange={(e) => setDraft((current) => ({ ...current, active: e.target.checked }))} /> Disponível no cardápio</span></label>
                  <label><span><input type="checkbox" checked={draft.featured} onChange={(e) => setDraft((current) => ({ ...current, featured: e.target.checked }))} /> Destacar na Home</span></label>
                </div>
              </section>

              <section className="section">
                <header><div><span className="step">PASSO 3</span><h3>Foto do combo</h3><p>Opcional. Envie uma foto própria ou deixe a IA criar a imagem usando o nome, a descrição e os produtos escolhidos.</p></div></header>
                <div className="photo">
                  <div className="photo-preview">
                    {draft.image ? <img src={draft.image} alt="Prévia do combo" /> : <ImageIcon size={38} />}
                  </div>
                  <div className="photo-actions">
                    <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void uploadPhoto(e.target.files?.[0])} />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}><Upload size={17} /> {draft.image ? 'Trocar foto manual' : 'Enviar foto manual'}</button>
                    {draft.image ? (
                      <button className="ai" type="button" onClick={() => void enhancePhoto()} disabled={Boolean(busy)}><WandSparkles size={17} /> {busy === 'enhance' ? 'Melhorando...' : 'Melhorar foto com IA'}</button>
                    ) : (
                      <button className="ai" type="button" onClick={() => void generatePhoto()} disabled={Boolean(busy)}><Sparkles size={17} /> {busy === 'generate' ? 'Criando foto...' : 'Criar foto com IA'}</button>
                    )}
                    <div className="hint">A IA usa nome, descrição, preço e os produtos escolhidos como contexto. O preço não é escrito dentro da foto.</div>
                  </div>
                </div>
              </section>

              <section className="section products-section">
                <header>
                  <div>
                    <span className="step">PASSO 2</span>
                    <h3>Escolha os produtos do combo</h3>
                    <p>
                      Selecione apenas produtos que já estão no seu cardápio. Cada produto escolhido
                      será incluído uma vez no combo.
                    </p>
                  </div>
                </header>

                <div className="product-picker">
                  <label>
                    Produto cadastrado
                    <small>Abra a lista e escolha o produto que deseja incluir.</small>
                    <select
                      value={selectedProductId}
                      onChange={(event) => setSelectedProductId(event.target.value)}
                    >
                      <option value="">Selecione um produto...</option>
                      {availableProducts
                        .filter((product) => !selectedProductIds.has(String(product.id)))
                        .map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} — {money(Number(product.price))}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    className="add-selected-product"
                    type="button"
                    onClick={addSelectedProduct}
                    disabled={!selectedProductId}
                  >
                    <Plus size={17} /> Adicionar ao combo
                  </button>
                </div>

                {selectedProducts.length ? (
                  <div className="selected-products" aria-label="Produtos selecionados">
                    <div className="selected-products-head">
                      <CheckCircle2 size={18} />
                      <strong>
                        {selectedProducts.length} produto{selectedProducts.length === 1 ? '' : 's'} no combo
                      </strong>
                    </div>
                    {selectedProducts.map((product) => (
                      <div className="selected-product" key={product.id}>
                        <div className="selected-product-image">
                          {product.image ? (
                            <img src={product.image} alt="" />
                          ) : (
                            <ImageIcon size={20} />
                          )}
                        </div>
                        <div className="selected-product-copy">
                          <b>{product.name}</b>
                          <small>{product.description || 'Produto do cardápio'}</small>
                        </div>
                        <span>{money(Number(product.price))}</span>
                        <button
                          type="button"
                          aria-label={`Remover ${product.name} do combo`}
                          onClick={() => removeSelectedProduct(product.id)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-products">
                    <Info size={18} />
                    <span>
                      Nenhum produto selecionado ainda. Escolha o primeiro produto na lista acima.
                    </span>
                  </div>
                )}
              </section>
              </section>
            </div>

            <div className="footer">
              <button className="secondary" type="button" onClick={close} disabled={Boolean(busy)}>Cancelar</button>
              <button className="save" type="button" onClick={() => void save()} disabled={Boolean(busy)}>{busy === 'save' ? 'Salvando...' : 'Salvar combo'}</button>
            </div>
          </C.Editor>
        </C.Overlay>
      )}
    </C.Workspace>
  );
}
