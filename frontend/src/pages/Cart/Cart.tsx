import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ChevronRight,
  MapPin,
  CreditCard,
  X,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import ordersService from "../../Services/ordersService";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import { useAuth } from "../../contexts/authContext";
import * as S from "./styles";

const PixPaymentPanel = lazy(() => import("./components/PixPaymentPanel"));

const ADDRESS_STORAGE_KEY = "@PecaJaFood:enderecos";
const ADDRESS_SELECTED_KEY = "@PecaJaFood:enderecoSelecionadoId";
const MIN_CONFIRMATION_DELAY_MS = 5000;
const CONFIRMED_STATE_DELAY_MS = 2000;

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseMoney(value, fallback = 0) {
  const normalized = Number(value);
  if (Number.isNaN(normalized)) {
    return fallback;
  }

  return normalized;
}

function readFileAsDataUrl(file) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result || ""));
    };

    reader.onerror = () => {
      reject(new Error("Não foi possível ler o arquivo selecionado."));
    };

    reader.readAsDataURL(file);
  });
}

function readJsonStorage(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function formatPhoneInput(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (
    digits.startsWith("55") &&
    (digits.length === 12 || digits.length === 13)
  ) {
    digits = digits.slice(2);
  }

  digits = digits.slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);

  if (local.length <= 4) {
    return `(${ddd}) ${local}`;
  }

  if (local.length <= 8) {
    return `(${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  }

  return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5, 9)}`;
}

function normalizeStoredAddress(address) {
  return {
    id: Number(address?.id || Date.now()),
    rotulo: String(address?.rotulo || "Principal"),
    rua: String(address?.rua || ""),
    numero: String(address?.numero || ""),
    bairro: String(address?.bairro || ""),
    cidade: String(address?.cidade || ""),
    estado: String(address?.estado || ""),
    cep: String(address?.cep || ""),
    complemento: String(address?.complemento || ""),
  };
}

function buildDeliveryAddress(user) {
  const savedAddresses = readJsonStorage(ADDRESS_STORAGE_KEY, []);
  const selectedId = Number(localStorage.getItem(ADDRESS_SELECTED_KEY) || 0);
  const addresses = Array.isArray(savedAddresses)
    ? savedAddresses.map(normalizeStoredAddress)
    : [];

  const selectedAddress =
    addresses.find((address) => address.id === selectedId) ||
    addresses[0] ||
    null;

  return {
    cep: selectedAddress?.cep || user?.zipCode || "",
    logradouro: selectedAddress?.rua || user?.address || "",
    numero: selectedAddress?.numero || user?.number || "",
    bairro: selectedAddress?.bairro || user?.district || "",
    cidade: selectedAddress?.cidade || user?.city || "Fortaleza",
    estado: selectedAddress?.estado || user?.state || "CE",
    complemento: selectedAddress?.complemento || user?.complement || "",
  };
}

function getAddressSignature(address) {
  return [
    address?.logradouro,
    address?.numero,
    address?.bairro,
    address?.cidade,
    address?.estado,
    address?.cep,
    address?.complemento,
  ]
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    )
    .join("|");
}

function loadInitialCart() {
  const raw = localStorage.getItem("cartItems");
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map((item) => ({
    ...item,
    productId: Number(item.productId),
    quantity: Number(item.quantity || 1),
    price: Number(item.price || 0),
  }));
}

