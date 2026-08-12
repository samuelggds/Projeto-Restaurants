import { isPersistentImageSource } from "../../../utils/persistentImage";
import { createRestaurantMonogram } from "../../../utils/restaurantMonogram";
import type { HomeCategory, HomeData, HomeProduct } from "../../Home/types";
import { isProductUnavailable } from "../domain/productAvailability";

const CATEGORY_IMAGES: Record<string, string> = {
  pizza: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  hamburguer: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  lanche: "https://images.unsplash.com/photo-1561626423-a51b45aef0a1?auto=format&fit=crop&w=800&q=80",
  frango: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80",
  carne: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=800&q=80",
  massa: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=80",
  salada: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
  sobremesa: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80",
  bebida: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80",
  cerveja: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=800&q=80",
  combo: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80",
  acompanhamento: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
};

const PRODUCT_FALLBACKS = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
];

export function resolveProductImage(product: Record<string, unknown>, index: number): string {
  if (product.image && String(product.image).startsWith("http")) return String(product.image);
  const terms = [product.name, product.description, (product.category as { name?: string })?.name]
    .filter(Boolean).join(" ").toLowerCase();
  for (const [keyword, url] of Object.entries(CATEGORY_IMAGES)) {
    if (terms.includes(keyword)) return url;
  }
  return PRODUCT_FALLBACKS[index % PRODUCT_FALLBACKS.length];
}

export function buildHomeData(productsFromApi: Record<string, unknown>[], settings: Record<string, unknown> | null): HomeData {
  const restaurant = (settings?.restaurant as Record<string, unknown>) ?? {};
  const persistedBanners = Array.isArray(restaurant.banners) ? restaurant.banners as Record<string, unknown>[] : [];
  const bannerByTitle = (title: string) => persistedBanners.find((item) => String(item.title || "") === title);
  const mainBanner = bannerByTitle("Banner principal");
  const hero = mainBanner && isPersistentImageSource(mainBanner.image)
    ? { title: "Confira nossas", highlight: "promoções", description: "Ofertas especiais preparadas para você.", image: String(mainBanner.image) }
    : { title: "", highlight: "", description: "", image: "" };
  const banners = [];
  const restaurantName = String(restaurant.name || "");
  const brand = {
    name: String(restaurantName || settings?.restaurantName || ""),
    monogram: createRestaurantMonogram(restaurantName || settings?.restaurantName),
    address: String(settings?.address || ""),
    primaryColor: String(settings?.primaryColor || "#d64d08"),
    whatsapp: String(settings?.whatsapp || ""), instagram: String(settings?.instagram || ""), facebook: String(settings?.facebook || ""),
    logoUrl: isPersistentImageSource(restaurant.logo) ? String(restaurant.logo) : "",
  };
  const products: HomeProduct[] = productsFromApi.map((product, index) => ({
    id: String(product.id), categoryId: String((product.category as { name?: string })?.name || "outros"),
    name: String(product.name || ""), description: String(product.description || ""), price: Number(product.price || 0),
    image: resolveProductImage(product, index), rating: Number(product.averageRating || 0),
    stock: product.stock === null || product.stock === undefined ? null : Number(product.stock),
    available: !isProductUnavailable(product),
  }));
  const seen = new Set<string>();
  const categories: HomeCategory[] = [{ id: "todos", name: "Todos", image: "" }, ...productsFromApi.map((product) => {
    const name = String((product.category as { name?: string })?.name || "");
    if (!name || seen.has(name)) return null;
    seen.add(name);
    return { id: name, name, image: resolveProductImage(product, 0) };
  }).filter(Boolean) as HomeCategory[]];
  return {
    brand, hero, banners, categories, products,
    deliveryTime: String(settings?.averageDeliveryTime || ""), minimumOrder: Number(settings?.minimumOrder || 0),
    freeDeliveryFrom: 0, isOpen: false, about: String(restaurant.description || settings?.restaurantDescription || settings?.description || ""),
  };
}
