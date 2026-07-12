const configuredProvider = String(process.env.CUSTOMER_NOTIFICATION_PROVIDER || "none")
    .trim()
    .toLowerCase();
const whatsappWebhookUrl = String(process.env.WHATSAPP_WEBHOOK_URL || "").trim();
const whatsappWebhookToken = String(process.env.WHATSAPP_WEBHOOK_TOKEN || "").trim();
function getErrorMessage(error) {
    return error instanceof Error ? error.message : "unknown";
}
function resolveProvider() {
    if (configuredProvider && configuredProvider !== "none") {
        return configuredProvider;
    }
    if (whatsappWebhookUrl) {
        return "whatsapp_webhook";
    }
    return "none";
}
function normalizeToE164Br(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) {
        return "";
    }
    if (/^55\d{10,11}$/.test(digits)) {
        return `+${digits}`;
    }
    if (/^\d{10}$/.test(digits)) {
        return `+55${digits}`;
    }
    if (/^\d{11}$/.test(digits)) {
        return `+55${digits}`;
    }
    return "";
}
function formatCurrencyBrl(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(Number.isFinite(amount) ? amount : 0);
}
function buildCustomerMessage({ customerName, restaurantName, orderId, total, paymentMethod, }) {
    const resolvedCustomerName = String(customerName || "Cliente").trim();
    const resolvedRestaurantName = String(restaurantName || "restaurante").trim();
    const resolvedPaymentMethod = String(paymentMethod || "PIX").toUpperCase();
    return [
        `Oi, ${resolvedCustomerName}!`,
        `Seu pagamento via ${resolvedPaymentMethod} foi confirmado com sucesso.`,
        `Pedido #${orderId} confirmado no ${resolvedRestaurantName}.`,
        `Total: ${formatCurrencyBrl(total)}.`,
        "Agora e so aguardar, seu pedido entrou em preparo.",
    ].join("\n");
}
function buildOrderStatusChangedMessage({ customerName, restaurantName, orderId, status, }) {
    const resolvedCustomerName = String(customerName || "Cliente").trim();
    const resolvedRestaurantName = String(restaurantName || "restaurante").trim();
    const resolvedStatus = String(status || "EM ANDAMENTO")
        .replace(/_/g, " ")
        .toUpperCase();
    return [
        `Oi, ${resolvedCustomerName}!`,
        `Atualizacao do seu pedido #${orderId} no ${resolvedRestaurantName}.`,
        `Novo status: ${resolvedStatus}.`,
    ].join("\n");
}
function buildRestaurantPinRequestMessage({ restaurantName, orderId, requestedByRole, }) {
    const resolvedRestaurantName = String(restaurantName || "restaurante").trim();
    const normalizedRole = String(requestedByRole || "MOTOQUEIRO").toUpperCase();
    const requesterLabel = normalizedRole === "ADMIN" ? "Admin" : "Motoqueiro";
    return [
        `Notificacao - ${resolvedRestaurantName}`,
        `${requesterLabel} solicitou PIN de confirmacao de pagamento.`,
        `Pedido #${orderId}.`,
    ].join("\n");
}
function buildRestaurantOrderIssueReportedMessage({ restaurantName, orderId, customerName, customerPhone, issueMessage, orderStatus, orderType, paymentMethod, total, addressLabel, itemsSummary, createdAt, }) {
    const resolvedRestaurantName = String(restaurantName || "restaurante").trim();
    const resolvedCustomerName = String(customerName || "Cliente").trim();
    const resolvedCustomerPhone = String(customerPhone || "").trim();
    const resolvedIssueMessage = String(issueMessage || "")
        .trim()
        .slice(0, 600);
    const resolvedOrderStatus = String(orderStatus || "N/A")
        .trim()
        .replace(/_/g, " ")
        .toUpperCase();
    const resolvedOrderType = String(orderType || "N/A")
        .trim()
        .replace(/_/g, " ")
        .toUpperCase();
    const resolvedPaymentMethod = String(paymentMethod || "N/A")
        .trim()
        .replace(/_/g, " ")
        .toUpperCase();
    const resolvedAddressLabel = String(addressLabel || "").trim();
    const resolvedItemsSummary = Array.isArray(itemsSummary)
        ? itemsSummary
            .map((item) => String(item || "").trim())
            .filter(Boolean)
            .slice(0, 8)
        : [];
    const resolvedCreatedAt = String(createdAt || "").trim();
    const resolvedCreatedAtText = resolvedCreatedAt
        ? new Date(resolvedCreatedAt).toLocaleString("pt-BR")
        : "N/A";
    return [
        `Notificacao - ${resolvedRestaurantName}`,
        `Cliente ${resolvedCustomerName} relatou problema no pedido #${orderId}.`,
        resolvedCustomerPhone
            ? `Telefone do cliente: ${resolvedCustomerPhone}.`
            : null,
        `Status: ${resolvedOrderStatus} | Tipo: ${resolvedOrderType} | Pagamento: ${resolvedPaymentMethod}.`,
        `Total: ${formatCurrencyBrl(total)}.`,
        resolvedAddressLabel ? `Endereco: ${resolvedAddressLabel}.` : null,
        resolvedItemsSummary.length > 0
            ? `Itens: ${resolvedItemsSummary.join("; ")}.`
            : null,
        `Criado em: ${resolvedCreatedAtText}.`,
        `Mensagem: ${resolvedIssueMessage || "(sem detalhes)"}`,
    ]
        .filter(Boolean)
        .join("\n");
}
async function notifyViaWhatsappWebhook({ restaurantWhatsapp, customerPhone, customerName, restaurantName, orderId, total, paymentMethod, }) {
    if (!whatsappWebhookUrl) {
        return {
            sent: false,
            reason: "webhook_not_configured",
        };
    }
    const from = normalizeToE164Br(restaurantWhatsapp);
    if (!from) {
        return {
            sent: false,
            reason: "restaurant_whatsapp_not_configured",
        };
    }
    const to = normalizeToE164Br(customerPhone);
    if (!to) {
        return {
            sent: false,
            reason: "invalid_or_missing_phone",
        };
    }
    const message = buildCustomerMessage({
        customerName,
        restaurantName,
        orderId,
        total,
        paymentMethod,
    });
    const headers = {
        "Content-Type": "application/json",
    };
    if (whatsappWebhookToken) {
        headers.Authorization = `Bearer ${whatsappWebhookToken}`;
    }
    const response = await fetch(whatsappWebhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
            channel: "whatsapp",
            from,
            to,
            message,
            metadata: {
                orderId,
                restaurantWhatsapp: from,
            },
        }),
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Webhook respondeu ${response.status}: ${body}`.trim());
    }
    return {
        sent: true,
        provider: "whatsapp_webhook",
        from,
        to,
    };
}
async function notifyOrderStatusChangedViaWhatsappWebhook({ restaurantWhatsapp, customerPhone, customerName, restaurantName, orderId, status, }) {
    if (!whatsappWebhookUrl) {
        return {
            sent: false,
            reason: "webhook_not_configured",
        };
    }
    const from = normalizeToE164Br(restaurantWhatsapp);
    if (!from) {
        return {
            sent: false,
            reason: "restaurant_whatsapp_not_configured",
        };
    }
    const to = normalizeToE164Br(customerPhone);
    if (!to) {
        return {
            sent: false,
            reason: "invalid_or_missing_phone",
        };
    }
    const message = buildOrderStatusChangedMessage({
        customerName,
        restaurantName,
        orderId,
        status,
    });
    const headers = {
        "Content-Type": "application/json",
    };
    if (whatsappWebhookToken) {
        headers.Authorization = `Bearer ${whatsappWebhookToken}`;
    }
    const response = await fetch(whatsappWebhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
            channel: "whatsapp",
            from,
            to,
            message,
            metadata: {
                orderId,
                status,
                restaurantWhatsapp: from,
            },
        }),
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Webhook respondeu ${response.status}: ${body}`.trim());
    }
    return {
        sent: true,
        provider: "whatsapp_webhook",
        from,
        to,
    };
}
async function notifyRestaurantPinRequestedViaWhatsappWebhook({ restaurantWhatsapp, restaurantName, orderId, requestedByRole, }) {
    if (!whatsappWebhookUrl) {
        return {
            sent: false,
            reason: "webhook_not_configured",
        };
    }
    const from = normalizeToE164Br(restaurantWhatsapp);
    if (!from) {
        return {
            sent: false,
            reason: "restaurant_whatsapp_not_configured",
        };
    }
    const to = from;
    const message = buildRestaurantPinRequestMessage({
        restaurantName,
        orderId,
        requestedByRole,
    });
    const headers = {
        "Content-Type": "application/json",
    };
    if (whatsappWebhookToken) {
        headers.Authorization = `Bearer ${whatsappWebhookToken}`;
    }
    const response = await fetch(whatsappWebhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
            channel: "whatsapp",
            from,
            to,
            message,
            metadata: {
                orderId,
                requestedByRole,
                restaurantWhatsapp: from,
            },
        }),
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Webhook respondeu ${response.status}: ${body}`.trim());
    }
    return {
        sent: true,
        provider: "whatsapp_webhook",
        from,
        to,
    };
}
async function notifyRestaurantOrderIssueReportedViaWhatsappWebhook({ restaurantWhatsapp, restaurantName, orderId, customerName, issueMessage, orderStatus, orderType, paymentMethod, total, addressLabel, itemsSummary, createdAt, }) {
    if (!whatsappWebhookUrl) {
        return {
            sent: false,
            reason: "webhook_not_configured",
        };
    }
    const from = normalizeToE164Br(restaurantWhatsapp);
    if (!from) {
        return {
            sent: false,
            reason: "restaurant_whatsapp_not_configured",
        };
    }
    const to = from;
    const message = buildRestaurantOrderIssueReportedMessage({
        restaurantName,
        orderId,
        customerName,
        issueMessage,
        orderStatus,
        orderType,
        paymentMethod,
        total,
        addressLabel,
        itemsSummary,
        createdAt,
    });
    const headers = {
        "Content-Type": "application/json",
    };
    if (whatsappWebhookToken) {
        headers.Authorization = `Bearer ${whatsappWebhookToken}`;
    }
    const response = await fetch(whatsappWebhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
            channel: "whatsapp",
            from,
            to,
            message,
            metadata: {
                orderId,
                customerName,
                issueMessage,
                orderStatus,
                orderType,
                paymentMethod,
                total,
                addressLabel,
                itemsSummary,
                createdAt,
                restaurantWhatsapp: from,
            },
        }),
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Webhook respondeu ${response.status}: ${body}`.trim());
    }
    return {
        sent: true,
        provider: "whatsapp_webhook",
        from,
        to,
    };
}
export async function notifyCustomerPaymentConfirmed({ restaurantWhatsapp, customerPhone, customerName, restaurantName, orderId, total, paymentMethod, }) {
    const provider = resolveProvider();
    if (provider === "none") {
        return {
            sent: false,
            reason: "provider_not_configured",
        };
    }
    try {
        if (provider === "whatsapp_webhook") {
            return await notifyViaWhatsappWebhook({
                restaurantWhatsapp,
                customerPhone,
                customerName,
                restaurantName,
                orderId,
                total,
                paymentMethod,
            });
        }
        return {
            sent: false,
            reason: "provider_not_supported",
            provider,
        };
    }
    catch (error) {
        console.error("[CUSTOMER_NOTIFICATION_ERROR]", getErrorMessage(error));
        return {
            sent: false,
            reason: "send_failed",
            provider,
            error: getErrorMessage(error),
        };
    }
}
export async function notifyCustomerOrderStatusChanged({ restaurantWhatsapp, customerPhone, customerName, restaurantName, orderId, status, }) {
    const provider = resolveProvider();
    if (provider === "none") {
        return {
            sent: false,
            reason: "provider_not_configured",
        };
    }
    try {
        if (provider === "whatsapp_webhook") {
            return await notifyOrderStatusChangedViaWhatsappWebhook({
                restaurantWhatsapp,
                customerPhone,
                customerName,
                restaurantName,
                orderId,
                status,
            });
        }
        return {
            sent: false,
            reason: "provider_not_supported",
            provider,
        };
    }
    catch (error) {
        console.error("[CUSTOMER_STATUS_NOTIFICATION_ERROR]", getErrorMessage(error));
        return {
            sent: false,
            reason: "send_failed",
            provider,
            error: getErrorMessage(error),
        };
    }
}
export async function notifyRestaurantPaymentPinRequested({ restaurantWhatsapp, restaurantName, orderId, requestedByRole, }) {
    const provider = resolveProvider();
    if (provider === "none") {
        return {
            sent: false,
            reason: "provider_not_configured",
        };
    }
    try {
        if (provider === "whatsapp_webhook") {
            return await notifyRestaurantPinRequestedViaWhatsappWebhook({
                restaurantWhatsapp,
                restaurantName,
                orderId,
                requestedByRole,
            });
        }
        return {
            sent: false,
            reason: "provider_not_supported",
            provider,
        };
    }
    catch (error) {
        console.error("[RESTAURANT_PIN_NOTIFICATION_ERROR]", getErrorMessage(error));
        return {
            sent: false,
            reason: "send_failed",
            provider,
            error: getErrorMessage(error),
        };
    }
}
export async function notifyRestaurantOrderIssueReported({ restaurantWhatsapp, restaurantName, orderId, customerName, issueMessage, orderStatus, orderType, paymentMethod, total, addressLabel, itemsSummary, createdAt, }) {
    const provider = resolveProvider();
    if (provider === "none") {
        return {
            sent: false,
            reason: "provider_not_configured",
        };
    }
    try {
        if (provider === "whatsapp_webhook") {
            return await notifyRestaurantOrderIssueReportedViaWhatsappWebhook({
                restaurantWhatsapp,
                restaurantName,
                orderId,
                customerName,
                issueMessage,
                orderStatus,
                orderType,
                paymentMethod,
                total,
                addressLabel,
                itemsSummary,
                createdAt,
            });
        }
        return {
            sent: false,
            reason: "provider_not_supported",
            provider,
        };
    }
    catch (error) {
        console.error("[RESTAURANT_ORDER_ISSUE_NOTIFICATION_ERROR]", getErrorMessage(error));
        return {
            sent: false,
            reason: "send_failed",
            provider,
            error: getErrorMessage(error),
        };
    }
}
