import type { Prisma } from '@prisma/client';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import prisma from '../../../config/prisma.js';
import { normalizeRestaurantImage } from '../utils/normalizeRestaurantImage.js';
import {
  normalizeEstablishmentAddress,
  validateEstablishmentAddress,
} from '../utils/establishmentAddress.js';
import { normalizeBusinessHours } from '../utils/businessHours.js';
import {
  isValidCnpj,
  isValidCpf,
  normalizeFontFamily,
  normalizeIntegerInRange,
  normalizeNonNegativeMoney,
  normalizeOptionalNonNegativeMoney,
  normalizeOptionalText,
  normalizePrimaryColor,
  normalizeSocialReference,
  normalizeStrictBoolean,
  normalizeWhatsappNumber,
} from '../utils/adminSettingsValidation.js';

type CreateRestaurantSettingsPayload = {
  restaurantId: number | string;
  deliveryFee: number;
  courierFeePerDelivery?: number;
  minimumOrder: number;
  freeShippingMinimum?: number | null;
  acceptsDelivery?: boolean;
  acceptsPickup?: boolean;
  acceptsPix?: boolean;
  acceptsCard?: boolean;
  tableOrderingEnabled?: boolean;
  waiterCallEnabled?: boolean;
  billRequestEnabled?: boolean;
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
  whatsappEnabled?: boolean;
  whatsappDisplayName?: string | null;
  whatsappDefaultMessage?: string | null;
  receiveOrdersOnWhatsapp?: boolean;
  receiveStatusNotifications?: boolean;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  primaryColor?: string | null;
  fontFamily?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
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
  averageDeliveryTime?: string | number | null;
  autoAcceptOrders?: boolean;
  trackingRequiresLogin?: boolean;
  soundNotifications?: boolean;
  maxConcurrentOrders?: number;
};

class CreateRestaurantSettingsService {
  async execute({
    restaurantId,
    deliveryFee,
    courierFeePerDelivery,
    minimumOrder,
    freeShippingMinimum,
    acceptsDelivery,
    acceptsPickup,
    acceptsPix,
    acceptsCard,
    tableOrderingEnabled,
    waiterCallEnabled,
    billRequestEnabled,
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
    whatsappEnabled,
    whatsappDisplayName,
    whatsappDefaultMessage,
    receiveOrdersOnWhatsapp,
    receiveStatusNotifications,
    instagram,
    facebook,
    tiktok,
    youtube,
    primaryColor,
    fontFamily,
    seoTitle,
    seoDescription,
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
    averageDeliveryTime,
    autoAcceptOrders,
    trackingRequiresLogin,
    soundNotifications,
    maxConcurrentOrders,
  }: CreateRestaurantSettingsPayload) {
    const settingsExists = await restaurantSettingsRepository.findByRestaurantId(restaurantId);

    if (settingsExists) {
      throw new Error('Configurações já existem para esse restaurante!');
    }

    const normalizedWhatsapp =
      whatsapp === undefined ? undefined : normalizeWhatsappNumber(whatsapp);
    const normalizedRestaurantName =
      restaurantName === undefined ? undefined : String(restaurantName || '').trim();
    const normalizedRestaurantLogo =
      restaurantLogo === undefined ? undefined : normalizeRestaurantImage(restaurantLogo);
    const normalizedRestaurantCoverImage =
      restaurantCoverImage === undefined
        ? undefined
        : normalizeRestaurantImage(restaurantCoverImage);
    const normalizedRestaurantDescription =
      restaurantDescription === undefined
        ? undefined
        : normalizeOptionalText(restaurantDescription, 'Descrição do restaurante', 500);
    const establishmentAddress = normalizeEstablishmentAddress({
      address: restaurantAddress,
      number: restaurantAddressNumber,
      complement: restaurantAddressComplement,
      district: restaurantAddressDistrict,
      city: restaurantCity,
      state: restaurantState,
      zipCode: restaurantZipCode,
    });
    const addressValidationError = validateEstablishmentAddress(establishmentAddress);
    if (addressValidationError) throw new Error(addressValidationError);

    if (
      restaurantName !== undefined &&
      (String(normalizedRestaurantName || '').length < 2 ||
        String(normalizedRestaurantName || '').length > 120)
    ) {
      throw new Error('Nome do restaurante deve ter entre 2 e 120 caracteres.');
    }

    const normalizedLegalDocumentType = String(legalDocumentType || '')
      .trim()
      .toUpperCase();
    const normalizedCompanyDocument = String(companyDocument || '').replace(/\D/g, '');
    const normalizedBankHolderDocument = String(bankHolderDocument || '').replace(/\D/g, '');
    const normalizedOwnerCpf = String(ownerCpf || '').replace(/\D/g, '');
    const normalizedOwnerPhone = String(ownerPhone || '').replace(/\D/g, '');
    const normalizedBusinessHours = normalizeBusinessHours(businessHours);
    const normalizedWhatsappEnabled = normalizeStrictBoolean(
      whatsappEnabled,
      'Integração com WhatsApp',
      false,
    );
    if (normalizedWhatsappEnabled && !normalizedWhatsapp) {
      throw new Error('Informe o número comercial antes de ativar o WhatsApp.');
    }

    if (
      normalizedLegalDocumentType === 'CNPJ' &&
      normalizedCompanyDocument.length > 0 &&
      !isValidCnpj(normalizedCompanyDocument)
    ) {
      throw new Error('CNPJ inválido para cadastro da empresa.');
    }

    if (
      normalizedLegalDocumentType === 'CPF' &&
      normalizedCompanyDocument.length > 0 &&
      !isValidCpf(normalizedCompanyDocument)
    ) {
      throw new Error('CPF inválido para cadastro de autônomo.');
    }

    if (
      normalizedCompanyDocument &&
      normalizedBankHolderDocument &&
      normalizedCompanyDocument !== normalizedBankHolderDocument
    ) {
      throw new Error(
        'A titularidade da conta bancária deve ser igual ao documento cadastrado (CPF/CNPJ).',
      );
    }

    if (companyLegalName !== undefined && String(companyLegalName || '').trim().length < 2) {
      throw new Error('Razão social inválida.');
    }
    if (
      ownerPhone !== undefined &&
      (!normalizedOwnerPhone || !/^\d{10,11}$/.test(normalizedOwnerPhone))
    ) {
      throw new Error('Telefone comercial inválido.');
    }
    const normalizedOwnerEmail =
      ownerEmail === undefined
        ? undefined
        : String(ownerEmail || '')
            .trim()
            .toLowerCase();
    if (
      normalizedOwnerEmail !== undefined &&
      (!normalizedOwnerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedOwnerEmail))
    ) {
      throw new Error('E-mail comercial inválido.');
    }

