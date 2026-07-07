import { useEffect, useMemo, useState } from "react";
import menuService from "../../Services/menuService";
import { MAX_RATING_STARS, resolveRatingClientKey } from "./helpers";

export default function useProductRatings({ restaurantId, tableSession }) {
  const [productRatings, setProductRatings] = useState({});
  const [ratingHover, setRatingHover] = useState(0);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

  const ratingClientKey = useMemo(
    () => resolveRatingClientKey(tableSession),
    [tableSession?.sessionId, tableSession?.sessionToken],
  );

  function getProductRating(productId) {
    const normalizedId = String(productId || "").trim();

    if (!normalizedId) {
      return { average: 0, count: 0, userRating: 0 };
    }

    const current = productRatings[normalizedId];
    const average = Number(current?.average || 0);
    const count = Number(current?.count || 0);
    const userRating = Number(current?.userRating || 0);

    return {
      average: average > 0 ? average : 0,
      count: count > 0 ? count : 0,
      userRating,
    };
  }

  async function handleRateProduct(product, stars) {
    if (!product?.id || !restaurantId || isRatingSubmitting) {
      return;
    }

    const nextRating = Math.max(
      1,
      Math.min(MAX_RATING_STARS, Number(stars || 0)),
    );

    if (!nextRating) {
      return;
    }

    const productId = String(product.id);
    const previous = getProductRating(product.id);
    const hasRatedBefore = previous.userRating > 0;
    const nextCount = hasRatedBefore ? previous.count : previous.count + 1;
    const nextSum = hasRatedBefore
      ? previous.average * previous.count - previous.userRating + nextRating
      : previous.average * previous.count + nextRating;
    const nextAverage = nextCount > 0 ? nextSum / nextCount : 0;

    setProductRatings((prevMap) => ({
      ...prevMap,
      [productId]: {
        average: nextAverage,
        count: nextCount,
        userRating: nextRating,
      },
    }));
    setRatingHover(0);
    setIsRatingSubmitting(true);

    try {
      const saved = await menuService.rateProduct({
        restaurantId,
        productId,
        rating: nextRating,
        clientKey: ratingClientKey,
      });

      if (saved) {
        setProductRatings((prevMap) => ({
          ...prevMap,
          [productId]: {
            average: Number(saved.average || 0),
            count: Number(saved.count || 0),
            userRating: Number(saved.userRating || nextRating),
          },
        }));
      }
    } catch {
      setProductRatings((prevMap) => ({
        ...prevMap,
        [productId]: previous,
      }));
    } finally {
      setIsRatingSubmitting(false);
    }
  }

  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    let mounted = true;

    async function loadProductRatings() {
      try {
        const ratings = await menuService.listProductRatings(
          restaurantId,
          ratingClientKey,
        );

        if (!mounted) {
          return;
        }

        const mapped = Array.isArray(ratings)
          ? ratings.reduce((acc, item) => {
              const productId = String(item?.productId || "").trim();

              if (!productId) {
                return acc;
              }

              acc[productId] = {
                average: Number(item?.average || 0),
                count: Number(item?.count || 0),
                userRating: Number(item?.userRating || 0),
              };

              return acc;
            }, {})
          : {};

        setProductRatings(mapped);
      } catch {
        if (mounted) {
          setProductRatings({});
        }
      }
    }

    loadProductRatings();

    return () => {
      mounted = false;
    };
  }, [restaurantId, ratingClientKey]);

  return {
    ratingHover,
    isRatingSubmitting,
    getProductRating,
    handleRateProduct,
    setRatingHover,
  };
}
