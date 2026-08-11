import { useCallback, useEffect, useState } from "react";
import favoritesService from "../../../Services/favoritesService";

type User = { role?: string } | null | undefined;
type Options = {
  user: User;
  restaurantId: number | null;
  onRequireLogin: () => void;
  onAdded?: () => void;
  onRemoved?: () => void;
  onError?: () => void;
};

export function useFavorites({ user, restaurantId, onRequireLogin, onAdded, onRemoved, onError }: Options) {
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);

  useEffect(() => {
    if (user?.role !== "CLIENTE" || !restaurantId) {
      return;
    }
    let active = true;
    favoritesService.list(restaurantId).then((items) => {
      if (active) setFavoriteProductIds(items.map((item) => String(item.id)));
    }).catch(() => {
      if (active) setFavoriteProductIds([]);
    });
    return () => { active = false; };
  }, [restaurantId, user?.role]);

  const toggleFavorite = useCallback(async (productId: string) => {
    if (!user) {
      onRequireLogin();
      return;
    }
    if (user.role !== "CLIENTE") return;
    const isFavorite = favoriteProductIds.includes(productId);
    setFavoriteProductIds((current) => isFavorite ? current.filter((id) => id !== productId) : [productId, ...current]);
    try {
      if (isFavorite) {
        await favoritesService.remove(productId);
        onRemoved?.();
      } else {
        await favoritesService.add(productId);
        onAdded?.();
      }
    } catch {
      setFavoriteProductIds((current) => isFavorite ? [productId, ...current] : current.filter((id) => id !== productId));
      onError?.();
    }
  }, [favoriteProductIds, onAdded, onError, onRemoved, onRequireLogin, user]);

  return {
    favoriteProductIds: user?.role === "CLIENTE" && restaurantId ? favoriteProductIds : [],
    toggleFavorite,
  };
}
