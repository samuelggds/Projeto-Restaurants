import type { Prisma } from "@prisma/client";
import restaurantSettingsRepository from "../repositories/RestaurantSettingsRepository.js";
import prisma from "../../../config/prisma.js";
import { normalizeRestaurantImage } from "../utils/normalizeRestaurantImage.js";
import { normalizeEstablishmentAddress, validateEstablishmentAddress } from "../utils/establishmentAddress.js";

type UpdateRestaurantSettingsPayload = {
  restaurantId: number | string;
  deliveryFee?: number;
  courierFeePerDelivery?: number;
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
  restaurantDescription?: string | null;
  restaurantAddress?: string | null;
  restaurantAddressNumber?: string | null;
  restaurantAddressComplement?: string | null;
  restaurantAddressDistrict?: string | null;
  restaurantCity?: string | null;
  restaurantState?: string | null;
  restaurantZipCode?: string | null;
  businessHours?: unknown;
  isOpenForOrders?: boolean;
};

class UpdateRestaurantSettingsService {
  private isValidCpf(value: string) {
    if (!/^\d{11}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
    const digit = (base: string, factor: number) => {
      const sum = base.split("").reduce((total, number, index) => total + Number(number) * (factor - index), 0);
      const result = (sum * 10) % 11;
      return result === 10 ? 0 : result;
    };
    return value.endsWith(`${digit(value.slice(0, 9), 10)}${digit(value.slice(0, 10), 11)}`);
  }

  private isValidCnpj(value: string) {
    if (!/^\d{14}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
    const digit = (base: string, weights: number[]) => {
      const sum = base.split("").reduce((total, number, index) => total + Number(number) * weights[index], 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };
    const first = digit(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = digit(value.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return value.endsWith(`${first}${second}`);
  }

  private getAsaasBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || "https://api.asaas.com")
      .trim()
      .replace(/\/+$/, "");
  }

  private async resolveAsaasWalletIdentifierByToken(token: string) {
    const normalizedToken = String(token || "").trim();
    if (!normalizedToken) {
      return "";
    }

    const response = await fetch(`${this.getAsaasBaseUrl()}/v3/myAccount`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        access_token: normalizedToken,
      },
    });

    if (!response.ok) {
      return "";
    }

    const body = (await response.json()) as {
      walletId?: string;
      id?: string;
    };

    return String(body?.walletId || body?.id || "").trim();
  }

  async execute({
    restaurantId,
    deliveryFee,
    courierFeePerDelivery,
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
    restaurantDescription,
    restaurantAddress,
    restaurantAddressNumber,
    restaurantAddressComplement,
    restaurantAddressDistrict,
    restaurantCity,
    restaurantState,
    restaurantZipCode,
    businessHours,
    isOpenForOrders,
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
        : normalizeRestaurantImage(restaurantLogo);
    const normalizedRestaurantCoverImage =
      restaurantCoverImage === undefined
        ? undefined
        : String(restaurantCoverImage || "").trim() || null;
    const normalizedRestaurantDescription = restaurantDescription === undefined
      ? undefined
      : String(restaurantDescription || "").trim() || null;
    const establishmentAddress = normalizeEstablishmentAddress({
      address: restaurantAddress,
      number: restaurantAddressNumber,
      complement: restaurantAddressComplement,
      district: restaurantAddressDistrict,
      city: restaurantCity,
      state: restaurantState,
      zipCode: restaurantZipCode,
    });
    const hasAddressPayload = [restaurantAddress, restaurantAddressNumber, restaurantAddressComplement, restaurantAddressDistrict, restaurantCity, restaurantState, restaurantZipCode].some((value) => value !== undefined);
    const addressValidationError = hasAddressPayload ? validateEstablishmentAddress(establishmentAddress) : null;
    if (addressValidationError) throw new Error(addressValidationError);
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
    const normalizedStripeSecretKey =
      stripeSecretKey === undefined
        ? undefined
        : String(stripeSecretKey || "").trim() || null;
    const normalizedStripeWebhookSecret =
      stripeWebhookSecret === undefined
        ? undefined
        : String(stripeWebhookSecret || "").trim() || null;
    const normalizedMercadoPagoAccessToken =
      mercadoPagoAccessToken === undefined
        ? undefined
        : String(mercadoPagoAccessToken || "").trim() || null;
    const normalizedPicPayToken =
      picpayToken === undefined
        ? undefined
        : String(picpayToken || "").trim() || null;
    const normalizedAsaasAccessToken =
      asaasAccessToken === undefined
        ? undefined
        : String(asaasAccessToken || "").trim() || null;
    const normalizedPagBankEmail =
      pagbankEmail === undefined
        ? undefined
        : String(pagbankEmail || "").trim() || null;
    const normalizedPagBankToken =
      pagbankToken === undefined
        ? undefined
        : String(pagbankToken || "").trim() || null;
    const normalizedPagBankEnvironment = "production";
    const normalizedBusinessHours = businessHours === undefined ? undefined : businessHours;
    const normalizedIsOpenForOrders = isOpenForOrders === undefined ? undefined : Boolean(isOpenForOrders);
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
    const normalizedOwnerEmail =
      ownerEmail === undefined
        ? undefined
        : String(ownerEmail || "").trim().toLowerCase() || null;
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

    const resolvedAsaasToken =
      normalizedAsaasAccessToken === undefined
        ? String(settings.asaasAccessToken || "").trim()
        : String(normalizedAsaasAccessToken || "").trim();

    const resolvedPixProvider = String(
      pixProvider || settings.pixProvider || "MERCADO_PAGO",
    )
      .trim()
      .toUpperCase();

    const resolvedCardGateway =
      normalizedCardGateway === undefined
        ? String(settings.cardGateway || "")
            .trim()
            .toUpperCase()
        : String(normalizedCardGateway || "")
            .trim()
            .toUpperCase();

    let resolvedGatewayMerchantId =
      normalizedGatewayMerchantId === undefined
        ? String(settings.gatewayMerchantId || "").trim() || null
        : normalizedGatewayMerchantId;
    let gatewayMerchantIdAutoResolved = false;
    let gatewayMerchantIdAutoResolvedSource: string | null = null;

    const shouldTryAutoResolveGatewayMerchantId =
      !resolvedGatewayMerchantId &&
      Boolean(resolvedAsaasToken) &&
      (resolvedPixProvider === "ASAAS" || resolvedCardGateway === "ASAAS");

    if (shouldTryAutoResolveGatewayMerchantId) {
      try {
        const autoWalletId =
          await this.resolveAsaasWalletIdentifierByToken(resolvedAsaasToken);

        if (autoWalletId) {
          resolvedGatewayMerchantId = autoWalletId;
          gatewayMerchantIdAutoResolved = true;
          gatewayMerchantIdAutoResolvedSource = "asaas_myAccount";
        }
      } catch {
        // Non-blocking fallback: webhook can still backfill gatewayMerchantId later.
      }
    }

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
      !this.isValidCnpj(resolvedCompanyDocument)
    ) {
      throw new Error("CNPJ inválido para cadastro da empresa.");
    }

    if (
      resolvedDocumentType === "CPF" &&
      resolvedCompanyDocument &&
      !this.isValidCpf(resolvedCompanyDocument)
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

    if (companyLegalName !== undefined && String(companyLegalName || "").trim().length < 2) {
      throw new Error("Razão social inválida.");
    }
    if (normalizedOwnerPhone !== undefined && (!normalizedOwnerPhone || !/^\d{10,11}$/.test(normalizedOwnerPhone))) {
      throw new Error("Telefone comercial inválido.");
    }
    if (normalizedOwnerEmail !== undefined && (!normalizedOwnerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedOwnerEmail))) {
      throw new Error("E-mail comercial inválido.");
    }

    const updated = await restaurantSettingsRepository.update(restaurantId, {
      deliveryFee,
      courierFeePerDelivery:
        courierFeePerDelivery === undefined
          ? undefined
          : Math.max(Number(courierFeePerDelivery || 0), 0),
      minimumOrder,
      pixProvider: resolvedPixProvider,
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
      ownerEmail: normalizedOwnerEmail,
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
      gatewayMerchantId: resolvedGatewayMerchantId,
      stripeSecretKey: normalizedStripeSecretKey,
      stripeWebhookSecret: normalizedStripeWebhookSecret,
      mercadoPagoAccessToken: normalizedMercadoPagoAccessToken,
      picpayToken: normalizedPicPayToken,
      asaasAccessToken: normalizedAsaasAccessToken,
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
      businessHours: normalizedBusinessHours as Prisma.InputJsonValue | undefined,
      isOpenForOrders: normalizedIsOpenForOrders,
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
    if (normalizedRestaurantDescription !== undefined) {
      restaurantData.description = normalizedRestaurantDescription;
    }
    if (hasAddressPayload && establishmentAddress.address) {
      restaurantData.address = establishmentAddress.address;
      restaurantData.addressNumber = establishmentAddress.number;
      restaurantData.addressComplement = establishmentAddress.complement || null;
      restaurantData.addressDistrict = establishmentAddress.district;
      restaurantData.city = establishmentAddress.city;
      restaurantData.state = establishmentAddress.state;
      restaurantData.zipCode = establishmentAddress.zipCode;
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
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      mercadoPagoAccessToken: null,
      picpayToken: null,
      asaasAccessToken: null,
      pagbankToken: null,
      stripeSecretKeyConfigured: Boolean(
        String(updated?.stripeSecretKey || "").trim(),
      ),
      stripeWebhookSecretConfigured: Boolean(
        String(updated?.stripeWebhookSecret || "").trim(),
      ),
      mercadoPagoAccessTokenConfigured: Boolean(
        String(updated?.mercadoPagoAccessToken || "").trim(),
      ),
      picpayTokenConfigured: Boolean(String(updated?.picpayToken || "").trim()),
      asaasAccessTokenConfigured: Boolean(
        String(updated?.asaasAccessToken || "").trim(),
      ),
      pagbankTokenConfigured: Boolean(
        String(updated?.pagbankToken || "").trim(),
      ),
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
      restaurantDescription:
        restaurantDescription !== undefined
          ? normalizedRestaurantDescription
          : String(settings?.restaurant?.description || "").trim() || null,
      gatewayMerchantIdConfigured: Boolean(
        String(updated?.gatewayMerchantId || "").trim(),
      ),
      gatewayMerchantIdAutoResolved,
      gatewayMerchantIdAutoResolvedSource,
    };
  }
}

export default new UpdateRestaurantSettingsService();
