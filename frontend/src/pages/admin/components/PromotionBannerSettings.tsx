import type { ChangeEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  LoaderCircle,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type { AdminPromotionBanner } from '../types';
import {
  PROMOTION_BANNER_LIMITS,
  createEmptyPromotionBanner,
  reindexPromotionBanners,
  validatePromotionBanners,
} from '../domain/promotionBannerValidation';
import * as S from './PromotionBannerSettings.styles';

type Props = {
  banners: AdminPromotionBanner[];
  onChange: (banners: AdminPromotionBanner[]) => void;
  onImageChange: (localId: string, event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onEnhance: (localId: string) => void | Promise<void>;
  enhancingLocalId: string | null;
};

export function PromotionBannerSettings({
  banners,
  onChange,
  onImageChange,
  onEnhance,
  enhancingLocalId,
}: Props) {
  const errors = validatePromotionBanners(banners);

  const changeBanner = <Key extends keyof AdminPromotionBanner>(
    localId: string,
    key: Key,
    value: AdminPromotionBanner[Key],
  ) => {
    onChange(
      banners.map((banner) => (banner.localId === localId ? { ...banner, [key]: value } : banner)),
    );
  };

  const moveBanner = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;
    const reordered = [...banners];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    onChange(reindexPromotionBanners(reordered));
  };

  const removeBanner = (localId: string) => {
    onChange(reindexPromotionBanners(banners.filter((banner) => banner.localId !== localId)));
  };

  return (
    <S.Manager>
      <div className="manager-header">
        <div>
          <strong>Banners cadastrados</strong>
          <small>
            {banners.length} {banners.length === 1 ? 'banner' : 'banners'} na sequência da Home
          </small>
        </div>
        <button
          className="add-banner"
          type="button"
          onClick={() => onChange([...banners, createEmptyPromotionBanner(banners.length)])}
        >
          <Plus size={17} /> Novo banner
        </button>
      </div>

      {banners.length === 0 && (
        <div className="empty-state">
          <div>
            <ImagePlus size={30} aria-hidden="true" />
            <b>Nenhum banner promocional</b>
            <span>
              Adicione quantos banners precisar. Eles serão exibidos na Home na ordem escolhida.
            </span>
          </div>
        </div>
      )}

      {banners.map((banner, index) => {
        const bannerErrors = errors[banner.localId] || {};
        const inputId = `promotion-image-${banner.localId}`;
        const isEnhancing = enhancingLocalId === banner.localId;

        return (
          <S.BannerCard key={banner.localId} aria-label={`Editor do banner ${index + 1}`}>
            <div className="banner-header">
              <div>
                <h3>Banner {index + 1}</h3>
                <p>
                  {banner.id ? `Salvo com o código ${banner.id}` : 'Novo banner ainda não salvo'}
                </p>
              </div>
              <div className="header-actions">
                <label className="status-toggle">
                  <input
                    type="checkbox"
                    checked={banner.active}
                    aria-label={`Exibir banner ${index + 1} na Home`}
                    onChange={(event) =>
                      changeBanner(banner.localId, 'active', event.target.checked)
                    }
                  />
                  {banner.active ? 'Ativo' : 'Oculto'}
                </label>
                <div className="order-actions" aria-label="Alterar posição do banner">
                  <button
                    className="icon-action"
                    type="button"
                    aria-label={`Mover banner ${index + 1} para cima`}
                    disabled={index === 0}
                    onClick={() => moveBanner(index, -1)}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    className="icon-action"
                    type="button"
                    aria-label={`Mover banner ${index + 1} para baixo`}
                    disabled={index === banners.length - 1}
                    onClick={() => moveBanner(index, 1)}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
                <button
                  className="icon-action danger"
                  type="button"
                  aria-label={`Remover banner ${index + 1}`}
                  onClick={() => removeBanner(banner.localId)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="banner-body">
              <div className="visual-column">
                <div className="preview" aria-label={`Prévia do banner ${index + 1}`}>
                  {banner.image ? (
                    <img src={banner.image} alt="" />
                  ) : (
                    <div className="preview-placeholder">
                      <span>
                        <ImagePlus size={26} /> Escolha uma imagem horizontal
                      </span>
                    </div>
                  )}
                  <div className="preview-copy">
                    <h4>
                      {banner.title.trim() || 'Título da promoção'}
                      {banner.highlight.trim() && <em>{banner.highlight}</em>}
                    </h4>
                    {banner.description.trim() && <p>{banner.description}</p>}
                    {banner.buttonLabel.trim() && (
                      <span className="preview-button">{banner.buttonLabel}</span>
                    )}
                  </div>
                </div>

                <div className="image-actions">
                  <label className="image-action" htmlFor={inputId}>
                    <Upload size={16} /> {banner.image ? 'Trocar imagem' : 'Adicionar imagem'}
                    <input
                      id={inputId}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label={`Selecionar imagem do banner ${index + 1}`}
                      onChange={(event) => onImageChange(banner.localId, event)}
                    />
                  </label>
                  <button
                    className="image-action"
                    type="button"
                    disabled={!banner.image || Boolean(enhancingLocalId)}
                    onClick={() => onEnhance(banner.localId)}
                  >
                    {isEnhancing ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    {isEnhancing ? 'Melhorando...' : 'Melhorar com IA'}
                  </button>
                </div>
                <small className="image-help">
                  Recomendado: 1440 × 560 px, JPG, PNG ou WebP, máximo 5 MB. A descrição é aplicada
                  sobre a imagem para continuar legível no celular.
                </small>
                {bannerErrors.image && <small className="image-error">{bannerErrors.image}</small>}
              </div>

              <div className="fields">
                <label className="field full">
                  Título da promoção
                  <input
                    value={banner.title}
                    maxLength={PROMOTION_BANNER_LIMITS.title}
                    aria-label={`Título do banner ${index + 1}`}
                    aria-invalid={Boolean(bannerErrors.title)}
                    placeholder="Ex.: Confira nossas ofertas"
                    onChange={(event) => changeBanner(banner.localId, 'title', event.target.value)}
                  />
                  <span className="field-meta">
                    <span>Mensagem principal do banner</span>
                    <span>
                      {banner.title.length}/{PROMOTION_BANNER_LIMITS.title}
                    </span>
                  </span>
                  {bannerErrors.title && <span className="field-error">{bannerErrors.title}</span>}
                </label>

                <label className="field">
                  Destaque
                  <input
                    value={banner.highlight}
                    maxLength={PROMOTION_BANNER_LIMITS.highlight}
                    aria-label={`Destaque do banner ${index + 1}`}
                    aria-invalid={Boolean(bannerErrors.highlight)}
                    placeholder="Ex.: 30% OFF"
                    onChange={(event) =>
                      changeBanner(banner.localId, 'highlight', event.target.value)
                    }
                  />
                  <span className="field-meta">
                    <span>Opcional</span>
                    <span>
                      {banner.highlight.length}/{PROMOTION_BANNER_LIMITS.highlight}
                    </span>
                  </span>
                  {bannerErrors.highlight && (
                    <span className="field-error">{bannerErrors.highlight}</span>
                  )}
                </label>

                <label className="field">
                  Texto do botão
                  <input
                    value={banner.buttonLabel}
                    maxLength={PROMOTION_BANNER_LIMITS.buttonLabel}
                    aria-label={`Texto do botão do banner ${index + 1}`}
                    aria-invalid={Boolean(bannerErrors.buttonLabel)}
                    placeholder="Ex.: Ver cardápio"
                    onChange={(event) =>
                      changeBanner(banner.localId, 'buttonLabel', event.target.value)
                    }
                  />
                  <span className="field-meta">
                    <span>Opcional</span>
                    <span>
                      {banner.buttonLabel.length}/{PROMOTION_BANNER_LIMITS.buttonLabel}
                    </span>
                  </span>
                  {bannerErrors.buttonLabel && (
                    <span className="field-error">{bannerErrors.buttonLabel}</span>
                  )}
                </label>

                <label className="field full">
                  Descrição da promoção
                  <textarea
                    value={banner.description}
                    maxLength={PROMOTION_BANNER_LIMITS.description}
                    aria-label={`Descrição do banner ${index + 1}`}
                    aria-invalid={Boolean(bannerErrors.description)}
                    placeholder="Conte ao cliente como aproveitar a oferta, o desconto ou o combo."
                    onChange={(event) =>
                      changeBanner(banner.localId, 'description', event.target.value)
                    }
                  />
                  <span className="field-meta">
                    <span>Opcional</span>
                    <span>
                      {banner.description.length}/{PROMOTION_BANNER_LIMITS.description}
                    </span>
                  </span>
                  {bannerErrors.description && (
                    <span className="field-error">{bannerErrors.description}</span>
                  )}
                </label>
              </div>
            </div>
          </S.BannerCard>
        );
      })}
    </S.Manager>
  );
}
