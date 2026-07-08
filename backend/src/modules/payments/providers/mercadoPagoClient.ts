import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

function getAccessToken() {
  const token = String(process.env.MP_ACCESS_TOKEN || "").trim();

  if (!token) {
    throw new Error(
      "Pagamento Mercado Pago indisponivel. Configure MP_ACCESS_TOKEN no servidor.",
    );
  }

  return token;
}

export function getMercadoPagoClient() {
  return new MercadoPagoConfig({
    accessToken: getAccessToken(),
  });
}

export function getMercadoPagoPaymentApi() {
  return new Payment(getMercadoPagoClient());
}

export function getMercadoPagoPreferenceApi() {
  return new Preference(getMercadoPagoClient());
}
