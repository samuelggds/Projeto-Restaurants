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

const emptyGroup = (index = 1): ComboGroupInput => ({
  name: `Etapa ${index}`,
  description: '',
  minSelections: 1,
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
  groups: [emptyGroup(1)],
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

export function AdminCombos({ products, money, onChanged }: Props) {
  const [combos, setCombos] = useState<ComboRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null | undefined>();
  const [draft, setDraft] = useState<ComboInput>(emptyCombo());
  const [busy, setBusy] = useState('');
  const [selectedProductByGroup, setSelectedProductByGroup] = useState<Record<string, string>>({});
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
  const canGenerateImage = draft.name.trim().length >= 2 && selectedRows.some((row) => row.product);

  const selectableProductsForGroup = (groupIndex: number) => {
    const selectedIds = new Set(
      (draft.groups[groupIndex]?.options || []).map((option) => String(option.componentProductId)),
    );
    return availableProducts.filter((product) => !selectedIds.has(String(product.id)));
  };

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
    setSelectedProductByGroup({});
    setEditingId(null);
    setFeedback(null);
  };

  const openEdit = (combo: ComboRecord) => {
    if (busy) return;
    setBrand(
      getComputedStyle(workspaceRef.current!).getPropertyValue('--brand').trim() || '#d64d08',
    );
    setDraft(toInput(combo));
    setSelectedProductByGroup({});
    setEditingId(combo.id);
    setFeedback(null);
  };

  const close = () => {
    if (busy) return;
    setEditingId(undefined);
    setFeedback(null);
  };

  const updateGroup = (groupIndex: number, updates: Partial<ComboGroupInput>) => {
    if (busy) return;
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group, index) =>
        index === groupIndex ? { ...group, ...updates } : group,
      ),
    }));
    setFeedback(null);
  };

  const updateGroupRequiredSelections = (groupIndex: number, rawValue: number) => {
    const quantity = Math.max(1, Math.min(20, Math.trunc(rawValue || 1)));
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group, index) => {
        if (index !== groupIndex) return group;
        const autoSelectOnlyOption = quantity === 1 && group.options.length === 1;
        return {
          ...group,
          minSelections: quantity,
          maxSelections: quantity,
          options: group.options.map((option) => ({
            ...option,
            minQuantity: autoSelectOnlyOption ? 1 : 0,
            maxQuantity: 1,
            defaultQuantity: autoSelectOnlyOption ? 1 : 0,
            locked: autoSelectOnlyOption,
          })),
        };
      }),
    }));
    setFeedback(null);
  };

  const addChoiceGroup = () => {
    if (busy) return;
    if (draft.groups.length >= 12) {
      setFeedback({
        tone: 'error',
        message: 'Cada combo pode ter no máximo 12 etapas de escolha.',
      });
      return;
    }
    setDraft((current) => ({
      ...current,
      groups: [...current.groups, emptyGroup(current.groups.length + 1)],
    }));
    setFeedback(null);
  };

  const removeChoiceGroup = (groupIndex: number) => {
    if (busy) return;
    if (draft.groups.length <= 1) {
      setFeedback({
        tone: 'error',
        message: 'O combo precisa ter pelo menos uma etapa de escolha.',
      });
      return;
    }
    setDraft((current) => ({
      ...current,
      groups: current.groups.filter((_, index) => index !== groupIndex),
    }));
    setSelectedProductByGroup({});
    setFeedback(null);
  };

  const addSelectedProduct = (groupIndex: number) => {
    if (busy) return;
    const selectedValue = selectedProductByGroup[String(groupIndex)] || '';
    const productId = Number(selectedValue);
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      setFeedback({
        tone: 'error',
        message: 'Escolha um produto da lista para adicionar à etapa.',
      });
      return;
    }

    const group = draft.groups[groupIndex];
    if (!group) return;
    if (group.options.some((option) => option.componentProductId === productId)) {
      setFeedback({ tone: 'error', message: 'Este produto já está disponível nesta etapa.' });
      return;
    }
    if (!availableProducts.some((product) => Number(product.id) === productId)) return;
    if (group.options.length >= 20) {
      setFeedback({
        tone: 'error',
        message: 'Cada etapa aceita até 20 produtos diferentes para escolha.',
      });
      return;
    }

    setDraft((current) => ({
      ...current,
      groups: current.groups.map((currentGroup, index) => {
        if (index !== groupIndex) return currentGroup;
        const rawOptions = [
          ...currentGroup.options,
          {
            componentProductId: productId,
            additionalPrice: 0,
            minQuantity: 0,
            maxQuantity: 1,
            defaultQuantity: 0,
            locked: false,
            active: true,
          },
        ];
        const autoSelectOnlyOption =
          currentGroup.minSelections === 1 &&
          currentGroup.maxSelections === 1 &&
          rawOptions.length === 1;
        return {
          ...currentGroup,
          options: rawOptions.map((option) => ({
            ...option,
            minQuantity: autoSelectOnlyOption ? 1 : 0,
            maxQuantity: 1,
            defaultQuantity: autoSelectOnlyOption ? 1 : 0,
            locked: autoSelectOnlyOption,
          })),
        };
      }),
    }));
    setSelectedProductByGroup((current) => ({ ...current, [String(groupIndex)]: '' }));
    setFeedback(null);
  };

  const removeSelectedProduct = (groupIndex: number, optionIndex: number) => {
    if (busy) return;
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group, index) => {
        if (index !== groupIndex) return group;
        const options = group.options.filter((_, index) => index !== optionIndex);
        const nextRequired = Math.max(
          1,
          Math.min(group.minSelections, Math.max(options.length, 1)),
        );
        const autoSelectOnlyOption = nextRequired === 1 && options.length === 1;
        return {
          ...group,
          options: options.map((option) => ({
            ...option,
            minQuantity: autoSelectOnlyOption ? 1 : 0,
            maxQuantity: 1,
            defaultQuantity: autoSelectOnlyOption ? 1 : 0,
            locked: autoSelectOnlyOption,
          })),
          minSelections: nextRequired,
          maxSelections: nextRequired,
        };
      }),
    }));
    setFeedback(null);
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
      if (draft.groups.some((group) => group.name.trim().length < 2)) {
        throw new Error('Dê um nome com pelo menos 2 caracteres para cada etapa do combo.');
      }
      if (new Set(draft.groups.map((group) => group.name.trim().toLocaleLowerCase('pt-BR'))).size !== draft.groups.length) {
        throw new Error('Cada etapa do combo precisa ter um nome diferente.');
      }
      if (draft.groups.some((group) => group.options.length === 0)) {
        throw new Error('Adicione pelo menos um produto em cada etapa do combo.');
      }
      if (
        draft.groups.some(
          (group) =>
            group.minSelections > 20 ||
            group.maxSelections > 20 ||
            group.minSelections < 1 ||
            group.maxSelections < 1,
        )
      ) {
        throw new Error('Cada etapa deve exigir entre 1 e 20 escolhas.');
      }
      if (draft.groups.some((group) => group.options.filter((option) => option.active).length < group.minSelections)) {
        throw new Error('Cada etapa precisa ter opções suficientes para a quantidade exigida.');
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
            Crie combos por etapas de escolha. Defina quantos itens o cliente deverá escolher em
            cada etapa e quais produtos do cardápio estarão disponíveis para a montagem.
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
          <p>Crie etapas de escolha, selecione os produtos disponíveis e defina o preço da oferta.</p>
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
                    Defina as etapas do combo, quantas escolhas cada etapa exige e quais produtos
                    podem ser escolhidos.
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
                      Primeiro defina nome, preço e descrição. Depois crie as etapas do combo, como
                      “Hambúrgueres”, “Batata” e “Bebida”. Em cada etapa, informe a quantidade
                      exigida e selecione os produtos que o cliente poderá escolher. A foto é
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
                  <header className="combo-builder-header">
                    <div>
                      <span className="step">PASSO 2</span>
                      <h3>Monte as etapas de escolha do combo</h3>
                      <p>
                        Separe o combo por tipo de item. Em cada etapa, informe quantos produtos o
                        cliente deverá escolher e quais produtos estarão disponíveis.
                      </p>
                    </div>
                    <button
                      className="add-group"
                      type="button"
                      onClick={addChoiceGroup}
                      disabled={draft.groups.length >= 12}
                    >
                      <Plus size={17} /> Adicionar etapa
                    </button>
                  </header>

                  <div className="combo-example" role="note">
                    <Info size={18} />
                    <div>
                      <strong>Exemplo: 2 hambúrgueres + 1 batata + 1 bebida</strong>
                      <p>
                        Crie uma etapa “Hambúrgueres” com quantidade 2, uma etapa “Batata” com
                        quantidade 1 e uma etapa “Bebida” com quantidade 1. Depois escolha quais
                        produtos do cardápio poderão ser selecionados em cada etapa.
                      </p>
                    </div>
                  </div>

                  <div className="choice-groups" aria-label="Etapas do combo">
                    {draft.groups.map((group, groupIndex) => {
                      const selectableProducts = selectableProductsForGroup(groupIndex);
                      const selectedValue = selectedProductByGroup[String(groupIndex)] || '';
                      const requiredSelections = Math.max(1, group.maxSelections);
                      return (
                        <article className="choice-group" key={`combo-group-${groupIndex}`}>
                          <div className="choice-group-head">
                            <div className="choice-group-number">{groupIndex + 1}</div>
                            <div>
                              <strong>Etapa {groupIndex + 1}</strong>
                              <span>
                                {group.options.length
                                  ? `${group.options.length} opção(ões) disponível(is)`
                                  : 'Nenhum produto adicionado'}
                              </span>
                            </div>
                            {draft.groups.length > 1 ? (
                              <button
                                className="icon-button"
                                type="button"
                                aria-label={`Remover etapa ${groupIndex + 1}`}
                                onClick={() => removeChoiceGroup(groupIndex)}
                              >
                                <Trash2 size={17} />
                              </button>
                            ) : null}
                          </div>

                          <div className="choice-group-settings">
                            <label>
                              Nome da etapa
                              <small>Ex.: Hambúrgueres, Batata ou Bebida.</small>
                              <input
                                aria-label={`Nome da etapa ${groupIndex + 1}`}
                                value={group.name}
                                maxLength={80}
                                onChange={(event) =>
                                  updateGroup(groupIndex, { name: event.target.value })
                                }
                                placeholder="Ex.: Hambúrgueres"
                              />
                            </label>

                            <label>
                              Quantidade que o cliente escolhe
                              <small>Quantos itens desta etapa fazem parte do combo.</small>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                step={1}
                                inputMode="numeric"
                                aria-label={`Quantidade da etapa ${groupIndex + 1}`}
                                value={requiredSelections}
                                onChange={(event) =>
                                  updateGroupRequiredSelections(
                                    groupIndex,
                                    Number(event.target.value),
                                  )
                                }
                              />
                            </label>
                          </div>

                          <label>
                            Explicação para a etapa
                            <small>Opcional. Ajuda a deixar a montagem mais clara para o cliente.</small>
                            <input
                              aria-label={`Descrição da etapa ${groupIndex + 1}`}
                              value={group.description || ''}
                              maxLength={240}
                              onChange={(event) =>
                                updateGroup(groupIndex, { description: event.target.value })
                              }
                              placeholder="Ex.: Escolha 2 hambúrgueres para o combo."
                            />
                          </label>

                          <div className="group-product-picker">
                            <label>
                              Produtos que entram nesta escolha
                              <small>Somente produtos ativos do cardápio aparecem aqui.</small>
                              <select
                                aria-label={`Adicionar produto na etapa ${groupIndex + 1}`}
                                value={selectedValue}
                                onChange={(event) =>
                                  setSelectedProductByGroup((current) => ({
                                    ...current,
                                    [String(groupIndex)]: event.target.value,
                                  }))
                                }
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
                              aria-label={`Adicionar produto à etapa ${groupIndex + 1}`}
                              onClick={() => addSelectedProduct(groupIndex)}
                              disabled={!selectedValue}
                            >
                              <Plus size={17} /> Adicionar produto
                            </button>
                          </div>

                          {group.options.length ? (
                            <div className="group-products">
                              {group.options.map((option, optionIndex) => {
                                const product =
                                  products.find(
                                    (item) => Number(item.id) === option.componentProductId,
                                  ) ||
                                  combos
                                    .find((combo) => combo.id === editingId)
                                    ?.comboGroups.flatMap((item) => item.options)
                                    .find(
                                      (item) =>
                                        item.componentProductId === option.componentProductId,
                                    )?.componentProduct;
                                return (
                                  <div
                                    className="group-product"
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
                                          : 'Produto não encontrado no catálogo atual.'}
                                      </small>
                                      {(!product || product.active === false || !option.active) && (
                                        <span className="product-warning">Item inativo</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      aria-label={`Remover ${product?.name || 'produto indisponível'} da etapa ${groupIndex + 1}`}
                                      onClick={() =>
                                        removeSelectedProduct(groupIndex, optionIndex)
                                      }
                                    >
                                      <Trash2 size={17} />
                                      <span>Remover</span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="empty-products">
                              <Info size={18} />
                              <span>
                                Adicione os produtos que o cliente poderá escolher nesta etapa.
                              </span>
                            </div>
                          )}

                          <div className="choice-group-summary">
                            <CheckCircle2 size={17} />
                            <span>
                              Cliente deverá escolher <b>{requiredSelections}</b>{' '}
                              {requiredSelections === 1 ? 'item' : 'itens'} entre{' '}
                              <b>{group.options.length}</b>{' '}
                              {group.options.length === 1 ? 'opção' : 'opções'}.
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
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
