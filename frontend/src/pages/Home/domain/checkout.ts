import type { CartItem } from "../hooks/useCart";
import type { DeliveryAddress } from "../hooks/useDeliveryAddress";

export type CheckoutPaymentMethod = "pix" | "card" | "delivery_pix" | "delivery_card";
export type OrderType = "MESA" | "DELIVERY" | "RETIRADA";
export type CheckoutIssue = { title: string; message: string };

type ValidationInput = {
  type: OrderType;
  customerPhone: unknown;
  deliveryAddress: DeliveryAddress;
  cepStatus: "idle" | "loading" | "success" | "error";
  paymentMethod: CheckoutPaymentMethod;
};

export function resolveOrderType(mesaMode: boolean, orderType: "delivery" | "pickup"): OrderType {
  if (mesaMode) return "MESA";
  return orderType === "delivery" ? "DELIVERY" : "RETIRADA";
}

export function validateCheckout(input: ValidationInput): CheckoutIssue | null {
  const { type, customerPhone, deliveryAddress, cepStatus, paymentMethod } = input;
  if (type === "DELIVERY") {
    const required = [deliveryAddress.address, deliveryAddress.number, deliveryAddress.district, deliveryAddress.city, deliveryAddress.state];
    if (required.some((value) => !String(value || "").trim()))
      return { title: "Complete seu endereço", message: "Preencha o endereço completo no próprio carrinho." };

    const phoneDigits = String(customerPhone || "").replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 13)
      return { title: "Celular inválido", message: "Cadastre um celular com DDD para receber atualizações do pedido." };
    if (cepStatus !== "success")
      return { title: "Confirme o CEP", message: "Informe um CEP válido e aguarde o preenchimento do endereço." };
    if (!/^\d+[A-Za-z]?$/i.test(deliveryAddress.number.trim()))
      return { title: "Número inválido", message: "Informe o número do endereço, como 123 ou 123A." };
    if (!/^[A-Z]{2}$/.test(deliveryAddress.state.trim().toUpperCase()))
      return { title: "Estado inválido", message: "Informe a UF com duas letras, como CE ou SP." };
  }
  if (paymentMethod.startsWith("delivery_") && type !== "DELIVERY")
    return { title: "Opção indisponível", message: "Pagar na entrega só está disponível para delivery." };
  return null;
}

type PayloadInput = {
  restaurantId: number;
  type: OrderType;
  paymentMethod: CheckoutPaymentMethod;
  cart: CartItem[];
  tableId?: number | null;
  customer: Record<string, unknown>;
  deliveryAddress: DeliveryAddress;
};

export function buildOrderPayload(input: PayloadInput) {
  const { restaurantId, type, paymentMethod, cart, tableId, customer, deliveryAddress } = input;
  const payOnDelivery = paymentMethod.startsWith("delivery_");
  const resolvedPaymentMethod = paymentMethod.includes("pix") ? "PIX" : "CARTAO";
  return {
    payload: {
      restaurantId, type, paymentMethod: resolvedPaymentMethod, payOnDelivery,
      payOnDeliveryMethod: payOnDelivery ? resolvedPaymentMethod : undefined,
      items: cart.map((item) => ({ productId: Number(item.productId), quantity: item.quantity })),
      tableId: type === "MESA" ? tableId || undefined : undefined,
      customerName: String(customer.name || "Cliente"),
      customerPhone: String(customer.phone || ""),
      address: deliveryAddress.address.trim(), number: deliveryAddress.number.trim(),
      district: deliveryAddress.district.trim(), city: deliveryAddress.city.trim(),
      state: deliveryAddress.state.trim().toUpperCase(), zipCode: deliveryAddress.zipCode.trim(),
      complement: deliveryAddress.complement.trim(),
    },
    payOnDelivery,
    resolvedPaymentMethod,
  } as const;
}
