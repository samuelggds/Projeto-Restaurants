import type {
  ConfigurableProduct,
  ProductConfiguration,
  ProductGroupSelection,
} from '../Home/domain/productCustomization';

export type MenuCategory = { id: string; name: string; image: string };
export type MenuProduct = ConfigurableProduct & {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  rating: number;
  preparationTime: string;
  ingredients?: Array<{ id: string; name: string; price: number; required?: boolean }>;
  saleMode?: 'COMPLETE' | 'BUILDABLE';
};
export type CartItem = {
  cartId: string;
  product: MenuProduct;
  quantity: number;
  unitPrice: number;
  observation?: string;
  selectedOptionIds: string[];
  selectedOptions: ProductGroupSelection[];
  optionQuantities?: ProductConfiguration['optionQuantities'];
  removedCompositionItemIds?: string[];
  removedCompositionItems?: Array<{ id: string; name: string }>;
  portions?: Array<{ optionId: string; name?: string; observation?: string }>;
  configurationVersion?: number;
  options: Array<{
    id: string;
    groupName: string;
    name: string;
    price: number;
    quantity?: number;
  }>;
};
export type TableOrderStatus = 'received' | 'preparing' | 'ready';
export type DigitalMenuActionResult = true | { ok: true };
export type DigitalMenuData = {
  restaurantName: string;
  monogram: string;
  primaryColor?: string;
  tableNumber: number;
  categories: MenuCategory[];
  products: MenuProduct[];
  orderStatus: TableOrderStatus;
  tableOrderingEnabled?: boolean;
  waiterCallEnabled?: boolean;
  billRequestEnabled?: boolean;
};
export type DigitalMenuProps = {
  data?: DigitalMenuData;
  onCallWaiter?: () => DigitalMenuActionResult | Promise<DigitalMenuActionResult>;
  onRequestBill?: () => DigitalMenuActionResult | Promise<DigitalMenuActionResult>;
  onSubmitOrder?: (items: CartItem[]) => DigitalMenuActionResult | Promise<DigitalMenuActionResult>;
  onValidateTableCode?: (code: string) => boolean | Promise<boolean>;
};
