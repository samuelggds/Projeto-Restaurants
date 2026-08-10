import { useCallback, useEffect, useState } from "react";
import favoritesService from "../../../Services/favoritesService";

type User = { role?: string } | null | undefined;
type Options = {
  user: User;
  restaurantId: number | null;
  onRequireLogin: () => void;
};

export function useFavorites({ user, restaurantId, onRequireLogin }: Options) {
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
      if (isFavorite) await favoritesService.remove(productId);
      else await favoritesService.add(productId);
    } catch {
      setFavoriteProductIds((current) => isFavorite ? [productId, ...current] : current.filter((id) => id !== productId));
    }
  }, [favoriteProductIds, onRequireLogin, user]);

  return {
    favoriteProductIds: user?.role === "CLIENTE" && restaurantId ? favoriteProductIds : [],
    toggleFavorite,
  };
}
