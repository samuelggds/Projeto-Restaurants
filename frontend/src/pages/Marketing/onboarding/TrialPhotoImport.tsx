import { useRef, useState, type FormEvent } from 'react';
import menuImport, {
  type MenuImportDraft,
  type MenuImportDraftItem,
} from '../../../Services/menuImportService';
import { createPersistentImageDataUrl } from '../../../utils/persistentImage';
import { trialRequestError } from './trialApi';

export default function TrialPhotoImport({
  onPublished,
  onReviewChange,
}: {
  onPublished: () => Promise<void>;
  onReviewChange: (busy: boolean) => void;
}) {
  const [mode, setMode] = useState<'menu' | 'product'>('menu');
  const [photo, setPhoto] = useState('');
  const [draft, setDraft] = useState<MenuImportDraft | null>(null);
  const [items, setItems] = useState<MenuImportDraftItem[]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  function edit(id: string, patch: Partial<MenuImportDraftItem>) {
    setItems((current) =>
      current.map((item) => (item.publicId === id ? { ...item, ...patch } : item)),
    );
  }
  async function run(action: () => Promise<void>, fallback: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (cause) {
      setError(trialRequestError(cause, cause instanceof Error ? cause.message : fallback));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  function clear() {
    setPhoto('');
    setDraft(null);
    setItems([]);
    onReviewChange(false);
  }
  function choose(file?: File) {
    if (!file) return;
    void run(async () => {
      const prepared = await createPersistentImageDataUrl(file, 1600);
      setPhoto(prepared);
      onReviewChange(true);
    }, 'Não foi possível preparar a foto.');
  }
  function analyze() {
    void run(async () => {
      const result = await menuImport.previewMenuFromImage({ imageUrl: photo, photoMode: mode });
      setDraft(result);
      setItems(result.items);
      setPhoto('');
    }, 'Não foi possível analisar a foto. Tente novamente.');
  }
  function publish(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    void run(async () => {
      for (const item of items) {
        const original = draft.items.find((row) => row.publicId === item.publicId)!;
        if (item.publishedProductId) continue;
        const change: Partial<MenuImportDraftItem> = {};
        if (item.selected !== original.selected) {
          change.selected = item.selected;
          change.action = item.selected ? (item.duplicateProductId ? 'UPDATE' : 'CREATE') : 'SKIP';
        }
        if (item.selected) {
          if (item.name !== original.name) change.name = item.name;
          if (item.description !== original.description) change.description = item.description;
          if (item.price !== original.price) change.price = item.price;
          if (item.image !== original.image) change.image = item.image;
        }
        if (Object.keys(change).length)
          await menuImport.updateDraftItem(draft.publicId, item.publicId, change);
      }
      const result = await menuImport.publishDraft(draft.publicId);
      if (result.status !== 'PUBLISHED') {
        const remaining = await menuImport.getDraft(draft.publicId);
        setDraft(remaining);
        setItems(remaining.items);
        throw new Error(
          'Alguns itens ainda precisam de revisão. Os itens já salvos estão identificados abaixo.',
        );
      }
      clear();
      setNotice('Produtos adicionados ao cardápio.');
      await onPublished();
    }, 'Não foi possível salvar o cardápio.');
  }
  return (
    <section className="gx-setup__photo" aria-label="Cardápio por foto">
      <h3>Adicionar produtos por foto</h3>
      <p>
        Fotografe uma página do cardápio ou um prato. A análise usa os créditos de IA da loja e
        prepara uma prévia para você conferir.
      </p>
      <fieldset disabled={busy} className="gx-trial__fields">
        {!draft ? (
          <>
            <label>
              O que aparece na foto?
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value === 'product' ? 'product' : 'menu')}
              >
                <option value="menu">Uma página do cardápio</option>
                <option value="product">Um produto</option>
              </select>
            </label>
            <div className="gx-setup__files">
              <label>
                Tirar foto
                <input
                  type="file"
                  capture="environment"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => choose(e.target.files?.[0])}
                />
              </label>
              <label>
                Escolher da galeria
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => choose(e.target.files?.[0])}
                />
              </label>
            </div>
            {photo && (
              <>
                <img className="gx-setup__preview" src={photo} alt="Foto selecionada" />
                <button type="button" onClick={analyze}>
                  Analisar foto com IA
                </button>
                <button type="button" onClick={clear}>
                  Descartar foto
                </button>
              </>
            )}
          </>
        ) : (
          <form onSubmit={publish}>
            <h4>Confira os produtos encontrados</h4>
            {items.map((item) => (
              <div className="gx-setup__item" key={item.publicId}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.selected}
                    disabled={Boolean(item.publishedProductId)}
                    onChange={(e) => edit(item.publicId, { selected: e.target.checked })}
                  />
                  {item.publishedProductId
                    ? 'Já salvo'
                    : item.duplicateProductId
                      ? 'Atualizar produto existente'
                      : 'Adicionar ao cardápio'}{' '}
                  · {item.name}
                </label>
                {item.image && <img src={item.image} alt={item.name} />}
                {item.selected && !item.publishedProductId && (
                  <>
                    <label>
                      Nome do produto
                      <input
                        required
                        maxLength={160}
                        value={item.name}
                        onChange={(e) => edit(item.publicId, { name: e.target.value })}
                      />
                    </label>
                    <label>
                      Descrição
                      <textarea
                        maxLength={1000}
                        value={item.description || ''}
                        onChange={(e) => edit(item.publicId, { description: e.target.value })}
                      />
                    </label>
                    <label>
                      Preço em reais
                      <input
                        required
                        type="number"
                        min="0.01"
                        max="100000"
                        step="0.01"
                        value={item.price || ''}
                        onChange={(e) => edit(item.publicId, { price: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      {item.image ? 'Substituir foto' : 'Adicionar foto do produto'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            void run(
                              async () =>
                                edit(item.publicId, {
                                  image: await createPersistentImageDataUrl(file, 1000),
                                }),
                              'Confira a foto.',
                            );
                        }}
                      />
                    </label>
                  </>
                )}
              </div>
            ))}
            <button
              type="submit"
              disabled={!items.some((item) => item.selected && !item.publishedProductId)}
            >
              Salvar itens revisados
            </button>
            <button type="button" onClick={clear}>
              Sair desta prévia
            </button>
          </form>
        )}
      </fieldset>
      {busy && <p role="status">Processando…</p>}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert" className="gx-trial__error">
          {error}
        </p>
      )}
    </section>
  );
}
