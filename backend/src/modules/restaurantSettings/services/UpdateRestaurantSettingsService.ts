import type { Prisma } from "@prisma/client";
import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";
import prisma from "../../../config/prisma.js";

type UpdateRestaurantSettingsPayload = {
  restaurantId: number | string;
  deliveryFee?: number;
  minimumOrder?: number;
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

class UpdateRestaurantSettingsService {
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
  }: UpdateRestaurantSettingsPayload) {
    const settings =
      await restaurantSettingsRepository.findByRestaurantId(restaurantId);

    if (!settings) {
      throw new Error("Configurações não encontradas!");
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
    const normalizedBankName =
      bankName === undefined
        ? undefined
        : String(bankName || "").trim() || null;
    const normalizedBankBranch =
      bankBranch === undefined
        ? undefined
        : String(bankBranch || "").trim() || null;
    const normalizedBankAccount =
      bankAccount === undefined
        ? undefined
        : String(bankAccount || "").trim() || null;
    const normalizedCardGateway =
      cardGateway === undefined
        ? undefined
        : String(cardGateway || "").trim() || null;
    const normalizedGatewayMerchantId =
      gatewayMerchantId === undefined
        ? undefined
        : String(gatewayMerchantId || "").trim() || null;
    const normalizedPagBankEmail =
      pagbankEmail === undefined
        ? undefined
        : String(pagbankEmail || "").trim() || null;
    const normalizedPagBankToken =
      pagbankToken === undefined
        ? undefined
        : String(pagbankToken || "").trim() || null;
    const normalizedPagBankEnvironment = "production";
    const normalizedLegalDocumentType =
      legalDocumentType === undefined
        ? undefined
        : String(legalDocumentType || "")
            .trim()
            .toUpperCase() || null;
    const normalizedCompanyDocument =
      companyDocument === undefined
        ? undefined
        : String(companyDocument || "").replace(/\D/g, "") || null;
    const normalizedOwnerCpf =
      ownerCpf === undefined
        ? undefined
        : String(ownerCpf || "").replace(/\D/g, "") || null;
    const normalizedOwnerPhone =
      ownerPhone === undefined
        ? undefined
        : String(ownerPhone || "").replace(/\D/g, "") || null;
    const normalizedBankHolderDocument =
      bankHolderDocument === undefined
        ? undefined
        : String(bankHolderDocument || "").replace(/\D/g, "") || null;
    const normalizedOwnerBirthDate =
      ownerBirthDate === undefined
        ? undefined
        : ownerBirthDate
          ? new Date(ownerBirthDate)
          : null;

    if (
      restaurantName !== undefined &&
      String(normalizedRestaurantName || "").length < 2
    ) {
      throw new Error("Nome do restaurante inválido.");
    }

    const resolvedDocumentType =
      normalizedLegalDocumentType || String(settings.legalDocumentType || "");
    const resolvedCompanyDocument =
      normalizedCompanyDocument || String(settings.companyDocument || "");
    const resolvedBankHolderDocument =
      normalizedBankHolderDocument || String(settings.bankHolderDocument || "");

    if (
      resolvedDocumentType === "CNPJ" &&
      resolvedCompanyDocument &&
      resolvedCompanyDocument.length !== 14
    ) {
      throw new Error("CNPJ inválido para cadastro da empresa.");
    }

    if (
      resolvedDocumentType === "CPF" &&
      resolvedCompanyDocument &&
      resolvedCompanyDocument.length !== 11
    ) {
      throw new Error("CPF inválido para cadastro de autônomo.");
    }

    if (
      resolvedCompanyDocument &&
      resolvedBankHolderDocument &&
      resolvedCompanyDocument !== resolvedBankHolderDocument
    ) {
      throw new Error(
        "A titularidade da conta bancária deve ser igual ao documento cadastrado (CPF/CNPJ).",
      );
    }

    const updated = await restaurantSettingsRepository.update(restaurantId, {
      deliveryFee,
      minimumOrder,
      pixProvider: String(pixProvider || settings.pixProvider || "MERCADO_PAGO")
        .trim()
        .toUpperCase(),
      pixKey,
      legalDocumentType: normalizedLegalDocumentType,
      companyDocument: normalizedCompanyDocument,
      companyLegalName:
        companyLegalName === undefined
          ? undefined
          : String(companyLegalName || "").trim() || null,
      companyTradeName:
        companyTradeName === undefined
          ? undefined
          : String(companyTradeName || "").trim() || null,
      companyAddress:
        companyAddress === undefined
          ? undefined
          : String(companyAddress || "").trim() || null,
      companyCnae:
        companyCnae === undefined
          ? undefined
          : String(companyCnae || "").trim() || null,
      monthlyRevenue:
        monthlyRevenue === undefined
          ? undefined
          : monthlyRevenue === null
            ? null
            : Number(monthlyRevenue),
      ownerFullName:
        ownerFullName === undefined
          ? undefined
          : String(ownerFullName || "").trim() || null,
      ownerCpf: normalizedOwnerCpf,
      ownerBirthDate: normalizedOwnerBirthDate,
      ownerEmail:
        ownerEmail === undefined
          ? undefined
          : String(ownerEmail || "").trim() || null,
      ownerPhone: normalizedOwnerPhone,
      ownerAddress:
        ownerAddress === undefined
          ? undefined
          : String(ownerAddress || "").trim() || null,
      bankName: normalizedBankName,
      bankCode:
        bankCode === undefined
          ? undefined
          : String(bankCode || "").trim() || null,
      bankAccountType:
        bankAccountType === undefined
          ? undefined
          : String(bankAccountType || "")
              .trim()
              .toUpperCase() || null,
      bankBranch: normalizedBankBranch,
      bankAccount: normalizedBankAccount,
      bankHolderDocument: normalizedBankHolderDocument,
      cardGateway: normalizedCardGateway,
      gatewayMerchantId: normalizedGatewayMerchantId,
      pagbankEmail: normalizedPagBankEmail,
      pagbankToken: normalizedPagBankToken,
      pagbankEnvironment: normalizedPagBankEnvironment,
      ownerDocumentFileUrl:
        ownerDocumentFileUrl === undefined
          ? undefined
          : String(ownerDocumentFileUrl || "").trim() || null,
      bankProofFileUrl:
        bankProofFileUrl === undefined
          ? undefined
          : String(bankProofFileUrl || "").trim() || null,
      companyContractFileUrl:
        companyContractFileUrl === undefined
          ? undefined
          : String(companyContractFileUrl || "").trim() || null,
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
      ...updated,
      pagbankToken: null,
      whatsapp:
        whatsapp !== undefined
          ? normalizedWhatsapp
          : String(settings?.restaurant?.whatsapp || "").trim() || null,
      restaurantName:
        restaurantName !== undefined
          ? normalizedRestaurantName
          : String(settings?.restaurant?.name || "").trim() || null,
      restaurantLogo:
        restaurantLogo !== undefined
          ? normalizedRestaurantLogo
          : String(settings?.restaurant?.logo || "").trim() || null,
      restaurantCoverImage:
        restaurantCoverImage !== undefined
          ? normalizedRestaurantCoverImage
          : String(settings?.restaurant?.coverImage || "").trim() || null,
    };
  }
}

export default new UpdateRestaurantSettingsService();
