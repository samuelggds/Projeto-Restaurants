import { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Plus, Sparkles, Trash2, Upload, WandSparkles, X } from 'lucide-react';
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
  name: 'Itens do combo',
  description: 'Escolha os itens que fazem parte deste combo.',
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

export function AdminCombos({ products, money, onChanged }: Props) {
  const [combos, setCombos] = useState<ComboRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null | undefined>();
  const [draft, setDraft] = useState<ComboInput>(emptyCombo());
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const availableProducts = useMemo(
    () =>
      products.filter(
        (product) => product.id && product.active !== false && product.kind !== 'COMBO',
      ),
    [products],
  );

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
      if (!draft.groups.length || draft.groups.some((group) => !group.options.length)) {
        throw new Error('Todo combo precisa ter pelo menos um grupo com produtos.');
      }
      if (editingId) await productComboService.update(editingId, draft);
      else await productComboService.create(draft);
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
            Monte ofertas fáceis de entender, com itens fixos ou escolhas do cliente. O preço e o estoque são validados pelo servidor antes de cada pedido.
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
                <h2>{editingId ? 'Editar combo' : 'Novo combo'}</h2>
                <p>Informações claras para o cliente e uma montagem simples para a equipe.</p>
              </div>
              <button className="close" type="button" aria-label="Fechar" onClick={close}><X /></button>
            </div>

            <div className="content">
              {feedback && <div className={`feedback ${feedback.tone}`} role="status">{feedback.message}</div>}

              <section className="section">
                <header><div><h3>1. Informações do combo</h3><p>Nome, descrição e preço que aparecem no cardápio.</p></div></header>
                <div className="grid2">
                  <label>Nome do combo
                    <input value={draft.name} maxLength={100} onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))} placeholder="Ex.: Combo Casal" />
                  </label>
                  <label>Preço
                    <input type="number" min="0.01" step="0.01" value={draft.price || ''} onChange={(e) => setDraft((current) => ({ ...current, price: Number(e.target.value) }))} placeholder="59,90" />
                  </label>
                </div>
                <label>Descrição
                  <textarea value={draft.description} maxLength={600} onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))} placeholder="Ex.: 2 burgers, batata grande e 2 bebidas para compartilhar." />
                </label>
                <div className="grid2">
                  <label><span><input type="checkbox" checked={draft.active} onChange={(e) => setDraft((current) => ({ ...current, active: e.target.checked }))} /> Disponível no cardápio</span></label>
                  <label><span><input type="checkbox" checked={draft.featured} onChange={(e) => setDraft((current) => ({ ...current, featured: e.target.checked }))} /> Destacar na Home</span></label>
                </div>
              </section>

              <section className="section">
                <header><div><h3>2. Foto do combo</h3><p>Envie sua foto e melhore com IA, ou deixe a IA criar uma composição usando as informações do combo.</p></div></header>
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

              <section className="section">
                <header>
                  <div><h3>3. Itens e escolhas</h3><p>Crie etapas como “Escolha 2 burgers”, “Bebidas” ou “Acompanhamento”.</p></div>
                  <button className="add-group" type="button" onClick={() => setDraft((current) => ({ ...current, groups: [...current.groups, emptyGroup()] }))}><Plus size={16} /> Etapa</button>
                </header>

                {draft.groups.map((group, groupIndex) => (
                  <div className="group" key={groupIndex}>
                    <div className="group-head">
                      <label>Nome da etapa
                        <input value={group.name} onChange={(e) => updateGroup(groupIndex, { name: e.target.value })} placeholder="Ex.: Escolha 2 bebidas" />
                      </label>
                      <label>Mínimo
                        <input type="number" min="0" max="20" value={group.minSelections} onChange={(e) => updateGroup(groupIndex, { minSelections: Number(e.target.value) })} />
                      </label>
                      <label>Máximo
                        <input type="number" min="1" max="20" value={group.maxSelections} onChange={(e) => updateGroup(groupIndex, { maxSelections: Number(e.target.value) })} />
                      </label>
                      <button className="icon-button" type="button" aria-label="Remover etapa" disabled={draft.groups.length === 1} onClick={() => setDraft((current) => ({ ...current, groups: current.groups.filter((_, index) => index !== groupIndex) }))}><Trash2 /></button>
                    </div>

                    {group.options.map((option, optionIndex) => (
                      <div className="option" key={optionIndex}>
                        <label>Produto
                          <select value={option.componentProductId || ''} onChange={(e) => updateOption(groupIndex, optionIndex, { componentProductId: Number(e.target.value) })}>
                            <option value="">Selecione...</option>
                            {availableProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                          </select>
                        </label>
                        <label>+ Preço
                          <input type="number" min="0" step="0.01" value={option.additionalPrice} onChange={(e) => updateOption(groupIndex, optionIndex, { additionalPrice: Number(e.target.value) })} />
                        </label>
                        <label>Qtd. padrão
                          <input type="number" min="0" max="20" value={option.defaultQuantity} onChange={(e) => updateOption(groupIndex, optionIndex, { defaultQuantity: Number(e.target.value) })} />
                        </label>
                        <label>Mín.
                          <input type="number" min="0" max="20" value={option.minQuantity} onChange={(e) => updateOption(groupIndex, optionIndex, { minQuantity: Number(e.target.value) })} />
                        </label>
                        <label>Máx.
                          <input type="number" min="1" max="20" value={option.maxQuantity} onChange={(e) => updateOption(groupIndex, optionIndex, { maxQuantity: Number(e.target.value) })} />
                        </label>
                        <label className="fixed"><input type="checkbox" checked={option.locked} onChange={(e) => updateOption(groupIndex, optionIndex, { locked: e.target.checked, ...(e.target.checked && option.defaultQuantity < 1 ? { defaultQuantity: 1, minQuantity: Math.max(1, option.minQuantity) } : {}) })} /> Fixo</label>
                        <button className="icon-button" type="button" aria-label="Remover produto" onClick={() => updateGroup(groupIndex, { options: group.options.filter((_, index) => index !== optionIndex) })}><Trash2 size={18} /></button>
                      </div>
                    ))}

                    <button className="add-option" type="button" onClick={() => updateGroup(groupIndex, {
                      options: [...group.options, {
                        componentProductId: 0,
                        additionalPrice: 0,
                        minQuantity: 0,
                        maxQuantity: 1,
                        defaultQuantity: 0,
                        locked: false,
                        active: true,
                      }],
                    })}><Plus size={16} /> Adicionar produto à etapa</button>
                  </div>
                ))}
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
