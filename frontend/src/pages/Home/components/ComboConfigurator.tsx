import { Minus, Plus, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import type { ProductConfiguration } from '../domain/productCustomization';
import type { HomeProduct } from '../types';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type QuantityState = Record<string, number>;

function initialQuantities(product: HomeProduct): QuantityState {
  const values: QuantityState = {};
  (product.comboGroups || []).forEach((group) => {
    group.options.forEach((option) => {
      const initial = option.locked
        ? Math.max(1, option.defaultQuantity, option.minQuantity)
        : Math.max(0, option.defaultQuantity);
      if (initial > 0) values[option.id] = initial;
    });
  });
  return values;
}

export function ComboConfigurator({
  product,
  primaryColor,
  onClose,
  onConfirm,
}: {
  product: HomeProduct;
  primaryColor: string;
  onClose: () => void;
  onConfirm: (configuration: ProductConfiguration) => void;
}) {
  const [quantities, setQuantities] = useState<QuantityState>(() => initialQuantities(product));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const total = useMemo(
    () =>
      Number(product.price) +
      (product.comboGroups || []).reduce(
        (sum, group) =>
          sum +
          group.options.reduce(
            (groupSum, option) =>
              groupSum + Number(option.additionalPrice || 0) * Number(quantities[option.id] || 0),
            0,
          ),
        0,
      ),
    [product.comboGroups, product.price, quantities],
  );

  const change = (groupId: string, optionId: string, next: number) => {
    const group = (product.comboGroups || []).find((candidate) => candidate.id === groupId);
    const option = group?.options.find((candidate) => candidate.id === optionId);
    if (!group || !option || !option.active) return;
    const clamped = Math.max(0, Math.min(option.maxQuantity, next));
    if (option.locked && clamped < Math.max(1, option.minQuantity)) return;
    setQuantities((current) => ({ ...current, [optionId]: clamped }));
    setErrors((current) => ({ ...current, [groupId]: '' }));
  };

  const confirm = () => {
    const nextErrors: Record<string, string> = {};
    const comboSelections = (product.comboGroups || []).map((group) => {
      const items = group.options
        .map((option) => ({ optionId: option.id, quantity: Number(quantities[option.id] || 0) }))
        .filter((item) => item.quantity > 0);
      const selectedCount = items.length;
      if (selectedCount < group.minSelections || selectedCount > group.maxSelections) {
        nextErrors[group.id] = `Escolha entre ${group.minSelections} e ${group.maxSelections} opção(ões).`;
      }
      return { groupId: group.id, items };
    });
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onConfirm({
      selectedOptions: [],
      selectedOptionIds: [],
      observation: '',
      comboSelections,
      configurationVersion: product.configurationVersion,
    });
  };

  return createPortal(
    <Backdrop onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <Dialog $primary={primaryColor} role="dialog" aria-modal="true" aria-label={`Montar ${product.name}`}>
        <header>
          <div>
            <span><Sparkles size={15} /> Monte do seu jeito</span>
            <h2>{product.name}</h2>
            <p>{product.description}</p>
          </div>
          <button className="close" type="button" aria-label="Fechar" onClick={onClose}><X /></button>
        </header>

        <div className="body">
          <div className="hero">
            <img src={product.image} alt="" />
            <div>
              <small>Preço do combo</small>
              <strong>{brl(total)}</strong>
              <span>O valor é recalculado conforme suas escolhas.</span>
            </div>
          </div>

          {(product.comboGroups || []).map((group, groupIndex) => (
            <section key={group.id}>
              <div className="group-title">
                <div>
                  <small>Etapa {groupIndex + 1}</small>
                  <h3>{group.name}</h3>
                  {group.description && <p>{group.description}</p>}
                </div>
                <span>Escolha {group.minSelections === group.maxSelections ? group.minSelections : `${group.minSelections}–${group.maxSelections}`}</span>
              </div>
              {errors[group.id] && <div className="error">{errors[group.id]}</div>}
              <div className="options">
                {group.options.map((option) => {
                  const quantity = Number(quantities[option.id] || 0);
                  return (
                    <article className={quantity > 0 ? 'selected' : ''} key={option.id}>
                      {option.image ? <img src={option.image} alt="" /> : <div className="image-fallback"><Sparkles /></div>}
                      <div className="copy">
                        <b>{option.name}</b>
                        {option.description && <small>{option.description}</small>}
                        {option.additionalPrice > 0 && <em>+ {brl(option.additionalPrice)} por unidade</em>}
                        {option.locked && <span>Incluído no combo</span>}
                      </div>
                      <div className="stepper">
                        <button
                          type="button"
                          aria-label={`Diminuir ${option.name}`}
                          disabled={option.locked && quantity <= Math.max(1, option.minQuantity)}
                          onClick={() => change(group.id, option.id, quantity - 1)}
                        ><Minus size={15} /></button>
                        <strong>{quantity}</strong>
                        <button
                          type="button"
                          aria-label={`Aumentar ${option.name}`}
                          disabled={!option.active || quantity >= option.maxQuantity}
                          onClick={() => change(group.id, option.id, quantity + 1)}
                        ><Plus size={15} /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <footer>
          <div><small>Total</small><strong>{brl(total)}</strong></div>
          <button type="button" onClick={confirm}>Adicionar combo à sacola</button>
        </footer>
      </Dialog>
    </Backdrop>,
    document.body,
  );
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(16, 15, 14, .62);
  backdrop-filter: blur(7px);

  @media (max-width: 680px) {
    align-items: end;
    padding: 0;
  }
`;

const Dialog = styled.div<{ $primary: string }>`
  --combo-primary: ${(p) => p.$primary || '#d64d08'};
  width: min(760px, 100%);
  max-height: min(880px, calc(100dvh - 36px));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 28px 90px rgba(0,0,0,.28);

  > header {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding: 20px 22px 15px;
    border-bottom: 1px solid #eee8e3;
  }
  > header span {
    display: inline-flex;
    gap: 7px;
    align-items: center;
    color: var(--combo-primary);
    font-size: .72rem;
    font-weight: 900;
    text-transform: uppercase;
  }
  > header h2 { margin: 5px 0 4px; font-size: 1.5rem; }
  > header p { margin: 0; color: #776e67; font-size: .85rem; line-height: 1.4; }
  .close { flex: 0 0 auto; width: 38px; height: 38px; border: 0; border-radius: 50%; background: #f4f1ee; cursor: pointer; }
  .body { overflow-y: auto; padding: 18px 22px 24px; display: grid; gap: 18px; }
  .hero {
    display: grid;
    grid-template-columns: 118px 1fr;
    gap: 15px;
    align-items: center;
    padding: 12px;
    border-radius: 16px;
    background: #fbf7f3;
  }
  .hero img { width: 118px; height: 92px; border-radius: 12px; object-fit: cover; }
  .hero small, > footer small { display: block; color: #867c74; font-size: .72rem; }
  .hero strong, > footer strong { display: block; color: var(--combo-primary); font-size: 1.32rem; }
  .hero span { display: block; margin-top: 4px; color: #776f68; font-size: .75rem; }
  section { display: grid; gap: 10px; }
  .group-title { display: flex; justify-content: space-between; gap: 14px; align-items: end; }
  .group-title small { color: var(--combo-primary); font-weight: 900; font-size: .68rem; text-transform: uppercase; }
  .group-title h3 { margin: 2px 0; font-size: 1.02rem; }
  .group-title p { margin: 0; color: #7a726c; font-size: .78rem; }
  .group-title > span {
    padding: 6px 9px; border-radius: 999px; background: #f6f2ee; color: #6d655f;
    font-size: .7rem; font-weight: 800; white-space: nowrap;
  }
  .error { padding: 8px 10px; border-radius: 9px; background: #fff0ef; color: #a5372f; font-size: .76rem; }
  .options { display: grid; gap: 8px; }
  article {
    display: grid;
    grid-template-columns: 62px 1fr auto;
    gap: 11px;
    align-items: center;
    padding: 9px;
    border: 1px solid #e9e4df;
    border-radius: 14px;
    transition: border-color .15s ease, background .15s ease;
  }
  article.selected { border-color: color-mix(in srgb, var(--combo-primary) 45%, #e9e4df); background: color-mix(in srgb, var(--combo-primary) 4%, #fff); }
  article img, .image-fallback { width: 62px; height: 56px; border-radius: 10px; object-fit: cover; background: #f2eeea; display: grid; place-items: center; color: #a09993; }
  .copy { min-width: 0; }
  .copy b { display: block; font-size: .9rem; }
  .copy small { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 1; color: #817870; font-size: .72rem; }
  .copy em { display: block; color: var(--combo-primary); font-style: normal; font-size: .72rem; font-weight: 800; margin-top: 3px; }
  .copy span { display: inline-block; margin-top: 4px; padding: 3px 6px; border-radius: 999px; background: #f3eee9; color: #655e58; font-size: .64rem; font-weight: 800; }
  .stepper { display: grid; grid-template-columns: 32px 28px 32px; align-items: center; text-align: center; }
  .stepper button { width: 32px; height: 32px; border: 1px solid #ded8d2; background: #fff; border-radius: 9px; display: grid; place-items: center; cursor: pointer; }
  .stepper button:disabled { opacity: .38; cursor: not-allowed; }
  > footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    padding: 14px 22px;
    border-top: 1px solid #eee8e3;
    background: #fff;
  }
  > footer > button {
    border: 0; border-radius: 12px; padding: 12px 16px; background: var(--combo-primary); color: #fff;
    font-weight: 900; cursor: pointer;
  }

  @media (max-width: 680px) {
    width: 100%;
    max-height: 94dvh;
    border-radius: 24px 24px 0 0;
    .body { padding: 15px; }
    > header, > footer { padding-inline: 15px; }
    .hero { grid-template-columns: 90px 1fr; }
    .hero img { width: 90px; height: 76px; }
    .group-title { align-items: start; flex-direction: column; gap: 7px; }
    article { grid-template-columns: 54px 1fr; }
    article img, .image-fallback { width: 54px; height: 52px; }
    .stepper { grid-column: 1 / -1; justify-self: end; }
    > footer > button { flex: 1; }
  }
`;