    const created = await restaurantSettingsRepository.create({
      restaurantId: Number(restaurantId),
      deliveryFee: normalizeNonNegativeMoney(deliveryFee, 'Taxa de entrega'),
      courierFeePerDelivery: normalizeNonNegativeMoney(
        courierFeePerDelivery,
        'Repasse por entrega',
      ),
      minimumOrder: normalizeNonNegativeMoney(minimumOrder, 'Pedido mínimo'),
      freeShippingMinimum: normalizeOptionalNonNegativeMoney(
        freeShippingMinimum,
        'Frete grátis acima de',
      ),
      acceptsDelivery: normalizeStrictBoolean(acceptsDelivery, 'Delivery', true),
      acceptsPickup: normalizeStrictBoolean(acceptsPickup, 'Retirada', true),
      acceptsPix: normalizeStrictBoolean(acceptsPix, 'Pagamento por PIX', true),
      acceptsCard: normalizeStrictBoolean(acceptsCard, 'Pagamento por cartão', true),
      tableOrderingEnabled: normalizeStrictBoolean(
        tableOrderingEnabled,
        'Pedidos por QR Code',
        true,
      ),
      waiterCallEnabled: normalizeStrictBoolean(waiterCallEnabled, 'Chamados ao garçom', true),
      billRequestEnabled: normalizeStrictBoolean(billRequestEnabled, 'Solicitação da conta', true),
      pixProvider: String(pixProvider || 'MERCADO_PAGO')
        .trim()
        .toUpperCase(),
      pixKey,
      legalDocumentType: normalizedLegalDocumentType || null,
      companyDocument: normalizedCompanyDocument || null,
      companyLegalName: String(companyLegalName || '').trim() || null,
      companyTradeName: String(companyTradeName || '').trim() || null,
      companyAddress: String(companyAddress || '').trim() || null,
      companyCnae: String(companyCnae || '').trim() || null,
      monthlyRevenue:
        monthlyRevenue === undefined || monthlyRevenue === null ? null : Number(monthlyRevenue),
      ownerFullName: String(ownerFullName || '').trim() || null,
      ownerCpf: normalizedOwnerCpf || null,
      ownerBirthDate: ownerBirthDate ? new Date(ownerBirthDate) : null,
      ownerEmail: normalizedOwnerEmail || null,
      ownerPhone: normalizedOwnerPhone || null,
      ownerAddress: String(ownerAddress || '').trim() || null,
      bankName: String(bankName || '').trim() || null,
      bankCode: String(bankCode || '').trim() || null,
      bankAccountType:
        String(bankAccountType || '')
          .trim()
          .toUpperCase() || null,
      bankBranch: String(bankBranch || '').trim() || null,
      bankAccount: String(bankAccount || '').trim() || null,
      bankHolderDocument: normalizedBankHolderDocument || null,
      cardGateway: String(cardGateway || '').trim() || null,
      gatewayMerchantId: String(gatewayMerchantId || '').trim() || null,
      stripeSecretKey: String(stripeSecretKey || '').trim() || null,
      stripeWebhookSecret: String(stripeWebhookSecret || '').trim() || null,
      mercadoPagoAccessToken: String(mercadoPagoAccessToken || '').trim() || null,
      picpayToken: String(picpayToken || '').trim() || null,
      asaasAccessToken: String(asaasAccessToken || '').trim() || null,
      pagbankEmail: String(pagbankEmail || '').trim() || null,
      pagbankToken: String(pagbankToken || '').trim() || null,
      pagbankEnvironment: 'production',
      ownerDocumentFileUrl: String(ownerDocumentFileUrl || '').trim() || null,
      bankProofFileUrl: String(bankProofFileUrl || '').trim() || null,
      companyContractFileUrl: String(companyContractFileUrl || '').trim() || null,
      primaryColor: normalizePrimaryColor(primaryColor),
      instagram: normalizeSocialReference(instagram, 'Instagram'),
      facebook: normalizeSocialReference(facebook, 'Facebook'),
      tiktok: normalizeSocialReference(tiktok, 'TikTok'),
      youtube: normalizeSocialReference(youtube, 'YouTube'),
      fontFamily: normalizeFontFamily(fontFamily),
      seoTitle: normalizeOptionalText(seoTitle, 'Título para buscadores', 70),
      seoDescription: normalizeOptionalText(seoDescription, 'Descrição para buscadores', 160),
      whatsappEnabled: normalizedWhatsappEnabled,
      whatsappDisplayName: normalizeOptionalText(
        whatsappDisplayName,
        'Nome exibido no WhatsApp',
        80,
      ),
      whatsappDefaultMessage: normalizeOptionalText(
        whatsappDefaultMessage,
        'Mensagem inicial do WhatsApp',
        500,
      ),
      receiveOrdersOnWhatsapp: normalizeStrictBoolean(
        receiveOrdersOnWhatsapp,
        'Pedidos pelo WhatsApp',
        false,
      ),
      receiveStatusNotifications: normalizeStrictBoolean(
        receiveStatusNotifications,
        'Notificações de status pelo WhatsApp',
        false,
      ),
      businessHours: normalizedBusinessHours as Prisma.InputJsonValue | undefined,
      isOpenForOrders: normalizeStrictBoolean(isOpenForOrders, 'Recebimento de pedidos', true),
      averageDeliveryTime:
        averageDeliveryTime === undefined
          ? undefined
          : String(normalizeIntegerInRange(averageDeliveryTime, 'Tempo médio de preparo', 1, 240)),
      autoAcceptOrders: normalizeStrictBoolean(
        autoAcceptOrders,
        'Aceite automático de pedidos',
        false,
      ),
      trackingRequiresLogin: normalizeStrictBoolean(
        trackingRequiresLogin,
        'Login para rastreamento',
        true,
      ),
      soundNotifications: normalizeStrictBoolean(soundNotifications, 'Notificação sonora', true),
      maxConcurrentOrders: normalizeIntegerInRange(
        maxConcurrentOrders,
        'Limite de pedidos simultâneos',
        1,
        500,
        20,
      ),
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
    if (establishmentAddress.address) {
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
      ...created,
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      mercadoPagoAccessToken: null,
      picpayToken: null,
      asaasAccessToken: null,
      pagbankToken: null,
      stripeSecretKeyConfigured: Boolean(String(created?.stripeSecretKey || '').trim()),
      stripeWebhookSecretConfigured: Boolean(String(created?.stripeWebhookSecret || '').trim()),
      mercadoPagoAccessTokenConfigured: Boolean(
        String(created?.mercadoPagoAccessToken || '').trim(),
      ),
      picpayTokenConfigured: Boolean(String(created?.picpayToken || '').trim()),
      asaasAccessTokenConfigured: Boolean(String(created?.asaasAccessToken || '').trim()),
      pagbankTokenConfigured: Boolean(String(created?.pagbankToken || '').trim()),
      whatsapp: normalizedWhatsapp ?? null,
      restaurantName: normalizedRestaurantName ?? null,
      restaurantLogo: normalizedRestaurantLogo ?? null,
      restaurantCoverImage: normalizedRestaurantCoverImage ?? null,
      restaurantDescription: normalizedRestaurantDescription ?? null,
    };
  }
}

export default new CreateRestaurantSettingsService();
