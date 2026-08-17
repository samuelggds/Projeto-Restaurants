export type MenuCategory = { id: string; name: string; image: string };
export type MenuProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  rating: number;
  preparationTime: string;
  customizable?: boolean;
};
export type CartItem = { product: MenuProduct; quantity: number; observation?: string };
export type TableOrderStatus = 'received' | 'preparing' | 'ready';
export type DigitalMenuData = {
  restaurantName: string;
  monogram: string;
  primaryColor?: string;
  tableNumber: number;
  categories: MenuCategory[];
  products: MenuProduct[];
  orderStatus: TableOrderStatus;
};
export type DigitalMenuProps = {
  data?: DigitalMenuData;
  onCallWaiter?: () => void;
  onRequestBill?: () => void;
  onSubmitOrder?: (items: CartItem[]) => void;
  onValidateTableCode?: (code: string) => boolean | Promise<boolean>;
};
