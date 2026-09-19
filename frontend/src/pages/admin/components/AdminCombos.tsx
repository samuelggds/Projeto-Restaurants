import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Image as ImageIcon,
  Info,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react';
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
  const response = (error as { response?: { data?: { error?: string; message?: string } } })
    ?.response;
  return String(
    response?.data?.error ||
      response?.data?.message ||
      (error instanceof Error ? error.message : fallback),
  );
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

function isFixedGroup(group: ComboGroupInput) {
  return (
    group.active &&
    group.options.every(
      (option) =>
        option.active &&
        option.locked &&
        option.additionalPrice === 0 &&
        option.minQuantity === option.defaultQuantity &&
        option.maxQuantity === option.defaultQuantity,
    ) &&
    (group.options.length === 0 ||
      (group.minSelections === group.options.length &&
        group.maxSelections === group.options.length))
  );
}

export function AdminCombos({ products, money, onChanged }: Props) {
  const [combos, setCombos] = useState<ComboRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null | undefined>();
  const [draft, setDraft] = useState<ComboInput>(emptyCombo());
  const [busy, setBusy] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; message: string } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [brand, setBrand] = useState('#d64d08');
  const isEditing = editingId !== undefined;

  const availableProducts = useMemo(
    () =>
      products.filter(
        (product) => product.id && product.active !== false && product.kind !== 'COMBO',
      ),
    [products],
  );

  const selectedRows = draft.groups.flatMap((group, groupIndex) =>
    group.options.map((option, optionIndex) => {
      const product =
        products.find((item) => Number(item.id) === option.componentProductId) ||
        combos
          .find((combo) => combo.id === editingId)
          ?.comboGroups.flatMap((item) => item.options)
          .find((item) => item.componentProductId === option.componentProductId)?.componentProduct;
      return { group, groupIndex, option, optionIndex, product };
    }),
  );
  const selectedOptions = selectedRows.map((row) => row.option);
  const selectedProductIds = new Set(
    selectedOptions.map((option) => String(option.componentProductId)),
  );
  const canGenerateImage = draft.name.trim().length >= 2 && selectedRows.some((row) => row.product);
  const selectableProducts = availableProducts.filter(
    (product) => !selectedProductIds.has(String(product.id)),
  );

  const load = async () => {
    setCombos(await productComboService.list());
  };

  useEffect(() => {
    if (!isEditing) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const background = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        !element.hasAttribute('data-combo-overlay') &&
        !element.hasAttribute('inert'),
    );
    document.body.style.overflow = 'hidden';
    background.forEach((element) => element.setAttribute('inert', ''));
    nameRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((element) => element.removeAttribute('inert'));
      if (opener?.isConnected) opener.focus();
    };
  }, [isEditing]);

  useEffect(() => {
    if (feedback?.tone === 'error' && isEditing) feedbackRef.current?.focus();
  }, [feedback, isEditing]);

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
    if (busy) return;
    setBrand(
      getComputedStyle(workspaceRef.current!).getPropertyValue('--brand').trim() || '#d64d08',
    );
    setDraft(emptyCombo());
    setSelectedProductId('');
    setEditingId(null);
    setFeedback(null);
  };

  const openEdit = (combo: ComboRecord) => {
    if (busy) return;
    setBrand(
      getComputedStyle(workspaceRef.current!).getPropertyValue('--brand').trim() || '#d64d08',
    );
    setDraft(toInput(combo));
    setSelectedProductId('');
    setEditingId(combo.id);
    setFeedback(null);
  };

  const close = () => {
    if (busy) return;
    setEditingId(undefined);
    setFeedback(null);
  };

  const addSelectedProduct = () => {
    if (busy) return;
    const productId = Number(selectedProductId);
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      setFeedback({
        tone: 'error',
        message: 'Escolha um produto da lista para adicionar ao combo.',
      });
      return;
    }

    if (selectedProductIds.has(String(productId))) {
      setFeedback({ tone: 'error', message: 'Este produto já faz parte do combo.' });
      return;
    }
    if (!availableProducts.some((product) => Number(product.id) === productId)) return;
    const fixedGroupIndex = draft.groups.findIndex(isFixedGroup);
    if (
      (fixedGroupIndex >= 0 && draft.groups[fixedGroupIndex].options.length >= 20) ||
      (fixedGroupIndex < 0 && draft.groups.length >= 12)
    ) {
      setFeedback({
        tone: 'error',
        message: 'O grupo de produtos incluídos aceita até 20 produtos diferentes.',
      });
      return;
    }
    setDraft((current) => {
      const groups = [...current.groups];
      const groupIndex = groups.findIndex(isFixedGroup);
      const group =
        groupIndex >= 0
          ? groups[groupIndex]
          : { ...emptyGroup(), name: `Produtos incluídos ${groups.length + 1}` };
      const options = [
        ...group.options,
        {
          componentProductId: productId,
          additionalPrice: 0,
          minQuantity: 1,
          maxQuantity: 1,
          defaultQuantity: 1,
          locked: true,
          active: true,
        },
      ];
      const updated = {
        ...group,
        options,
        minSelections: options.length,
        maxSelections: options.length,
      };
      if (groupIndex >= 0) groups[groupIndex] = updated;
      else groups.push(updated);
      return { ...current, groups };
    });
    setSelectedProductId('');
    setFeedback(null);
  };

  const removeSelectedProduct = (groupIndex: number, optionIndex: number) => {
    if (busy) return;
    setDraft((current) => {
      const groups = current.groups
        .map((group, index) => {
          if (index !== groupIndex) return group;
          const options = group.options.filter((_, index) => index !== optionIndex);
          return {
            ...group,
            options,
            minSelections: isFixedGroup(group)
              ? options.length
              : Math.min(group.minSelections, options.length),
            maxSelections: isFixedGroup(group)
              ? Math.max(1, options.length)
              : Math.max(1, Math.min(group.maxSelections, options.length)),
          };
        })
        .filter((group) => group.options.length);
      return { ...current, groups: groups.length ? groups : [emptyGroup()] };
    });
    setFeedback(null);
  };

  const updateQuantity = (groupIndex: number, optionIndex: number, quantity: number) => {
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              options: group.options.map((option, index) =>
                index === optionIndex
                  ? {
                      ...option,
                      minQuantity: quantity,
                      maxQuantity: quantity,
                      defaultQuantity: quantity,
                    }
                  : option,
              ),
            }
          : group,
      ),
    }));
  };

  const uploadPhoto = async (file?: File) => {
    if (!file || busy) return;
    setBusy('photo');
    setFeedback(null);
    try {
      const image = await createPersistentImageDataUrl(file, 1024, {
        targetWidth: 1024,
        targetHeight: 1024,
      });
      setDraft((current) => ({ ...current, image }));
      setFeedback({
        tone: 'success',
        message: 'Foto carregada. Você pode melhorar a apresentação com IA antes de salvar.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: errorMessage(error, 'Não foi possível carregar a foto.'),
      });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
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
      setFeedback({
        tone: 'success',
        message: 'Foto melhorada com IA. Revise a prévia e salve quando estiver satisfeito.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: errorMessage(error, 'Não foi possível melhorar a foto.'),
      });
    } finally {
      setBusy('');
    }
  };

  const generatePhoto = async () => {
    if (!canGenerateImage) {
      setFeedback({
        tone: 'error',
        message:
          'Para criar a foto com IA, informe o nome do combo e adicione pelo menos um produto.',
      });
      return;
    }
    setBusy('generate');
    setFeedback(null);
    try {
      const generated = await productComboService.generatePreviewImage(draft);
      if (!generated) throw new Error('A IA não retornou uma imagem.');
      setDraft((current) => ({ ...current, image: generated }));
      setFeedback({
        tone: 'success',
        message: 'A IA criou uma foto a partir do nome, descrição, preço e itens do combo.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: errorMessage(error, 'Preencha o combo antes de gerar a foto com IA.'),
      });
    } finally {
      setBusy('');
    }
  };

  const save = async () => {
    if (busy || editingId === undefined) return;
    setBusy('save');
    setFeedback(null);
    try {
      if (draft.name.trim().length < 2)
        throw new Error('Informe um nome com pelo menos 2 caracteres.');
      if (!Number.isFinite(draft.price) || !(draft.price > 0) || draft.price > 1_000_000) {
        throw new Error('Informe um preço maior que zero e de até R$ 1.000.000,00.');
      }
      if (!selectedOptions.length) {
        throw new Error('Escolha pelo menos um produto para o combo.');
      }
      if (draft.groups.some((group) => group.minSelections > 20 || group.maxSelections > 20)) {
        throw new Error('Cada grupo aceita a seleção de até 20 produtos diferentes.');
      }
      if (
        selectedOptions.some(
          (option) =>
            !Number.isInteger(option.defaultQuantity) ||
            option.defaultQuantity < (option.locked ? 1 : 0) ||
            option.defaultQuantity > 20 ||
            option.defaultQuantity < option.minQuantity ||
            option.defaultQuantity > option.maxQuantity,
        )
      ) {
        throw new Error(
          'Revise as quantidades dos produtos. Itens fixos devem ter de 1 a 20 unidades.',
        );
      }
      const payload = { ...draft, name: draft.name.trim(), description: draft.description.trim() };
      const saved = editingId
        ? await productComboService.update(editingId, payload)
        : await productComboService.create(payload);
      if (saved)
        setCombos((current) => [...current.filter((combo) => combo.id !== saved.id), saved]);
      setEditingId(undefined);
      setFeedback({ tone: 'success', message: 'Combo salvo com sucesso.' });
      const refresh = await Promise.allSettled([load(), Promise.resolve().then(onChanged)]);
      if (refresh.some((result) => result.status === 'rejected')) {
        setFeedback({
          tone: 'error',
          message:
            'O combo foi salvo, mas não foi possível atualizar o catálogo. Atualize a página para conferir.',
        });
      }
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: errorMessage(error, 'Não foi possível salvar o combo.'),
      });
    } finally {
      setBusy('');
    }
  };

  const remove = async (combo: ComboRecord) => {
    if (busy) return;
    if (
      !window.confirm(`Remover “${combo.name}”? Se já houver pedidos, ele será apenas desativado.`)
    )
      return;
    setBusy(`delete-${combo.id}`);
    setFeedback(null);
    try {
      await productComboService.remove(combo.id);
      setCombos((current) => current.filter((item) => item.id !== combo.id));
      const refresh = await Promise.allSettled([load(), Promise.resolve().then(onChanged)]);
      setFeedback(
        refresh.some((result) => result.status === 'rejected')
          ? {
              tone: 'error',
              message:
                'Combo removido, mas o catálogo não foi atualizado. Atualize a página para conferir.',
            }
          : { tone: 'success', message: 'Combo removido com sucesso.' },
      );
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: errorMessage(error, 'Não foi possível remover o combo.'),
      });
    } finally {
      setBusy('');
    }
  };

  if (loading) return <p role="status">Carregando combos...</p>;

  return (
    <C.Workspace ref={workspaceRef}>
      <C.Hero>
        <div>
          <h2>Combos</h2>
          <p>
            Crie combos usando os produtos que já estão cadastrados. Escolha os itens, informe o
            preço e escreva uma descrição simples para o cliente.
          </p>
        </div>
        <button type="button" onClick={openNew} disabled={Boolean(busy)}>
          <Plus size={18} /> Novo combo
        </button>
      </C.Hero>

      {!isEditing && feedback && (
        <C.Feedback $tone={feedback.tone} role={feedback.tone === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </C.Feedback>
      )}

      {combos.length ? (
        <C.Grid>
          {combos.map((combo) => (
            <C.Card key={combo.id}>
              <div className="image">
                {combo.image ? (
                  <img src={combo.image} alt="" />
                ) : (
                  <span className="placeholder">
                    <ImageIcon />
                  </span>
                )}
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
                  <button
                    className="primary"
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => openEdit(combo)}
                  >
                    Editar combo
                  </button>
                  <button
                    className="danger"
                    type="button"
                    disabled={Boolean(busy)}
                    aria-label={`Remover ${combo.name}`}
                    onClick={() => void remove(combo)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </C.Card>
          ))}
        </C.Grid>
      ) : (
        <C.Empty>
          <Sparkles />
          <h3>Crie seu primeiro combo</h3>
          <p>Junte produtos do cardápio, informe as quantidades e defina o preço da oferta.</p>
        </C.Empty>
      )}

      {isEditing &&
        createPortal(
          <C.Overlay role="presentation" data-combo-overlay $brand={brand}>
            <C.Editor
              ref={editorRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="combo-editor-title"
              aria-describedby="combo-editor-description"
              tabIndex={-1}
              aria-busy={Boolean(busy)}
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                  close();
                  return;
                }
                if (event.key !== 'Tab') return;
                const focusable = Array.from(
                  editorRef.current?.querySelectorAll<HTMLElement>(
                    'button:not(:disabled), input:not(:disabled):not([hidden]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
                  ) || [],
                ).filter((element) => !element.closest('fieldset:disabled'));
                const first = focusable[0];
                const last = focusable.at(-1);
                if (!first) {
                  event.preventDefault();
                  editorRef.current?.focus();
                } else if (
                  event.shiftKey &&
                  (document.activeElement === first || document.activeElement === editorRef.current)
                ) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first.focus();
                }
              }}
            >
              <div className="head">
                <div>
                  <span className="head-kicker">CATÁLOGO · COMBOS</span>
                  <h2 id="combo-editor-title">{editingId ? 'Editar combo' : 'Criar novo combo'}</h2>
                  <p id="combo-editor-description">
                    Escolha os produtos, defina as quantidades e o preço da oferta.
                  </p>
                </div>
                <button
                  className="close"
                  type="button"
                  aria-label="Fechar"
                  disabled={Boolean(busy)}
                  onClick={close}
                >
                  <X />
                </button>
              </div>

              <fieldset className="content" disabled={Boolean(busy)}>
                <div className="combo-guide" role="note">
                  <Info size={18} />
                  <div>
                    <strong>Como criar um combo</strong>
                    <p>
                      Escolha produtos que já estão cadastrados no cardápio, dê um nome para a
                      oferta, escreva uma descrição simples e defina o preço final. A foto é
                      opcional.
                    </p>
                  </div>
                </div>

                {feedback && (
                  <div
                    ref={feedbackRef}
                    tabIndex={-1}
                    className={`feedback ${feedback.tone}`}
                    role={feedback.tone === 'error' ? 'alert' : 'status'}
                  >
                    {feedback.message}
                  </div>
                )}

                <section className="section">
                  <header>
                    <div>
                      <span className="step">PASSO 1</span>
                      <h3>Nome, preço e descrição</h3>
                      <p>Essas informações aparecem para o cliente no cardápio.</p>
                    </div>
                  </header>

                  <div className="grid2">
                    <label>
                      Nome do combo
                      <small>Ex.: Combo Casal, Combo Família ou Combo Executivo.</small>
                      <input
                        ref={nameRef}
                        aria-label="Nome do combo"
                        required
                        minLength={2}
                        value={draft.name}
                        maxLength={100}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Ex.: Combo Casal"
                      />
                    </label>

                    <label>
                      Preço final do combo
                      <small>Digite o valor que o cliente pagará pelo combo completo.</small>
                      <input
                        type="number"
                        min="0.01"
                        max="1000000"
                        step="0.01"
                        inputMode="decimal"
                        aria-label="Preço final do combo"
                        required
                        value={draft.price || ''}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            price: Number(event.target.value),
                          }))
                        }
                        placeholder="59,90"
                      />
                    </label>
                  </div>

                  <label>
                    Descrição do combo
                    <small>
                      Explique de forma simples o que vem na oferta. Ex.: “2 hambúrgueres, 1 batata
                      grande e 2 refrigerantes”.
                    </small>
                    <textarea
                      value={draft.description}
                      maxLength={600}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Ex.: 2 burgers, batata grande e 2 bebidas para compartilhar."
                    />
                  </label>

                  <div className="toggle-grid">
                    <label className="toggle-card">
                      <input
                        type="checkbox"
                        checked={draft.active}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, active: event.target.checked }))
                        }
                      />
                      <span>
                        <b>Disponível no cardápio</b>
                        <small>Desative quando não quiser vender este combo.</small>
                      </span>
                    </label>

                    <label className="toggle-card">
                      <input
                        type="checkbox"
                        checked={draft.featured}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, featured: event.target.checked }))
                        }
                      />
                      <span>
                        <b>Destacar na Home</b>
                        <small>Mostra o combo na área de destaques da loja.</small>
                      </span>
                    </label>
                  </div>
                </section>

                <section className="section products-section">
                  <header>
                    <div>
                      <span className="step">PASSO 2</span>
                      <h3>Escolha os produtos do combo</h3>
                      <p>
                        A lista abaixo mostra somente produtos já cadastrados e ativos neste
                        restaurante.
                      </p>
                    </div>
                  </header>

                  <div className="product-picker">
                    <label>
                      Produto cadastrado
                      <small>
                        Abra o seletor, escolha um produto e clique em “Adicionar ao combo”.
                      </small>
                      <select
                        value={selectedProductId}
                        onChange={(event) => setSelectedProductId(event.target.value)}
                      >
                        <option value="">Selecione um produto...</option>
                        {selectableProducts.map((product) => (
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

                  {!selectableProducts.length && (
                    <p className="hint">
                      {availableProducts.length
                        ? 'Todos os produtos ativos já foram adicionados.'
                        : 'Cadastre e ative um produto no cardápio para incluí-lo no combo.'}
                    </p>
                  )}
                  {draft.groups.some((group) => !isFixedGroup(group)) && (
                    <p className="hint">
                      Este combo possui etapas com regras próprias. As quantidades, escolhas e
                      acréscimos existentes são mantidos ao salvar.
                    </p>
                  )}

                  {selectedRows.length ? (
                    <div className="selected-products" aria-label="Produtos selecionados">
                      <div className="selected-products-head">
                        <CheckCircle2 size={18} />
                        <strong>
                          {selectedRows.length} produto
                          {selectedRows.length === 1 ? '' : 's'} selecionado
                          {selectedRows.length === 1 ? '' : 's'}
                        </strong>
                      </div>

                      {selectedRows.map(({ product, group, option, groupIndex, optionIndex }) => (
                        <div
                          className="selected-product"
                          key={`${groupIndex}-${option.componentProductId}`}
                        >
                          <div className="selected-product-image">
                            {product?.image ? (
                              <img
                                src={product.image}
                                alt=""
                                loading="lazy"
                                width={48}
                                height={48}
                              />
                            ) : (
                              <ImageIcon size={20} />
                            )}
                          </div>

                          <div className="selected-product-copy">
                            <b>{product?.name || 'Produto indisponível'}</b>
                            <small>
                              {product
                                ? `Preço avulso: ${money(Number(product.price))}`
                                : 'Remova este vínculo antes de salvar.'}
                            </small>
                            {(!product ||
                              product.active === false ||
                              !option.active ||
                              !group.active) && (
                              <span className="product-warning">
                                {!product ? 'Produto não encontrado' : 'Item inativo'}
                              </span>
                            )}
                            {!isFixedGroup(group) && (
                              <small>
                                {group.name} · {option.locked ? 'Item fixo' : 'Escolha do cliente'}{' '}
                                · {option.minQuantity}–{option.maxQuantity} un.
                                {option.additionalPrice > 0
                                  ? ` · Acréscimo ${money(option.additionalPrice)}`
                                  : ''}
                              </small>
                            )}
                          </div>

                          {isFixedGroup(group) ? (
                            <label className="quantity-field">
                              <span>Quantidade</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={20}
                                step={1}
                                aria-label={`Quantidade de ${product?.name || 'produto indisponível'}`}
                                value={option.defaultQuantity || ''}
                                onChange={(event) =>
                                  updateQuantity(
                                    groupIndex,
                                    optionIndex,
                                    Number(event.target.value),
                                  )
                                }
                              />
                            </label>
                          ) : (
                            <span className="selected-product-price">
                              Padrão: {option.defaultQuantity} un.
                            </span>
                          )}

                          <button
                            type="button"
                            aria-label={`Remover ${product?.name || 'produto indisponível'} do combo`}
                            onClick={() => removeSelectedProduct(groupIndex, optionIndex)}
                          >
                            <Trash2 size={17} />
                            <span>Remover</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-products">
                      <Info size={18} />
                      <span>
                        Nenhum produto selecionado. Escolha pelo menos um produto para poder salvar
                        o combo e gerar a foto com IA.
                      </span>
                    </div>
                  )}
                </section>

                <section className="section">
                  <header>
                    <div>
                      <span className="step">PASSO 3</span>
                      <h3>Foto do combo</h3>
                      <p>
                        Opcional. Você pode enviar uma foto própria ou deixar a IA criar a imagem
                        usando o nome, a descrição e os produtos escolhidos.
                      </p>
                    </div>
                  </header>

                  <div className="photo">
                    <div className="photo-preview">
                      {draft.image ? (
                        <img src={draft.image} alt="Prévia do combo" />
                      ) : (
                        <div className="photo-empty">
                          <ImageIcon size={38} />
                          <span>Sem foto</span>
                        </div>
                      )}
                    </div>

                    <div className="photo-actions">
                      <input
                        ref={fileRef}
                        hidden
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => void uploadPhoto(event.target.files?.[0])}
                      />

                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={Boolean(busy)}
                      >
                        <Upload size={17} />
                        {draft.image ? 'Trocar foto manual' : 'Enviar foto manual'}
                      </button>

                      {draft.image && (
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => setDraft((current) => ({ ...current, image: '' }))}
                        >
                          <Trash2 size={17} /> Remover foto
                        </button>
                      )}

                      {draft.image ? (
                        <button
                          className="ai"
                          type="button"
                          onClick={() => void enhancePhoto()}
                          disabled={Boolean(busy)}
                        >
                          <WandSparkles size={17} />
                          {busy === 'enhance' ? 'Melhorando...' : 'Melhorar foto com IA'}
                        </button>
                      ) : (
                        <button
                          className="ai"
                          type="button"
                          onClick={() => void generatePhoto()}
                          disabled={Boolean(busy) || !canGenerateImage}
                        >
                          <Sparkles size={17} />
                          {busy === 'generate' ? 'Criando foto...' : 'Criar foto com IA'}
                        </button>
                      )}

                      <div className="hint">
                        <b>Como a IA funciona:</b> ela usa o nome do combo, a descrição e os
                        produtos selecionados para montar a imagem. O preço continua no cardápio e
                        não é escrito dentro da foto.
                      </div>
                    </div>
                  </div>
                </section>
              </fieldset>

              <div className="footer">
                <div className="footer-summary">
                  <span>Preço final do combo</span>
                  <strong>{money(Number.isFinite(draft.price) ? draft.price : 0)}</strong>
                </div>
                <button
                  className="secondary"
                  type="button"
                  onClick={close}
                  disabled={Boolean(busy)}
                >
                  Cancelar
                </button>
                <button className="save" type="submit" disabled={Boolean(busy)}>
                  {busy === 'save' ? 'Salvando...' : 'Salvar combo'}
                </button>
              </div>
            </C.Editor>
          </C.Overlay>,
          document.body,
        )}
    </C.Workspace>
  );
}
