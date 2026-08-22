import type {
  ProductGroupSelection,
  ProductOptionGroup,
} from '../Home/domain/productCustomization';

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
  ingredients?: Array<{ id: string; name: string; price: number; required?: boolean }>;
  optionGroups?: ProductOptionGroup[];
};
export type CartItem = {
  cartId: string;
  product: MenuProduct;
  quantity: number;
  unitPrice: number;
  observation?: string;
  selectedOptionIds: string[];
  selectedOptions: ProductGroupSelection[];
  options: Array<{ id: string; groupName: string; name: string; price: number }>;
};
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
