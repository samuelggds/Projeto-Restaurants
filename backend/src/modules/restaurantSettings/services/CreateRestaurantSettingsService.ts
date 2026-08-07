import type { Prisma } from "@prisma/client";
import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";
import prisma from "../../../config/prisma.js";

type CreateRestaurantSettingsPayload = {
  restaurantId: number | string;
  deliveryFee: number;
  minimumOrder: number;
  pixProvider?: string;
  pixKey?: string | null;
  legalDocumentType?: string | null;
  companyDocument?: string | null;
  companyLegalName?: string | null;
  companyTradeName?: string | null;
  companyAddress?: string | null;
  companyCnae?: string | null;
  monthlyRevenue?: number | null;
  ownerFullName?: string | null;
  ownerCpf?: string | null;
  ownerBirthDate?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  ownerAddress?: string | null;
  bankName?: string | null;
  bankCode?: string | null;
  bankAccountType?: string | null;
  bankBranch?: string | null;
  bankAccount?: string | null;
  bankHolderDocument?: string | null;
  cardGateway?: string | null;
  gatewayMerchantId?: string | null;
  stripeSecretKey?: string | null;
  stripeWebhookSecret?: string | null;
  mercadoPagoAccessToken?: string | null;
  picpayToken?: string | null;
  asaasAccessToken?: string | null;
  pagbankEmail?: string | null;
  pagbankToken?: string | null;
  pagbankEnvironment?: string | null;
  ownerDocumentFileUrl?: string | null;
  bankProofFileUrl?: string | null;
  companyContractFileUrl?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  restaurantName?: string | null;
  restaurantLogo?: string | null;
  restaurantCoverImage?: string | null;
};

