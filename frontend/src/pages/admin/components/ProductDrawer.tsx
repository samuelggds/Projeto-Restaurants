import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { createPersistentImageDataUrl } from "../../../utils/persistentImage";
import * as S from "../Admin.styles";
import type { AdminCategory, AdminProduct } from "../types";
import { isProductActiveFromStock, isUnlimitedStock, normalizeProductStock } from "../domain/productStock";

type ProductDrawerProps = {
  product: AdminProduct | null;
  categories: AdminCategory[];
  close: () => void;
  save: (product: AdminProduct) => Promise<void>;
};

export function ProductDrawer({ product, categories, close, save }: ProductDrawerProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [image, setImage] = useState(product?.image ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? 0);
  const [stock, setStock] = useState(String(product?.stock ?? ""));
  const [unlimitedStock, setUnlimitedStock] = useState(isUnlimitedStock(product?.stock));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setError("");
    try {
      setImage(await createPersistentImageDataUrl(file, 960));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível carregar a imagem.");
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim() || Number(price) < 0 || !categoryId) {
      setError("Preencha nome, preço e categoria.");
      return;
    }
    setBusy(true);
    try {
      const normalizedStock = normalizeProductStock(stock, unlimitedStock);
      await save({
        id: product?.id ?? "",
        name: name.trim(),
        description: description.trim(),
        image: image.trim(),
        price: Number(price),
        categoryId,
        category: categories.find((item) => item.id === categoryId)?.name ?? "",
        stock: normalizedStock,
        active: isProductActiveFromStock(normalizedStock),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o produto.");
      setBusy(false);
    }
  };

  return (
    <S.Overlay onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <S.Drawer onSubmit={(event) => void submit(event)}>
        <header>
          <h2>{product ? "Editar produto" : "Novo produto"}</h2>
          <button type="button" onClick={close}><X /></button>
        </header>
        {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
        <S.Field>Nome<input required value={name} onChange={(event) => setName(event.target.value)} /></S.Field>
        <S.Field>Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></S.Field>
        <S.Field>
          Foto do produto
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadImage(event.target.files?.[0])} />
        </S.Field>
        {image && <img src={image} alt={`Prévia de ${name || "produto"}`} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12 }} />}
        <S.Field>Ou use a URL da imagem<input value={image} onChange={(event) => setImage(event.target.value)} /></S.Field>
        <S.Field>Preço<input required type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></S.Field>
        <S.Field>
          Categoria
          <select required value={categoryId} onChange={(event) => setCategoryId(Number(event.target.value))}>
            <option value={0}>Selecione</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </S.Field>
        <S.Field>
          Controle de estoque
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input type="checkbox" checked={unlimitedStock} onChange={(event) => setUnlimitedStock(event.target.checked)} />
            Estoque ilimitado (produto feito sob demanda)
          </label>
          {!unlimitedStock && <input required type="number" min="0" step="1" placeholder="Quantidade disponível" value={stock} onChange={(event) => setStock(event.target.value.replace(/\D/g, ""))} />}
        </S.Field>
        <footer>
          <button type="button" onClick={close}>Cancelar</button>
          <button className="primary" disabled={busy} type="submit">{busy ? "Salvando..." : "Salvar produto"}</button>
        </footer>
      </S.Drawer>
    </S.Overlay>
  );
}
