import { ArrowLeft, Star } from "lucide-react";
import * as S from "../styles";

type SelectedProduct = {
  id: number | string;
  name?: string;
  description?: string;
  price?: number | string;
};

type RatingState = {
  average: number;
  count: number;
  userRating: number;
};

type ProductDetailModalProps = {
  selectedProduct: SelectedProduct;
  isUnavailable: boolean;
  isClosingProductDetail: boolean;
  selectedRating: RatingState;
  ratingHover: number;
  isRatingSubmitting: boolean;
  maxRatingStars: number;
  resolveProductImage: (product: unknown) => string;
  toPrice: (value: unknown) => string;
  toRatingLabel: (value: unknown) => string;
  setRatingHover: (value: number) => void;
  handleRateProduct: (product: SelectedProduct, stars: number) => void;
  addToCart: (product: SelectedProduct) => void;
  isAddedToCart: boolean;
  handleCloseProductDetail: () => void;
};

export default function ProductDetailModal({
  selectedProduct,
  isUnavailable,
  isClosingProductDetail,
  selectedRating,
  ratingHover,
  isRatingSubmitting,
  maxRatingStars,
  resolveProductImage,
  toPrice,
  toRatingLabel,
  setRatingHover,
  handleRateProduct,
  addToCart,
  isAddedToCart,
  handleCloseProductDetail,
}: ProductDetailModalProps) {
  const previewRating = ratingHover || selectedRating.userRating;

  return (
    <S.ProductDetailOverlay
      $closing={isClosingProductDetail}
      onClick={handleCloseProductDetail}
    >
      <S.ProductDetailImage
        $image={resolveProductImage(selectedProduct)}
        $closing={isClosingProductDetail}
        onClick={(event) => event.stopPropagation()}
      >
        <S.ProductDetailBackButton
          type="button"
          onClick={handleCloseProductDetail}
        >
          <ArrowLeft size={20} />
        </S.ProductDetailBackButton>
      </S.ProductDetailImage>

      <S.ProductDetailBody
        $closing={isClosingProductDetail}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{selectedProduct.name}</h2>
        <p>
          {selectedProduct.description ||
            "Sem descricao disponivel para este item."}
        </p>

        <S.ProductDetailPrice>
          R$ {toPrice(selectedProduct.price)}
        </S.ProductDetailPrice>

        {isUnavailable && (
          <p
            style={{
              margin: "0.55rem 0 0",
              color: "#b91c1c",
              fontWeight: 700,
            }}
          >
            Este produto esta indisponivel no momento.
          </p>
        )}

        <S.ProductDetailRatingText>
          Deixe sua avaliacao para este item
        </S.ProductDetailRatingText>

        <S.ProductDetailStars>
          {Array.from({ length: maxRatingStars }, (_, starIndex) => {
            const value = starIndex + 1;
            const active = value <= previewRating;

            return (
              <S.ProductDetailStarButton
                key={`detail-rating-${value}`}
                type="button"
                $active={active}
                disabled={isRatingSubmitting}
                aria-label={`Avaliar com ${value} estrela${value > 1 ? "s" : ""}`}
                onMouseEnter={() => setRatingHover(value)}
                onMouseLeave={() => setRatingHover(0)}
                onFocus={() => setRatingHover(value)}
                onBlur={() => setRatingHover(0)}
                onClick={() => handleRateProduct(selectedProduct, value)}
              >
                <Star
                  size={34}
                  fill={active ? "#d7b35e" : "transparent"}
                  color={active ? "#d7b35e" : "#d5d5da"}
                />
              </S.ProductDetailStarButton>
            );
          })}
        </S.ProductDetailStars>

        <S.ProductDetailRatingMeta>
          {selectedRating.count > 0
            ? `Media ${toRatingLabel(selectedRating.average)} de ${selectedRating.count} avaliacao${selectedRating.count > 1 ? "oes" : ""}`
            : "Ainda sem avaliacoes"}
        </S.ProductDetailRatingMeta>

        <S.ProductDetailActions>
          <S.AddButton
            type="button"
            $added={isAddedToCart}
            disabled={isUnavailable}
            onClick={() => addToCart(selectedProduct)}
          >
            {isUnavailable
              ? "Indisponivel"
              : isAddedToCart
                ? "Adicionado"
                : "Adicionar ao pedido"}
          </S.AddButton>
        </S.ProductDetailActions>
      </S.ProductDetailBody>
    </S.ProductDetailOverlay>
  );
}