class CreateRestaurantSettingsService {
  async execute({
    restaurantId,
    deliveryFee,
    minimumOrder,
    pixProvider,
    pixKey,
    legalDocumentType,
    companyDocument,
    companyLegalName,
    companyTradeName,
    companyAddress,
    companyCnae,
    monthlyRevenue,
    ownerFullName,
    ownerCpf,
    ownerBirthDate,
    ownerEmail,
    ownerPhone,
    ownerAddress,
    bankName,
    bankCode,
    bankAccountType,
    bankBranch,
    bankAccount,
    bankHolderDocument,
    cardGateway,
    gatewayMerchantId,
    stripeSecretKey,
    stripeWebhookSecret,
    mercadoPagoAccessToken,
    picpayToken,
    asaasAccessToken,
    pagbankEmail,
    pagbankToken,
    pagbankEnvironment,
    ownerDocumentFileUrl,
    bankProofFileUrl,
    companyContractFileUrl,
    whatsapp,
    instagram,
    facebook,
    restaurantName,
    restaurantLogo,
    restaurantCoverImage,
  }: CreateRestaurantSettingsPayload) {
    const settingsExists =
      await restaurantSettingsRepository.findByRestaurantId(restaurantId);

    if (settingsExists) {
      throw new Error("Configurações já existem para esse restaurante!");
    }

    const normalizedWhatsapp =
      whatsapp === undefined
        ? undefined
        : String(whatsapp || "").trim() || null;
    const normalizedRestaurantName =
      restaurantName === undefined
        ? undefined
        : String(restaurantName || "").trim();
    const normalizedRestaurantLogo =
      restaurantLogo === undefined
        ? undefined
        : String(restaurantLogo || "").trim() || null;
    const normalizedRestaurantCoverImage =
      restaurantCoverImage === undefined
        ? undefined
        : String(restaurantCoverImage || "").trim() || null;

    if (
      restaurantName !== undefined &&
      String(normalizedRestaurantName || "").length < 2
    ) {
      throw new Error("Nome do restaurante inválido.");
    }

    const normalizedLegalDocumentType = String(legalDocumentType || "")
      .trim()
      .toUpperCase();
    const normalizedCompanyDocument = String(companyDocument || "").replace(
      /\D/g,
      "",
    );
    const normalizedBankHolderDocument = String(
      bankHolderDocument || "",
    ).replace(/\D/g, "");
    const normalizedOwnerCpf = String(ownerCpf || "").replace(/\D/g, "");
    const normalizedOwnerPhone = String(ownerPhone || "").replace(/\D/g, "");

    if (
      normalizedLegalDocumentType === "CNPJ" &&
      normalizedCompanyDocument.length > 0 &&
      normalizedCompanyDocument.length !== 14
    ) {
      throw new Error("CNPJ inválido para cadastro da empresa.");
    }

    if (
      normalizedLegalDocumentType === "CPF" &&
      normalizedCompanyDocument.length > 0 &&
      normalizedCompanyDocument.length !== 11
    ) {
      throw new Error("CPF inválido para cadastro de autônomo.");
    }

    if (
      normalizedCompanyDocument &&
      normalizedBankHolderDocument &&
      normalizedCompanyDocument !== normalizedBankHolderDocument
    ) {
      throw new Error(
        "A titularidade da conta bancária deve ser igual ao documento cadastrado (CPF/CNPJ).",
      );
    }

    const created = await restaurantSettingsRepository.create({
      restaurantId: Number(restaurantId),
      deliveryFee,
      minimumOrder,
      pixProvider: String(pixProvider || "MERCADO_PAGO")
        .trim()
        .toUpperCase(),
      pixKey,
      legalDocumentType: normalizedLegalDocumentType || null,
      companyDocument: normalizedCompanyDocument || null,
      companyLegalName: String(companyLegalName || "").trim() || null,
      companyTradeName: String(companyTradeName || "").trim() || null,
      companyAddress: String(companyAddress || "").trim() || null,
      companyCnae: String(companyCnae || "").trim() || null,
      monthlyRevenue:
        monthlyRevenue === undefined || monthlyRevenue === null
          ? null
          : Number(monthlyRevenue),
      ownerFullName: String(ownerFullName || "").trim() || null,
      ownerCpf: normalizedOwnerCpf || null,
      ownerBirthDate: ownerBirthDate ? new Date(ownerBirthDate) : null,
      ownerEmail: String(ownerEmail || "").trim() || null,
      ownerPhone: normalizedOwnerPhone || null,
      ownerAddress: String(ownerAddress || "").trim() || null,
      bankName: String(bankName || "").trim() || null,
      bankCode: String(bankCode || "").trim() || null,
      bankAccountType:
        String(bankAccountType || "")
          .trim()
          .toUpperCase() || null,
      bankBranch: String(bankBranch || "").trim() || null,
      bankAccount: String(bankAccount || "").trim() || null,
      bankHolderDocument: normalizedBankHolderDocument || null,
      cardGateway: String(cardGateway || "").trim() || null,
      gatewayMerchantId: String(gatewayMerchantId || "").trim() || null,
      stripeSecretKey: String(stripeSecretKey || "").trim() || null,
      stripeWebhookSecret:
        String(stripeWebhookSecret || "").trim() || null,
      mercadoPagoAccessToken:
        String(mercadoPagoAccessToken || "").trim() || null,
      picpayToken: String(picpayToken || "").trim() || null,
      asaasAccessToken: String(asaasAccessToken || "").trim() || null,
      pagbankEmail: String(pagbankEmail || "").trim() || null,
      pagbankToken: String(pagbankToken || "").trim() || null,
      pagbankEnvironment: "production",
      ownerDocumentFileUrl: String(ownerDocumentFileUrl || "").trim() || null,
      bankProofFileUrl: String(bankProofFileUrl || "").trim() || null,
      companyContractFileUrl:
        String(companyContractFileUrl || "").trim() || null,
      instagram,
      facebook,
    });

    const restaurantData: Prisma.RestaurantUpdateInput = {};

    if (normalizedWhatsapp !== undefined) {
      restaurantData.whatsapp = normalizedWhatsapp;
    }

    if (normalizedRestaurantName !== undefined) {
      restaurantData.name = normalizedRestaurantName;
    }

    if (normalizedRestaurantLogo !== undefined) {
      restaurantData.logo = normalizedRestaurantLogo;
    }

    if (normalizedRestaurantCoverImage !== undefined) {
      restaurantData.coverImage = normalizedRestaurantCoverImage;
    }

    if (Object.keys(restaurantData).length > 0) {
      await prisma.restaurant.update({
        where: {
          id: Number(restaurantId),
        },
        data: restaurantData,
      });
    }

    return {
      ...created,
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      mercadoPagoAccessToken: null,
      picpayToken: null,
      asaasAccessToken: null,
      pagbankToken: null,
      stripeSecretKeyConfigured: Boolean(
        String(created?.stripeSecretKey || "").trim(),
      ),
      stripeWebhookSecretConfigured: Boolean(
        String(created?.stripeWebhookSecret || "").trim(),
      ),
      mercadoPagoAccessTokenConfigured: Boolean(
        String(created?.mercadoPagoAccessToken || "").trim(),
      ),
      picpayTokenConfigured: Boolean(String(created?.picpayToken || "").trim()),
      asaasAccessTokenConfigured: Boolean(
        String(created?.asaasAccessToken || "").trim(),
      ),
      pagbankTokenConfigured: Boolean(
        String(created?.pagbankToken || "").trim(),
      ),
      whatsapp: normalizedWhatsapp ?? null,
      restaurantName: normalizedRestaurantName ?? null,
      restaurantLogo: normalizedRestaurantLogo ?? null,
      restaurantCoverImage: normalizedRestaurantCoverImage ?? null,
    };
  }
}

export default new CreateRestaurantSettingsService();