export default function Cart() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [isDarkMode] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cartItems, setCartItems] = useState(loadInitialCart);
  const [orderType, setOrderType] = useState("DELIVERY");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [pixPaymentData, setPixPaymentData] = useState(null);
  const [pendingPixOrderPayload, setPendingPixOrderPayload] = useState(null);
  const [pixManualProof, setPixManualProof] = useState("");
  const [pixManualProofImage, setPixManualProofImage] = useState("");
  const [pixManualProofImageName, setPixManualProofImageName] = useState("");
  const [isSubmittingPixConfirmation, setIsSubmittingPixConfirmation] =
    useState(false);
  const [publicRestaurantSettings, setPublicRestaurantSettings] = useState({
    deliveryFee: 8.5,
    minimumOrder: 0,
    pixProvider: "MERCADO_PAGO",
    pixKey: "",
  });

  const storedUser = user || readJsonStorage("user", null);

  const [endereco, setEndereco] = useState(() =>
    buildDeliveryAddress(storedUser),
  );
  const [customerPhone, setCustomerPhone] = useState(() =>
    formatPhoneInput(storedUser?.phone || ""),
  );

  const tableSession = useMemo(() => {
    const raw = localStorage.getItem("tableSession");
    return raw ? JSON.parse(raw) : null;
  }, []);

  const restaurantId =
    Number(tableSession?.restaurantId) ||
    Number(storedUser?.restaurantId) ||
    Number(localStorage.getItem("menuRestaurantId")) ||
    null;

  const returnMenuPath = tableSession?.tableId
    ? `/mesa/${tableSession.tableNumber || tableSession.tableId}?tableId=${tableSession.tableId}${restaurantId ? `&restaurantId=${restaurantId}` : ""}`
    : "/";

  const isMesa = Boolean(tableSession?.tableId);
  const isDelivery = !isMesa && orderType === "DELIVERY";

  useEffect(() => {
    let mounted = true;

    async function loadPublicRestaurantSettings() {
      if (!restaurantId) {
        return;
      }

      try {
        const settings =
          await restaurantSettingsService.getPublicSettings(restaurantId);

        if (!mounted) {
          return;
        }

        setPublicRestaurantSettings({
          deliveryFee: Math.max(parseMoney(settings?.deliveryFee, 8.5), 0),
          minimumOrder: Math.max(parseMoney(settings?.minimumOrder, 0), 0),
          pixProvider: String(settings?.pixProvider || "MERCADO_PAGO")
            .trim()
            .toUpperCase(),
          pixKey: String(settings?.pixKey || "").trim(),
        });
      } catch {
        if (!mounted) {
          return;
        }

        setPublicRestaurantSettings({
          deliveryFee: 8.5,
          minimumOrder: 0,
          pixProvider: "MERCADO_PAGO",
          pixKey: "",
        });
      }
    }

    loadPublicRestaurantSettings();

    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const taxaEntrega =
    isMesa || orderType === "RETIRADA"
      ? 0
      : publicRestaurantSettings.deliveryFee;
  const total = subtotal + taxaEntrega;
  const hasMinimumOrderForDelivery =
    isDelivery && publicRestaurantSettings.minimumOrder > 0;
  const minimumOrderShortfall = hasMinimumOrderForDelivery
    ? Math.max(publicRestaurantSettings.minimumOrder - subtotal, 0)
    : 0;
  const isMinimumOrderReached =
    hasMinimumOrderForDelivery && minimumOrderShortfall <= 0;
  const isBlockedByMinimumOrder =
    hasMinimumOrderForDelivery && !isMinimumOrderReached;

  function buildOrderPayload({ paid = false, pixPaymentId = null } = {}) {
    return {
      restaurantId,
      type: isMesa ? "MESA" : orderType,
      paymentMethod,
      paid,
      pixPaymentId: pixPaymentId || undefined,
      customerPhone: isDelivery
        ? String(customerPhone || "").trim() || undefined
        : undefined,
      tableId: isMesa ? Number(tableSession.tableId) : undefined,
      address: isDelivery ? endereco.logradouro : undefined,
      number: isDelivery ? endereco.numero : undefined,
      district: isDelivery ? endereco.bairro : undefined,
      city: isDelivery ? endereco.cidade : undefined,
      state: isDelivery ? endereco.estado : undefined,
      zipCode: isDelivery ? endereco.cep : undefined,
      complement: isDelivery ? endereco.complemento : undefined,
      items: cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };
  }

  function persist(items) {
    localStorage.setItem("cartItems", JSON.stringify(items));
    setCartItems(items);
  }

  function increaseItem(productId) {
    const updated = cartItems.map((item) =>
      item.productId === productId
        ? { ...item, quantity: item.quantity + 1 }
        : item,
    );
    persist(updated);
  }

  function decreaseItem(productId) {
    const updated = cartItems
      .map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item,
      )
      .filter((item) => item.quantity > 0);
    persist(updated);
  }

  function removeItem(productId) {
    const updated = cartItems.filter((item) => item.productId !== productId);
    persist(updated);
  }

  function clearCart() {
    localStorage.removeItem("cartItems");
    setCartItems([]);
    toast.info("Carrinho esvaziado.");
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setEndereco((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomerPhoneChange = (event) => {
    setCustomerPhone(formatPhoneInput(event.target.value));
  };

  function persistDeliveryAddress(address) {
    const normalizedAddress = normalizeStoredAddress({
      rotulo: "Entrega recente",
      rua: address.logradouro,
      numero: address.numero,
      bairro: address.bairro,
      cidade: address.cidade,
      estado: address.estado,
      cep: address.cep,
      complemento: address.complemento,
    });

    const currentAddresses = readJsonStorage(ADDRESS_STORAGE_KEY, []);
    const addresses = Array.isArray(currentAddresses)
      ? currentAddresses.map(normalizeStoredAddress)
      : [];

    const addressSignature = getAddressSignature(address);
    const existingIndex = addresses.findIndex(
      (savedAddress) =>
        getAddressSignature({
          logradouro: savedAddress.rua,
          numero: savedAddress.numero,
          bairro: savedAddress.bairro,
          cidade: savedAddress.cidade,
          estado: savedAddress.estado,
          cep: savedAddress.cep,
          complemento: savedAddress.complemento,
        }) === addressSignature,
    );

    const nextAddress =
      existingIndex >= 0
        ? addresses[existingIndex]
        : {
            ...normalizedAddress,
            id: Date.now(),
          };

    const nextAddresses =
      existingIndex >= 0 ? addresses : [...addresses, nextAddress];

    localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(nextAddresses));
    localStorage.setItem(ADDRESS_SELECTED_KEY, String(nextAddress.id));

    const currentUser = storedUser || {};
    const nextUser = {
      ...currentUser,
      phone: String(customerPhone || "").trim() || currentUser.phone,
      address: nextAddress.rua,
      number: nextAddress.numero,
      district: nextAddress.bairro,
      city: nextAddress.cidade,
      state: nextAddress.estado,
      zipCode: nextAddress.cep,
      complement: nextAddress.complemento,
      defaultAddressId: nextAddress.id,
      defaultAddressLabel: nextAddress.rotulo,
    };

    const token = localStorage.getItem("token");
    if (token) {
      login(nextUser, token);
    } else {
      localStorage.setItem("user", JSON.stringify(nextUser));
    }
  }

  async function handleSubmitOrder() {
    if (isSubmitting || isConfirmed) {
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Seu carrinho está vazio.");
      return;
    }

    if (!restaurantId) {
      toast.error("Não foi possível identificar o restaurante do pedido.");
      return;
    }

    if (isDelivery) {
      const phoneDigits = String(customerPhone || "").replace(/\D/g, "");
      if (
        paymentMethod === "PIX" &&
        (phoneDigits.length < 10 || phoneDigits.length > 13)
      ) {
        toast.error(
          "Informe um celular/WhatsApp válido para receber a confirmação do pagamento.",
        );
        return;
      }

      if (
        publicRestaurantSettings.minimumOrder > 0 &&
        subtotal < publicRestaurantSettings.minimumOrder
      ) {
        toast.error(
          `Pedido mínimo para delivery: ${formatCurrency(publicRestaurantSettings.minimumOrder)}.`,
        );
        return;
      }

      const required = [
        endereco.logradouro,
        endereco.numero,
        endereco.bairro,
        endereco.cidade,
        endereco.estado,
      ];
      if (required.some((field) => !field)) {
        toast.error("Preencha os dados obrigatórios de entrega.");
        return;
      }
    }

    const startedAt = Date.now();

    try {
      setIsSubmitting(true);

      if (isDelivery && paymentMethod === "PIX") {
        const pixPayment = await ordersService.createPixPayment(
          buildOrderPayload({ paid: false }),
        );

        setIsDrawerOpen(false);
        setIsSubmitting(false);
        setPixPaymentData({
          orderId: null,
          total: Number(pixPayment?.totalAmount || total),
          paymentId: String(pixPayment?.paymentId || ""),
          provider: String(
            pixPayment?.provider ||
              publicRestaurantSettings.pixProvider ||
              "MERCADO_PAGO",
          )
            .trim()
            .toUpperCase(),
          pixCode: String(pixPayment?.qrCode || ""),
          qrCodeBase64: pixPayment?.qrCodeBase64 || null,
          requiresStatusCheck: Boolean(pixPayment?.requiresStatusCheck),
        });
        setPixManualProof("");
        setPixManualProofImage("");
        setPixManualProofImageName("");
        setPendingPixOrderPayload(
          buildOrderPayload({
            paid: true,
            pixPaymentId: pixPayment?.paymentId,
          }),
        );
        return;
      }

      await ordersService.createOrder(buildOrderPayload({ paid: false }));

      localStorage.removeItem("cartItems");
      if (isDelivery) {
        persistDeliveryAddress(endereco);
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_CONFIRMATION_DELAY_MS) {
        await new Promise((resolve) => {
          setTimeout(resolve, MIN_CONFIRMATION_DELAY_MS - elapsed);
        });
      }

      setIsSubmitting(false);
      setIsConfirmed(true);

      await new Promise((resolve) => {
        setTimeout(resolve, CONFIRMED_STATE_DELAY_MS);
      });

      setIsConfirmed(false);
      navigate(returnMenuPath, { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Erro ao enviar pedido");
      setIsSubmitting(false);
    }
  }

  async function handleCopyPixKey() {
    try {
      const pixCode = String(pixPaymentData?.pixCode || "").trim();

      if (!pixCode) {
        throw new Error("Código PIX indisponível para cópia.");
      }

      if (!navigator?.clipboard?.writeText) {
        throw new Error("Seu navegador não permite copiar automaticamente.");
      }

      await navigator.clipboard.writeText(pixCode);
      toast.success("Código PIX copiado!");
    } catch (error) {
      toast.error(error?.message || "Erro ao copiar código PIX");
    }
  }

  async function handleManualProofFileChange(event) {
    try {
      const file = event.target.files?.[0];

      if (!file) {
        setPixManualProofImage("");
        setPixManualProofImageName("");
        return;
      }

      if (!String(file.type || "").startsWith("image/")) {
        throw new Error("Selecione um arquivo de imagem válido.");
      }

      if (Number(file.size || 0) > 2 * 1024 * 1024) {
        throw new Error("A imagem deve ter no máximo 2MB.");
      }

      const dataUrl = await readFileAsDataUrl(file);
      setPixManualProofImage(dataUrl);
      setPixManualProofImageName(String(file.name || "comprovante"));
    } catch (error) {
      toast.error(error?.message || "Erro ao carregar comprovante.");
      setPixManualProofImage("");
      setPixManualProofImageName("");
    }
  }

  async function handleConfirmPixPaymentAndCreateOrder() {
    if (!pendingPixOrderPayload || isSubmittingPixConfirmation) {
      return;
    }

    try {
      setIsSubmittingPixConfirmation(true);
      const isManualProvider =
        String(pixPaymentData?.provider || "").toUpperCase() !== "MERCADO_PAGO";
      const normalizedManualProof = String(pixManualProof || "").trim();
      const normalizedManualProofImage = String(
        pixManualProofImage || "",
      ).trim();
      const hasManualProofImage =
        normalizedManualProofImage.startsWith("data:image/") &&
        normalizedManualProofImage.length >= 40;

      if (
        isManualProvider &&
        normalizedManualProof.length < 6 &&
        !hasManualProofImage
      ) {
        toast.error(
          "Informe o comprovante PIX (código da transação ou imagem) para gerar o pedido.",
        );
        setIsSubmittingPixConfirmation(false);
        return;
      }

      if (
        hasManualProofImage &&
        normalizedManualProofImage.length > 3_000_000
      ) {
        toast.error(
          "Imagem do comprovante muito grande. Envie uma imagem menor que 3MB.",
        );
        setIsSubmittingPixConfirmation(false);
        return;
      }

      if (pixPaymentData?.requiresStatusCheck) {
        const paymentStatus = await ordersService.getPixPaymentStatus({
          restaurantId,
          paymentId: pendingPixOrderPayload.pixPaymentId,
        });

        if (!paymentStatus?.isApproved) {
          toast.error(
            "Pagamento PIX ainda não foi aprovado. Finalize o pagamento e tente novamente.",
          );
          setIsSubmittingPixConfirmation(false);
          return;
        }
      }

      const payloadToCreate = isManualProvider
        ? {
            ...pendingPixOrderPayload,
            paymentProof: normalizedManualProof || undefined,
            paymentProofImage: hasManualProofImage
              ? normalizedManualProofImage
              : undefined,
          }
        : pendingPixOrderPayload;

      const createdOrder = await ordersService.createOrder(payloadToCreate);

      localStorage.removeItem("cartItems");
      if (isDelivery) {
        persistDeliveryAddress(endereco);
      }

      setPixPaymentData((prev) =>
        prev
          ? {
              ...prev,
              orderId: createdOrder?.id || null,
            }
          : prev,
      );

      setPendingPixOrderPayload(null);
      setPixPaymentData(null);
      setPixManualProof("");
      setPixManualProofImage("");
      setPixManualProofImageName("");
      toast.success("Pagamento confirmado e pedido criado com sucesso!");
      navigate(returnMenuPath, { replace: true });
    } catch (err) {
      toast.error(
        err?.response?.data?.error || "Erro ao confirmar pagamento PIX",
      );
      setIsSubmittingPixConfirmation(false);
    }
  }

  if (pixPaymentData) {
    const isManualProvider =
      String(pixPaymentData?.provider || "").toUpperCase() !== "MERCADO_PAGO";
    const hasManualProofImage =
      String(pixManualProofImage || "").startsWith("data:image/") &&
      String(pixManualProofImage || "").length >= 40;
    const isConfirmDisabled =
      isSubmittingPixConfirmation ||
      (isManualProvider &&
        String(pixManualProof || "").trim().length < 6 &&
        !hasManualProofImage);

    return (
      <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
        <S.HomeLayout>
          <S.Navbar>
            <S.Brand>
              <ShoppingBag size={24} />
              <span>Pagamento via PIX</span>
            </S.Brand>
          </S.Navbar>

          <S.MenuSection>
            <Suspense fallback={null}>
              <PixPaymentPanel
                pixPaymentData={pixPaymentData}
                formatCurrency={formatCurrency}
                pixManualProof={pixManualProof}
                pixManualProofImage={pixManualProofImage}
                pixManualProofImageName={pixManualProofImageName}
                isSubmittingPixConfirmation={isSubmittingPixConfirmation}
                isManualProvider={isManualProvider}
                isConfirmDisabled={isConfirmDisabled}
                onCopyPixKey={handleCopyPixKey}
                onPixManualProofChange={setPixManualProof}
                onManualProofFileChange={handleManualProofFileChange}
                onConfirmPayment={handleConfirmPixPaymentAndCreateOrder}
              />
            </Suspense>
          </S.MenuSection>
        </S.HomeLayout>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={isDarkMode ? S.darkTheme : S.lightTheme}>
      <S.HomeLayout>
        <S.Navbar>
          <S.Brand>
            <ShoppingBag size={24} />
            <span>Seu Carrinho</span>
          </S.Brand>

          {isMesa && (
            <div
              style={{
                padding: "0.55rem 0.85rem",
                borderRadius: 999,
                background: "rgba(234, 179, 8, 0.14)",
                color: isDarkMode ? "#fef3c7" : "#92400e",
                border: `1px solid ${isDarkMode ? "rgba(234,179,8,0.26)" : "rgba(234,179,8,0.28)"}`,
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Mesa {tableSession?.tableNumber || tableSession?.tableId}
            </div>
          )}
        </S.Navbar>

        <S.MenuSection>
          <button
            onClick={() => navigate(returnMenuPath)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              marginBottom: "1.5rem",
              color: isDarkMode ? "#eab308" : "#dba206",
              fontWeight: "600",
            }}
          >
            <ArrowLeft size={18} /> Voltar ao Cardápio
          </button>

          <S.CartSplitLayout>
            <S.CartItemsSection>
              <h3>Itens Selecionados</h3>
              {cartItems.length === 0 ? (
                <p style={{ opacity: 0.5 }}>Seu carrinho está vazio.</p>
              ) : (
                cartItems.map((item) => (
                  <S.ProductCard
                    key={item.productId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "1.25rem",
                      marginBottom: "1rem",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <h4 style={{ margin: "0 0 0.25rem 0" }}>{item.name}</h4>
                      <span
                        style={{
                          fontWeight: "700",
                          color: isDarkMode ? "#eab308" : "#dba206",
                        }}
                      >
                        R$ {item.price.toFixed(2)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.5rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          background: "rgba(0,0,0,0.04)",
                          padding: "6px 12px",
                          borderRadius: "20px",
                        }}
                      >
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                          onClick={() => decreaseItem(item.productId)}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ fontWeight: "600" }}>
                          {item.quantity}
                        </span>
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                          onClick={() => increaseItem(item.productId)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        style={{
                          border: "none",
                          background: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                        }}
                        onClick={() => removeItem(item.productId)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </S.ProductCard>
                ))
              )}
            </S.CartItemsSection>

            <S.CartSummarySection>
              <S.ProductCard style={{ padding: "1.5rem" }}>
                <h3>Resumo dos Valores</h3>
                <hr style={{ opacity: 0.1, margin: "1rem 0" }} />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.75rem",
                  }}
                >
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "1.25rem",
                  }}
                >
                  <span>Taxa de Entrega:</span>
                  <span>R$ {taxaEntrega.toFixed(2)}</span>
                </div>

                {isDelivery && (
                  <div
                    style={{
                      marginBottom: "1.25rem",
                      padding: "0.75rem",
                      borderRadius: "10px",
                      border: hasMinimumOrderForDelivery
                        ? isMinimumOrderReached
                          ? "1px solid rgba(34, 197, 94, 0.45)"
                          : "1px solid rgba(239, 68, 68, 0.45)"
                        : "1px solid rgba(148, 163, 184, 0.4)",
                      background: hasMinimumOrderForDelivery
                        ? isMinimumOrderReached
                          ? "rgba(34, 197, 94, 0.12)"
                          : "rgba(239, 68, 68, 0.12)"
                        : "rgba(148, 163, 184, 0.08)",
                      fontSize: "0.9rem",
                      lineHeight: 1.45,
                      color: hasMinimumOrderForDelivery
                        ? isMinimumOrderReached
                          ? "#166534"
                          : "#991b1b"
                        : isDarkMode
                          ? "#e2e8f0"
                          : "#334155",
                    }}
                  >
                    <div>
                      Taxa configurada pelo restaurante:{" "}
                      {formatCurrency(taxaEntrega)}
                    </div>
                    {hasMinimumOrderForDelivery ? (
                      <div>
                        Pedido mínimo do delivery:{" "}
                        {formatCurrency(publicRestaurantSettings.minimumOrder)}
                        {minimumOrderShortfall > 0
                          ? ` (faltam ${formatCurrency(minimumOrderShortfall)} no subtotal)`
                          : " (mínimo atingido)"}
                      </div>
                    ) : (
                      <div>Sem pedido mínimo configurado para delivery.</div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: "800",
                    fontSize: "1.3rem",
                    marginBottom: "1.5rem",
                    borderTop: "1px dashed #ccc",
                    paddingTop: "1rem",
                  }}
                >
                  <span>Total:</span>
                  <span style={{ color: isDarkMode ? "#eab308" : "#dba206" }}>
                    R$ {total.toFixed(2)}
                  </span>
                </div>

                <S.PrimaryButton
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setIsDrawerOpen(true)}
                >
                  Continuar para Entrega <ChevronRight size={20} />
                </S.PrimaryButton>

                <button
                  type="button"
                  onClick={clearCart}
                  disabled={cartItems.length === 0}
                  style={{
                    width: "100%",
                    marginTop: "0.75rem",
                    padding: "0.9rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid #ef4444",
                    background: "transparent",
                    color: "#ef4444",
                    fontWeight: 700,
                    cursor: cartItems.length === 0 ? "not-allowed" : "pointer",
                    opacity: cartItems.length === 0 ? 0.5 : 1,
                  }}
                >
                  Esvaziar carrinho
                </button>
              </S.ProductCard>
            </S.CartSummarySection>
          </S.CartSplitLayout>
        </S.MenuSection>

        {isDrawerOpen && (
          <S.DrawerOverlay onClick={() => setIsDrawerOpen(false)} />
        )}

        <S.DrawerContainer $isOpen={isDrawerOpen}>
          <S.DrawerHeader>
            <h3>Dados de Entrega & Pagamento</h3>
            <button onClick={() => setIsDrawerOpen(false)}>
              <X size={22} />
            </button>
          </S.DrawerHeader>

          <S.DrawerContent>
            {!isMesa && (
              <div style={{ marginBottom: "1.5rem" }}>
                <h4
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  Tipo do Pedido
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    style={{
                      padding: "1rem",
                      borderRadius: "8px",
                      border:
                        orderType === "DELIVERY"
                          ? "2px solid #dba206"
                          : "1px solid #ccc",
                      background: "transparent",
                      fontWeight: "600",
                      cursor: "pointer",
                      color: "inherit",
                    }}
                    onClick={() => setOrderType("DELIVERY")}
                  >
                    Delivery
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: "1rem",
                      borderRadius: "8px",
                      border:
                        orderType === "RETIRADA"
                          ? "2px solid #dba206"
                          : "1px solid #ccc",
                      background: "transparent",
                      fontWeight: "600",
                      cursor: "pointer",
                      color: "inherit",
                    }}
                    onClick={() => setOrderType("RETIRADA")}
                  >
                    Retirada
                  </button>
                </div>
              </div>
            )}

            {isDelivery && (
              <div style={{ marginBottom: "2rem" }}>
                <h4
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <MapPin size={18} /> Endereço de Entrega
                </h4>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <input
                    type="text"
                    name="customerPhone"
                    placeholder="Celular/WhatsApp para confirmação (Ex: (85) 99999-9999)"
                    value={customerPhone}
                    onChange={handleCustomerPhoneChange}
                  />
                  <input
                    type="text"
                    name="cep"
                    placeholder="CEP"
                    value={endereco.cep}
                    onChange={handleInputChange}
                  />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "3fr 1fr",
                      gap: "0.75rem",
                    }}
                  >
                    <input
                      type="text"
                      name="logradouro"
                      placeholder="Endereço"
                      value={endereco.logradouro}
                      onChange={handleInputChange}
                    />
                    <input
                      type="text"
                      name="numero"
                      placeholder="Nº"
                      value={endereco.numero}
                      onChange={handleInputChange}
                    />
                  </div>
                  <input
                    type="text"
                    name="bairro"
                    placeholder="Bairro"
                    value={endereco.bairro}
                    onChange={handleInputChange}
                  />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr",
                      gap: "0.75rem",
                    }}
                  >
                    <input
                      type="text"
                      name="cidade"
                      placeholder="Cidade"
                      value={endereco.cidade}
                      onChange={handleInputChange}
                    />
                    <input
                      type="text"
                      name="estado"
                      placeholder="UF"
                      value={endereco.estado}
                      onChange={handleInputChange}
                      maxLength={2}
                    />
                  </div>
                  <input
                    type="text"
                    name="complemento"
                    placeholder="Complemento"
                    value={endereco.complemento}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: "2rem" }}>
              <h4
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <CreditCard size={18} /> Forma de Pagamento
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                }}
              >
                <button
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    border:
                      paymentMethod === "PIX"
                        ? "2px solid #dba206"
                        : "1px solid #ccc",
                    background: "transparent",
                    fontWeight: "600",
                    cursor: "pointer",
                    color: "inherit",
                  }}
                  onClick={() => setPaymentMethod("PIX")}
                >
                  Pix
                </button>
                <button
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    border:
                      paymentMethod === "CARTAO"
                        ? "2px solid #dba206"
                        : "1px solid #ccc",
                    background: "transparent",
                    cursor: "pointer",
                    color: "inherit",
                  }}
                  onClick={() => setPaymentMethod("CARTAO")}
                >
                  Cartão
                </button>
              </div>
            </div>

            <div
              style={{
                background: "rgba(0,0,0,0.03)",
                padding: "1rem",
                borderRadius: "12px",
                marginBottom: "2rem",
              }}
            >
              {isDelivery && (
                <div
                  style={{
                    marginBottom: "0.75rem",
                    fontSize: "0.86rem",
                    lineHeight: 1.45,
                    color: hasMinimumOrderForDelivery
                      ? isMinimumOrderReached
                        ? "#166534"
                        : "#991b1b"
                      : isDarkMode
                        ? "#cbd5e1"
                        : "#334155",
                    border: hasMinimumOrderForDelivery
                      ? isMinimumOrderReached
                        ? "1px solid rgba(34, 197, 94, 0.45)"
                        : "1px solid rgba(239, 68, 68, 0.45)"
                      : "1px solid rgba(148, 163, 184, 0.35)",
                    background: hasMinimumOrderForDelivery
                      ? isMinimumOrderReached
                        ? "rgba(34, 197, 94, 0.1)"
                        : "rgba(239, 68, 68, 0.1)"
                      : "rgba(148, 163, 184, 0.08)",
                    borderRadius: "10px",
                    padding: "0.65rem 0.75rem",
                  }}
                >
                  <div>
                    Taxa de entrega aplicada: {formatCurrency(taxaEntrega)}
                  </div>
                  {hasMinimumOrderForDelivery ? (
                    <div>
                      Mínimo do delivery:{" "}
                      {formatCurrency(publicRestaurantSettings.minimumOrder)}
                      {minimumOrderShortfall > 0
                        ? ` (faltam ${formatCurrency(minimumOrderShortfall)} no subtotal)`
                        : " (mínimo atingido)"}
                    </div>
                  ) : (
                    <div>Sem pedido mínimo configurado.</div>
                  )}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "700",
                }}
              >
                <span>Total a pagar:</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <S.PrimaryButton
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "1rem",
                background: isConfirmed
                  ? "linear-gradient(135deg, #0f172a, #1d4ed8)"
                  : isBlockedByMinimumOrder
                    ? "#9ca3af"
                    : undefined,
                color: isConfirmed ? "#ffffff" : undefined,
                border: isConfirmed
                  ? "1px solid rgba(148, 163, 184, 0.32)"
                  : undefined,
                boxShadow: isConfirmed
                  ? "0 14px 28px rgba(29, 78, 216, 0.32)"
                  : undefined,
                letterSpacing: isConfirmed ? "0.01em" : undefined,
              }}
              $loading={isSubmitting && !isConfirmed}
              disabled={isSubmitting || isConfirmed || isBlockedByMinimumOrder}
              aria-busy={isSubmitting}
              onClick={handleSubmitOrder}
            >
              {isConfirmed ? (
                <>
                  <CheckCircle size={18} /> Confirmado
                </>
              ) : isSubmitting ? (
                <>
                  <S.LoadingFill />
                  <S.LoadingSpinner />
                  Confirmando pedido...
                </>
              ) : isBlockedByMinimumOrder ? (
                <>
                  <CheckCircle size={18} /> Atinga o mínimo para continuar
                </>
              ) : (
                <>
                  <CheckCircle size={18} /> Confirmar e Fazer Pedido
                </>
              )}
            </S.PrimaryButton>
          </S.DrawerContent>
        </S.DrawerContainer>
      </S.HomeLayout>
    </ThemeProvider>
  );
}
